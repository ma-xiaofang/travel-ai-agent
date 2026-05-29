/**
 * 货币别名 → ISO 4217 标准代码映射表。
 *
 * 同时收录中文俗称（如「日元」「港币」）与标准代码，用于将用户的
 * 自然语言输入归一化为统一的货币代码。
 */
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

/** 货币代码 → 货币符号映射表，用于格式化展示金额 */
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

/** 货币代码 → 所属国家/地区映射表，用于补充消费参考信息 */
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

/** Frankfurter `/latest` 接口的响应结构 */
type FrankfurterResponse = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
};

/**
 * 将货币别名或代码归一化为标准 ISO 4217 代码。
 *
 * 依次尝试原文匹配与大写匹配（兼容 `usd` / `USD` 等大小写），
 * 命中映射表则返回标准代码，否则返回 null。
 *
 * @param input 用户输入的货币名称或代码（如「日元」「jpy」）
 * @returns 标准货币代码（如 'JPY'）；无法识别时返回 null
 */
export function normalizeCurrencyCode(input: string): string | null {
  const trimmed = input.trim();
  return (
    CURRENCY_CODES[trimmed] ||
    CURRENCY_CODES[trimmed.toUpperCase()] ||
    null
  );
}

/**
 * 获取实时汇率换算结果（Markdown 文本）。
 *
 * 数据源为 Frankfurter（免费、无需 API Key，基于欧洲央行 ECB 参考汇率）。
 * 任一环节失败（货币无法识别、网络异常、响应非法）均返回 null，
 * 由上层工具决定是否回退到内置参考数据。
 *
 * @param amount 待换算金额
 * @param fromCurrency 源货币（别名或代码）
 * @param toCurrency 目标货币（别名或代码），默认人民币 CNY
 * @returns 格式化后的换算结果文本；失败时返回 null
 */
export async function fetchLiveExchangeRate(
  amount: number,
  fromCurrency: string,
  toCurrency = 'CNY',
): Promise<string | null> {
  // 归一化货币代码，任一无法识别则直接放弃
  const from = normalizeCurrencyCode(fromCurrency);
  const to = normalizeCurrencyCode(toCurrency);
  if (!from || !to) return null;

  try {
    // 构造请求：由 API 直接按 amount 完成换算
    const url = new URL('https://api.frankfurter.app/latest');
    url.searchParams.set('amount', String(amount));
    url.searchParams.set('from', from);
    url.searchParams.set('to', to);

    const resp = await fetch(url, { redirect: 'follow' });
    if (!resp.ok) return null;

    const data = (await resp.json()) as FrankfurterResponse;
    // 读取目标货币换算值，缺失或类型异常时视为失败
    const converted = data.rates?.[to];
    if (typeof converted !== 'number') return null;

    // 由换算总额反推单位汇率，用于展示「1 单位 ≈ X」参考
    const unitRate = converted / amount;
    // 符号缺失时回退使用货币代码本身
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
    // 网络/解析等任何异常均静默回退为 null，交由上层处理
    return null;
  }
}

/**
 * 查询货币对应的国家/地区。
 *
 * @param code 货币别名或代码
 * @returns 国家/地区名称；无法识别时返回 undefined
 */
export function getCurrencyCountry(code: string): string | undefined {
  const normalized = normalizeCurrencyCode(code);
  return normalized ? CURRENCY_COUNTRY[normalized] : undefined;
}

/**
 * 查询货币对应的符号。
 *
 * @param code 货币别名或代码
 * @returns 货币符号（如 '¥'）；无法识别时返回 undefined
 */
export function getCurrencySymbol(code: string): string | undefined {
  const normalized = normalizeCurrencyCode(code);
  return normalized ? CURRENCY_SYMBOLS[normalized] : undefined;
}
