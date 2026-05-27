import type { VisaInfo } from './types.js';

export const VISA_DB: Record<string, VisaInfo> = {
  日本: {
    type: '旅游签证',
    status: '需要申请',
    validity: '单次入境，停留15-90天',
    processing: '5-10个工作日',
    fee: '免签证费，服务费约150元',
    materials: [
      '有效护照（有效期6个月以上）',
      '近期白底照片',
      '往返机票订单',
      '酒店预订',
      '银行流水（3个月）',
      '行程单',
    ],
    tips: '个人旅游可在国内日本签证中心申请，首次赴日推荐签证代办',
  },
  法国: {
    type: '申根签证',
    status: '需要申请',
    validity: '申根区多国通用，最长90天/180天',
    processing: '15个工作日',
    fee: '80欧元（约600元）',
    materials: [
      '有效护照',
      '申请表',
      '照片',
      '往返机票',
      '酒店预订',
      '保险',
      '银行流水（余额不少于3000欧）',
      '在职证明',
    ],
    tips: '申根签证可在多国使用，申请首次入境国签证即可',
  },
  泰国: {
    type: '免签',
    status: '✅ 2024年起中泰互免签证',
    validity: '30天（可延期30天）',
    processing: '直接入境',
    fee: '免费',
    materials: ['有效护照', '回程机票', '酒店预订', '现金（建议带10000泰铢）'],
    tips: '2024年3月起中泰互免签证，直接落地！建议提前填好入境表格',
  },
  印度尼西亚: {
    type: '免签',
    status: '✅ 免签入境',
    validity: '30天',
    processing: '直接入境',
    fee: '免费',
    materials: ['有效护照（有效期6个月）', '回程机票', '酒店预订'],
    tips: '印尼对中国公民免签，直接入境！',
  },
  美国: {
    type: 'B1/B2旅游签证',
    status: '需要申请',
    validity: '10年多次往返，每次最长180天',
    processing: '面签等待时间不定',
    fee: '约1100元（185美元）',
    materials: [
      '有效护照',
      'DS-160表格',
      '预约面签',
      '银行证明',
      '资产证明',
      '工作证明',
    ],
    tips: '建议提前3-6个月申请，面签成功率与个人财力相关',
  },
  英国: {
    type: '标准旅游签证',
    status: '需要申请',
    validity: '最长6个月',
    processing: '3-5周',
    fee: '约700元',
    materials: ['护照', '照片', '银行流水', '雇主信', '行程单', '酒店预订'],
    tips: '英国已脱欧，不在申根区，需单独申请',
  },
  澳大利亚: {
    type: '电子旅游签ETA',
    status: '在线申请',
    validity: '1年内多次，每次最长3个月',
    processing: '即时-几天',
    fee: '20澳元（约90元）',
    materials: ['护照', '通过澳大利亚ETA APP申请即可'],
    tips: '通过AustralianETA APP申请，通常几分钟到几天内批准',
  },
  新加坡: {
    type: '电子签',
    status: '需要申请（持有效他国签证可免签）',
    validity: '30天',
    processing: '1-3个工作日',
    fee: '约200元',
    materials: ['护照', '照片', '酒店预订', '资金证明'],
    tips: '持有有效的美国/英国/加拿大签证可免签入境',
  },
  韩国: {
    type: '旅游签证',
    status: '需要申请',
    validity: '单次30天或多次1年',
    processing: '3-5个工作日',
    fee: '约60元（5美元）',
    materials: ['有效护照', '申请表', '照片', '机票预订', '酒店预订', '银行流水'],
    tips: '可在韩国签证申请中心办理，材料相对简单',
  },
};

export function buildVisaMock(destination: string): string {
  const key = Object.keys(VISA_DB).find(
    (k) => destination.includes(k) || k.includes(destination),
  );

  if (!key) {
    return `📋 **${destination}签证信息**

暂无该目的地的内置签证数据，建议访问目的地驻华大使馆官网查询最新要求。`;
  }

  const info = VISA_DB[key];
  const materials = info.materials
    .map((m, i) => `   ${i + 1}. ${m}`)
    .join('\n');

  return `📋 **${destination}签证信息**（中国大陆护照）

**签证类型：** ${info.type}
**签证状态：** ${info.status}
**有效期：** ${info.validity}
**办理时间：** ${info.processing}
**签证费用：** ${info.fee}

**所需材料：**
${materials}

**温馨提示：** ${info.tips}`;
}
