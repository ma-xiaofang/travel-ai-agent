import { createChatModel } from '../../llm/create-chat-model.js';

export async function buildItineraryMock(
  destination: string,
  days: number,
  style: string,
  budget_level: string,
  interests: string[],
): Promise<string> {
  const interestStr =
    interests.length > 0 ? `，偏好：${interests.join('、')}` : '';
  const llm = createChatModel(0.7);
  const resp = await llm.invoke(
    `你是专业旅行规划师，请为以下旅行生成详细行程：
目的地：${destination}，天数：${days}天，风格：${style}，预算：${budget_level}${interestStr}

每天包含：上午安排（9-12点）、午餐推荐、下午安排（13-17点）、晚餐、晚上活动、交通方式、当日预算。
格式清晰易读，用emoji增加可读性。`,
  );
  return `📅 **${destination} ${days}天${style}行程规划**

${resp.content}`;
}
