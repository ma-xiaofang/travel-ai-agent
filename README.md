# 途旅 AI · React Native (Expo) 客户端

「途旅 AI 旅行助手」的 React Native 移动端。基于 **Expo SDK 57 + expo-router + TypeScript**，独立分支（`react-native`）从零初始化，对接仓库内 `apps/server`（NestJS）提供的旅行规划智能体 API。

## 快速开始

```bash
npm install        # 安装依赖
cp .env.example .env   # 自定义后端地址（真机调试改局域网 IP）
npm start          # 启动 Expo 开发服务器（a=Android / i=iOS / w=Web）
```

`EXPO_PUBLIC_API_URL` 指向 `apps/server` 服务（默认 `http://localhost:3000`），真机调试请改为电脑局域网 IP。

## 功能

- 账号体系：注册 / 登录（用户名·邮箱·手机号）、JWT + Refresh Token 自动刷新
- 对话：SSE 流式输出（text / reasoning / session / done / error 事件），含思考过程折叠、流式中止；SSE 不可用时保留非流式接口兜底
- 历史会话：会话列表、历史消息加载、清空会话
- 我的：服务健康检测、服务器地址展示、退出登录
- 明暗主题跟随系统

## 目录结构

```
src/
├── api/          # 对接层：http 客户端、token 存储、SSE、auth/agent API
├── app/          # expo-router 路由（login、(tabs)/chat·history·profile）
├── components/   # 通用组件
├── constants/    # 主题常量
├── hooks/        # 主题 hooks
├── lib/          # 工具函数
└── stores/       # auth 状态、跨页会话通信
```

## 后端协议约定（与 apps/server 对齐）

- 统一响应包 `{ code, message, data }`；错误经 `ApiError` 抛出
- 鉴权头 `Authorization: Bearer <accessToken>`
- 401 自动刷新（`POST /api/auth/refresh`，单飞）并重放原请求
- 流式接口 `POST /api/agent/chat/stream` 返回 SSE
