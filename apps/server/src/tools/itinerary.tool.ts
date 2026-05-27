import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { RagService } from '../rag/rag.service.js';
import type { TavilyService } from '../tavily/tavily.service.js';
import { resolveTravelData } from './helpers/data-source.helper.js';
import { buildItineraryMock } from './mock/index.js';

export function createItineraryTool(rag: RagService, tavily: TavilyService) {
  return tool(
    async ({
      destination,
      days,
      style = '平衡',
      budget_level = '中等',
      interests = [],
    }: {
      destination: string;
      days: number;
      style?: string;
      budget_level?: string;
      interests?: string[];
    }) => {
      const interestStr =
        interests.length > 0 ? `，偏好：${interests.join('、')}` : '';
      const { content } = await resolveTravelData(
        { rag, tavily },
        {
          query: `${destination} ${days}天 ${style} 旅行行程 路线 攻略${interestStr}`,
          ragQuery: `${destination} ${days}天 行程 路线 ${style} ${interestStr}`,
          title: `📅 **${destination} ${days}天行程**`,
          topK: 4,
          mock: () =>
            buildItineraryMock(
              destination,
              days,
              style,
              budget_level,
              interests,
            ),
        },
      );
      return content;
    },
    {
      name: 'generate_itinerary',
      description:
        '生成逐日旅行行程。数据优先级：知识库 → 联网搜索 → 内置参考（LLM 生成）。用户要求规划行程时调用。',
      schema: z.object({
        destination: z.string().describe('目的地，如：河南、巴黎、巴厘岛'),
        days: z.number().describe('旅行天数'),
        style: z
          .string()
          .optional()
          .describe('旅行风格：慢节奏/深度/美食/文化/购物，默认平衡'),
        budget_level: z
          .string()
          .optional()
          .describe('预算档次：经济/中等/豪华，默认中等'),
        interests: z.array(z.string()).optional().describe('兴趣偏好列表'),
      }),
    },
  );
}
