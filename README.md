# 途旅 · AI 旅行规划助手

基于 **NestJS 11 + LangGraph + Vue 3** 的智能旅行规划平台。10 个 AI 工具协同工作，覆盖天气查询、景点推荐、行程生成、预算估算、签证政策、货币换算、打包清单、实时翻译、联网搜索等旅行全流程。

**预览地址**：http://117.72.219.224:5174/

## 特性

- **LangGraph Agent**：多工具协同调用链（天气 → 景点 → 行程 → 预算），自动串联
- **DeepSeek V4 模型**：在线推理 + 思维链（reasoning），决策过程透明可查
- **10 个专业工具**：8 个旅行工具 + 联网搜索 + 会话标题自动生成
- **RAG 知识库**：手动入库或自动检索，三级数据回退（RAG → Tavily 联网 → Mock）
- **流式 SSE 响应**：实时展示 AI 思考过程与回答内容
- **JWT 双令牌认证**：Access Token（15min）+ Refresh Token（7d），角色守卫（ADMIN/USER）
- **管理后台**：仪表盘、会话观测、知识库运营、用户管理
- **PostgreSQL + PGVector**：业务数据 + 向量存储一体化

## 界面截图

- 登录页（路由：`/#/login`）

![登录页](screenshots/login.png)

- 知识库文档管理（路由：`/#/knowledge/documents`）

![知识库文档管理](screenshots/knowledge_documents.png)

- RAG 调试（路由：`/#/knowledge/playground`）

![RAG 调试](screenshots/knowledge_playground.png)

- 会话对话测试（路由：`/#/sessions/conversation`）

![会话对话测试](screenshots/sessions_conversation.png)

- 工具详情（上半区，路由：`/#/tools`）

![工具详情上半区](screenshots/toolinfo_1.png)

- 工具详情（下半区，路由：`/#/tools`）

![工具详情下半区](screenshots/toolinfo_2.png)

## 项目结构

```
travel-agent/
├── apps/
│   ├── server/                    # NestJS 后端
│   │   ├── src/
│   │   │   ├── agent/             # LangGraph Agent + SSE 流式
│   │   │   ├── admin/             # 管理后台 API（仪表盘/会话/知识库/用户）
│   │   │   ├── auth/              # JWT 认证 + 角色守卫
│   │   │   ├── llm/               # DeepSeek 模型工厂
│   │   │   ├── memory/            # 对话历史（Prisma 持久化）
│   │   │   ├── rag/               # RAG 向量检索（Chroma + PGVector）
│   │   │   ├── session/           # 会话归属校验
│   │   │   ├── tavily/            # Tavily 联网搜索
│   │   │   ├── tools/             # 10 个 Agent Tool
│   │   │   ├── prisma/            # PrismaClient 全局模块
│   │   │   └── common/            # 全局拦截器/过滤器
│   │   └── prisma/
│   │       └── schema.prisma      # 数据模型（User/ChatSession/ChatMessage/知识库）
│   └── admin-ui/                  # 管理后台前端（Vue 3 + Element Plus）
│       └── src/
│           ├── views/sessions/    # 会话观测（会话管理/消息管理/对话）
│           ├── views/knowledge/   # 知识库管理
│           └── layouts/           # 管理布局 + 侧栏菜单
├── patches/                       # pnpm 依赖补丁
├── docs/                          # 技术文档
├── package.json                   # 根 monorepo 脚本
├── pnpm-workspace.yaml            # 工作区定义
└── CLAUDE.md                      # Claude Code 指引
```

## 快速开始

### 前置条件

- **Node.js** ≥ 18
- **pnpm** ≥ 10（务必使用 pnpm，补丁依赖）
- **PostgreSQL** ≥ 15 + **pgvector** 扩展
- **DeepSeek API Key**（[获取地址](https://platform.deepseek.com)）
- **Zhipu API Key**（RAG Embedding，[获取地址](https://open.bigmodel.cn)）
- **Tavily API Key**（联网搜索，可选，[获取地址](https://tavily.com)）
- **OpenWeatherMap API Key**（实时天气，可选，[获取地址](https://openweathermap.org/api)）

### 1. 克隆项目

```bash
git clone <repo-url>
cd travel-agent
```

### 2. Docker 部署 PostgreSQL + PGVector

推荐使用 Docker 一键启动带 pgvector 扩展的 PostgreSQL：

```bash
docker run -d \
  --name travel-pgvector \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your-password \
  -e POSTGRES_DB=travel-agent \
  -p 5432:5432 \
  pgvector/pgvector:pg17
```

**参数说明**：

| 参数 | 说明 |
|------|------|
| `--name travel-pgvector` | 容器名称，可自定义 |
| `POSTGRES_USER` | 数据库用户（默认 postgres） |
| `POSTGRES_PASSWORD` | 数据库密码，**请修改为强密码** |
| `POSTGRES_DB` | 默认创建的数据库名，需与 `DATABASE_URL` 一致 |
| `-p 5432:5432` | 端口映射（宿主机:容器） |
| `pgvector/pgvector:pg17` | 官方镜像，基于 PostgreSQL 17 |

**镜像选择**：

| 镜像标签 | PostgreSQL 版本 |
|----------|----------------|
| `pgvector/pgvector:pg17` | PostgreSQL 17（推荐） |
| `pgvector/pgvector:pg16` | PostgreSQL 16 |
| `pgvector/pgvector:pg15` | PostgreSQL 15 |

**验证 pgvector 扩展**：

```bash
docker exec -it travel-pgvector psql -U postgres -d travel-agent -c "CREATE EXTENSION IF NOT EXISTS vector; SELECT extversion FROM pg_extension WHERE extname='vector';"
```

若输出版本号（如 `0.8.0`），说明 pgvector 已就绪。

**常用 Docker 命令**：

```bash
# 查看容器状态
docker ps -a --filter name=travel-pgvector

# 停止容器
docker stop travel-pgvector

# 启动已有容器
docker start travel-pgvector

# 删除容器（数据会丢失！）
docker rm -f travel-pgvector

# 数据持久化（推荐生产环境）
docker run -d \
  --name travel-pgvector \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your-password \
  -e POSTGRES_DB=travel-agent \
  -p 5432:5432 \
  -v travel-pgdata:/var/lib/postgresql/data \
  pgvector/pgvector:pg17
```

使用 `-v` 挂载数据卷后，即使删除容器，数据仍保留。

### 3. 配置环境变量

```bash
cd apps/server
cp .env.example .env
```

编辑 `.env`，填入必要配置：

```bash
# 数据库（Docker 部署时密码需与上面一致）
DATABASE_URL="postgresql://postgres:your-password@localhost:5432/travel-agent?schema=public"

# DeepSeek
DEEPSEEK_API_KEY=sk-your-deepseek-key
DEEPSEEK_MODEL=deepseek-v4-flash

# Zhipu（RAG Embedding）
ZHIPU_API_KEY=your-glm-key

# Tavily（联网搜索，可选）
TAVILY_API_KEY=tvly-your-tavily-key

# OpenWeatherMap（实时天气，可选）
OPEN_WEATHER_API_KEY=your-open-weather-key

# JWT
JWT_ACCESS_SECRET=your-access-secret-change-in-production
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES_MS=604800000
```

> `.env.local` 已加入 `.gitignore`，可存放本地密钥，自动覆盖 `.env` 中的值。

### 4. 安装依赖 & 初始化数据库

```bash
# 根目录安装所有工作区
pnpm install              # 安装依赖 + Prisma 生成 + pnpm 补丁自动应用

# 数据库迁移
pnpm run db:migrate
```

### 5. 创建管理员

```bash
pnpm run seed:admin
```

默认账号：`admin` / `admin123`

### 6. 启动服务

```bash
# 终端 1：启动后端（端口 3000）
pnpm run dev:backend

# 终端 2：启动管理后台（端口 5174）
pnpm run dev:admin
```

访问：
- 管理后台：`http://localhost:5174`
- Swagger 文档：`http://localhost:3000/api`（开发环境）
- 健康检查：`http://localhost:3000/api/agent/health`

## API 概览

### Agent（`/api/agent`）

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/chat/stream` | SSE 流式聊天（text + reasoning + session 事件） |
| `POST` | `/chat` | 同步聊天 |
| `GET` | `/sessions` | 当前用户会话列表 |
| `POST` | `/sessions` | 创建会话 |
| `GET` | `/history/:sessionId` | 会话消息历史 |
| `DELETE` | `/history/:sessionId` | 清除会话消息 |
| `GET` | `/health` | 健康检查 |

### Auth（`/api/auth`）

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/register` | 用户注册 |
| `POST` | `/login` | 用户登录（返回 Access + Refresh Token） |
| `POST` | `/refresh` | 刷新令牌 |
| `POST` | `/logout` | 登出 |

### Admin（`/api/admin`，仅 ADMIN 角色）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/stats` | 仪表盘统计 |
| `GET` | `/sessions` | 会话分页列表 |
| `GET` | `/sessions/:id` | 会话详情（含消息） |
| `GET` | `/messages` | 消息分页列表 |
| `GET` | `/users` | 用户列表 |
| `GET` | `/knowledge/collections` | 知识库集合管理 |
| `GET` | `/knowledge/documents` | 知识文档管理 |

### Tools（`/api/tools`）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/tools` | 工具元数据列表 |
| `POST` | `/tools/weather` | 天气查询 |
| `POST` | `/tools/attractions` | 景点推荐 |
| `POST` | `/tools/itinerary` | 行程生成 |
| `POST` | `/tools/budget` | 预算估算 |
| `POST` | `/tools/visa` | 签证查询 |
| `POST` | `/tools/currency` | 货币换算 |
| `POST` | `/tools/packing` | 打包清单 |
| `POST` | `/tools/translate` | 短语翻译 |
| `POST` | `/tools/web-search` | 联网搜索 |

## 一次流式对话的完整流程

入口：`POST /api/agent/chat/stream`  
Body：`{ userId, sessionId?, message }`

```mermaid
sequenceDiagram
  participant FE as 前端
  participant API as AgentController
  participant Agent as AgentService
  participant Session as SessionService
  participant Memory as MemoryService
  participant Graph as LangGraph
  participant LLM as DeepSeek
  participant Tool as Tools
  participant DB as PostgreSQL

  FE->>API: POST chat/stream
  API->>Agent: streamChat(userId, message, sessionId?)
  Agent->>Session: ensureSession(sessionId, userId)
  Session->>DB: 查找或创建 chat_sessions
  Agent->>Memory: getHistory(session.id)
  Memory->>DB: 最近 20 条 chat_messages
  Agent->>Agent: buildGraph(session.id)
  Agent->>Graph: stream({ messages })

  loop ReAct 循环
    Graph->>LLM: invoke（含 SystemPrompt + 历史）
    alt 有 tool_calls
      Graph->>Tool: ToolNode 执行
      Tool->>DB: update_session_title 等写库
      Tool-->>Graph: Tool 结果消息
    else 无 tool_calls
      Graph-->>Agent: 流式文本 chunk
      Agent-->>API: yield { type: text, content }
      API-->>FE: SSE data
    end
  end

  Agent->>Memory: addMessage USER + ASSISTANT
  Memory->>DB: INSERT chat_messages
  Agent-->>API: yield { type: session, sessionId }
  API-->>FE: SSE done
```

### 步骤说明

| 步骤 | 代码位置 | 说明 |
|------|----------|------|
| 1. 确保会话 | `sessionService.ensureSession()` | 有 `sessionId` 则复用，否则新建 `chat_sessions` |
| 2. 编译 Graph | `buildGraph(session.id)` | 绑定 9 个 Tool（含会话标题） |
| 3. 加载历史 | `memoryService.getHistory()` | DB → `HumanMessage` / `AIMessage` |
| 4. 拼消息 | `[...history, new HumanMessage(message)]` | 送入 Graph 初始状态 |
| 5. 流式执行 | `graph.stream({ streamMode: 'messages' })` | 只 yield `agent` 节点的文本 chunk |
| 6. 持久化 | `memoryService.addMessage()` | 流结束后写入 USER / ASSISTANT |
| 7. 回传 sessionId | `yield { type: 'session', sessionId }` | 前端可存 localStorage |

## LLM 配置

### 模型选择

默认使用 DeepSeek V4 Flash。若要切换：

```bash
# .env 中修改
DEEPSEEK_MODEL=deepseek-v4-pro    # 更强模型，包含深度思考
# DEEPSEEK_MODEL=deepseek-v4-flash # 快速模型（默认）
```

### 思维链（Reasoning）

DeepSeek V4 模型支持"思考模式"——在回答之前先输出推理过程。后端通过 SSE `type: 'reasoning'` 事件流式输出，前端展示为可折叠的"思考过程"面板。

> **已知问题**：`@langchain/openai` v1.4.7 在工具调用链中未透传 `reasoning_content`，项目通过 pnpm 补丁修复。详见 [docs/langchain-reasoning-content-patch.md](docs/langchain-reasoning-content-patch.md)。

### 其他 LLM 提供商

如需接入其他 OpenAI 兼容模型（如 Qwen、GLM），编辑 `apps/server/src/llm/create-chat-model.ts` 修改 `baseURL`。

## 技术栈

| 层 | 技术 |
|----|------|
| 后端框架 | NestJS 11 |
| Agent 框架 | LangGraph (LangChain) |
| LLM | DeepSeek V4（OpenAI 兼容） |
| 数据库 | PostgreSQL 17 |
| ORM | Prisma 7 |
| 向量存储 | PGVector |
| 向量嵌入 | Zhipu Embedding-3 |
| 认证 | JWT（Access + Refresh Token） |
| 管理前端 | Vue 3 + Element Plus + Pinia |
| Markdown 渲染 | markdown-it + highlight.js + DOMPurify |
| 包管理 | pnpm 10 (monorepo) |

## 数据库

### 核心模型

| 表 | 说明 |
|----|------|
| `users` | 用户账户（支持 USER/ADMIN 角色） |
| `refresh_tokens` | JWT 刷新令牌 |
| `chat_sessions` | 聊天会话（按 userId + updatedAt 索引） |
| `chat_messages` | 聊天消息（按 sessionId + createdAt 索引，每会话最多 20 条） |
| `knowledge_collections` | 知识库集合 |
| `knowledge_documents` | 知识文档（支持分类 + 状态管理） |
| `knowledge_chunks` | 文档分块（关联 PGVector embedding） |
| `user_travel_profiles` | 用户旅行画像（JSON 偏好） |

### 迁移命令

```bash
pnpm run db:migrate          # 应用迁移
pnpm run db:migrate:dev      # 开发：修改 schema 后生成新迁移
pnpm run db:studio           # Prisma Studio 可视化
```

## 脚本

```bash
# 创建管理员
pnpm run seed:admin

# 重新导入知识库示例数据
cd apps/server && pnpm run db:reseed-knowledge
```

## 注意事项

- **包管理器必须是 pnpm**，项目依赖 pnpm 的原生补丁机制和 workspace
- **monorepo**：所有命令可在根目录执行（`pnpm run dev:backend` / `pnpm run dev:admin`），也可进入 `apps/` 子目录
- **`/generated/prisma` 已忽略**：该目录由 `prisma generate` 自动生成（Prisma Client 代码）。它是构建产物，每次 `pnpm install` 或 schema 变更后自动重新生成，不应手动编辑，也无需纳入版本控制
- `.env.local` 存放真实密钥，已加入 `.gitignore`，切勿提交
- RAG 知识库写入前需先创建集合（`travel-knowledge-base`），详见管理后台"知识库"页面
- 管理后台端口可能自动递增（若 5174 被占用），注意 Vite 终端输出

## License

MIT
