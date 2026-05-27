import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { RagService } from '../rag/rag.service.js';
import type { TavilyService } from '../tavily/tavily.service.js';
import { resolveTravelData } from './helpers/data-source.helper.js';
import { buildAttractionsMock } from './mock/index.js';

export function createAttractionsTool(rag: RagService, tavily: TavilyService) {
  return tool(
    async ({
      city,
      interests,
      limit = 5,
    }: {
      city: string;
      interests?: string[];
      limit?: number;
    }) => {
      const interestQuery =
        interests && interests.length > 0 ? interests.join(' ') : '';
      const { content } = await resolveTravelData(
        { rag, tavily },
        {
          query: `${city} 必去景点 门票 攻略 ${interestQuery}`,
          ragQuery: `${city} 景点 攻略 门票 ${interestQuery}`,
          title: `🏛️ **${city}景点推荐**`,
          topK: 4,
          mock: () => buildAttractionsMock(city, interests, limit),
        },
      );
      return content;
    },
    {
      name: 'get_attractions',
      description:
        '查询目的地热门景点。数据优先级：知识库 → 联网搜索 → 内置参考。用户询问景点时调用。',
      schema: z.object({
        city: z.string().describe('目的地城市'),
        interests: z
          .array(z.string())
          .optional()
          .describe('兴趣偏好，如：["文化","美食","购物"]'),
        limit: z.number().optional().describe('返回数量，默认5个'),
      }),
    },
  );
}
