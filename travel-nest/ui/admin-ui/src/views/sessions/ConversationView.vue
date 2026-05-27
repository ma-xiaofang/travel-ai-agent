<template>
  <div class="conversation-layout">
    <!-- 左侧：会话列表 -->
    <div class="session-panel">
      <div class="panel-head">
        <h3><el-icon><ChatDotRound /></el-icon> 会话列表</h3>
        <el-button size="small" type="primary" :icon="Plus" @click="startNewChat">新建对话</el-button>
      </div>
      <div class="panel-search">
        <el-input
          v-model="searchWord"
          placeholder="搜索会话..."
          :prefix-icon="Search"
          clearable
          size="small"
        />
      </div>
      <div class="session-scroll" v-loading="sessionsLoading">
        <div
          v-for="s in filteredSessions"
          :key="s.id"
          :class="['session-card', { active: selectedId === s.id }]"
          @click="openSession(s)"
        >
          <div class="session-card-top">
            <span class="session-title">{{ s.title?.trim() || '新会话' }}</span>
            <span class="session-count">{{ s.messageCount ?? 0 }} 条</span>
          </div>
          <div class="session-card-bottom">
            <span class="session-user">{{ s.userLabel }}</span>
            <span class="session-time">{{ formatTime(s.updatedAt) }}</span>
          </div>
        </div>
        <el-empty v-if="!sessionsLoading && filteredSessions.length === 0" :description="searchWord ? '未找到匹配会话' : '暂无会话'" />
      </div>
    </div>

    <!-- 右侧：对话消息 -->
    <div class="chat-panel">
      <!-- 空状态 -->
      <div v-if="!detail" class="chat-empty">
        <div class="empty-box">
          <el-icon :size="52" color="#c8ccd2"><ChatDotRound /></el-icon>
          <p class="empty-title">选择会话查看对话</p>
          <p class="empty-sub">从左侧列表中选择一个会话，查看完整对话记录</p>
        </div>
      </div>

      <template v-else>
        <!-- 顶部会话信息 -->
        <div class="chat-header">
          <div class="chat-header-info">
            <strong>{{ detail.session.title?.trim() || '新会话' }}</strong>
            <span class="chat-header-meta">
              {{ detail.session.userLabel }} · {{ detail.messages.length }} 条消息 · {{ formatTime(detail.session.updatedAt) }}
            </span>
          </div>
        </div>

        <!-- 消息气泡区 -->
        <div class="chat-messages" ref="msgScrollRef" v-loading="detailLoading">
          <div v-if="detail.messages.length === 0 && !streaming" class="chat-empty-inner">
            暂无消息
          </div>
          <div
            v-for="(msg, idx) in detail.messages"
            :key="idx"
            :class="['msg-bubble-row', msg.role]"
          >
            <div class="msg-body">
              <div class="msg-role-label">
                {{ msg.role === 'user' ? '用户' : 'AI 助手' }}
                <span class="msg-time">{{ formatTime(msg.createdAt) }}</span>
              </div>
              <!-- 思维链 -->
              <div
                v-if="msg.role === 'assistant' && msg.reasoning"
                class="reasoning-block"
              >
                <button
                  type="button"
                  class="reasoning-toggle"
                  @click="msg.reasoningCollapsed = !msg.reasoningCollapsed"
                >
                  <span class="reasoning-arrow" :class="{ expanded: !msg.reasoningCollapsed }">▶</span>
                  <span>思考过程</span>
                </button>
                <pre v-show="!msg.reasoningCollapsed" class="reasoning-text">{{ msg.reasoning }}</pre>
              </div>
              <div class="msg-content">
                <MarkdownBody v-if="msg.role === 'assistant'" :source="msg.content" />
                <p v-else>{{ msg.content }}</p>
              </div>
            </div>
          </div>
          <!-- 流式生成中的临时消息 -->
          <div v-if="streaming" class="msg-bubble-row assistant">
            <div class="msg-body">
              <div class="msg-role-label">
                AI 助手
                <span class="msg-time streaming-tag">生成中…</span>
              </div>
              <!-- 流式思维链 -->
              <div v-if="streamingReasoning" class="reasoning-block streaming">
                <div class="reasoning-toggle">
                  <span class="reasoning-arrow expanded">▶</span>
                  <span>思考过程</span>
                  <span class="streaming-tag">进行中</span>
                </div>
                <pre class="reasoning-text">{{ streamingReasoning }}</pre>
              </div>
              <div class="msg-content">
                <MarkdownBody v-if="streamingContent" :source="streamingContent" />
                <div v-else class="typing-dots">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部输入区 -->
        <div class="chat-input-bar">
          <div class="input-wrapper">
            <textarea
              v-model="inputText"
              class="input-textarea"
              placeholder="输入消息，以管理员身份与 AI 对话…"
              rows="1"
              :disabled="streaming"
              @keydown.enter.exact.prevent="handleSend"
            />
            <button
              :class="['send-btn', { disabled: !canSend }]"
              :disabled="!canSend"
              @click="handleSend"
            >
              发送
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { ChatDotRound, Search, Plus } from '@element-plus/icons-vue'
import { listSessions, getSessionDetail } from '@/api/sessions'
import MarkdownBody from '@/components/MarkdownBody.vue'

/** 格式化时间 */
function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const t = d.getTime()
  if (t >= start) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (t >= start - 86400000) return '昨天'
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

/** 获取 admin token */
function getAdminToken() {
  return localStorage.getItem('adminAccessToken') || ''
}

/** 从 JWT 解析 admin userId（sub 字段） */
function getAdminUserId() {
  const token = getAdminToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.sub ?? null
  } catch {
    return null
  }
}

const sessions = ref([])
const sessionsLoading = ref(false)
const searchWord = ref('')

const selectedId = ref(null)
const detail = ref(null)
const detailLoading = ref(false)
const msgScrollRef = ref(null)

/** 输入与流式状态 */
const inputText = ref('')
const streaming = ref(false)
const streamingContent = ref('')
const streamingReasoning = ref('')
let abortController = null

const canSend = computed(() => inputText.value.trim().length > 0 && !streaming.value)

const filteredSessions = computed(() => {
  if (!searchWord.value.trim()) return sessions.value
  const kw = searchWord.value.trim().toLowerCase()
  return sessions.value.filter(
    s =>
      (s.title || '').toLowerCase().includes(kw) ||
      (s.userLabel || '').toLowerCase().includes(kw) ||
      s.id.toLowerCase().includes(kw),
  )
})

/** 滚动到消息底部 */
function scrollToBottom() {
  nextTick(() => {
    if (msgScrollRef.value) {
      msgScrollRef.value.scrollTop = msgScrollRef.value.scrollHeight
    }
  })
}

async function fetchSessions() {
  sessionsLoading.value = true
  try {
    const adminUserId = getAdminUserId()
    const res = await listSessions({ page: 1, pageSize: 50, userId: adminUserId })
    sessions.value = res.data?.items ?? []
  } catch {
    ElMessage.error('加载会话列表失败')
  } finally {
    sessionsLoading.value = false
  }
}

/** 新建空白对话 */
function startNewChat() {
  stopStream()
  selectedId.value = null
  detail.value = {
    session: { title: '新对话', userLabel: 'admin', messageCount: 0, updatedAt: new Date().toISOString() },
    messages: [],
  }
}

/** 停止流式 */
function stopStream() {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
  streaming.value = false
  streamingContent.value = ''
}

async function openSession(session) {
  if (selectedId.value === session.id) return
  selectedId.value = session.id
  detailLoading.value = true
  detail.value = null
  try {
    const res = await getSessionDetail(session.id)
    detail.value = res.data
    scrollToBottom()
  } catch {
    ElMessage.error('加载会话详情失败')
  } finally {
    detailLoading.value = false
  }
}

/** 流式发送消息 */
async function handleSend() {
  const text = inputText.value.trim()
  if (!text || streaming.value) return

  inputText.value = ''
  streaming.value = true
  streamingContent.value = ''

  // 添加用户消息到列表
  detail.value.messages.push({ role: 'user', content: text, createdAt: new Date().toISOString() })
  scrollToBottom()

  abortController = new AbortController()

  try {
    const resp = await fetch('/api/agent/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminToken()}`,
      },
      body: JSON.stringify({
        message: text,
        sessionId: selectedId.value || undefined, // 新建对话不传 sessionId
      }),
      signal: abortController.signal,
    })

    if (!resp.ok) {
      ElMessage.error(`请求失败：HTTP ${resp.status}`)
      return
    }

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'reasoning') {
            streamingReasoning.value += data.content
            scrollToBottom()
          } else if (data.type === 'text') {
            streamingContent.value += data.content
            scrollToBottom()
          } else if (data.type === 'session') {
            // 后端返回 sessionId（新建会话时）
            if (data.sessionId) {
              selectedId.value = data.sessionId
              detail.value.session.title = detail.value.session.title || '新对话'
            }
          } else if (data.type === 'done') {
            // 流结束
          } else if (data.type === 'error') {
            ElMessage.error(data.message)
          }
        } catch { /* ignore parse errors */ }
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      ElMessage.error(err.message)
    }
  } finally {
    // 将流式内容固化为 AI 消息
    if (streamingContent.value || streamingReasoning.value) {
      detail.value.messages.push({
        role: 'assistant',
        content: streamingContent.value,
        reasoning: streamingReasoning.value || undefined,
        reasoningCollapsed: true, // 流结束后默认折叠
        createdAt: new Date().toISOString(),
      })
    }
    streaming.value = false
    streamingContent.value = ''
    streamingReasoning.value = ''
    abortController = null
    scrollToBottom()
    // 刷新会话列表以更新消息数
    fetchSessions()
  }
}

onMounted(() => {
  fetchSessions()
})
</script>

<style scoped>
.conversation-layout {
  display: flex;
  height: calc(100vh - 60px - 40px);
  background: #fff;
  border-radius: 4px;
  overflow: hidden;
}

/* ======== 左侧会话列表 ======== */
.session-panel {
  width: 300px;
  min-width: 280px;
  border-right: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
}

.panel-head {
  padding: 10px 12px;
  border-bottom: 1px solid #f0f1f3;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-head h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 6px;
}

.panel-search {
  padding: 10px 12px;
  border-bottom: 1px solid #f0f1f3;
}

.session-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.session-card {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 3px;
  transition: background 0.15s;
  border: 1px solid transparent;
}

.session-card:hover {
  background: #f5f7fa;
}

.session-card.active {
  background: #ecf5ff;
  border-color: #b3d8ff;
}

.session-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.session-title {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.session-count {
  font-size: 11px;
  color: #909399;
  flex-shrink: 0;
  margin-left: 8px;
}

.session-card-bottom {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #a8abb2;
}

.session-user {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.session-time {
  flex-shrink: 0;
  margin-left: 8px;
}

/* ======== 右侧对话面板 ======== */
.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #fafbfc;
}

.chat-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-box {
  text-align: center;
}

.empty-title {
  margin: 12px 0 6px;
  font-size: 16px;
  font-weight: 500;
  color: #606266;
}

.empty-sub {
  margin: 0;
  font-size: 13px;
  color: #a8abb2;
}

/* 顶部信息条 */
.chat-header {
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

.chat-header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chat-header-info strong {
  font-size: 14px;
  color: #303133;
}

.chat-header-meta {
  font-size: 12px;
  color: #909399;
}

/* 消息区 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.chat-empty-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #a8abb2;
  font-size: 13px;
}

/* 消息行 */
.msg-bubble-row {
  margin-bottom: 24px;
  max-width: 800px;
}

.msg-body {
  min-width: 0;
}

.msg-role-label {
  font-size: 12px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.msg-bubble-row.assistant .msg-role-label {
  color: #67c23a;
}

.msg-time {
  font-weight: 400;
  color: #c0c4cc;
  font-size: 11px;
}

.streaming-tag {
  color: #67c23a;
  font-weight: 500;
}

.msg-content {
  font-size: 13.5px;
  line-height: 1.7;
  color: #303133;
  word-break: break-word;
}

.msg-content p {
  margin: 0;
  white-space: pre-wrap;
}

/* 思维链 */
.reasoning-block {
  margin-bottom: 8px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e0d6f0;
  background: #f9f6fd;
}

.reasoning-block.streaming {
  border-color: #d4e6c3;
  background: #f8fdf5;
}

.reasoning-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 10px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12px;
  color: #7c6ba0;
  text-align: left;
}

.reasoning-toggle:hover {
  background: rgba(0, 0, 0, 0.03);
}

.reasoning-arrow {
  font-size: 8px;
  transition: transform 0.2s ease;
  display: inline-block;
}

.reasoning-arrow.expanded {
  transform: rotate(90deg);
}

.reasoning-text {
  margin: 0;
  padding: 8px 12px 10px;
  border-top: 1px solid #e0d6f0;
  font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #5a4e6e;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 320px;
  overflow-y: auto;
}

/* 打字动画 */
.typing-dots {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #c0c4cc;
  animation: dot-bounce 1.4s infinite ease-in-out both;
}

.typing-dots span:nth-child(1) { animation-delay: -0.32s; }
.typing-dots span:nth-child(2) { animation-delay: -0.16s; }
.typing-dots span:nth-child(3) { animation-delay: 0s; }

@keyframes dot-bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* 输入区 */
.chat-input-bar {
  padding: 12px 24px 16px;
  background: #fff;
  border-top: 1px solid #ebeef5;
  flex-shrink: 0;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  background: #f5f7fa;
  border-radius: 12px;
  padding: 8px 10px;
  border: 1px solid #e4e7ed;
  transition: border-color 0.2s;
}

.input-wrapper:focus-within {
  border-color: #409eff;
}

.input-textarea {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  resize: none;
  font-size: 13.5px;
  line-height: 1.5;
  color: #303133;
  min-height: 24px;
  max-height: 120px;
  font-family: inherit;
  padding: 4px 0;
}

.input-textarea::placeholder {
  color: #c0c4cc;
}

.send-btn {
  flex-shrink: 0;
  padding: 5px 18px;
  border: none;
  border-radius: 8px;
  background: #409eff;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.send-btn:hover:not(.disabled) {
  background: #337ecc;
}

.send-btn.disabled {
  background: #a0cfff;
  cursor: not-allowed;
}
</style>
