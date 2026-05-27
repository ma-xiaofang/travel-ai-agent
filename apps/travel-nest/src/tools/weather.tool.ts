import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { TavilyService } from '../tavily/tavily.service.js';
import { resolveTravelData } from './helpers/data-source.helper.js';
import { buildWeatherMock } from './mock/index.js';

export function createWeatherTool(tavily: TavilyService) {
  return tool(
    async ({ city }: { city: string }) => {
      const { content } = await resolveTravelData(
        { tavily },
        {
          query: `${city} 实时天气 温度 湿度 穿衣建议`,
          title: `🌤️ **${city}天气**`,
          skipRag: true,
          mock: () => buildWeatherMock(city),
        },
      );
      return content;
    },
    {
      name: 'get_weather',
      description:
        '查询指定城市的实时天气与穿衣建议。数据优先级：联网搜索 → OpenWeather/内置参考（不走知识库）。用户询问目的地天气时调用。',
      schema: z.object({
        city: z.string().describe('城市或省份，如：郑州、河南、巴黎、北京'),
      }),
    },
  );
}
