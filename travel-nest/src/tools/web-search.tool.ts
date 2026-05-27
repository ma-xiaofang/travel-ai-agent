import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { TavilyService } from '../tavily/tavily.service.js';

/** 创建 Tavily 联网搜索 Tool（供 Agent 查询实时旅行资讯） */
export function createWebSearchTool(tavily: TavilyService) {
  return tool(
    async ({
      query,
      topic,
      timeRange,
    }: {
      query: string;
      topic?: 'general' | 'news' | 'finance';
      timeRange?: 'day' | 'week' | 'month' | 'year';
    }) => {
      return tavily.search({ query, topic, timeRange });
    },
    {
      name: 'web_search',
      description:
        '通过 Tavily 联网搜索实时旅行资讯，适用于：最新签证政策、航班/交通变动、景点开放时间、当地活动、汇率与消费、安全提示等。知识库或 mock 数据可能过时时优先调用。查询请用中文或英文自然语言。',
      schema: z.object({
        query: z
          .string()
          .describe('搜索关键词或问题，如「2025年泰国对中国免签政策」'),
        topic: z
          .enum(['general', 'news', 'finance'])
          .optional()
          .describe('搜索类型：general 综合，news 新闻，finance 财经'),
        timeRange: z
          .enum(['day', 'week', 'month', 'year'])
          .optional()
          .describe('时间范围：day 近一天，week 近一周，month 近一月'),
      }),
    },
  );
}
