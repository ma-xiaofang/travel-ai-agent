import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { RagService } from '../rag/rag.service.js';
import type { TavilyService } from '../tavily/tavily.service.js';
import { resolveTravelData } from './helpers/data-source.helper.js';
import { buildBudgetMock } from './mock/index.js';

export function createBudgetTool(rag: RagService, tavily: TavilyService) {
  return tool(
    async ({
      destination,
      days,
      people = 1,
      budget_level = '中等',
      include_flight = false,
    }: {
      destination: string;
      days: number;
      people?: number;
      budget_level?: string;
      include_flight?: boolean;
    }) => {
      const { content } = await resolveTravelData(
        { rag, tavily },
        {
          query: `${destination} ${days}天 ${budget_level} 旅行预算 花费 人均`,
          ragQuery: `${destination} ${days}天 ${budget_level} 旅行预算 花费`,
          title: `💰 **${destination} ${days}天预算参考**`,
          topK: 4,
          mock: () =>
            buildBudgetMock(
              destination,
              days,
              people,
              budget_level,
              include_flight,
            ),
        },
      );
      return content;
    },
    {
      name: 'calculate_budget',
      description:
        '估算旅行总费用。数据优先级：知识库 → 联网搜索 → 内置参考。用户询问旅行花费时调用。',
      schema: z.object({
        destination: z.string().describe('目的地'),
        days: z.number().describe('旅行天数'),
        people: z.number().optional().describe('出行人数，默认1人'),
        budget_level: z.string().optional().describe('预算档次：经济/中等/豪华'),
        include_flight: z.boolean().optional().describe('是否包含机票估算'),
      }),
    },
  );
}
