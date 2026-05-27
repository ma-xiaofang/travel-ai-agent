import type { StructuredToolInterface } from '@langchain/core/tools';
import type { RagService } from '../rag/rag.service.js';
import type { TavilyService } from '../tavily/tavily.service.js';
import { createWeatherTool } from './weather.tool.js';
import { createAttractionsTool } from './attractions.tool.js';
import { createItineraryTool } from './itinerary.tool.js';
import { createBudgetTool } from './budget.tool.js';
import { createVisaTool } from './visa.tool.js';
import { createCurrencyTool } from './currency.tool.js';
import { createPackingTool } from './packing.tool.js';
import { createTranslatorTool } from './translator.tool.js';

/** 创建 8 个旅行工具（数据优先级：RAG → Tavily → mock） */
export function createTravelTools(
  rag: RagService,
  tavily: TavilyService,
): StructuredToolInterface[] {
  return [
    createWeatherTool(tavily),
    createAttractionsTool(rag, tavily),
    createItineraryTool(rag, tavily),
    createBudgetTool(rag, tavily),
    createVisaTool(rag, tavily),
    createCurrencyTool(tavily),
    createPackingTool(rag, tavily),
    createTranslatorTool(rag, tavily),
  ];
}
