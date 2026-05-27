import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { RagService } from '../rag/rag.service.js';
import type { TavilyService } from '../tavily/tavily.service.js';
import { resolveTravelData } from './helpers/data-source.helper.js';
import { buildVisaMock } from './mock/index.js';

export function createVisaTool(rag: RagService, tavily: TavilyService) {
  return tool(
    async ({ destination }: { destination: string }) => {
      const { content } = await resolveTravelData(
        { rag, tavily },
        {
          query: `${destination} 中国公民 签证 入境政策 材料 2025`,
          ragQuery: `${destination} 签证 入境 材料 要求`,
          title: `📋 **${destination}签证信息**`,
          topK: 4,
          tavily: { topic: 'news', timeRange: 'month' },
          mock: () => buildVisaMock(destination),
        },
      );
      return content;
    },
    {
      name: 'check_visa',
      description:
        '查询目的地签证要求。数据优先级：知识库 → 联网搜索 → 内置参考。用户询问签证时调用。',
      schema: z.object({
        destination: z.string().describe('目的地国家，如：日本、泰国、法国'),
      }),
    },
  );
}
