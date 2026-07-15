<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useUserStore } from '@/store'

onLaunch(() => {
  console.log('途旅 AI 启动')

  const store = useUserStore()
  if (!store.userInfo?.accessToken) {
    uni.reLaunch({ url: '/pages/login/index' })
  }
})
</script>

<style>
/* ======== CSS 自定义属性（品牌色） ======== */
page {
  --color-primary: #FF6B3D;
  --color-primary-light: #FF8F5E;
  --color-primary-dark: #E55A2F;
  --color-primary-pale: #FFF5F0;
  --color-primary-border: #FFE0D0;
  --color-success: #52C41A;
  --color-warning: #FAAD14;
  --color-error: #FF4D4F;
  --color-text: #1A1A1A;
  --color-text-secondary: #666666;
  --color-text-tertiary: #999999;
  --color-text-placeholder: #BBBBBB;
  --color-bg: #F5F6FA;
  --color-bg-white: #FFFFFF;
  --color-border: #F0F0F0;
  --color-border-light: #F5F5F5;
  --shadow-sm: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  --shadow-base: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
  --radius-sm: 8rpx;
  --radius-base: 12rpx;
  --radius-md: 16rpx;
  --radius-lg: 20rpx;
  --radius-xl: 28rpx;
  --radius-full: 9999rpx;
}

/* ======== 全局基础样式 ======== */
page {
  background-color: #F5F6FA;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', sans-serif;
  font-size: 28rpx;
  color: #1A1A1A;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

/* 统一按钮重置 */
button {
  padding: 0;
  margin: 0;
  background: transparent;
  line-height: inherit;
}

button::after {
  border: none;
}

/* 统一输入框 */
input, textarea {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
}
</style>
