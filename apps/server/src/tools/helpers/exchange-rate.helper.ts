const CURRENCY_CODES: Record<string, string> = {
  日元: 'JPY',
  日圆: 'JPY',
  JPY: 'JPY',
  美元: 'USD',
  USD: 'USD',
  欧元: 'EUR',
  EUR: 'EUR',
  英镑: 'GBP',
  GBP: 'GBP',
  泰铢: 'THB',
  THB: 'THB',
  印尼卢比: 'IDR',
  IDR: 'IDR',
  澳元: 'AUD',
  AUD: 'AUD',
  韩元: 'KRW',
  KRW: 'KRW',
  新加坡元: 'SGD',
  SGD: 'SGD',
  港币: 'HKD',
  港元: 'HKD',
  HKD: 'HKD',
  人民币: 'CNY',
  CNY: 'CNY',
  元: 'CNY',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  JPY: '¥',
  USD: '$',
  EUR: '€',
  GBP: '£',
  THB: '฿',
  IDR: 'Rp',
  AUD: 'A$',
  KRW: '₩',
  SGD: 'S$',
  HKD: 'HK$',
  CNY: '¥',
};

const CURRENCY_COUNTRY: Record<string, string> = {
  JPY: '日本',
  USD: '美国',
  EUR: '欧洲',
  GBP: '英国',
  THB: '泰国',
  IDR: '印尼',
  AUD: '澳大利亚',
  KRW: '韩国',
  SGD: '新加坡',
  HKD: '香港',
  CNY: '中国',
};

type FrankfurterResponse = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
};

export function normalizeCurrencyCode(input: string): string | null {
  const trimmed = input.trim();
  return (
    CURRENCY_CODES[trimmed] ||
    CURRENCY_CODES[trimmed.toUpperCase()] ||
    null
  );
}

/** Frankfurter 实时汇率（免费、无需 Key，基于 ECB 数据） */
export async function fetchLiveExchangeRate(
  amount: number,
  fromCurrency: string,
  toCurrency = 'CNY',
): Promise<string | null> {
  const from = normalizeCurrencyCode(fromCurrency);
  const to = normalizeCurrencyCode(toCurrency);
  if (!from || !to) return null;

  try {
    const url = new URL('https://api.frankfurter.app/latest');
    url.searchParams.set('amount', String(amount));
    url.searchParams.set('from', from);
    url.searchParams.set('to', to);

    const resp = await fetch(url, { redirect: 'follow' });
    if (!resp.ok) return null;

    const data = (await resp.json()) as FrankfurterResponse;
    const converted = data.rates?.[to];
    if (typeof converted !== 'number') return null;

    const unitRate = converted / amount;
    const fromSymbol = CURRENCY_SYMBOLS[from] ?? from;
    const toSymbol = CURRENCY_SYMBOLS[to] ?? to;
    const toLabel = to === 'CNY' ? '人民币' : to;

    return `💱 **汇率换算**

${fromSymbol}${amount.toLocaleString()} ${fromCurrency}
≈ **${toSymbol}${converted.toFixed(2)} ${toLabel}**

（实时汇率：1 ${from} ≈ ${toSymbol}${unitRate.toFixed(4)} ${to}）
📅 报价日期：${data.date}

> 数据来自 Frankfurter（ECB 参考汇率），实际换汇以银行/柜台为准`;
  } catch {
    return null;
  }
}

export function getCurrencyCountry(code: string): string | undefined {
  const normalized = normalizeCurrencyCode(code);
  return normalized ? CURRENCY_COUNTRY[normalized] : undefined;
}

export function getCurrencySymbol(code: string): string | undefined {
  const normalized = normalizeCurrencyCode(code);
  return normalized ? CURRENCY_SYMBOLS[normalized] : undefined;
}
