import {
  getCurrencyCountry,
  getCurrencySymbol,
  normalizeCurrencyCode,
} from '../helpers/exchange-rate.helper.js';

export const MOCK_RATES: Record<string, number> = {
  JPY: 0.048,
  USD: 7.25,
  EUR: 7.85,
  GBP: 9.2,
  THB: 0.21,
  IDR: 0.00046,
  AUD: 4.72,
  KRW: 0.0053,
  SGD: 5.38,
  HKD: 0.93,
};

export const SPENDING_TIPS: Record<string, string> = {
  日本: '每日约花费 5000-15000 日元（约240-720元）',
  泰国: '每日约花费 500-2000 泰铢（约100-400元）',
  印尼: '每日约花费 200000-600000 卢比（约90-280元）',
  法国: '每日约花费 50-150 欧元（约390-1180元）',
  美国: '每日约花费 80-200 美元（约580-1450元）',
  澳大利亚: '每日约花费 100-250 澳元（约470-1180元）',
  韩国: '每日约花费 50000-150000 韩元（约265-800元）',
};

export function buildCurrencyMock(
  amount: number,
  from_currency: string,
): string {
  const code = normalizeCurrencyCode(from_currency);
  const rate = code ? MOCK_RATES[code] : undefined;

  if (!code || rate === undefined) {
    return `💱 **${from_currency} 汇率参考**

暂不支持 ${from_currency} 的汇率换算。支持：日元、美元、欧元、英镑、泰铢、印尼卢比、澳元、韩元、港币、新加坡元`;
  }

  const result = amount * rate;
  const symbol = getCurrencySymbol(from_currency) ?? code;
  const country = getCurrencyCountry(from_currency);
  const tip = country
    ? Object.entries(SPENDING_TIPS).find(([k]) => country.includes(k))?.[1]
    : undefined;

  return `💱 **汇率换算**

${symbol}${amount.toLocaleString()} ${from_currency}
≈ **¥${result.toFixed(2)} 人民币**

（参考汇率：1 ${code} ≈ ¥${rate} 人民币）
${tip ? `\n**消费参考：** ${tip}` : ''}

> 汇率实时波动，以实际换汇为准，建议到目的地换小额现金，大额用信用卡`;
}
