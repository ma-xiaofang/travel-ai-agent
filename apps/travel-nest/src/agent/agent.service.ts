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

const SYSTEM_PROMPT = `你是「旅途」AI旅行规划师，专业、热情的旅行助手。
不要输出思考过程，不要输出推理步骤，不要解释过程，直接给出最终答案。

可用工具：
- get_weather：查询目的地天气和穿衣建议
- get_attractions：推荐景点和目的地信息
- generate_itinerary：生成逐日详细行程
- calculate_budget：估算旅行总费用
- check_visa：查询签证要求
- convert_currency：货币换算和消费参考
- generate_packing_list：生成打包清单
- translate_phrases：旅行常用短语翻译
- web_search：Tavily 联网搜索实时资讯（签证政策、开放时间、航班、当地活动等）
- update_session_title：为当前对话设置简短中文标题（用户已表达旅行需求且尚无标题时调用）

工作原则：
1. 根据用户需求主动使用合适工具，不要等用户指定
2. 复杂问题串联多个工具（如：查景点→生成行程→估算预算）
3. 各旅行工具内部按 **知识库（RAG）→ 联网搜索（Tavily）→ 内置参考（mock）** 优先级获取数据，有知识库资料时直接采用
4. 需要跨主题实时资讯时，可额外调用 web_search 补充
5. 识别到明确旅行需求时，调用 update_session_title 设置 6-15 字会话标题
6. 回答热情友好，多使用 emoji
7. 使用中文回答
8. 输出的内容不要 ai 化，要像旅行达人一样分享经验和建议`;

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly memoryService: MemoryService,
    private readonly sessionService: SessionService,
    private readonly toolsService: ToolsService,
    private readonly config: ConfigService,
  ) {}

  /** 按 session 动态编译 Graph（Tool 含 sessionId 绑定） */
  private buildGraph(sessionId: string) {
    const tools = this.toolsService.getAgentTools(sessionId);
    const temperature = parseFloat(
      this.config.get<string>('CHAT_TEMPERATURE', '0.7'),
    );
    const llm = createChatModel(temperature, true);
    const llmWithTools = llm.bindTools(tools);
    const toolNode = new ToolNode(tools);

    const shouldContinue = (state: typeof MessagesAnnotation.State) => {
      const last = state.messages[state.messages.length - 1] as AIMessage;
      return last.tool_calls?.length ? 'tools' : END;
    };

    const callModel = async (state: typeof MessagesAnnotation.State) => {
      const messages = [new SystemMessage(SYSTEM_PROMPT), ...state.messages];
      const response = await llmWithTools.invoke(messages);
      return { messages: [response] };
    };

    return new StateGraph(MessagesAnnotation)
      .addNode('agent', callModel)
      .addNode('tools', toolNode)
      .addEdge(START, 'agent')
      .addConditionalEdges('agent', shouldContinue, {
        tools: 'tools',
        [END]: END,
      })
      .addEdge('tools', 'agent')
      .compile();
  }

  private getRecursionLimit() {
    const maxIterations = parseInt(
      this.config.get<string>('MAX_ITERATIONS', '6'),
      10,
    );
    return maxIterations * 2;
  }

  async *streamChat(
    userId: string,
    message: string,
    sessionId?: string,
  ): AsyncGenerator<
    | { type: 'text'; content: string }
    | { type: 'reasoning'; content: string }
    | { type: 'session'; sessionId: string }
  > {
    const session = await this.sessionService.ensureSession(sessionId, userId);
    const graph = this.buildGraph(session.id);
    const history = await this.memoryService.getHistory(session.id);
    const messages = [...history, new HumanMessage(message)];
    let fullContent = '';

    try {
      const stream = await graph.stream(
        { messages },
        {
          streamMode: 'messages',
          recursionLimit: this.getRecursionLimit(),
        },
      );

      for await (const [msg, meta] of stream) {
        if (meta.langgraph_node === 'agent') {
          // DeepSeek 思维链（reasoning_content）
          const reasoning =
            (msg as any).additional_kwargs?.reasoning_content as
            | string
            | undefined;
          if (reasoning) {
            yield { type: 'reasoning', content: reasoning };
          }

          // 正文内容
          const chunk = typeof (msg as any).content === 'string' ? ((msg as any).content as string) : '';
          if (chunk) {
            fullContent += chunk;
            yield { type: 'text', content: chunk };
          }
        }
      }

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

      yield { type: 'session', sessionId: session.id };
    } catch (error: any) {
      this.logger.error(`streamChat failed: ${error.message}`, error.stack);
      yield {
        type: 'text',
        content: `\n\n抱歉，处理请求时出错：${error.message}`,
      };
      yield { type: 'session', sessionId: session.id };
    }
  }

  async chat(userId: string, message: string, sessionId?: string) {
    const session = await this.sessionService.ensureSession(sessionId, userId);
    const graph = this.buildGraph(session.id);
    const history = await this.memoryService.getHistory(session.id);

    const result = await graph.invoke(
      { messages: [...history, new HumanMessage(message)] },
      { recursionLimit: this.getRecursionLimit() },
    );

    const lastAI = [...result.messages]
      .reverse()
      .find((m) => m instanceof AIMessage);
    const content = lastAI?.content?.toString() || '抱歉，无法处理您的请求';

    await this.memoryService.addMessage(session.id, MessageRole.USER, message);
    await this.memoryService.addMessage(
      session.id,
      MessageRole.ASSISTANT,
      content,
    );

    return { sessionId: session.id, userId, message, answer: content };
  }
}
