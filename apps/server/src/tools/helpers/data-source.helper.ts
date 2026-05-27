import type { RagService } from '../../rag/rag.service.js';
import type { TavilyService, WebSearchParams } from '../../tavily/tavily.service.js';
import { fetchKnowledgeContext } from './rag-context.helper.js';

export type DataSource = 'rag' | 'tavily' | 'api' | 'mock';

export type TravelDataContext = {
  rag?: RagService;
  tavily: TavilyService;
};

export type ResolveTravelDataOptions = {
  query: string;
  ragQuery?: string;
  topK?: number;
  /** 为 true 时跳过 RAG */
  skipRag?: boolean;
  /** 为 true 时 live 优先于 Tavily（如汇率工具：Frankfurter → Tavily → mock） */
  liveFirst?: boolean;
  tavily?: Omit<WebSearchParams, 'query'>;
  /** 实时 API，返回 null 则继续下一优先级 */
  live?: () => string | Promise<string | null>;
  title?: string;
  mock: () => string | Promise<string>;
};

const SOURCE_LABEL: Record<DataSource, string> = {
  rag: '📚 知识库',
  tavily: '🌐 联网搜索',
  api: '📡 实时汇率',
  mock: '📋 内置参考数据',
};

function formatRagAnswer(title: string | undefined, knowledge: string): string {
  if (title) {
    return `${title}\n\n${knowledge}`;
  }
  return knowledge;
}

function appendSourceFooter(content: string, source: DataSource): string {
  return `${content}\n\n> 数据来源：${SOURCE_LABEL[source]}，出行前请二次核实。`;
}

async function tryLive(
  options: ResolveTravelDataOptions,
): Promise<{ content: string; source: DataSource } | null> {
  if (!options.live) return null;
  const liveContent = await options.live();
  if (!liveContent) return null;
  const body = options.title
    ? `${options.title}\n\n${liveContent}`
    : liveContent;
  return { content: appendSourceFooter(body, 'api'), source: 'api' };
}

async function tryTavily(
  ctx: TravelDataContext,
  options: ResolveTravelDataOptions,
): Promise<{ content: string; source: DataSource } | null> {
  const tavilyContent = await ctx.tavily.searchForTool({
    query: options.query,
    ...options.tavily,
  });
  if (!tavilyContent) return null;
  const body = options.title
    ? `${options.title}\n\n${tavilyContent}`
    : tavilyContent;
  return { content: appendSourceFooter(body, 'tavily'), source: 'tavily' };
}

/** 按 RAG → Tavily/live(可选顺序) → mock 优先级解析旅行数据 */
export async function resolveTravelData(
  ctx: TravelDataContext,
  options: ResolveTravelDataOptions,
): Promise<{ content: string; source: DataSource }> {
  if (!options.skipRag && ctx.rag) {
    const ragQuery = options.ragQuery ?? options.query;
    const knowledge = await fetchKnowledgeContext(
      ctx.rag,
      ragQuery,
      options.topK ?? 3,
    );
    if (knowledge) {
      return {
        content: appendSourceFooter(
          formatRagAnswer(options.title, knowledge),
          'rag',
        ),
        source: 'rag',
      };
    }
  }

  const steps = options.liveFirst
    ? [
        () => tryLive(options),
        () => tryTavily(ctx, options),
      ]
    : [
        () => tryTavily(ctx, options),
        () => tryLive(options),
      ];

  for (const step of steps) {
    const result = await step();
    if (result) return result;
  }

  const mockContent = await options.mock();
  return {
    content: appendSourceFooter(mockContent, 'mock'),
    source: 'mock',
  };
}
