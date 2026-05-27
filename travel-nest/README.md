# 旅途 · travel-nest

「旅途」AI 旅行规划助手后端 — 基于 **NestJS 11**、**LangGraph**、**Prisma 7**、**PostgreSQL + PGVector** 构建。提供流式对话 Agent、8 个旅行工具（均已接入 RAG 知识库）、用户认证与会话持久化。

默认端口：`3000`（可通过 `PORT` 修改）。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | NestJS 11 |
| Agent | LangGraph（agent ↔ tools 循环） |
| 大模型 | DeepSeek（OpenAI 兼容 API） |
| 向量检索 | LangChain PGVector + 智谱 Embedding |
| 数据库 | PostgreSQL + Prisma 7 |
| 校验 | class-validator / class-transformer |

## 模块结构

```
src/
├── agent/          # LangGraph 对话（SSE 流式 + 同步）
├── tools/          # 8 个旅行 Tool（工厂函数 + RAG 检索）
├── rag/            # 文档入库、向量检索、RAG 问答
├── memory/         # 会话消息（Prisma chat_messages）
├── session/        # 会话管理（chat_sessions）
├── auth/           # JWT 注册 / 登录 / 刷新
├── prisma/         # PrismaService
└── llm/            # createChatModel（DeepSeek）
```

**AppModule** 聚合：`PrismaModule`、`MemoryModule`、`AuthModule`、`ToolsModule`、`AgentModule`、`RagModule`。

## 快速开始

### 1. 安装依赖

```bash
cd travel-nest
pnpm install
```

### 2. 配置环境变量

复制并编辑 `.env`（参考下方 [环境变量](#环境变量)）。

### 3. 数据库迁移

```bash
npx prisma migrate deploy
npx prisma generate
```

### 4. 启动开发服务

```bash
pnpm run start:dev
```

前端（`frontend/`）需单独启动，Vite 将 `/api` 代理到 `http://localhost:3000`。

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 连接串 |
| `DEEPSEEK_API_KEY` | ✅ | DeepSeek API Key（对话 + 部分 Tool LLM） |
| `DEEPSEEK_MODEL` | | 默认 `deepseek-v4-flash` |
| `ZHIPU_API_KEY` | ✅* | 智谱 API Key（RAG Embedding） |
| `JWT_ACCESS_SECRET` | ✅ | JWT 签名密钥 |
| `OPEN_WEATHER_API_KEY` | | OpenWeatherMap；未配置时天气 Tool 使用 mock |
| `RAG_COLLECTION_NAME` | | 向量集合名，默认 `travel-knowledge-base` |
| `RAG_EMBEDDING_MODEL` | | 智谱 Embedding 模型，默认 `embedding-3` |
| `RAG_MAX_DISTANCE` | | RAG 问答相似度阈值，默认 `0.5` |
| `CHAT_TEMPERATURE` | | 对话温度，默认 `0.7` |
| `MAX_ITERATIONS` | | Agent 最大迭代轮数，默认 `6` |
| `PORT` | | 服务端口，默认 `3000` |

\* 未配置 `ZHIPU_API_KEY` 时，RAG 检索失败但不影响 Tool 的 mock/API 逻辑。

示例：

```env
DATABASE_URL="postgresql://postgres:123456@localhost:5432/travel-agent?schema=public"
DEEPSEEK_API_KEY=sk-your-deepseek-key
DEEPSEEK_MODEL=deepseek-v4-flash
ZHIPU_API_KEY=your-zhipu-key
OPEN_WEATHER_API_KEY=your-open-weather-key
JWT_ACCESS_SECRET=your-access-secret-change-in-production
```

## API 概览

### Agent（`/api/agent`）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/chat/stream` | SSE 流式对话 |
| POST | `/chat` | 同步对话 |
| POST | `/sessions` | 创建会话 |
| GET | `/sessions?userId=` | 会话列表 |
| GET | `/history/:sessionId` | 会话消息历史 |
| DELETE | `/history/:sessionId` | 清空会话消息 |
| GET | `/tools` | 工具元数据 |
| GET | `/health` | 健康检查 |

### RAG 知识库（`/api/rag`）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/load` | 文档分块入库（PGVector + Prisma 知识表） |
| POST | `/query` | RAG 问答（检索 + DeepSeek 生成） |
| POST | `/search` | 纯向量检索 |

**入库示例：**

> Windows PowerShell 下请勿直接在 `-d` 中写中文（易乱码）。请用管理后台「保存并入库」，或将 JSON 存为 UTF-8 文件后：`curl ... --data-binary @body.json`。修复历史乱码数据：`pnpm run db:reseed-knowledge`。

```bash
curl -X POST http://localhost:3000/api/rag/load \
  -H "Content-Type: application/json" \
  -d '{
    "collectionName": "travel-knowledge-base",
    "documents": [{
      "title": "郑州中等预算参考",
      "content": "郑州3天中等预算：住宿约350元/晚，餐饮约150元/天...",
      "category": "DESTINATION",
      "tags": ["河南", "郑州", "2025"]
    }]
  }'
```

### 旅行工具调试（`/api/tools`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 工具列表 |
| POST | `/weather` | `{ "city": "郑州" }` |
| POST | `/budget` | 预算估算 body |
| POST | `/visa` | `{ "destination": "泰国" }` |
| POST | `/currency` | 汇率换算 body |

### 认证（`/api/auth`）

注册、登录、刷新 Token 等（详见 `src/auth/`）。

## 旅行工具（均已接 RAG）

| Tool | 功能 | 数据来源 |
|------|------|----------|
| `get_weather` | 天气与穿衣建议 | OpenWeatherMap 或 mock + 知识库 |
| `get_attractions` | 景点推荐 | 内置 mock（河南等）/ LLM + 知识库 |
| `generate_itinerary` | 逐日行程 | LLM + 知识库 |
| `calculate_budget` | 费用估算 | 内置 `DAILY_COSTS` mock + 知识库 |
| `check_visa` | 签证信息 | 内置 mock + 知识库 |
| `convert_currency` | 汇率换算 | 内置汇率表 + 知识库 |
| `generate_packing_list` | 打包清单 | 规则生成 + 知识库 |
| `translate_phrases` | 短语翻译 | 内置短语 / LLM + 知识库 |
| `update_session_title` | 会话标题 | 按 sessionId 动态绑定 |

Agent 调用工具时，会通过 `fetchKnowledgeContext` 自动检索向量库，并在回答末尾附上「知识库参考资料」（检索失败则静默降级）。

## 知识库数据模型（Prisma）

| 表 | 说明 |
|----|------|
| `knowledge_collections` | 知识库集合（对应 PGVector collection） |
| `knowledge_documents` | 原始文档（分类、标签、索引状态） |
| `knowledge_chunks` | 分块记录（关联 `langchain_pg_embedding`） |

知识分类枚举见 `prisma/schema.prisma` 中的 `KnowledgeCategory`（如 `ATTRACTION_GUIDE`、`VISA`、`DESTINATION` 等）。

## LangGraph 流程

```
START → agent（DeepSeek + bindTools）
         ↓ 有 tool_calls?
       tools（ToolNode 执行 8+1 个工具）
         ↓
       agent → … → END
```

- 会话与消息持久化在 PostgreSQL（`chat_sessions` / `chat_messages`）。
- 用户旅行画像：`user_travel_profiles`（跨会话偏好）。

## 常用命令

```bash
# 开发（热重载）
pnpm run start:dev

# 编译
pnpm run build

# 生产运行
pnpm run start:prod

# Prisma
npx prisma migrate dev --name <name>   # 开发迁移
npx prisma migrate deploy            # 生产迁移
npx prisma studio                    # 数据浏览器

# 代码检查
pnpm run lint
pnpm run test
```

## 与 monorepo 其他目录的关系

| 目录 | 说明 |
|------|------|
| `frontend/` | Vue 3 聊天前端，代理 `/api` 到本服务 |
| `backend/` | 旧版 ts-node 后端（逐步由 travel-nest 替代） |

更详细的 Agent 流程见仓库根目录 `docs/Agent核心流程.md`。

## License

UNLICENSED（私有项目）
