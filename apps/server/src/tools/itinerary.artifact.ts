import { z } from 'zod';
import { createChatModel } from '../llm/create-chat-model.js';

/** 行程时段枚举 */
export const ITINERARY_PERIODS = ['上午', '午餐', '下午', '晚餐', '晚上'] as const;

/** 单条行程安排 */
export const itineraryItemSchema = z.object({
  period: z.enum(ITINERARY_PERIODS).describe('时段'),
  title: z.string().describe('安排标题，如「少林寺 + 塔林」'),
  detail: z.string().optional().describe('具体玩法、看点或避坑提醒'),
  transport: z.string().optional().describe('前往方式 / 交通'),
  budget: z.string().optional().describe('该段花费参考，如「门票 80 元」'),
});

/** 单日行程 */
export const itineraryDaySchema = z.object({
  day: z.number().describe('第几天，从 1 开始'),
  theme: z.string().optional().describe('当日主题，如「老城人文漫步」'),
  items: z.array(itineraryItemSchema).describe('按时间顺序的当日安排'),
  dailyBudget: z.string().optional().describe('当日预算参考'),
});

/** 行程结构化结果（Agent artifact） */
export const itineraryArtifactSchema = z.object({
  destination: z.string().describe('目的地'),
  days: z.number().describe('行程天数'),
  style: z.string().optional().describe('旅行风格'),
  budgetLevel: z.string().optional().describe('预算档次'),
  summary: z.string().optional().describe('一句话行程概览'),
  plan: z.array(itineraryDaySchema).describe('逐日行程'),
  source: z.string().optional().describe('数据来源标记'),
});

export type ItineraryArtifact = z.infer<typeof itineraryArtifactSchema>;

/** {@link buildItineraryArtifact} 入参 */
export type BuildItineraryArtifactParams = {
  destination: string;
  days: number;
  style?: string;
  budgetLevel?: string;
  /** 数据来源（rag / tavily / api / mock），写入 artifact 便于前端标注 */
  source: string;
  /** resolveTravelData 产出的 Markdown 行程正文 */
  content: string;
};

/**
 * 把行程 Markdown 正文整理为结构化 artifact。
 *
 * 供 `generate_itinerary` 工具以 `content_and_artifact` 方式返回：
 * Markdown 继续作为 ToolMessage 内容喂给模型，结构化结果单独作为 artifact 下发前端。
 *
 * 约定：**任何异常都必须降级为 null，绝不能让工具抛错**，
 * 前端在 artifact 为 null 时回退为纯 Markdown 渲染。
 *
 * @param params 行程参数与已生成的 Markdown 正文
 * @returns 结构化行程；整理失败时返回 null
 */
export async function buildItineraryArtifact(
  params: BuildItineraryArtifactParams,
): Promise<ItineraryArtifact | null> {
  const { destination, days, style, budgetLevel, source, content } = params;
  if (!content?.trim()) return null;

  try {
    // 结构化是机械抽取任务，关闭思考模式：
    // DeepSeek 思考模式的推理 token 计入输出预算（实测一次抽取推理可达 2800+ token），
    // 会把 JSON 正文挤掉导致截断/空串；关闭后推理为 0，耗时从 ~19s 降到 ~2s。
    const llm = createChatModel(0.2, false, 4096, {
      thinking: { type: 'disabled' },
    });
    // DeepSeek 思考模式不支持强制 tool_choice（functionCalling 会报 400），
    // 且不支持 OpenAI 的 json_schema 模式，故用 jsonMode + 显式 JSON 模板约束。
    const structurer = llm.withStructuredOutput(itineraryArtifactSchema, {
      name: 'itinerary',
      method: 'jsonMode',
    });

    const result = await structurer.invoke(
      `你是旅行行程结构化助手。请把下面的行程资料整理成结构化 json。

只输出 json，不要任何解释文字。json 结构必须严格如下：
{
  "destination": "目的地字符串",
  "days": 1,
  "summary": "一句话行程概览",
  "plan": [
    {
      "day": 1,
      "theme": "当日主题",
      "items": [
        { "period": "上午", "title": "安排标题", "detail": "40字以内的玩法或看点", "transport": "前往方式", "budget": "门票 90 元" }
      ],
      "dailyBudget": "约 200 元"
    }
  ]
}

规则：
1. period 只能取：上午 / 午餐 / 下午 / 晚餐 / 晚上
2. day 从 1 开始连续编号，共 ${days} 天
3. 严格按资料内容抽取，不要编造资料中没有的景点或价格
4. 资料若已是逐日行程，按「天 → 时段」拆分；若只是攻略片段，概括为合理的逐日安排
5. detail 精简到 40 字以内，没有信息就省略该字段

目的地：${destination}
天数：${days} 天
风格：${style ?? '平衡'}
预算档次：${budgetLevel ?? '中等'}

行程资料：
${content}`,
    );

    // 基本完整性校验：必须解析出至少一天的安排
    if (!result?.plan?.length) return null;

    // 用调用方已知的参数覆盖模型输出，保证与工具入参一致
    return {
      ...result,
      destination,
      days,
      style,
      budgetLevel,
      source,
    };
  } catch {
    // 结构化失败（模型不支持 / 超时 / 输出超限等）一律降级
    return null;
  }
}