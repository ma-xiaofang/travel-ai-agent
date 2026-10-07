import { AIMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { AgentService } from './agent.service.js';
import { createChatModel } from '../llm/create-chat-model.js';
import { MessageRole } from '../../generated/prisma/client.js';

// streamChat 会真实构建 LangGraph 并调用 DeepSeek，这里只打桩模型，
// 其余（StateGraph / ToolNode / 事件解析）都跑真实实现。
jest.mock('../llm/create-chat-model.js', () => ({
  createChatModel: jest.fn(),
}));

const mockedCreateChatModel = createChatModel as jest.MockedFunction<
  typeof createChatModel
>;

/**
 * 覆盖「工具产出 artifact → SSE 透传 → 落库挂到助手消息 → session 事件带 messageId」
 * 这条链路：行程卡能否被渲染和二次编辑，全依赖这四个环节首尾相接。
 */
describe('AgentService.streamChat (artifact 事件passthrough)', () => {
  const artifact = {
    destination: '洛阳',
    days: 1,
    plan: [{ day: 1, items: [{ period: '上午', title: '龙门石窟' }] }],
  };

  // 真实的 content_and_artifact 工具，模拟 generate_itinerary 的产出形态
  const itineraryTool = tool(
    async () => ['📅 **洛阳 1天行程**\n\n上午 龙门石窟', artifact],
    {
      name: 'generate_itinerary',
      description: '生成逐日旅行行程',
      responseFormat: 'content_and_artifact',
      schema: z.object({ destination: z.string(), days: z.number() }),
    },
  );

  function buildService() {
    // 第一轮让模型请求工具，第二轮给出最终正文
    const fakeBoundModel = {
      invoke: jest
        .fn()
        .mockResolvedValueOnce(
          new AIMessage({
            content: '',
            tool_calls: [
              {
                name: 'generate_itinerary',
                args: { destination: '洛阳', days: 1 },
                id: 'call_1',
                type: 'tool_call',
              },
            ],
          }),
        )
        .mockResolvedValueOnce(new AIMessage('这是你的行程')),
    };
    mockedCreateChatModel.mockReturnValue({
      bindTools: jest.fn(() => fakeBoundModel),
    } as unknown as ReturnType<typeof createChatModel>);

    const memoryService = {
      getHistory: jest.fn().mockResolvedValue([]),
      addMessage: jest.fn().mockResolvedValue('assistant-msg-1'),
    };
    const sessionService = {
      ensureSession: jest
        .fn()
        .mockResolvedValue({ id: 'session-1', userId: 'user-1' }),
    };
    const toolsService = {
      getAgentTools: jest.fn().mockReturnValue([itineraryTool]),
    };
    const config = {
      get: jest.fn((_key: string, def?: string) => def),
    };

    const service = new AgentService(
      memoryService as any,
      sessionService as any,
      toolsService as any,
      config as any,
    );

    return { service, memoryService, sessionService };
  }

  it('透传 artifact、结束下发带 messageId 的 session 事件，并把 artifact 挂到助手消息落库', async () => {
    const { service, memoryService } = buildService();

    const events: any[] = [];
    for await (const evt of service.streamChat('user-1', '帮我规划洛阳')) {
      events.push(evt);
    }

    // 1) 正文逐字事件
    const text = events
      .filter((e) => e.type === 'text')
      .map((e) => e.content)
      .join('');
    expect(text).toBe('这是你的行程');

    // 2) artifact 事件：内容与工具产出一致
    const artifactEvents = events.filter((e) => e.type === 'artifact');
    expect(artifactEvents).toHaveLength(1);
    expect(artifactEvents[0].artifact).toEqual(artifact);

    // 3) session 事件带 messageId，前端据此回写编辑
    const sessionEvent = events.find((e) => e.type === 'session');
    expect(sessionEvent).toMatchObject({
      sessionId: 'session-1',
      messageId: 'assistant-msg-1',
    });

    // 4) 落库：用户消息无 artifact，助手消息挂上第一个 artifact
    expect(memoryService.addMessage).toHaveBeenNthCalledWith(
      1,
      'session-1',
      MessageRole.USER,
      '帮我规划洛阳',
    );
    expect(memoryService.addMessage).toHaveBeenNthCalledWith(
      2,
      'session-1',
      MessageRole.ASSISTANT,
      '这是你的行程',
      artifact,
    );
  });
});