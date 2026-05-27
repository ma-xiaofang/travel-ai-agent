export { createTravelTools } from './create-travel-tools.js';

export const toolMetadata = [
  { name: 'get_weather', desc: '查询天气（Tavily → OpenWeather/mock，不走 RAG）' },
  { name: 'get_attractions', desc: '推荐景点（RAG → Tavily → mock）' },
  { name: 'generate_itinerary', desc: '生成行程（RAG → Tavily → mock）' },
  { name: 'calculate_budget', desc: '估算预算（RAG → Tavily → mock）' },
  { name: 'check_visa', desc: '查询签证（RAG → Tavily → mock）' },
  { name: 'convert_currency', desc: '货币换算（Frankfurter → Tavily → mock，不走 RAG）' },
  { name: 'generate_packing_list', desc: '打包清单（RAG → Tavily → mock）' },
  { name: 'translate_phrases', desc: '短语翻译（RAG → Tavily → mock）' },
  { name: 'web_search', desc: 'Tavily 联网搜索（Agent 主动补充实时资讯）' },
  { name: 'update_session_title', desc: '设置本会话标题（按 sessionId 动态注册）' },
];

/** 无 REST 端点、需 session 绑定的 Agent 专用工具 */
export const AGENT_ONLY_TOOL_NAMES = ['update_session_title'] as const;

/** 供 /api/tools REST 调试的工具元数据（不含 session 绑定工具） */
export function getRestToolMetadata() {
  return toolMetadata.filter(
    (t) =>
      !(AGENT_ONLY_TOOL_NAMES as readonly string[]).includes(t.name),
  );
}
