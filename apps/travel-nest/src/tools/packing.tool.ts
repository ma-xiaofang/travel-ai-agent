import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { RagService } from '../rag/rag.service.js';
import type { TavilyService } from '../tavily/tavily.service.js';
import { resolveTravelData } from './helpers/data-source.helper.js';
import { buildPackingMock } from './mock/index.js';

export function createPackingTool(rag: RagService, tavily: TavilyService) {
  return tool(
    async ({
      destination,
      days,
      season,
      activities = [],
    }: {
      destination: string;
      days: number;
      season: string;
      activities?: string[];
    }) => {
      const activityQuery =
        activities && activities.length > 0 ? activities.join(' ') : '';
      const { content } = await resolveTravelData(
        { rag, tavily },
        {
          query: `${destination} ${days}天 ${season} 旅行 打包清单 行李 ${activityQuery}`,
          ragQuery: `${destination} ${days}天 ${season} 打包 行李 清单 ${activityQuery}`,
          title: `🎒 **${destination}打包清单**`,
          mock: () => buildPackingMock(destination, days, season, activities),
        },
      );
      return content;
    },
    {
      name: 'generate_packing_list',
      description:
        '生成旅行打包清单。数据优先级：知识库 → 联网搜索 → 内置参考。用户询问带什么行李时调用。',
      schema: z.object({
        destination: z.string().describe('目的地'),
        days: z.number().describe('旅行天数'),
        season: z.string().describe('季节：夏/冬/春/秋，或描述气候'),
        activities: z
          .array(z.string())
          .optional()
          .describe('活动类型：海滩/徒步/购物/文化参观等'),
      }),
    },
  );
}
