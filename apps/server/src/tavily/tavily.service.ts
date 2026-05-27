import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TavilySearch,
  type SearchDepth,
  type TimeRange,
  type TopicType,
} from '@langchain/tavily';
import type { TavilySearchResponse } from '@langchain/tavily';

export type WebSearchParams = {
  query: string;
  topic?: TopicType;
  timeRange?: TimeRange;
  searchDepth?: SearchDepth;
};

@Injectable()
export class TavilyService {
  private readonly logger = new Logger(TavilyService.name);
  private readonly searchTool: TavilySearch | null;
  readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('TAVILY_API_KEY', '').trim();
    const placeholder = /^tvly-your-tavily-key$/i;

    if (apiKey && !placeholder.test(apiKey)) {
      this.searchTool = new TavilySearch({
        tavilyApiKey: apiKey,
        maxResults: parseInt(
          this.config.get<string>('TAVILY_MAX_RESULTS', '5'),
          10,
        ),
        includeAnswer: true,
        searchDepth: this.config.get<SearchDepth>(
          'TAVILY_SEARCH_DEPTH',
          'basic',
        ),
        topic: 'general',
      });
      this.enabled = true;
      this.logger.log('Tavily 联网搜索已启用');
    } else {
      this.searchTool = null;
      this.enabled = false;
      this.logger.warn('未配置 TAVILY_API_KEY，联网搜索不可用');
    }
  }

  /** 原始 Tavily 响应；未配置、失败或无结果时返回 null */
  async searchRaw(
    params: WebSearchParams,
  ): Promise<TavilySearchResponse | null> {
    if (!this.searchTool) return null;

    try {
      const raw = await this.searchTool.invoke({
        query: params.query,
        topic: params.topic,
        timeRange: params.timeRange,
        searchDepth: params.searchDepth,
      });
      if ('error' in raw) return null;
      if (!raw.answer && (!raw.results || raw.results.length === 0)) {
        return null;
      }
      return raw;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Tavily search failed: ${message}`);
      return null;
    }
  }

  /** 供各旅行 Tool 使用的 Tavily 内容（无外层标题） */
  async searchForTool(params: WebSearchParams): Promise<string | null> {
    const raw = await this.searchRaw(params);
    if (!raw) return null;
    return this.formatToolContent(raw);
  }

  /** web_search Tool / REST 调试接口 */
  async search(params: WebSearchParams): Promise<string> {
    if (!this.searchTool) {
      return '联网搜索未配置：请在 .env 中设置有效的 TAVILY_API_KEY。';
    }

    const raw = await this.searchRaw(params);
    if (!raw) {
      return '联网搜索未找到相关结果，请尝试调整关键词。';
    }
    return this.formatResponse(raw);
  }

  private formatToolContent(raw: TavilySearchResponse): string {
    const lines: string[] = [];

    if (raw.answer) {
      lines.push(`**摘要：** ${raw.answer}`, '');
    }

    if (raw.results?.length) {
      lines.push('**参考来源：**');
      raw.results.forEach((item, index) => {
        lines.push(`${index + 1}. **${item.title}**`);
        lines.push(`   ${item.content}`);
        lines.push(`   🔗 ${item.url}`, '');
      });
    }

    return lines.join('\n');
  }

  private formatResponse(raw: TavilySearchResponse): string {
    const lines: string[] = ['🔍 **联网搜索结果**', ''];
    lines.push(this.formatToolContent(raw));
    lines.push('> 信息来自实时网络搜索，出行前请二次核实。');
    return lines.join('\n');
  }
}
