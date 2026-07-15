# 途旅 AI 项目记忆

## 项目结构
- `apps/server` — NestJS 后端 (SSE 流式对话、多 Agent 协同)
- `apps/admin-ui` — Vue 3 管理后台
- `apps/miniprogram` — uni-app (Vue 3) 微信小程序
- 包管理: pnpm monorepo

## 小程序设计规范
- **主色**: `#FF6B3D` (珊瑚橙)
- **渐变**: `#FF6B3D → #FF8F5E`
- **背景**: `#F5F6FA`
- **圆角体系**: sm=6rpx, base=12rpx, md=16rpx, lg=20rpx, xl=28rpx
- **字体**: PingFang SC → Microsoft YaHei 降级
- **导航**: 全页面 `navigationStyle: "custom"` 沉浸式；`pages.config.ts` 是路由配置唯一源文件（由 `@uni-helper/vite-plugin-uni-pages` 生成 `pages.json`）
- **状态栏适配**: 各页面通过 `uni.getSystemInfoSync().statusBarHeight` 动态计算 `paddingTop`

## 小程序页面
| 页面 | 文件 | 导航 | 状态栏文字 | 特点 |
|------|------|------|------------|------|
| 对话 | `pages/chat/index` | 自定义沉浸式 | black | Tab 首页, SSE 流式, 零依赖正则 MD→HTML, mp-html 渲染 |
| 登录 | `pages/login/index` | 自定义沉浸式 | white | Hero 背景图, 玻璃拟态卡片 |
| 会话列表 | `pages/sessions/index` | 自定义沉浸式 | black | 彩色装饰条卡片 |
| 我的 | `pages/mine/index` | 自定义沉浸式 | white | Hero 背景图, 菜单悬浮卡片 |

## 素材资源
- Hero 图片 + 空状态插画: `src/static/hero/` (AI 生成, 已裁剪水印)
- Tabbar 图标: `src/static/tabbar/` (96x96 PNG, Python Pillow 生成)

## 关键依赖
- wot-design-uni (wd-* 组件)
- mp-html (HTML 渲染，tag-style 必须用 `:tag-style="obj"` 对象绑定)
- 状态管理: Pinia (useUserStore, useChatStore)

## 小程序 Markdown 渲染
- **方案**: 零依赖纯正则 `renderMarkdown()`，不使用 marked/x-markdown-mini
- **原因**: marked 编译后依赖 `@swc/helpers` 小程序找不到；x-markdown-mini 的 `parse()` 运行时抛 `TypeError: Function.prototype.toString`
- **标签**: 用 `<b>`/`<i>`/`<del>` 替代 `<strong>`/`<em>`（mp-html trustTags 支持）
- **流式友好**: 未闭合代码块单独处理，不完整 markdown 不会崩溃
