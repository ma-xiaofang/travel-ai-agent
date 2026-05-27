import { createChatModel } from '../../llm/create-chat-model.js';

export const PHRASES: Record<string, Record<string, string>> = {
  日语: {
    你好: 'こんにちは（Konnichiwa）',
    谢谢: 'ありがとうございます（Arigatou gozaimasu）',
    对不起: 'すみません（Sumimasen）',
    多少钱: 'いくらですか（Ikura desu ka）',
    在哪里: 'どこですか（Doko desu ka）',
    帮帮我: 'たすけてください（Tasukete kudasai）',
    结账: 'おかいけいをおねがいします（Okaikei wo onegaishimasu）',
    好吃: 'おいしい（Oishii）',
  },
  泰语: {
    你好: 'สวัสดี（Sawasdee krab/ka）',
    谢谢: 'ขอบคุณ（Khob khun）',
    多少钱: 'ราคาเท่าไร（Raka thao rai）',
    不要辣: 'ไม่เผ็ด（Mai phet）',
    好的: 'ตกลง（Tok long）',
  },
  韩语: {
    你好: '안녕하세요（Annyeonghaseyo）',
    谢谢: '감사합니다（Gamsahamnida）',
    多少钱: '얼마예요（Eolmayeyo）',
    好吃: '맛있어요（Massisseoyo）',
    在哪里: '어디예요（Eodiyeyo）',
  },
};

export const LANG_MAP: Record<string, string> = {
  日本: '日语',
  大阪: '日语',
  京都: '日语',
  泰国: '泰语',
  曼谷: '泰语',
  清迈: '泰语',
  韩国: '韩语',
  首尔: '韩语',
  法国: '法语',
  巴黎: '法语',
};

export function resolveLanguage(
  target_language?: string,
  destination?: string,
): string {
  return (
    target_language ||
    (destination
      ? Object.entries(LANG_MAP).find(([k]) => destination.includes(k))?.[1]
      : null) ||
    '英语'
  );
}

export async function buildTranslatorMock(
  text: string | undefined,
  language: string,
): Promise<string> {
  const phrases = PHRASES[language];
  if ((!text || text.includes('常用') || text.includes('短语')) && phrases) {
    const list = Object.entries(phrases)
      .map(([zh, trans]) => `**${zh}** → ${trans}`)
      .join('\n');
    return `🗣️ **旅行${language}常用短语**

${list}

💡 在当地多说几句当地语，会让当地人更热情！`;
  }

  const llm = createChatModel(0.3);
  const resp = await llm.invoke(
    `请将"${text}"翻译成${language}，提供：翻译、发音（罗马字/拼音）、适用场合。格式简洁。`,
  );
  return `🗣️ **旅行翻译**

原文：${text}
目标语言：${language}

${resp.content}`;
}
