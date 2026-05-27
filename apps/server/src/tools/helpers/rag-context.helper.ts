import type { RagService } from '../../rag/rag.service.js';

/** 从知识库检索上下文，失败或未命中时返回 null（不阻断工具） */
export async function fetchKnowledgeContext(
  rag: RagService | undefined,
  query: string,
  topK = 3,
): Promise<string | null> {
  if (!rag) return null;
  try {
    const hits = await rag.searchVectorStore(query, topK);
    if (!hits.length) return null;
    return hits
      .map((h, i) => {
        const source = h.metadata?.source as string | undefined;
        const suffix = source ? `（来源：${source}）` : '';
        return `[${i + 1}] ${h.content}${suffix}`;
      })
      .join('\n\n');
  } catch {
    return null;
  }
}

/** 将知识库片段拼到工具输出末尾 */
export function withKnowledgeBase(
  answer: string,
  context: string | null,
): string {
  if (!context) return answer;
  return `${answer}

---
📚 **知识库参考资料**
${context}

> 以上为知识库RAG检索内容；可能会过时，请结合实际情况判断。`;
}

/** 供 LLM 类工具注入 system/user 的补充资料块 */
export function formatKnowledgePromptBlock(context: string | null): string {
  if (!context) return '';
  return `

【知识库参考资料（可能会过时，请结合实际情况判断）】
${context}`;
}
