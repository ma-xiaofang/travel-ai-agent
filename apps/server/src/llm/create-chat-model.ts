import { ChatOpenAI } from '@langchain/openai';

/** 创建 DeepSeek 聊天模型实例（OpenAI 兼容 API） */
export function createChatModel(temperature?: number, streaming = false) {
  const defaultTemperature = parseFloat(process.env.CHAT_TEMPERATURE || '0.7');

  return new ChatOpenAI({
    model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    configuration: {
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    },
    temperature: temperature ?? defaultTemperature,
    streaming,
    maxTokens: 2048,
  });
}
