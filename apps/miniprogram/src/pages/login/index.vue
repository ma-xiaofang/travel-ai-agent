<template>
  <view class="login-page">
    <!-- Hero 背景图 -->
    <image class="hero-bg" src="/static/hero/login-bg.png" mode="aspectFill" />
    <view class="hero-overlay" />

    <!-- 主体内容 -->
    <view class="login-content" :style="{ paddingTop: (statusBarHeight + 30) + 'px' }">
      <!-- 品牌区 -->
      <view class="brand-area">
        <view class="logo-backdrop">
          <image class="brand-logo" src="/static/hero/logo.png" mode="aspectFit" />
        </view>
        <text class="brand-name">途旅 AI</text>
        <text class="brand-desc">探索世界，从一次对话开始</text>
      </view>

      <!-- 表单卡片（玻璃拟态） -->
      <view class="form-card">
        <!-- 切换标签 -->
        <view class="tab-row">
          <view
            class="tab-item"
            :class="{ active: mode === 'login' }"
            @click="mode = 'login'"
          >
            <text>登录</text>
          </view>
          <view
            class="tab-item"
            :class="{ active: mode === 'register' }"
            @click="mode = 'register'"
          >
            <text>注册</text>
          </view>
          <view class="tab-slider" :class="{ right: mode === 'register' }" />
        </view>

        <!-- 用户名 -->
        <view class="input-group">
          <text class="input-label">用户名</text>
          <input
            class="input-field"
            v-model="form.username"
            placeholder="请输入用户名"
            placeholder-style="color:#bbb"
          />
        </view>

        <!-- 邮箱（仅注册） -->
        <view class="input-group" v-if="mode === 'register'">
          <text class="input-label">邮箱</text>
          <input
            class="input-field"
            v-model="form.email"
            placeholder="请输入邮箱"
            placeholder-style="color:#bbb"
          />
        </view>

        <!-- 密码 -->
        <view class="input-group">
          <text class="input-label">密码</text>
          <input
            class="input-field"
            v-model="form.password"
            password
            placeholder="请输入密码"
            placeholder-style="color:#bbb"
          />
        </view>

        <!-- 提交 -->
        <button class="submit-btn" :loading="loading" @click="handleSubmit">
          {{ mode === 'login' ? '登 录' : '注 册' }}
        </button>
      </view>

      <!-- 底部切换提示 -->
      <view class="footer-tip" v-if="mode === 'login'">
        还没有账号？<text class="link" @click="mode = 'register'">立即注册</text>
      </view>
      <view class="footer-tip" v-else>
        已有账号？<text class="link" @click="mode = 'login'">去登录</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { loginApi, registerApi } from '@/api'

const mode = ref<'login' | 'register'>('login')
const loading = ref(false)

const { statusBarHeight = 20 } = uni.getSystemInfoSync()

const form = reactive({
  username: '',
  email: '',
  password: '',
})

async function handleSubmit() {
  if (!form.username.trim()) {
    uni.showToast({ title: '请输入用户名', icon: 'none' })
    return
  }
  if (mode.value === 'register' && !form.email.trim()) {
    uni.showToast({ title: '请输入邮箱', icon: 'none' })
    return
  }
  if (!form.password.trim() || form.password.length < 6) {
    uni.showToast({ title: '密码至少6位', icon: 'none' })
    return
  }

  loading.value = true
  try {
    if (mode.value === 'login') {
      await loginApi({ username: form.username, password: form.password })
    } else {
      await registerApi({
        username: form.username,
        email: form.email,
        password: form.password,
      })
    }
    uni.showToast({ title: mode.value === 'login' ? '登录成功' : '注册成功', icon: 'success' })
    uni.switchTab({ url: '/pages/chat/index' })
  } catch (err: any) {
    uni.showToast({ title: err?.data?.message || '操作失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* ======== Hero 背景 ======== */
.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.35) 0%,
    rgba(0, 0, 0, 0.08) 35%,
    rgba(0, 0, 0, 0.15) 65%,
    rgba(0, 0, 0, 0.55) 100%
  );
  z-index: 2;
}

/* ======== 内容区 ======== */
.login-content {
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  padding: 0 72rpx;
  box-sizing: border-box;
}

/* ======== 品牌区 ======== */
.brand-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 100rpx;
}

.logo-backdrop {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 6rpx 24rpx rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.brand-logo {
  width: 64rpx;
  height: 64rpx;
}

.brand-name {
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 6rpx;
  text-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.2);
}

.brand-desc {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 8rpx;
  letter-spacing: 2rpx;
}

/* ======== 表单卡片（玻璃拟态） ======== */
.form-card {
  width: 100%;
  margin-top: 32rpx;
  background: rgba(255, 255, 255, 0.94);
  border-radius: 20rpx;
  padding: 28rpx 30rpx;
  box-shadow: 0 8rpx 36rpx rgba(0, 0, 0, 0.10);
  border: 1rpx solid rgba(255, 255, 255, 0.6);
}

/* ======== 标签切换 ======== */
.tab-row {
  display: flex;
  position: relative;
  margin-bottom: 24rpx;
  background: #F5F6FA;
  border-radius: 10rpx;
  padding: 4rpx;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 10rpx 0;
  font-size: 26rpx;
  color: #999;
  border-radius: 8rpx;
  z-index: 1;
  transition: color 0.25s;
  position: relative;
}

.tab-item.active {
  color: #FF6B3D;
  font-weight: 600;
}

.tab-slider {
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  width: calc(50% - 4rpx);
  height: calc(100% - 8rpx);
  background: #fff;
  border-radius: 8rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-slider.right {
  transform: translateX(100%);
}

/* ======== 输入组 ======== */
.input-group {
  margin-bottom: 16rpx;
}

.input-label {
  display: block;
  font-size: 22rpx;
  color: #666;
  margin-bottom: 6rpx;
  font-weight: 500;
}

.input-field {
  width: 100%;
  height: 72rpx;
  background: #F8F9FB;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 24rpx;
  color: #1A1A1A;
  box-sizing: border-box;
  border: 2rpx solid transparent;
  transition: border-color 0.2s, background 0.2s;
}

.input-field:focus {
  border-color: #FF6B3D;
  background: #FFF8F5;
}

/* ======== 提交按钮 ======== */
.submit-btn {
  width: 100%;
  height: 72rpx;
  margin-top: 20rpx;
  background: linear-gradient(135deg, #FF6B3D 0%, #FF8F5E 100%);
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  border-radius: 36rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 4rpx;
  box-shadow: 0 4rpx 20rpx rgba(255, 107, 61, 0.35);
}

.submit-btn::after {
  border: none;
}

.submit-btn:active {
  opacity: 0.9;
  transform: scale(0.98);
}

/* ======== 底部提示 ======== */
.footer-tip {
  margin-top: 24rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.75);
}

.link {
  color: #fff;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 4rpx;
}
</style>
