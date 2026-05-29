import type { RagService } from '../../rag/rag.service.js';
import type { TavilyService, WebSearchParams } from '../../tavily/tavily.service.js';
import { fetchKnowledgeContext } from './rag-context.helper.js';

/** 数据来源类型：知识库 / 联网搜索 / 实时 API / 内置参考数据 */
export type DataSource = 'rag' | 'tavily' | 'api' | 'mock';

/** 旅行数据上下文：注入各数据源所需的依赖服务 */
export type TravelDataContext = {
  /** RAG 知识库服务，可选；缺省时跳过知识库检索 */
  rag?: RagService;
  /** Tavily 联网搜索服务 */
  tavily: TavilyService;
};

/** {@link resolveTravelData} 的解析选项 */
export type ResolveTravelDataOptions = {
  /** 主查询语句（用于 Tavily 搜索，默认也用于 RAG） */
  query: string;
  /** 专用于 RAG 检索的查询语句；缺省时回退使用 query */
  ragQuery?: string;
  /** RAG 检索返回的片段数量，默认 3 */
  topK?: number;
  /** 为 true 时跳过 RAG */
  skipRag?: boolean;
  /** 为 true 时 live 优先于 Tavily（如汇率工具：Frankfurter → Tavily → mock） */
  liveFirst?: boolean;
  /** 透传给 Tavily 的额外搜索参数（query 由本函数提供） */
  tavily?: Omit<WebSearchParams, 'query'>;
  /** 实时 API，返回 null 则继续下一优先级 */
  live?: () => string | Promise<string | null>;
  /** 内容标题；存在时拼接在正文前面 */
  title?: string;
  /** 兜底数据生成函数，前序数据源全部失败时调用 */
  mock: () => string | Promise<string>;
};

/** 数据来源 → 展示标签映射，用于在结果尾部标注来源 */
const SOURCE_LABEL: Record<DataSource, string> = {
  rag: '📚 知识库',
  tavily: '🌐 联网搜索',
  api: '📡 实时汇率',
  mock: '📋 内置参考数据',
};

/**
 * 拼装 RAG 检索结果：若提供标题则置于知识内容前。
 *
 * @param title 可选标题
 * @param knowledge 知识库检索得到的内容
 * @returns 组合后的正文
 */
function formatRagAnswer(title: string | undefined, knowledge: string): string {
  if (title) {
    return `${title}\n\n${knowledge}`;
  }
  return knowledge;
}

/**
 * 在内容尾部追加数据来源声明与二次核实提示。
 *
 * @param content 正文内容
 * @param source 数据来源
 * @returns 追加来源脚注后的完整文本
 */
function appendSourceFooter(content: string, source: DataSource): string {
  return `${content}\n\n> 数据来源：${SOURCE_LABEL[source]}，出行前请二次核实。`;
}

/**
 * 尝试实时 API 数据源。
 *
 * 未配置 live 或其返回 null（无数据）时返回 null，交由上层继续下一优先级。
 *
 * @returns 命中时返回带来源标记的内容，否则返回 null
 */
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

/**
 * 尝试 Tavily 联网搜索数据源。
 *
 * 搜索无结果时返回 null，交由上层继续下一优先级。
 *
 * @returns 命中时返回带来源标记的内容，否则返回 null
 */
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

/**
 * 按多级回退策略解析旅行数据，是所有旅行工具的统一数据入口。
 *
 * 优先级：**RAG 知识库 → Tavily 联网搜索 / 实时 API（顺序可调） → mock 兜底**。
 * - RAG：未跳过且已注入 rag 服务时优先检索，命中即返回
 * - Tavily 与 live 的先后由 {@link ResolveTravelDataOptions.liveFirst} 决定
 *   （如汇率工具偏好实时 API 在前）
 * - 前序全部落空时调用 mock 生成内置参考数据，保证始终有返回
 *
 * @param ctx 数据上下文（rag / tavily 服务）
 * @param options 解析选项
 * @returns 解析得到的内容及其实际数据来源
 */
export async function resolveTravelData(
  ctx: TravelDataContext,
  options: ResolveTravelDataOptions,
): Promise<{ content: string; source: DataSource }> {
  // 第一优先级：RAG 知识库
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

  // 第二优先级：Tavily 与 live，按 liveFirst 决定先后顺序
  const steps = options.liveFirst
    ? [
        () => tryLive(options),
        () => tryTavily(ctx, options),
      ]
    : [
        () => tryTavily(ctx, options),
        () => tryLive(options),
      ];

  // 依次尝试，命中即返回
  for (const step of steps) {
    const result = await step();
    if (result) return result;
  }

  // 兜底：内置参考数据，确保始终有结果返回
  const mockContent = await options.mock();
  return {
    content: appendSourceFooter(mockContent, 'mock'),
    source: 'mock',
  };
}
