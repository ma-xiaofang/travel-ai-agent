import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { MessageRole } from '../../generated/prisma/client.js';
import { createChatModel } from '../llm/create-chat-model.js';
import { MemoryService } from '../memory/memory.service.js';
import { SessionService } from '../session/session.service.js';
import { ToolsService } from '../tools/tools.service.js';

/**
 * 系统提示词：定义 Agent 的角色设定、可用工具清单与工作原则。
 * 每次调用模型时都会注入到消息序列最前面，约束模型的行为与输出风格。
 */
const SYSTEM_PROMPT = `你是「旅途 · AI」旅行规划师，专业、热情的旅行助手。

可用工具：
- get_weather：查询目的地天气和穿衣建议
- get_attractions：推荐景点和目的地信息
- generate_itinerary：生成逐日详细行程
- calculate_budget：估算旅行总费用
- check_visa：查询签证要求
- convert_currency：货币换算和消费参考
- generate_packing_list：生成打包清单
- translate_phrases：旅行常用短语翻译
- web_search：Tavily 联网搜索实时资讯（签证政策、开放时间、航班、当地活动、当地突发事件等）
- update_session_title：为当前对话设置简短中文标题（用户已表达旅行需求且尚无标题时调用）

工作原则：
1. 根据用户需求主动使用合适工具，不要等用户指定
2. 复杂问题串联多个工具（如：查景点→生成行程→估算预算）
3. 部分工具内部按 **知识库（RAG）→ 联网搜索（Tavily）→ 内置参考（mock）** 优先级获取数据，有知识库资料时采用权重提高，并结合联网搜索结果。
4. 需要跨主题实时资讯时，可额外调用 web_search 补充
5. 识别到明确旅行需求时，调用 update_session_title 设置 6-15 字会话标题
6. 回答热情友好，多使用 emoji
7. 使用中文回答
8. 输出的内容不要 ai 化，要像旅行达人一样分享经验和建议`;

/**
 * Agent 核心服务
 *
 * 基于 LangGraph 的 `StateGraph` 构建「agent → tools 循环」的对话引擎，
 * 负责编排 LLM 调用、工具调用与对话历史持久化。对外暴露两种对话方式：
 * - {@link AgentService.streamChat} — SSE 流式输出（文本 / 思维链 / 会话事件）
 * - {@link AgentService.chat} — 一次性同步返回完整回答
 *
 * 整体流程：`START → agent(callModel) → shouldContinue → tools / END → agent → ...`
 */
@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly memoryService: MemoryService,
    private readonly sessionService: SessionService,
    private readonly toolsService: ToolsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * 按 session 动态编译 LangGraph 状态图。
   *
   * 由于每个工具都需要绑定当前会话的 `sessionId`（如 update_session_title
   * 需知道更新哪个会话），因此 Graph 无法全局复用，而是按会话即时构建。
   *
   * @param sessionId 当前会话 ID，用于绑定工具上下文
   * @returns 已编译、可执行（invoke / stream）的 LangGraph 实例
   */
  private buildGraph(sessionId: string) {
    // 获取绑定了当前会话上下文的全部 Agent 工具
    const tools = this.toolsService.getAgentTools(sessionId);
    // 获取聊天温度
    const temperature = parseFloat(
      this.config.get<string>('CHAT_TEMPERATURE', '0.7'),
    );
    // 第二个参数 streaming=true：开启流式以支持 SSE 逐字输出
    const llm = createChatModel(temperature, true);
    // 绑定工具，使模型能够调用工具
    const llmWithTools = llm.bindTools(tools);
    // 创建工具节点，用于执行工具调用
    const toolNode = new ToolNode(tools);

    /**
     * 条件边判定：决定 agent 节点之后走向。
     * 若最后一条 AI 消息包含 tool_calls，则转入 tools 节点执行工具；
     * 否则结束本轮对话（END）。
     * @param state - 当前状态
     * @returns 下一个节点
     */
    const shouldContinue = (state: typeof MessagesAnnotation.State) => {
      const last = state.messages[state.messages.length - 1] as AIMessage;
      return last.tool_calls?.length ? 'tools' : END;
    };

    /**
     * agent 节点：调用绑定工具后的 LLM。
     * 每次都在历史消息前注入系统提示词，保证模型角色与行为约束一致。
     */
    const callModel = async (state: typeof MessagesAnnotation.State) => {
      const messages = [new SystemMessage(SYSTEM_PROMPT), ...state.messages];
      const response = await llmWithTools.invoke(messages);
      return { messages: [response] };
    };

    // 组装状态图：agent 与 tools 两个节点构成循环，直至 shouldContinue 返回 END
    return new StateGraph(MessagesAnnotation)
      .addNode('agent', callModel)
      .addNode('tools', toolNode)
      .addEdge(START, 'agent')
      // 条件边判定：决定 agent 节点之后走向。
      // 若最后一条 AI 消息包含 tool_calls，则转入 tools 节点执行工具；
      // 否则结束本轮对话（END）。
      .addConditionalEdges('agent', shouldContinue, {
        tools: 'tools',
        [END]: END,
      })
      // 工具节点执行完毕后，返回 agent 节点继续处理
      .addEdge('tools', 'agent')
      .compile();
  }

  /**
   * 计算 LangGraph 的递归上限，防止 agent ↔ tools 无限循环。
   *
   * 一轮完整交互通常包含「调用工具」与「再次调用模型」两步，
   * 故以最大迭代次数（MAX_ITERATIONS）的 2 倍作为递归上限。
   *
   * @returns 递归上限步数
   */
  private getRecursionLimit() {
    const maxIterations = parseInt(
      this.config.get<string>('MAX_ITERATIONS', '6'),
      10,
    );
    return maxIterations * 2;
  }

  /**
   * 流式对话（SSE）。
   *
   * 逐步产出三类事件：
   * - `reasoning` — DeepSeek 思维链（reasoning_content），前端可折叠展示
   * - `text` — 正文回答内容（逐字增量）
   * - `session` — 会话 ID，流结束时下发，供前端关联/新建会话
   *
   * 对话结束后会将用户消息与完整回答写入对话历史。
   *
   * @param userId 当前用户 ID（用于会话归属校验）
   * @param message 用户输入内容
   * @param sessionId 可选会话 ID；为空时自动创建新会话
   * @yields 文本 / 思维链 / 会话事件
   */
  async *streamChat(
    userId: string,
    message: string,
    sessionId?: string,
  ): AsyncGenerator<
    | { type: 'text'; content: string }
    | { type: 'reasoning'; content: string }
    | { type: 'session'; sessionId: string }
  > {
    // 校验/创建会话归属，确保 userId 与 sessionId 匹配
    const session = await this.sessionService.ensureSession(sessionId, userId);
    const graph = this.buildGraph(session.id);
    // 载入历史消息并追加本轮用户输入，构成完整上下文
    const history = await this.memoryService.getHistory(session.id);
    const messages = [...history, new HumanMessage(message)];
    // 累积本轮正文，用于流结束后整体落库
    let fullContent = '';

    try {
      // streamMode: 'messages' —— 以消息为粒度流式产出，便于逐字转发
      const stream = await graph.stream(
        { messages },
        {
          streamMode: 'messages',
          recursionLimit: this.getRecursionLimit(),
        },
      );

      for await (const [msg, meta] of stream) {
        // 仅转发 agent 节点（模型）的输出，tools 节点的中间结果不直接外发
        if (meta.langgraph_node === 'agent') {
          // DeepSeek 思维链（reasoning_content）：作为独立的 reasoning 事件下发
          const reasoning =
            (msg as any).additional_kwargs?.reasoning_content as
            | string
            | undefined;
          if (reasoning) {
            yield { type: 'reasoning', content: reasoning };
          }

          // 正文内容：仅在为字符串时累积并下发（过滤工具调用等非文本块）
          const chunk = typeof (msg as any).content === 'string' ? ((msg as any).content as string) : '';
          if (chunk) {
            fullContent += chunk;
            yield { type: 'text', content: chunk };
          }
        }
      }

      // 持久化本轮对话：先写用户消息，再写完整回答
      await this.memoryService.addMessage(
        session.id,
        MessageRole.USER,
        message,
      );
      if (fullContent) {
        await this.memoryService.addMessage(
          session.id,
          MessageRole.ASSISTANT,
          fullContent,
        );
      }

      // 流正常结束，下发会话事件
      yield { type: 'session', sessionId: session.id };
    } catch (error: any) {
      // 出错时记录日志，并以文本事件向前端反馈友好错误，最后仍下发会话事件
      this.logger.error(`streamChat failed: ${error.message}`, error.stack);
      yield {
        type: 'text',
        content: `\n\n抱歉，处理请求时出错：${error.message}`,
      };
      yield { type: 'session', sessionId: session.id };
    }
  }

  /**
   * 同步对话（非流式）。
   *
   * 一次性执行完整的 agent ↔ tools 循环，返回最终回答；
   * 适用于无需流式体验的场景（如脚本调用、批处理）。
   * 对话结束后会将用户消息与回答写入对话历史。
   *
   * @param userId 当前用户 ID（用于会话归属校验）
   * @param message 用户输入内容
   * @param sessionId 可选会话 ID；为空时自动创建新会话
   * @returns 包含 sessionId、userId、原始问题与最终回答的结果对象
   */
  async chat(userId: string, message: string, sessionId?: string) {
    // 校验/创建会话归属
    const session = await this.sessionService.ensureSession(sessionId, userId);
    const graph = this.buildGraph(session.id);
    const history = await this.memoryService.getHistory(session.id);

    // 阻塞执行整个状态图，直至收敛到 END
    const result = await graph.invoke(
      { messages: [...history, new HumanMessage(message)] },
      { recursionLimit: this.getRecursionLimit() },
    );

    // 从消息列表末尾向前查找最后一条 AI 消息作为最终回答
    const lastAI = [...result.messages]
      .reverse()
      .find((m) => m instanceof AIMessage);
    const content = lastAI?.content?.toString() || '抱歉，无法处理您的请求';

    // 持久化本轮对话
    await this.memoryService.addMessage(session.id, MessageRole.USER, message);
    await this.memoryService.addMessage(
      session.id,
      MessageRole.ASSISTANT,
      content,
    );

    return { sessionId: session.id, userId, message, answer: content };
  }
}
