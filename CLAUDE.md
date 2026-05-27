# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

旅途 · AI 旅行规划助手 — 基于 NestJS 11 + LangGraph + Vue 3 的 pnpm monorepo。10 个工具协同工作（天气、景点、行程、预算、签证、货币、打包清单、翻译、联网搜索、会话标题）。

## 项目结构

```
travel-agent/
├── travel-nest/        # NestJS 后端（端口 3000）
├── admin-ui/           # 管理后台（Vue 3 + Element Plus，端口 5174）
├── docs/               # 技术文档
├── patches/            # pnpm 依赖补丁
├── package.json        # 根 monorepo 脚本
├── pnpm-workspace.yaml # 工作区定义
└── pnpm-lock.yaml      # 统一依赖锁文件
```

## 常用命令

```bash
# 从根目录执行
pnpm run dev:backend     # 启动后端（nest start --watch，端口 3000）
pnpm run dev:admin       # 启动管理后台（Vite，端口 5174）
pnpm run build:admin     # 构建管理后台

# 数据库
pnpm run db:migrate      # 应用迁移
pnpm run db:migrate:dev  # 开发：生成新迁移
pnpm run db:studio       # Prisma Studio
pnpm run seed:admin      # 创建管理员（admin / admin123）

# 也可直接进入子项目执行
cd travel-nest && pnpm run start:dev
cd admin-ui && pnpm run dev
```

启动顺序：先启动后端，再启动管理后台。Vite 端口可能自动递增（5174→5175→...），注意终端输出。

## 架构概要

### 后端 (NestJS 11 + LangGraph)

```
travel-nest/src/
├── agent/          # Agent 核心：StateGraph → tools 循环 + SSE 流式
├── admin/          # 管理后台 API：仪表盘、会话观测、知识库、用户管理
├── auth/           # JWT 认证 + 角色守卫（ADMIN / USER）
├── llm/            # DeepSeek 模型工厂（ChatOpenAI 兼容）
├── memory/         # 对话历史（Prisma 持久化，每会话最多 20 条）
├── session/        # 会话归属校验（ensureSession / assertSessionOwner）
├── prisma/         # PrismaClient 全局模块
├── rag/            # RAG 知识库（Chroma + PGVector）
├── tavily/         # Tavily 联网搜索
└── tools/          # 10 个 Agent Tool（zod 校验 + RAG→Tavily→mock 三级回退）
```

**关键文件**：
- `src/agent/agent.service.ts` — LangGraph `StateGraph`。`callModel` 绑定工具并调用 LLM，`shouldContinue` 检查 tool_calls。`streamChat()` 输出 `{ type: 'text' | 'reasoning' | 'session' }` 事件
- `src/agent/agent.controller.ts` — `POST /api/agent/chat/stream`（SSE 流式）、`POST /api/agent/chat`（同步）
- `src/admin/session.controller.ts` — 管理后台会话观测 API（仅 ADMIN）
- `src/tools/agent-tools.ts` — `buildAgentTools()` 组装全部工具

**LangGraph 流程**：`START → agent (callModel) → shouldContinue → tools / END → agent → ...`

**工具列表**：get_weather, get_attractions, generate_itinerary, calculate_budget, check_visa, convert_currency, generate_packing_list, translate_phrases, web_search, update_session_title

**思维链**：DeepSeek 模型输出 `reasoning_content` 时，后端作为 `type: 'reasoning'` 事件流式输出。前端可折叠展示"思考过程"面板。

### 管理后台 (Vue 3 + Element Plus + Pinia)

```
admin-ui/src/
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

**菜单结构**：
- 仪表盘
- 知识库 → 集合管理 / 文档管理 / RAG 调试
- **会话观测** → 会话管理 / 消息管理 / 对话
- 用户管理
- 工具详情
- 系统状态

**对话页面** (`views/sessions/ConversationView.vue`)：
- 左侧：admin 自己的会话列表（按 userId 过滤）+ 搜索 + 新建对话按钮
- 右侧：消息平铺展示（无气泡），含可折叠思维链面板 + 底部输入框
- 流式对话：SSE 实时接收 text / reasoning / session 事件
- 安全：不操作其他用户的会话，admin 只能在自己的会话中对话

## @langchain/openai 补丁

**补丁文件**：`patches/@langchain__openai@1.4.7.patch`

**问题**：`@langchain/openai` v1.4.7 在将消息序列化为 API 格式时，`convertMessagesToCompletionsMessageParams` 函数未透传 `additional_kwargs.reasoning_content`，导致 DeepSeek 工具调用链的第二轮请求返回 400。

**修复**：在 `completionParam` 构建逻辑中插入一行，将 `additional_kwargs.reasoning_content` 写入 `completionParam.reasoning_content`。

**管理方式**：pnpm 原生补丁（`patches/` 目录），`pnpm install` 时自动应用。详见 `docs/langchain-reasoning-content-patch.md`。

**升级时**：检查新版本是否已内置此支持，若已修复则删除补丁；否则需重新生成。

## 注意事项

- **包管理器**：pnpm（务必使用，依赖 workspace + 补丁机制）
- **monorepo**：根目录 `pnpm install` 安装所有工作区，`pnpm-workspace.yaml` 定义 `travel-nest` 和 `admin-ui`
- **admin-ui 端口**：默认 5174，被占用时自动递增。开发时注意 Vite 终端输出
- **API 响应格式**：后端统一包装 `{ code, message, data }`，admin-ui 的 http.js 拦截器已做 `res.data` 解包，业务代码通过 `res.data` 访问 data 层
- **环境变量**：dotenvx 注入（.env + .env.local），local 文件已 gitignore
- **启动顺序**：先启动后端（3000），再启动 admin-ui
- **会话归属**：`SessionService.ensureSession` 校验 session 归属，不绕过此检查。admin 对话功能通过 `listSessions({ userId })` 过滤自己的会话
