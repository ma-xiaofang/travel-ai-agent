/**
 * 修复知识库中文乱码：更新正文、清理旧向量，并通过 Admin API 重新入库。
 * 用法：node scripts/reseed-knowledge.mjs
 */
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

const API = process.env.API_BASE ?? 'http://127.0.0.1:3000';

const FIX_ITINERARY = {
  title: '河南3天精选',
  content:
    '河南3天行程：Day1浅尝中原+河南博物院；Day2嵩山+少林寺+龙门石窟；Day3清明上河园+夜游。住宿推荐市区酒店约800元/晚。',
};

const FIX_BUDGET = {
  title: '郑州中等预算参考',
  content:
    '郑州3天中等预算：住宿约350元/晚，餐饮约150元/天，交通约50元/天，景点门票约200元。推荐二七广场周边住宿。',
};

function resolveFix(doc) {
  if (doc.content.includes('Day1') || doc.content.includes('Day2')) {
    return FIX_ITINERARY;
  }
  if (doc.content.includes('350')) return FIX_BUDGET;
  if (doc.title === FIX_ITINERARY.title) return FIX_ITINERARY;
  if (doc.title === FIX_BUDGET.title) return FIX_BUDGET;
  return null;
}

async function login() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@travel.local';
  const password = process.env.ADMIN_PASSWORD ?? 'admin123';
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  return json.data?.accessToken;
}

async function indexDocument(docId, token) {
  const res = await fetch(
    `${API}/api/admin/knowledge/documents/${docId}/index`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message ?? `入库失败 HTTP ${res.status}`);
  }
  return json.data;
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: '-c client_encoding=UTF8',
  });

  const { rows: docs } = await pool.query(
    'SELECT id, title, content FROM knowledge_documents',
  );

  const token = await login();
  if (!token) {
    console.warn('未获取到 Admin Token，将只更新数据库正文。');
    console.warn('请登录管理后台后，对文档逐一点击「重新入库」。');
  }

  let fixed = 0;
  for (const doc of docs) {
    const patch = resolveFix(doc);
    if (!patch) {
      console.log(`跳过: ${doc.title ?? doc.id}`);
      continue;
    }

    console.log(`修复: ${patch.title}`);
    await pool.query(
      `UPDATE knowledge_documents
       SET title = $1, content = $2, status = 'DRAFT', error_message = NULL
       WHERE id = $3`,
      [patch.title, patch.content, doc.id],
    );

    await pool.query(
      `DELETE FROM langchain_pg_embedding WHERE cmetadata->>'docId' = $1`,
      [doc.id],
    );
    await pool.query('DELETE FROM knowledge_chunks WHERE document_id = $1', [
      doc.id,
    ]);

    if (token) {
      const result = await indexDocument(doc.id, token);
      console.log(`  入库: ${result?.status}, chunks=${result?.chunkCount ?? 0}`);
    }
    fixed += 1;
  }

  const verify = await pool.query(
    `SELECT title, LEFT(content, 40) AS preview FROM knowledge_documents`,
  );
  console.log('\n验证数据库内容:');
  for (const row of verify.rows) {
    console.log(`  ${row.title}: ${row.preview}`);
  }

  await pool.end();
  console.log(`\n共处理 ${fixed} 篇文档。`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
