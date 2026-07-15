<template>
  <view class="sessions-page">
    <!-- 沉浸式导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: (statusBarHeight + 8) + 'px' }">
      <text class="nav-title">历史会话</text>
    </view>

    <!-- 空状态 -->
    <view class="empty-state" v-if="sessions.length === 0 && !loading"
      :style="{ paddingTop: (statusBarHeight + 200) + 'px' }"
    >
      <image
        class="empty-img"
        src="/static/hero/sessions-empty.png"
        mode="aspectFit"
      />
      <text class="empty-text">暂无历史会话</text>
      <text class="empty-sub">去「对话」页开始你的旅行规划吧</text>
    </view>

    <!-- 会话列表 -->
    <view class="session-list" v-else
      :style="{ paddingTop: (statusBarHeight + 80) + 'px' }"
    >
      <view
        v-for="(item, idx) in sessions"
        :key="item.id"
        class="session-card"
        @click="goChat(item.id)"
      >
        <view
          class="card-accent"
          :style="{ background: accentColors[idx % accentColors.length] }"
        />
        <view class="card-body">
          <view class="card-title-row">
            <text class="card-title">{{ item.title || '未命名会话' }}</text>
            <text class="card-time">{{ formatTime(item.updatedAt) }}</text>
          </view>
        </view>
        <wd-icon name="chevron-right" size="28rpx" color="#ccc" />
      </view>
    </view>

    <!-- 加载中 -->
    <view class="loading" v-if="loading">
      <text class="loading-text">加载中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listSessionsApi } from '@/api'
import { useUserStore, useChatStore } from '@/store'
import type { SessionItem } from '@/types/api'

const { statusBarHeight = 20 } = uni.getSystemInfoSync()

onShow(() => {
  const store = useUserStore()
  if (!store.userInfo?.accessToken) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }
  fetchSessions()
})

const sessions = ref<SessionItem[]>([])
const loading = ref(false)
const chatStore = useChatStore()

const accentColors = [
  'linear-gradient(180deg, #FF6B3D, #FF8F5E)',
  'linear-gradient(180deg, #4A90D9, #6DB3F2)',
  'linear-gradient(180deg, #52C41A, #73D13D)',
  'linear-gradient(180deg, #FAAD14, #FFC53D)',
  'linear-gradient(180deg, #9B59B6, #BB7FD6)',
]

async function fetchSessions() {
  loading.value = true
  try {
    const data = await listSessionsApi()
    sessions.value = data ?? []
  } catch {
    // 静默处理
  } finally {
    loading.value = false
  }
}

function goChat(sessionId: string) {
  chatStore.setPendingSession(sessionId)
  uni.switchTab({ url: '/pages/chat/index' })
}

function formatTime(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()

  if (diff < 86400000) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  if (diff < 604800000) {
    const days = ['日', '一', '二', '三', '四', '五', '六']
    return `周${days[d.getDay()]}`
  }
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<style scoped>
.sessions-page {
  min-height: 100vh;
  background: #F5F6FA;
  padding: 0 24rpx;
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
  background: transparent;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1A1A1A;
}

/* ======== 空状态 ======== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-img {
  width: 340rpx;
  height: 340rpx;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #666;
  font-weight: 500;
  margin-bottom: 10rpx;
}

.empty-sub {
  font-size: 26rpx;
  color: #999;
}

/* ======== 会话卡片 ======== */
.session-card {
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.session-card:active {
  background: #fafafa;
}

.card-accent {
  width: 6rpx;
  height: 56rpx;
  border-radius: 3rpx;
  margin-left: 24rpx;
  flex-shrink: 0;
}

.card-body {
  flex: 1;
  padding: 28rpx 20rpx 28rpx 20rpx;
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 30rpx;
  color: #1A1A1A;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 16rpx;
}

.card-time {
  font-size: 24rpx;
  color: #BBB;
  flex-shrink: 0;
}

/* ======== 加载 ======== */
.loading {
  text-align: center;
  padding: 60rpx;
}

.loading-text {
  font-size: 26rpx;
  color: #999;
}
</style>
