import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { SessionService } from '../session/session.service.js';

/**
 * 会话标题 Tool — sessionId 由服务端绑定，模型只提供 title 文本。
 * Agent 在识别到用户旅行意图后调用，Tool 负责写入数据库（不再二次调 LLM）。
 */
export function createUpdateSessionTitleTool(
  sessionId: string,
  sessionService: SessionService,
) {
  return tool(
    async ({ title }: { title: string }) => {
      const result = await sessionService.updateTitle(sessionId, title);
      if (!result.updated) {
        return '标题为空，未更新会话名称。';
      }
      return `已将会话标题设为「${result.title}」，历史列表将显示该名称。`;
    },
    {
      name: 'update_session_title',
      description: `为当前对话设置简短中文标题，供历史会话列表展示。
在以下情况调用：
1) 用户首条或早期消息已表达明确旅行需求（目的地、天数、主题等）；
2) 当前会话尚未有合适标题。
标题要求：6-15 个汉字，概括核心需求（如「南极5天亲子游」「曼谷预算规划」）。
不要为寒暄、无关闲聊调用；同一标题勿重复调用。`,
      schema: z.object({
        title: z
          .string()
          .min(2)
          .max(30)
          .describe('6-15字中文会话标题，概括用户旅行需求'),
      }),
    },
  );
}
