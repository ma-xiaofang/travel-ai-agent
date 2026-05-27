# @langchain/openai reasoning_content 透传补丁

## 背景

项目使用 DeepSeek 模型（`deepseek-v4-flash`），该模型在"思考模式"（thinking mode）下会在 API 响应中输出 `reasoning_content` 字段，即模型的思维链/推理过程。前端将其展示为可折叠的"思考过程"面板。

## 问题

当 Agent 触发工具调用链（tool calling）时，模型在首轮响应中同时输出 `reasoning_content` + `tool_calls`。LangGraph 执行完工具后，需要将首轮的 Assistant 消息（含 `reasoning_content`）作为历史上下文传给模型进行第二轮调用。

**但第二轮调用始终失败，DeepSeek API 返回 400 错误：**

```
The `reasoning_content` in the thinking mode must be passed back to the API.
```

这意味着 DeepSeek 要求：若之前的 Assistant 消息包含 `reasoning_content`，后续请求中必须原样透传该字段。

## 根因分析

问题出在 `@langchain/openai` v1.4.7（最新版）的消息序列化函数。

**文件**：`dist/converters/completions.cjs`
**函数**：`convertMessagesToCompletionsMessageParams`

该函数负责将 LangChain 的 `BaseMessage[]` 转换为 OpenAI/DeepSeek API 的 `ChatCompletionMessageParam[]`。在构建每个消息的 API 参数对象 `completionParam` 时，函数已经处理了 `additional_kwargs` 中的以下字段：

| 字段 | 透传 | 代码行 |
|------|------|--------|
| `function_call` | 是 | `completionParam.function_call` |
| `tool_calls` | 是 | `completionParam.tool_calls` |
| `audio` | 是 | `completionParam.audio` |
| **`reasoning_content`** | **否** | **缺失** |

**缺失的代码**：函数在最终 `return completionParam` 之前，从未将 `message.additional_kwargs.reasoning_content` 写入 `completionParam.reasoning_content`。

### 调用链

```
LLM 首轮调用
  → 返回 AIMessage { content, tool_calls, additional_kwargs: { reasoning_content } }
  → LangGraph 存储到 State
  → shouldContinue → 'tools'
  → ToolNode 执行工具
  → shouldContinue → 'agent'
  → callModel 再次调用 LLM
  → ChatOpenAI._streamResponseChunks()
  → convertMessagesToCompletionsMessageParams()  ← 此处缺失 reasoning_content
  → DeepSeek API 收到不带 reasoning_content 的请求
  → 400 错误
```

**诊断日志验证**：在 `AgentService.buildGraph.callModel` 中打印消息状态，确认第二轮调用时 AIMessage 的 `additional_kwargs.reasoning_content` **确实存在**（约 200-500 字），但 API 请求中未携带。

## 修复方案

在 `convertMessagesToCompletionsMessageParams` 函数中，于 `audio` 处理之前插入一行：

```diff
+ if (message.additional_kwargs.reasoning_content)
+     completionParam.reasoning_content = message.additional_kwargs.reasoning_content;
```

该修复同时应用于：
- `dist/converters/completions.cjs`（CommonJS，当前项目使用）
- `dist/converters/completions.js`（ESM，备选）

## 补丁文件

使用 pnpm 原生补丁机制管理：

**补丁文件**：`patches/@langchain__openai@1.4.7.patch`
**生成命令**：
```bash
pnpm patch @langchain/openai@1.4.7
# 复制修改后的文件到补丁目录
pnpm patch-commit <补丁目录路径>
```

**自动应用**：每次执行 `pnpm install` 时 pnpm 自动应用补丁，无需额外脚本。

## 升级注意事项

当 `@langchain/openai` 发布新版本（> 1.4.7）时：

1. 检查新版本是否已内置 `reasoning_content` 透传
2. 如果已修复：删除补丁文件，升级版本号
3. 如果未修复：重新生成补丁文件（补丁可能因行号变化而失效）

可通过以下命令验证补丁是否仍有效：
```bash
grep "reasoning_content.*completionParam" \
  node_modules/@langchain/openai/dist/converters/completions.cjs
```

## 影响范围

- **修复前**：所有触发工具调用的请求失败（旅行规划场景 100% 失败）
- **修复后**：工具调用链正常工作，思维链在前端正常展示
- **不影响**：不触发工具调用的简单问答（原本正常）

## 相关文件

| 文件 | 说明 |
|------|------|
| `patches/@langchain__openai@1.4.7.patch` | pnpm 补丁文件 |
| `src/agent/agent.service.ts` | Agent 主循环，流式输出 reasoning 事件 |
| `src/agent/agent.controller.ts` | SSE 端点，转发 reasoning 事件到前端 |
| `src/llm/create-chat-model.ts` | DeepSeek 模型工厂 |
