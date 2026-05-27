import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { RagService } from '../rag/rag.service.js';
import type { TavilyService } from '../tavily/tavily.service.js';
import { resolveTravelData } from './helpers/data-source.helper.js';
import { buildTranslatorMock, resolveLanguage } from './mock/index.js';

export function createTranslatorTool(rag: RagService, tavily: TavilyService) {
  return tool(
    async ({
      text,
      target_language,
      destination,
    }: {
      text?: string;
      target_language?: string;
      destination?: string;
    }) => {
      const language = resolveLanguage(target_language, destination);
      const { content } = await resolveTravelData(
        { rag, tavily },
        {
          query: `${destination ?? ''} ${language} 旅行 常用语 短语 ${text ?? ''}`.trim(),
          ragQuery: `${destination ?? ''} ${language} 旅行 常用语 短语`,
          title: `🗣️ **${language}旅行用语**`,
          mock: () => buildTranslatorMock(text, language),
        },
      );
      return content;
    },
    {
      name: 'translate_phrases',
      description:
        '提供旅行常用短语翻译。数据优先级：知识库 → 联网搜索 → 内置参考。用户询问怎么说某句话、当地语言时调用。',
      schema: z.object({
        text: z.string().optional().describe('要翻译的中文'),
        target_language: z
          .string()
          .optional()
          .describe('目标语言：日语/泰语/韩语/法语/英语'),
        destination: z
          .string()
          .optional()
          .describe('目的地（可从目的地推断语言）'),
      }),
    },
  );
}
