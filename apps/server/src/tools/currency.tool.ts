import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { TavilyService } from '../tavily/tavily.service.js';
import { resolveTravelData } from './helpers/data-source.helper.js';
import { fetchLiveExchangeRate } from './helpers/exchange-rate.helper.js';
import { buildCurrencyMock } from './mock/index.js';

export function createCurrencyTool(tavily: TavilyService) {
  return tool(
    async ({
      amount,
      from_currency,
      to_currency = 'CNY',
    }: {
      amount: number;
      from_currency: string;
      to_currency?: string;
    }) => {
      const { content } = await resolveTravelData(
        { tavily },
        {
          query: `${from_currency} 兑 ${to_currency} 汇率 ${amount} 消费参考`,
          skipRag: true,
          liveFirst: true,
          tavily: { topic: 'finance' },
          live: () =>
            fetchLiveExchangeRate(amount, from_currency, to_currency),
          mock: () => buildCurrencyMock(amount, from_currency),
        },
      );
      return content;
    },
    {
      name: 'convert_currency',
      description:
        '货币换算与消费参考。数据优先级：Frankfurter 实时汇率 → 联网搜索 → 内置参考（不走知识库）。用户询问汇率、换钱时调用。',
      schema: z.object({
        amount: z.number().describe('金额'),
        from_currency: z
          .string()
          .describe('原始货币，如：日元、美元、欧元、泰铢'),
        to_currency: z.string().optional().describe('目标货币，默认人民币'),
      }),
    },
  );
}
