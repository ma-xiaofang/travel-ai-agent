import type { DailyCostBreakdown } from './types.js';

export const DAILY_COSTS: Record<
  string,
  Record<string, DailyCostBreakdown>
> = {
  河南: {
    economy: { accommodation: 150, food: 80, transport: 40, activities: 60 },
    mid: { accommodation: 350, food: 150, transport: 80, activities: 120 },
    luxury: { accommodation: 900, food: 400, transport: 150, activities: 350 },
  },
  郑州: {
    economy: { accommodation: 160, food: 85, transport: 45, activities: 65 },
    mid: { accommodation: 380, food: 160, transport: 85, activities: 130 },
    luxury: { accommodation: 950, food: 420, transport: 160, activities: 380 },
  },
  洛阳: {
    economy: { accommodation: 140, food: 75, transport: 35, activities: 70 },
    mid: { accommodation: 320, food: 140, transport: 70, activities: 140 },
    luxury: { accommodation: 850, food: 380, transport: 140, activities: 400 },
  },
  开封: {
    economy: { accommodation: 130, food: 70, transport: 30, activities: 65 },
    mid: { accommodation: 300, food: 130, transport: 65, activities: 125 },
    luxury: { accommodation: 800, food: 360, transport: 130, activities: 360 },
  },
  巴黎: {
    economy: { accommodation: 400, food: 150, transport: 80, activities: 120 },
    mid: { accommodation: 900, food: 350, transport: 150, activities: 300 },
    luxury: { accommodation: 2500, food: 800, transport: 300, activities: 600 },
  },
  曼谷: {
    economy: { accommodation: 150, food: 60, transport: 30, activities: 50 },
    mid: { accommodation: 400, food: 150, transport: 80, activities: 150 },
    luxury: { accommodation: 1200, food: 400, transport: 200, activities: 400 },
  },
  巴厘岛: {
    economy: { accommodation: 200, food: 80, transport: 60, activities: 100 },
    mid: { accommodation: 500, food: 200, transport: 150, activities: 250 },
    luxury: { accommodation: 1500, food: 500, transport: 300, activities: 600 },
  },
  默认: {
    economy: { accommodation: 300, food: 100, transport: 50, activities: 80 },
    mid: { accommodation: 600, food: 250, transport: 120, activities: 200 },
    luxury: { accommodation: 1800, food: 600, transport: 250, activities: 500 },
  },
};

export const LEVEL_MAP: Record<string, string> = {
  经济: 'economy',
  节省: 'economy',
  便宜: 'economy',
  中等: 'mid',
  适中: 'mid',
  普通: 'mid',
  豪华: 'luxury',
  高端: 'luxury',
  奢华: 'luxury',
};

export const FLIGHT_EST: Record<string, number> = {
  河南: 800,
  郑州: 800,
  洛阳: 800,
  开封: 800,
  大阪: 3000,
  首尔: 2500,
  巴黎: 8000,
  伦敦: 8000,
  罗马: 8000,
  曼谷: 2000,
  巴厘岛: 2500,
  新加坡: 2500,
  纽约: 10000,
  悉尼: 6000,
};

export function buildBudgetMock(
  destination: string,
  days: number,
  people: number,
  budget_level: string,
  include_flight: boolean,
): string {
  const levelKey = LEVEL_MAP[budget_level] || 'mid';
  const cityKey =
    Object.keys(DAILY_COSTS).find(
      (k) => destination.includes(k) || k.includes(destination),
    ) || '默认';
  const costs = DAILY_COSTS[cityKey][levelKey];
  const dailyTotal = Object.values(costs).reduce((s, v) => s + v, 0);
  const totalBase = dailyTotal * days * people;
  const shopping = Math.round(totalBase * 0.15);
  const misc = Math.round(totalBase * 0.1);
  const subtotal = totalBase + shopping + misc;
  const emergency = Math.round(subtotal * 0.1);
  const grandTotal = subtotal + emergency;

  let flightText = '';
  if (include_flight) {
    const flightKey = Object.keys(FLIGHT_EST).find((k) =>
      destination.includes(k),
    );
    const flightCost = flightKey ? FLIGHT_EST[flightKey] : 5000;
    flightText = `✈️ 机票（往返估算）：¥${(flightCost * people).toLocaleString()}（${people}人）\n`;
  }

  return `💰 **${destination} ${days}天预算（${budget_level}档·${people}人）**

**每日明细：**
🏨 住宿：¥${(costs.accommodation * people).toLocaleString()}/晚
🍜 餐饮：¥${(costs.food * people).toLocaleString()}/天
🚌 交通：¥${(costs.transport * people).toLocaleString()}/天
🎫 景点：¥${(costs.activities * people).toLocaleString()}/天

**${days}天总费用：**
${flightText}📋 基础花费：¥${totalBase.toLocaleString()}
🛍️ 购物纪念品：¥${shopping.toLocaleString()}
📌 杂费：¥${misc.toLocaleString()}
🆘 应急备用（10%）：¥${emergency.toLocaleString()}

**💵 预计总花费：¥${grandTotal.toLocaleString()}（人均 ¥${Math.round(grandTotal / people).toLocaleString()}）**

> 实际费用因个人消费习惯和汇率波动有所不同，建议多备10-15%应急资金`;
}
