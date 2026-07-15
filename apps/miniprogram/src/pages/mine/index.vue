<template>
  <view class="mine-page">
    <!-- Hero 区域 -->
    <view class="hero-section">
      <image class="hero-bg" src="/static/hero/mine-bg.png" mode="aspectFill" />
      <view class="hero-overlay" />
      <view class="hero-content" :style="{ paddingTop: (statusBarHeight + 16) + 'px' }">
        <view class="avatar-ring">
          <view class="avatar">
            <wd-icon name="user-circle" size="56rpx" color="#fff" />
          </view>
        </view>
        <text class="nickname">{{ userInfo.userName || '旅行者' }}</text>
        <text class="user-id" v-if="userInfo.userId">ID: {{ userInfo.userId.slice(0, 8) }}...</text>
      </view>
    </view>

    <!-- 菜单区 -->
    <view class="menu-section">
      <view class="menu-card">
        <view class="menu-item" @click="goChat">
          <view class="menu-icon-wrap" style="background: #FFF0E8">
            <wd-icon name="chat1" size="36rpx" color="#FF6B3D" />
          </view>
          <text class="menu-label">开始新对话</text>
          <text class="menu-hint">规划一段新的旅程</text>
          <wd-icon name="chevron-right" size="28rpx" color="#ccc" />
        </view>

        <view class="menu-divider" />

        <view class="menu-item" @click="showAbout">
          <view class="menu-icon-wrap" style="background: #E8F4FF">
            <wd-icon name="info-circle" size="36rpx" color="#4A90D9" />
          </view>
          <text class="menu-label">关于途旅</text>
          <text class="menu-hint">了解我们的故事</text>
          <wd-icon name="chevron-right" size="28rpx" color="#ccc" />
        </view>
      </view>
    </view>

    <!-- 退出登录 -->
    <view class="logout-section">
      <button class="logout-btn" @click="handleLogout">退出登录</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed } from 'vue'
import { useUserStore } from '@/store'
import { logoutApi } from '@/api'

const { statusBarHeight = 20 } = uni.getSystemInfoSync()

const store = useUserStore()
const userInfo = computed(() => store.userInfo)

onShow(() => {
  if (!userInfo.value?.accessToken) {
    uni.reLaunch({ url: '/pages/login/index' })
  }
})

function goChat() {
  uni.switchTab({ url: '/pages/chat/index' })
}

function showAbout() {
  uni.showModal({
    title: '途旅 AI',
    content: '基于多 Agent 协同的 AI 旅行规划助手，覆盖天气、景点、行程、预算、签证等旅行全流程。',
    showCancel: false,
    confirmText: '知道了',
  })
}

async function handleLogout() {
  const res = await uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
  })
  if (!res.confirm) return

  try {
    await logoutApi()
  } catch {
    store.clearUserInfo()
  }
  uni.reLaunch({ url: '/pages/login/index' })
}
</script>

<style scoped>
.mine-page {
  min-height: 100vh;
  background: #F5F6FA;
}

/* ======== Hero 区域 ======== */
.hero-section {
  position: relative;
  width: 100%;
  height: 400rpx;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.25) 0%,
    rgba(0, 0, 0, 0.15) 50%,
    rgba(0, 0, 0, 0.45) 100%
  );
}

.hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

/* ======== 头像 ======== */
.avatar-ring {
  width: 136rpx;
  height: 136rpx;
  border-radius: 68rpx;
  border: 3rpx solid rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  background: rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.nickname {
  font-size: 38rpx;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
}

.user-id {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 10rpx;
}

/* ======== 菜单 ======== */
.menu-section {
  padding: 0 24rpx;
  margin-top: -30rpx;
  position: relative;
  z-index: 3;
}

.menu-card {
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 28rpx 32rpx;
  position: relative;
}

.menu-item:active {
  background: #fafafa;
}

.menu-divider {
  height: 1rpx;
  background: #F5F5F5;
  margin: 0 32rpx;
}

/* ======== 菜单图标 ======== */
.menu-icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.menu-label {
  font-size: 30rpx;
  color: #1A1A1A;
  font-weight: 500;
}

.menu-hint {
  font-size: 24rpx;
  color: #BBB;
  margin-left: 12rpx;
  flex: 1;
}

/* ======== 退出 ======== */
.logout-section {
  margin: 48rpx 24rpx;
  padding-bottom: env(safe-area-inset-bottom);
}

.logout-btn {
  width: 100%;
  height: 92rpx;
  background: #fff;
  color: #FF6B3D;
  font-size: 30rpx;
  font-weight: 500;
  border-radius: 20rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.logout-btn::after {
  border: none;
}

.logout-btn:active {
  background: #FFF5F0;
}
</style>
