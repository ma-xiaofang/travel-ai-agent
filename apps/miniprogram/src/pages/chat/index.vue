<template>
  <view class="chat-page" :style="{ '--chat-font-size': aiFontSize + 'rpx' }">
    <!-- 沉浸式导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: (statusBarHeight + 8) + 'px' }">
      <text class="nav-title">途旅 AI</text>
    </view>

    <!-- 消息列表 -->
    <scroll-view
      class="msg-list"
      scroll-y
      :scroll-into-view="scrollToView"
      :scroll-with-animation="true"
      :style="{ paddingTop: (statusBarHeight + 72) + 'px' }"
    >
      <!-- 空状态 -->
      <view class="empty-state" v-if="messages.length === 0">
        <image
          class="empty-img"
          src="/static/hero/chat-empty.png"
          mode="aspectFit"
        />
        <text class="empty-title">Hi，想去哪里？</text>
        <text class="empty-sub">告诉我你的旅行计划，一切交给我</text>

        <view class="prompts-list">
          <view
            class="prompt-chip"
            v-for="p in quickPrompts"
            :key="p.text"
            @click="handleQuickPrompt(p.text)"
          >
            <text class="chip-emoji">{{ p.emoji }}</text>
            <text class="chip-text">{{ p.text }}</text>
          </view>
        </view>
      </view>

      <!-- 消息列表 -->
      <view
        v-for="(msg, idx) in messages"
        :key="idx"
        :id="'msg-' + idx"
        class="msg-wrapper"
        :class="msg.role"
      >
        <!-- 用户消息 -->
        <view v-if="msg.role === 'user'" class="user-msg">
          <text>{{ msg.content }}</text>
        </view>

        <!-- AI 消息 -->
        <view v-else class="ai-msg">
          <!-- 思维链 -->
          <view
            v-if="msg.reasoning"
            class="reasoning-box"
            @click="msg.reasoningOpen = !msg.reasoningOpen"
          >
            <view class="reasoning-header">
              <view class="reasoning-label">
                <text class="reasoning-dot" />
                <text>{{ msg.reasoningOpen ? '思考中...' : '思考完成' }}</text>
              </view>
              <text class="arrow">{{ msg.reasoningOpen ? '▾' : '▸' }}</text>
            </view>
            <view class="reasoning-content" v-if="msg.reasoningOpen">
              {{ msg.reasoning }}
            </view>
          </view>

          <!-- 正文：流式与最终均走 Markdown 渲染 -->
          <mp-html
            v-if="msg.content"
            :content="renderMarkdown(msg.content)"
            selectable
            :tag-style="tagStyle"
          />

          <!-- 打字光标 -->
          <text v-if="msg.streaming" class="typing-cursor">▎</text>
        </view>
      </view>

      <view id="msg-bottom" style="height: 20rpx"></view>
    </scroll-view>

    <!-- 底部输入区 -->
    <view class="input-bar">
      <view class="input-wrapper">
        <input
          class="msg-input"
          v-model="inputText"
          placeholder="输入你想去的地方..."
          placeholder-style="color:#bbb"
          confirm-type="send"
          :disabled="streaming"
          @confirm="handleSend"
        />
        <button
          v-if="!streaming"
          class="send-btn"
          :class="{ disabled: !inputText.trim() }"
          hover-class="none"
          @click="handleSend"
        >
          <image class="send-icon" src="/static/send.png" mode="aspectFit" />
        </button>
        <button v-else class="stop-btn" @click="abort">停止</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useChat, getHistoryApi } from '@/api'
import mpHtml from 'mp-html/dist/uni-app/components/mp-html/mp-html'
import { useUserStore, useChatStore } from '@/store'

/** mp-html 样式映射 */
const tagStyle: Record<string, string> = {
  p: 'margin:0 0 0.3em;line-height:1.45;font-size:var(--chat-font-size);color:#333',
  h1: 'margin:0.7em 0 0.3em;font-size:1.3em;font-weight:800;color:#1A1A1A;line-height:1.2',
  h2: 'margin:0.6em 0 0.3em;font-size:1.15em;font-weight:700;color:#1A1A1A;line-height:1.25',
  h3: 'margin:0.5em 0 0.25em;font-size:1em;font-weight:600;color:#1A1A1A;line-height:1.3',
  h4: 'margin:0.4em 0 0.2em;font-size:0.95em;font-weight:600;color:#333;line-height:1.3',
  ul: 'margin:0.2em 0 0.4em;padding-left:28rpx;list-style-type:disc',
  ol: 'margin:0.2em 0 0.4em;padding-left:28rpx;list-style-type:decimal',
  li: 'margin:0.1em 0;padding-left:4rpx;line-height:1.45;font-size:var(--chat-font-size);color:#333',
  code: 'background:#FFF5F0;padding:0.1em 0.3em;border-radius:0.15em;font-size:0.85em;color:#FF6B3D;font-family:monospace',
  pre: 'background:#F8F8F8;padding:0.5em 0.6em;border-radius:0.2em;margin:0.4em 0;overflow-x:auto;border:1rpx solid #F0F0F0;word-break:break-all;white-space:pre-wrap',
  'pre code': 'background:transparent;padding:0;color:#333;font-size:0.85em;word-break:break-all;white-space:pre-wrap',
  table: 'border-collapse:collapse;width:100%;margin:0.4em 0',
  th: 'background:#FFF5F0;color:#FF6B3D;font-weight:600;border:1rpx solid #FFE0D0;padding:0.3em 0.4em;text-align:left;font-size:0.95em',
  td: 'border:1rpx solid #F0F0F0;padding:0.3em 0.4em;text-align:left;font-size:0.95em',
  b: 'font-weight:700;color:#1A1A1A',
  i: 'font-style:italic',
  del: 'text-decoration:line-through;color:#999',
  blockquote: 'border-left:4rpx solid #FF6B3D;padding:0.4em 0.6em;margin:0.4em 0;color:#666;background:#FFF8F5;border-radius:0 8rpx 8rpx 0;font-size:var(--chat-font-size)',
  hr: 'border:none;border-top:1rpx solid #E0E0E0;margin:0.75em 0;height:1rpx',
  a: 'color:#FF6B3D;text-decoration:underline',
  img: 'max-width:100%;border-radius:8rpx;margin:0.4em 0',
}

/** 零依赖 Markdown → HTML，流式友好 */
function renderMarkdown(md: string): string {
  if (!md) return ''

  // 1. 转义 HTML
  let html = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // 2. 保护代码块 ```
  const codeBlocks: string[] = []
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, lang, code) => {
    const i = codeBlocks.length
    codeBlocks.push(`<pre><code>${code.replace(/\n$/, '')}</code></pre>`)
    return `\x00CB${i}\x00`
  })
  // 流式中的未闭合代码块
  html = html.replace(/```(\w*)\n?([\s\S]*)$/g, (_m, _lang, code) => {
    const i = codeBlocks.length
    codeBlocks.push(`<pre><code>${code}</code></pre>`)
    return `\x00CB${i}\x00`
  })

  // 3. 保护行内代码
  const inlineCodes: string[] = []
  html = html.replace(/`([^`]+)`/g, (_m, code) => {
    const i = inlineCodes.length
    inlineCodes.push(`<code>${code}</code>`)
    return `\x00IC${i}\x00`
  })

  // 4. 图片 ![alt](src)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1"/>')

  // 5. 链接 [text](href)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  // 6. 分割线
  html = html.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '<hr/>')

  // 7. 表格（在标题前处理，避免 | 被其他规则干扰）
  html = parseTable(html)

  // 8. 标题
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')

  // 9. 引用块
  const lines = html.split('\n')
  const out: string[] = []
  let inQuote = false
  let inUl = false
  let inOl = false

  for (const line of lines) {
    const trimmed = line.trim()

    // 引用
    const quote = trimmed.match(/^&gt;\s?(.*)$/)
    if (quote) {
      if (!inQuote) { out.push('<blockquote>'); inQuote = true }
      out.push(quote[1] || '&nbsp;')
      continue
    }
    if (inQuote) { out.push('</blockquote>'); inQuote = false }

    // 无序列表
    const ul = trimmed.match(/^[-*+]\s+(.+)$/)
    if (ul) {
      if (!inUl) { if (inOl) { out.push('</ol>'); inOl = false }; out.push('<ul>'); inUl = true }
      out.push(`<li>${ul[1]}</li>`)
      continue
    }

    // 有序列表
    const ol = trimmed.match(/^\d+\.\s+(.+)$/)
    if (ol) {
      if (!inOl) { if (inUl) { out.push('</ul>'); inUl = false }; out.push('<ol>'); inOl = true }
      out.push(`<li>${ol[1]}</li>`)
      continue
    }

    // 关闭列表
    if (inUl) { out.push('</ul>'); inUl = false }
    if (inOl) { out.push('</ol>'); inOl = false }

    out.push(line)
  }
  if (inUl) out.push('</ul>')
  if (inOl) out.push('</ol>')
  if (inQuote) out.push('</blockquote>')
  html = out.join('\n')

  // 10. 行内格式：加粗、斜体、删除线（先处理 *** 再 ** 再 *）
  html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<b><i>$1</i></b>')
  html = html.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
  // 此时 ** 已全部消除，剩余的 * 必为斜体
  html = html.replace(/\*([^*]+)\*/g, '<i>$1</i>')
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>')

  // 11. 段落：双换行分段
  const blocks = html.split(/\n\n+/)
  html = blocks.map((block) => {
    const t = block.trim()
    if (!t) return ''
    // 已是块级标签，不再包裹
    if (/^<(h[1-4]|ul|ol|pre|blockquote|hr|table|div|p)\b/.test(t)) return t
    if (/\x00CB\d+\x00/.test(t)) return t
    return `<p>${t}</p>`
  }).filter(Boolean).join('\n')

  // 12. 段落内单换行 → <br>
  html = html.replace(/\n/g, '<br>')

  // 13. 恢复代码块和行内代码
  codeBlocks.forEach((cb, i) => {
    html = html.replace(`\x00CB${i}\x00`, cb)
  })
  inlineCodes.forEach((ic, i) => {
    html = html.replace(`\x00IC${i}\x00`, ic)
  })

  return html
}

/** 解析 GFM 表格 */
function parseTable(html: string): string {
  const lines = html.split('\n')
  const result: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()

    // 检测表格行：含 | 且不是代码占位符
    const isTableRow = (l: string) => {
      const t = l.trim()
      return !t.startsWith('\x00') && t.includes('|') && t.split('|').length >= 3
    }
    // 分隔行：|---|---|
    const isSeparator = (l: string) => {
      const t = l.trim()
      return /^\|?[\s:|-]+\|[\s:|-]+\|?[\s:|-]*$/.test(t) && t.includes('-')
    }

    if (isTableRow(line) && i + 1 < lines.length && isSeparator(lines[i + 1].trim())) {
      // 解析表头
      const headerCells = line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      let table = '<table><thead><tr>'
      headerCells.forEach((c) => { table += `<th>${c}</th>` })
      table += '</tr></thead><tbody>'

      i += 2 // 跳过表头和分隔行

      // 解析数据行
      while (i < lines.length && isTableRow(lines[i].trim())) {
        const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
        table += '<tr>'
        cells.forEach((c) => { table += `<td>${c}</td>` })
        table += '</tr>'
        i++
      }
      table += '</tbody></table>'
      result.push(table)
    } else {
      result.push(lines[i])
      i++
    }
  }
  return result.join('\n')
}

const { statusBarHeight = 20, windowWidth = 375 } = uni.getSystemInfoSync()
// 以 13px 物理字号为基准，在不同宽度设备上保持舒适阅读大小
const aiFontSize = Math.round((13 * 750) / windowWidth)

onShow(() => {
  const store = useUserStore()
  if (!store.userInfo?.accessToken) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }

  const pendingId = chatStore.pendingSessionId
  if (pendingId) {
    loadSessionHistory(pendingId)
    chatStore.clearPendingSession()
  }
})

const { content, reasoning, sessionId, streaming, send, abort } = useChat()
const chatStore = useChatStore()

const inputText = ref('')
const scrollToView = ref('')

interface Message {
  role: 'user' | 'ai'
  content: string
  reasoning?: string
  reasoningOpen?: boolean
  streaming?: boolean
}
const messages = reactive<Message[]>([])

const quickPrompts = [
  { emoji: '🗺️', text: '推荐北京三日游路线' },
  { emoji: '🌸', text: '东京赏樱季节全攻略' },
  { emoji: '💰', text: '估算巴厘岛一周旅行预算' },
  { emoji: '🧳', text: '帮我生成出国旅行打包清单' },
]

let aiMsgIndex = -1

async function loadSessionHistory(id: string) {
  sessionId.value = id
  messages.splice(0, messages.length)

  try {
    const data = await getHistoryApi(id)
    if (!data?.messages?.length) return

    data.messages.forEach((m) => {
      const role = m.role === 'USER' ? 'user' : 'ai'
      messages.push({
        role,
        content: m.content,
        streaming: false,
      })
    })
  } catch {
    // 静默处理
  }

  nextTick(scrollToBottom)
}

function handleSend() {
  const text = inputText.value.trim()
  if (!text || streaming.value) return

  messages.push({ role: 'user', content: text })
  inputText.value = ''

  messages.push({ role: 'ai', content: '', reasoning: '', reasoningOpen: false, streaming: true })
  aiMsgIndex = messages.length - 1

  scrollToBottom()
  send(text, sessionId.value)
  watchStream()
}

function handleQuickPrompt(prompt: string) {
  inputText.value = prompt
  handleSend()
}

function scrollToBottom() {
  nextTick(() => {
    scrollToView.value = 'msg-bottom'
  })
}

let watchTimer: ReturnType<typeof setInterval> | null = null

function watchStream() {
  watchTimer = setInterval(() => {
    if (aiMsgIndex < 0) return
    const msg = messages[aiMsgIndex]
    if (!msg) return

    msg.content = content.value
    msg.reasoning = reasoning.value
    if (reasoning.value && msg.reasoningOpen === false && msg.reasoning === '') {
      msg.reasoningOpen = true
    }
    scrollToBottom()

    if (!streaming.value) {
      msg.streaming = false
      if (watchTimer) {
        clearInterval(watchTimer)
        watchTimer = null
      }
      aiMsgIndex = -1
    }
  }, 50)
}
</script>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #F5F6FA;
  overflow-x: hidden;
}

/* ======== 沉浸式导航栏 ======== */
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 12rpx;
  background: rgba(245, 246, 250, 0.85);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1A1A1A;
}

/* ======== 消息列表 ======== */
.msg-list {
  flex: 1;
  padding: 0;
  overflow-x: hidden;
}
.msg-list ::v-deep ._root {
  overflow-x: hidden;
  word-break: break-word;
}

/* ======== 空状态 ======== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 32rpx 0;
}

.empty-img {
  width: 360rpx;
  height: 360rpx;
  margin-bottom: 20rpx;
}

.empty-title {
  font-size: 38rpx;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 10rpx;
}

.empty-sub {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 40rpx;
}

/* ======== 快捷提示列表 ======== */
.prompts-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.prompt-chip {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 22rpx 28rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  border-left: 6rpx solid #FF6B3D;
  transition: all 0.15s;
}

.prompt-chip:active {
  background: #FFF8F5;
  transform: scale(0.98);
}

.chip-emoji {
  font-size: 36rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.chip-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.4;
}

/* ======== 消息区（无气泡） ======== */
.msg-wrapper {
  margin-bottom: 20rpx;
  padding: 0 32rpx;
  display: flex;
  overflow-x: hidden;
}

.msg-wrapper.user {
  justify-content: flex-end;
}

.msg-wrapper.ai {
  justify-content: center;
}

/* 用户消息 — 主题色气泡 */
.user-msg {
  max-width: 75%;
  padding: 16rpx 28rpx;
  background: linear-gradient(135deg, #FF6B3D, #FF8F5E);
  border-radius: 24rpx 4rpx 24rpx 24rpx;
  color: #fff;
  font-size: 28rpx;
  font-weight: 500;
  line-height: 1.5;
  word-break: break-all;
}

/* AI 消息 — 居中全宽排版，字号自适应 */
.ai-msg {
  width: 100%;
  box-sizing: border-box;
  font-size: var(--chat-font-size);
  line-height: 1.65;
  color: #333;
  word-break: break-word;
}

/* ======== 思维链 ======== */
.reasoning-box {
  background: #FAFAFA;
  border-radius: 10rpx;
  padding: 10rpx 14rpx;
  margin-bottom: 10rpx;
}

.reasoning-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 24rpx;
  color: #999;
}

.reasoning-label {
  display: flex;
  align-items: center;
}

.reasoning-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 5rpx;
  background: #FF6B3D;
  margin-right: 8rpx;
}

.arrow {
  font-size: 20rpx;
  color: #ccc;
}

.reasoning-content {
  margin-top: 8rpx;
  font-size: 0.85em;
  color: #999;
  line-height: 1.5;
  padding-top: 8rpx;
  border-top: 1rpx solid #EEE;
}

/* ======== 打字光标 ======== */
.typing-cursor {
  animation: blink 1s infinite;
  color: #FF6B3D;
  font-weight: 700;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* ======== 底部输入区 ======== */
.input-bar {
  padding: 20rpx 24rpx;
  background: #fff;
  border-top: 1rpx solid #F0F0F0;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.04);
}

.input-wrapper {
  display: flex;
  align-items: center;
  background: #F5F6FA;
  border-radius: 40rpx;
  padding: 6rpx 6rpx 6rpx 24rpx;
}

.msg-input {
  flex: 1;
  height: 72rpx;
  font-size: 30rpx;
  line-height: 72rpx;
}

.send-btn {
  width: 80rpx;
  height: 80rpx;
  background: linear-gradient(135deg, #FF6B3D, #FF8F5E);
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: none;
  padding: 0;
  margin: 0;
  transition: opacity 0.2s;
}

.send-btn::after {
  border: none;
}

.send-btn.disabled {
  opacity: 0.35;
}

.send-icon {
  width: 40rpx;
  height: 40rpx;
  opacity: 0.95;
}

.stop-btn {
  height: 80rpx;
  padding: 0 20rpx;
  background: #EEE;
  color: #999;
  font-size: 28rpx;
  border-radius: 40rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stop-btn::after {
  border: none;
}
</style>
