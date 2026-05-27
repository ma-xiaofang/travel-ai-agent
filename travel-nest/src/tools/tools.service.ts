import { Injectable, NotFoundException } from '@nestjs/common';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { RagService } from '../rag/rag.service.js';
import { SessionService } from '../session/session.service.js';
import { TavilyService } from '../tavily/tavily.service.js';
import { buildAgentTools } from './agent-tools.js';
import { createTravelTools } from './create-travel-tools.js';
import { createWebSearchTool } from './web-search.tool.js';
import { getRestToolMetadata, toolMetadata } from './index.js';

@Injectable()
export class ToolsService {
  constructor(
    private readonly sessionService: SessionService,
    private readonly ragService: RagService,
    private readonly tavilyService: TavilyService,
  ) {}

  /** 8 个旅行工具（各工具数据优先级见 toolMetadata） */
  getTravelTools(): StructuredToolInterface[] {
    return createTravelTools(this.ragService, this.tavilyService);
  }

  /** REST 可调用的工具：8 个旅行工具 + web_search */
  getRestTools(): StructuredToolInterface[] {
    return [...this.getTravelTools(), createWebSearchTool(this.tavilyService)];
  }

  /** 旅行工具 + 联网搜索 + 会话标题 Tool（供 Agent bindTools） */
  getAgentTools(sessionId: string) {
    return buildAgentTools(
      sessionId,
      this.sessionService,
      this.ragService,
      this.tavilyService,
    );
  }

  /** 按名称调用 REST 可用工具（与 Agent 共用同一 Tool 实现） */
  async invokeTool(name: string, args: Record<string, unknown>) {
    const tool = this.getRestTools().find((t) => t.name === name);
    if (!tool) {
      throw new NotFoundException(`未知工具: ${name}`);
    }
    return tool.invoke(args);
  }

  /** 全部工具元数据（含 Agent 专用） */
  getToolMetadata() {
    return toolMetadata;
  }

  /** REST 端点对应工具元数据 */
  getRestToolMetadata() {
    return getRestToolMetadata();
  }
}
