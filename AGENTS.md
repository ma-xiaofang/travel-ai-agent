# AGENTS.md

本文件为 AI 编码代理（Agent）在本仓库工作时的指引，与 `CLAUDE.md` 内容保持一致并互为补充。

## 项目概述

**旅途 · AI 旅行规划助手** — 基于 NestJS 11 + LangGraph + Vue 3 的 pnpm monorepo。10 个工具协同工作：天气、景点、行程、预算、签证、货币、打包清单、翻译、联网搜索、会话标题。

## 项目结构

```
travel-agent/
├── apps/
│   ├── server/       # NestJS 后端（端口 3000）
│   ├── admin-ui/     # 管理后台（Vue 3 + Element Plus，端口 5174）
│   └── miniprogram/  # 用户端（uni-app + Vue 3，微信小程序 / H5）
├── docs/             # 技术文档
├── patches/          # pnpm 依赖补丁
├── package.json      # 根 monorepo 脚本
├── pnpm-workspace.yaml # 工作区定义（apps/*）
├── pnpm-lock.yaml    # 统一依赖锁文件
└── CLAUDE.md         # Claude Code 指引
```

## 常用命令

```bash
# 从根目录执行
pnpm install             # 安装所有工作区依赖 + Prisma 生成 + 应用补丁
pnpm run dev:backend     # 启动后端（nest start --watch，端口 3000）
pnpm run dev:admin       # 启动管理后台（Vite，端口 5174）
pnpm run build:backend   # 构建后端
pnpm run build:admin     # 构建管理后台

# 数据库
pnpm run db:migrate      # 应用迁移
pnpm run db:migrate:dev  # 开发：生成新迁移
pnpm run db:studio       # Prisma Studio
pnpm run seed:admin      # 创建管理员（admin / admin123）

# 用户端 miniprogram（uni-app，无根脚本，需进入子目录）
cd apps/miniprogram && pnpm run dev:h5       # H5 调试
cd apps/miniprogram && pnpm run dev:mp-weixin # 微信小程序调试

# 也可直接进入后端子项目执行
cd apps/server && pnpm run start:dev
```

启动顺序：先启动后端（3000），再启动管理后台。Vite 端口可能自动递增（5174→5175→…），注意终端输出。

## 架构概要

### 后端 (NestJS 11 + LangGraph)

```
apps/server/src/
├── agent/          # Agent 核心：StateGraph → tools 循环 + SSE 流式
├── admin/          # 管理后台 API：仪表盘、会话观测、知识库、用户管理
├── auth/           # JWT 认证 + 角色守卫（ADMIN / USER）
├── llm/            # DeepSeek 模型工厂（ChatOpenAI 兼容）
├── memory/         # 对话历史（Prisma 持久化，每会话最多 20 条）
├── session/        # 会话归属校验（ensureSession / assertSessionOwner）
├── prisma/         # PrismaClient 全局模块
├── rag/            # RAG 知识库（PGVector 向量存储 + 向量化）
├── tavily/         # Tavily 联网搜索
└── tools/          # 10 个 Agent Tool（zod 校验 + RAG→Tavily→mock 三级回退）
```

**关键文件**：

- `src/agent/agent.service.ts` — LangGraph `StateGraph`。`callModel` 绑定工具并调用 LLM，`shouldContinue` 检查 tool_calls。`streamChat()` 输出 `{ type: 'text' | 'reasoning' | 'session' }` 事件
- `src/agent/agent.controller.ts` — `POST /api/agent/chat/stream`（SSE 流式）、`POST /api/agent/chat`（同步）
- `src/admin/session.controller.ts` — 管理后台会话观测 API（仅 ADMIN）
- `src/tools/agent-tools.ts` — `buildAgentTools()` 组装全部工具
- `src/llm/create-chat-model.ts` — `createChatModel()`，DeepSeek 走 OpenAI 兼容接口

**LangGraph 流程**：`START → agent (callModel) → shouldContinue → tools / END → agent → …`

**思维链**：DeepSeek 输出 `reasoning_content` 时，后端作为 `type: 'reasoning'` 事件流式输出，前端可折叠展示「思考过程」面板。

### RAG 与向量模型

RAG 采用「向量库存向量、Prisma 存正文与元数据」双写设计：

- 向量存储：PostgreSQL + **PGVector**，实现在 `src/rag/pgvector.service.ts`
- 向量模型在 `src/rag/pgvector.service.ts` 的 `createEmbeddings()` 中创建，由 `RAG_EMBEDDING_MODEL` 选择：
  - `embedding-2` / `embedding-3`（默认）→ 智谱 `ZhipuAIEmbeddings`，Key 为 `ZHIPU_API_KEY`
  - 模型名含 `bge`（如 `BAAI/bge-m3`）→ 硅基流动 `OpenAIEmbeddings`（OpenAI 兼容），Key 为 `SILICON_FLOW_API_KEY`，BaseURL 为 `SILICON_FLOW_BASE_URL`（默认 `https://api.siliconflow.cn/v1`）
- 维度由 `resolveEmbeddingDimensions()` 决定：`embedding-2`=1024、`embedding-3`=2048、`bge-m3`=1024，可用 `RAG_EMBEDDING_DIMENSIONS` 覆盖
- `VECTOR_STORE_SERVICE` 令牌（`src/rag/rag.module.ts`）暴露向量库实现，`RagService` 通过该接口写入与检索

> **切换向量模型注意事项**：`langchain_pg_embedding.embedding` 列维度固定，切换模型（维度变化）需先清空向量表并重新入库，否则报维度不匹配。

### 管理后台 (Vue 3 + Element Plus + Pinia)

```
apps/admin-ui/src/
├── layouts/AdminLayout.vue  # 侧栏菜单 + 面包屑
├── router/index.js           # hash 路由
├── views/
│   ├── dashboard/            # 仪表盘
│   ├── sessions/             # 会话观测（会话管理 / 消息管理 / 对话）
│   ├── knowledge/            # 知识库管理
│   ├── users/                # 用户管理
│   ├── tools/                # 工具详情
│   └── system/               # 系统状态
├── components/MarkdownBody.vue  # markdown-it + hljs 渲染
├── utils/renderMarkdown.js      # markdown → 安全 HTML（DOMPurify）
└── api/                         # Axios 封装（baseURL: /api，拦截器自动取 data）
```

**对话页面** (`views/sessions/ConversationView.vue`)：左侧为 admin 自己的会话列表（按 userId 过滤）+ 搜索 + 新建对话；右侧消息平铺展示（无气泡），含可折叠思维链面板 + 底部输入框，SSE 实时接收 text / reasoning / session 事件。不要操作其他用户的会话。

### 用户端 (uni-app + Vue 3)

```
apps/miniprogram/src/
├── api/          # 接口封装
├── http/         # 请求与拦截器
├── pages/        # chat / login / mine / sessions
├── store/        # 状态管理
└── layouts/      # 布局
```

## @langchain/openai 补丁

**补丁文件**：`patches/@langchain__openai@1.4.7.patch`

**问题**：`@langchain/openai` v1.4.7 在序列化消息为 API 格式时，`convertMessagesToCompletionsMessageParams` 未透传 `additional_kwargs.reasoning_content`，导致 DeepSeek 工具调用链的第二轮请求返回 400。

**修复**：在 `completionParam` 构建逻辑中插入一行，将 `additional_kwargs.reasoning_content` 写入 `completionParam.reasoning_content`。

**管理方式**：pnpm 原生补丁（`patches/` 目录），`pnpm install` 时自动应用。详见 `docs/langchain-reasoning-content-patch.md`。

**升级时**：检查新版本是否已内置此支持，若已修复则删除补丁；否则需重新生成。

## 约定与注意事项

- **包管理器**：必须使用 pnpm（依赖 workspace + 补丁机制），不要用 npm / yarn
- **monorepo**：根目录 `pnpm install` 安装所有工作区，`pnpm-workspace.yaml` 定义 `apps/*`
- **环境变量**：dotenvx 注入 `.env` + `.env.local`（local 覆盖 env，已 gitignore）；`.env.example` 为示例，勿写入真实密钥
- **API 响应格式**：后端统一包装 `{ code, message, data }`，admin-ui 的 `http.js` 拦截器已做 `res.data` 解包，业务代码通过 `res.data` 访问 data 层
- **启动顺序**：先启动后端（3000），再启动 admin-ui；admin-ui 端口默认 5174，被占用时自动递增
- **会话归属**：`SessionService.ensureSession` 校验 session 归属，不要绕过此检查；admin 对话功能通过 `listSessions({ userId })` 过滤自己的会话
- **Prisma Client**：`apps/server/generated/prisma`（及 `/generated/prisma`）由 `prisma generate` 自动生成，是构建产物，不要手动编辑或纳入版本控制
- **格式与检查**：后端 `pnpm run lint`、`npx tsc --noEmit`；管理后台/用户端为 Vite + Vue，注意类型检查（miniprogram 可用 `pnpm run type-check`）

## 参考文档

- `README.md` — 项目总览、快速开始、API 概览、部署
- `CLAUDE.md` — Claude Code 指引
- `docs/` — Agent 核心流程、ReAct 工作模式、知识库与向量表关系、认证授权、用户画像与跨会话记忆、admin-ui 设计、nginx 部署、langchain 补丁说明
