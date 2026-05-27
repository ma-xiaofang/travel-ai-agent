import type { StructuredToolInterface } from '@langchain/core/tools';
import type { RagService } from '../rag/rag.service.js';
import type { SessionService } from '../session/session.service.js';
import type { TavilyService } from '../tavily/tavily.service.js';
import { createTravelTools } from './create-travel-tools.js';
import { createUpdateSessionTitleTool } from './session-title.tool.js';
import { createWebSearchTool } from './web-search.tool.js';

/** 上下文相关 Tool 元数据（按 sessionId 动态注册） */
export const contextToolMetadata = [
  {
    name: 'update_session_title',
    desc: '根据用户旅行需求设置本会话标题（历史列表展示）',
  },
];

/**
 * 组装单次请求可用的全部 Tool：
 * 8 个旅行工具（RAG → Tavily → mock）+ 联网搜索 + 会话标题 Tool
 */
export function buildAgentTools(
  sessionId: string,
  sessionService: SessionService,
  ragService: RagService,
  tavilyService: TavilyService,
): StructuredToolInterface[] {
  return [
    ...createTravelTools(ragService, tavilyService),
    createWebSearchTool(tavilyService),
    createUpdateSessionTitleTool(sessionId, sessionService),
  ];
}
