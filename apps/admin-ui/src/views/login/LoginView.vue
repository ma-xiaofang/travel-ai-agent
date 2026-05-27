<template>
  <div class="login-page">
    <!-- 左侧品牌区 -->
    <aside class="login-hero" aria-hidden="true">
      <div class="hero-overlay" />
      <div class="hero-content">
        <div class="hero-brand">
          <LogoMark class="hero-logo" />
          <h1 class="hero-title">
            途旅<span class="hero-ai">AI</span>
          </h1>
        </div>
        <p class="hero-tagline">智能旅行规划 · 运营管理中心</p>
        <ul class="hero-features">
          <li><el-icon><Collection /></el-icon>知识库与 RAG 全链路管理</li>
          <li><el-icon><ChatDotRound /></el-icon>会话观测与用户偏好洞察</li>
          <li><el-icon><DataAnalysis /></el-icon>系统状态与数据仪表盘</li>
        </ul>
      </div>
    </aside>

    <!-- 右侧登录表单 -->
    <main class="login-main">
      <div class="login-panel">
        <header class="panel-header">
          <LogoMark class="panel-logo" />
          <h2 class="panel-title">欢迎回来</h2>
          <p class="panel-subtitle">登录 <strong>途旅AI</strong> 管理后台</p>
        </header>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-width="0"
          size="large"
          class="login-form"
          @submit.prevent="handleLogin"
        >
          <el-form-item prop="account">
            <el-input
              v-model="form.account"
              placeholder="用户名 / 邮箱 / 手机号"
              :prefix-icon="User"
              clearable
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="密码"
              :prefix-icon="Lock"
              show-password
              @keyup.enter="handleLogin"
            />
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              native-type="submit"
              :loading="loading"
              class="login-btn"
            >
              登 录
            </el-button>
          </el-form-item>
        </el-form>

        <p class="panel-footer">途旅AI · 让每一次出行都更从容</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, Collection, ChatDotRound, DataAnalysis } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import LogoMark from '@/components/LogoMark.vue'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)
const formRef = ref(null)

const form = reactive({ account: '', password: '' })
const rules = {
  account: [{ required: true, message: '请输入用户名 / 邮箱 / 手机号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

/** 根据输入格式自动识别账号类型 → username / email / phone */
function buildCredentials() {
  const v = form.account.trim()
  if (v.includes('@')) return { email: v, password: form.password }
  if (/^1[3-9]\d{9}$/.test(v)) return { phone: v, password: form.password }
  return { username: v, password: form.password }
}

async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    await auth.login(buildCredentials())
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch (err) {
    ElMessage.error(err.response?.data?.message ?? err.message ?? '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  min-height: 100vh;
  background: #f0f4f8;
}

/* —— 左侧英雄区 —— */
.login-hero {
  position: relative;
  flex: 1.1;
  min-height: 100vh;
  background: url('/images/login-hero.png') center / cover no-repeat;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    160deg,
    rgba(30, 58, 95, 0.55) 0%,
    rgba(56, 189, 248, 0.25) 45%,
    rgba(167, 139, 250, 0.35) 100%
  );
}

.hero-content {
  position: relative;
  z-index: 1;
  padding: 48px 56px;
  color: #fff;
  max-width: 520px;
}

.hero-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
}

.hero-logo {
  width: 52px;
  height: 52px;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2));
}

.hero-title {
  margin: 0;
  font-size: 36px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.25);
}

.hero-ai {
  margin-left: 4px;
  font-size: 0.72em;
  font-weight: 600;
  background: linear-gradient(135deg, #fde68a, #f472b6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-tagline {
  margin: 0 0 28px;
  font-size: 15px;
  opacity: 0.92;
  letter-spacing: 0.06em;
}

.hero-features {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hero-features li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  opacity: 0.9;
  backdrop-filter: blur(4px);
}

.hero-features .el-icon {
  font-size: 18px;
  color: #fde68a;
}

/* —— 右侧表单区 —— */
.login-main {
  flex: 0.9;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.login-panel {
  width: 100%;
  max-width: 400px;
}

.panel-header {
  text-align: center;
  margin-bottom: 36px;
}

.panel-logo {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
}

.panel-title {
  margin: 0 0 8px;
  font-size: 26px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: 0.02em;
}

.panel-subtitle {
  margin: 0;
  font-size: 14px;
  color: #64748b;
}

.panel-subtitle strong {
  color: #38bdf8;
  font-weight: 600;
}

.login-form :deep(.el-input__wrapper) {
  border-radius: 10px;
  padding: 4px 12px;
  box-shadow: 0 0 0 1px #e2e8f0 inset;
  transition: box-shadow 0.2s;
}

.login-form :deep(.el-input__wrapper:hover),
.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #38bdf8 inset, 0 0 0 3px rgba(56, 189, 248, 0.12);
}

.login-btn {
  width: 100%;
  height: 44px;
  border-radius: 10px;
  font-size: 15px;
  letter-spacing: 0.12em;
  font-weight: 600;
  border: none;
  background: linear-gradient(135deg, #38bdf8 0%, #818cf8 55%, #a78bfa 100%);
  transition: opacity 0.2s, transform 0.15s;
}

.login-btn:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}

.panel-footer {
  margin: 28px 0 0;
  text-align: center;
  font-size: 12px;
  color: #94a3b8;
  letter-spacing: 0.04em;
}

/* —— 响应式：窄屏隐藏左侧 —— */
@media (max-width: 900px) {
  .login-hero {
    display: none;
  }

  .login-main {
    flex: 1;
    background: linear-gradient(160deg, #e0f2fe 0%, #f8fafc 40%, #ffffff 100%);
  }
}
</style>
