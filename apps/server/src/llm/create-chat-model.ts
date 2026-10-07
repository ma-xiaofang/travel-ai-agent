import { ChatOpenAI } from '@langchain/openai';

/**
 * 创建 DeepSeek 聊天模型实例（OpenAI 兼容 API）
 *
 * @param temperature 采样温度，缺省读 env.CHAT_TEMPERATURE
 * @param streaming 是否流式
 * @param maxTokens 最大输出 token 数，默认 2048；结构化输出等长文本场景可调大
 * @param modelKwargs 透传给接口的额外参数（如 `{ thinking: { type: 'disabled' } }` 关闭思考模式）
 */
export function createChatModel(
  temperature?: number,
  streaming = false,
  maxTokens = 2048,
  modelKwargs?: Record<string, unknown>,
) {
  const defaultTemperature = parseFloat(process.env.CHAT_TEMPERATURE || '0.7');

  return new ChatOpenAI({
    model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    configuration: {
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    },
    temperature: temperature ?? defaultTemperature,
    streaming,
    maxTokens,
    ...(modelKwargs ? { modelKwargs } : {}),
  });
}
