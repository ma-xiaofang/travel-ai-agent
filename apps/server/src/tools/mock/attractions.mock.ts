import { createChatModel } from '../../llm/create-chat-model.js';
import type { AttractionItem } from './types.js';

export const ATTRACTIONS_DB: Record<string, AttractionItem[]> = {
  郑州: [
    {
      name: '只有河南·戏剧幻城',
      type: '体验',
      duration: '1天',
      ticket: '￥290起',
      tips: '需提前购票，穿舒适鞋，园内步行较多',
    },
    {
      name: '河南博物院',
      type: '文化',
      duration: '2-3小时',
      ticket: '免费（需预约）',
      tips: '镇院之宝妇好鸮尊，建议租讲解器',
    },
    {
      name: '黄河文化公园',
      type: '自然',
      duration: '2-3小时',
      ticket: '￥60',
      tips: '可远眺黄河悬河，傍晚景色更好',
    },
    {
      name: '少林寺',
      type: '文化',
      duration: '半天',
      ticket: '￥80起',
      tips: '位于登封，距郑州市区约1.5小时车程',
    },
  ],
  洛阳: [
    {
      name: '龙门石窟',
      type: '文化',
      duration: '3-4小时',
      ticket: '￥90',
      tips: '傍晚灯光秀值得看，西山石窟精华集中',
    },
    {
      name: '白马寺',
      type: '文化',
      duration: '1-2小时',
      ticket: '￥35',
      tips: '中国第一古刹，建议上午参观人少',
    },
    {
      name: '洛阳博物馆',
      type: '文化',
      duration: '2小时',
      ticket: '免费（需预约）',
      tips: '唐三彩馆藏丰富，周一闭馆',
    },
    {
      name: '老君山',
      type: '自然',
      duration: '1天',
      ticket: '￥100起（含索道另计）',
      tips: '金顶云海出名，冬季注意防滑保暖',
    },
  ],
  开封: [
    {
      name: '清明上河园',
      type: '文化',
      duration: '半天',
      ticket: '￥120',
      tips: '建议下午入园，可观看大型实景演出',
    },
    {
      name: '开封府',
      type: '文化',
      duration: '2小时',
      ticket: '￥65',
      tips: '有《开衙仪式》等定时表演，注意演出时刻表',
    },
    {
      name: '大相国寺',
      type: '文化',
      duration: '1-2小时',
      ticket: '￥45',
      tips: '千年古刹，钟楼鼓楼可登顶远眺',
    },
    {
      name: '万岁山大宋武侠城',
      type: '体验',
      duration: '半天',
      ticket: '￥60起',
      tips: '互动演出多，适合亲子，周末人较多',
    },
  ],
  河南: [
    {
      name: '少林寺',
      type: '文化',
      duration: '半天',
      ticket: '￥80起',
      tips: '建议上午观看武术表演，穿舒适运动鞋',
    },
    {
      name: '龙门石窟',
      type: '文化',
      duration: '3-4小时',
      ticket: '￥90',
      tips: '傍晚灯光秀值得看，西山石窟精华集中',
    },
    {
      name: '清明上河园',
      type: '文化',
      duration: '半天',
      ticket: '￥120',
      tips: '建议下午入园，可观看《大宋·东京梦华》演出',
    },
    {
      name: '云台山',
      type: '自然',
      duration: '1-2天',
      ticket: '￥120（含交通）',
      tips: '红石峡、茱萸峰必去，秋季红叶最美',
    },
    {
      name: '殷墟博物馆',
      type: '历史',
      duration: '2-3小时',
      ticket: '￥70',
      tips: '甲骨文发现地，建议租讲解器',
    },
    {
      name: '只有河南·戏剧幻城',
      type: '体验',
      duration: '1天',
      ticket: '￥290起',
      tips: '需提前购票，穿舒适鞋，园内步行较多',
    },
  ],
  巴黎: [
    {
      name: '埃菲尔铁塔',
      type: '地标',
      duration: '2-3小时',
      ticket: '€26-29',
      tips: '提前网上预订，避免排队1-2小时',
    },
    {
      name: '卢浮宫',
      type: '文化',
      duration: '3-4小时',
      ticket: '€17',
      tips: '蒙娜丽莎在713室，建议租语音导览',
    },
    {
      name: '凡尔赛宫',
      type: '历史',
      duration: '半天',
      ticket: '€20',
      tips: '需要提前半天，花园免费',
    },
    {
      name: '蒙马特高地',
      type: '文化',
      duration: '2-3小时',
      ticket: '免费',
      tips: '艺术家聚集地，可定制肖像画',
    },
    {
      name: '奥赛博物馆',
      type: '文化',
      duration: '3-4小时',
      ticket: '€16',
      tips: '印象派画作最全，莫奈梵高作品众多',
    },
  ],
  曼谷: [
    {
      name: '大皇宫&玉佛寺',
      type: '文化',
      duration: '2-3小时',
      ticket: '500铢',
      tips: '需着装保守，禁止穿短裤背心',
    },
    {
      name: '考山路',
      type: '娱乐',
      duration: '晚上',
      ticket: '免费',
      tips: '背包客天堂，酒吧美食按摩集中',
    },
    {
      name: '恰图恰市场',
      type: '购物',
      duration: '半天',
      ticket: '免费',
      tips: '仅周六日开放，上午最凉快',
    },
    {
      name: '卧佛寺',
      type: '文化',
      duration: '1小时',
      ticket: '200铢',
      tips: '46米长卧佛震撼，泰式按摩发源地',
    },
  ],
  巴厘岛: [
    {
      name: '乌布皇宫',
      type: '文化',
      duration: '1小时',
      ticket: '免费',
      tips: '每天晚上有克差舞表演',
    },
    {
      name: '德格拉朗梯田',
      type: '自然',
      duration: '2小时',
      ticket: '小费制',
      tips: '日出时分最美，带防晒霜',
    },
    {
      name: '库塔海滩',
      type: '自然',
      duration: '半天',
      ticket: '免费',
      tips: '冲浪胜地，日落景色绝美',
    },
    {
      name: '乌鲁瓦图寺',
      type: '文化',
      duration: '2小时',
      ticket: '约10万卢比',
      tips: '悬崖神庙，注意猴子抢东西',
    },
  ],
};

function formatAttractionsList(city: string, result: AttractionItem[]): string {
  const list = result
    .map(
      (a, i) =>
        `**${i + 1}. ${a.name}** [${a.type}]\n   ⏱ ${a.duration} | 🎫 ${a.ticket}\n   💡 ${a.tips}`,
    )
    .join('\n\n');

  return `🏛️ **${city}精选景点**（${result.length}个）

${list}

> 门票价格可能变化，出行前请确认`;
}

export async function buildAttractionsMock(
  city: string,
  interests: string[] | undefined,
  limit: number,
): Promise<string> {
  const cityKey = Object.keys(ATTRACTIONS_DB).find(
    (k) => city.includes(k) || k.includes(city),
  );
  let result: AttractionItem[];

  if (cityKey) {
    result = ATTRACTIONS_DB[cityKey];
  } else {
    const llm = createChatModel(0.5);
    const resp = await llm.invoke(
      `请列出${city}最值得去的${limit}个景点，每个包含名称、类型、建议游览时长、门票、实用小贴士。只输出JSON数组：[{"name":"","type":"","duration":"","ticket":"","tips":""}]`,
    );
    try {
      const json = resp.content
        .toString()
        .replace(/```json\n?|\n?```/g, '')
        .trim();
      result = JSON.parse(json);
    } catch {
      return `${city}景点信息生成失败，建议稍后重试或调整目的地名称`;
    }
  }

  if (interests && interests.length > 0) {
    const filtered = result.filter((a) =>
      interests.some((i) => a.type.includes(i) || a.name.includes(i)),
    );
    if (filtered.length > 0) result = filtered;
  }

  return formatAttractionsList(city, result.slice(0, limit));
}
