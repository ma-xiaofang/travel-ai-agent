<template>
  <el-container class="admin-layout">
    <!-- 侧栏 -->
    <el-aside width="220px" class="aside">
      <div class="logo" @click="$router.push('/dashboard')">
        <LogoMark />
        <span class="logo-brand">
          途旅<span class="logo-ai">AI</span>
        </span>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>

        <el-sub-menu index="knowledge">
          <template #title>
            <el-icon><Document /></el-icon>
            <span>知识库</span>
          </template>
          <el-menu-item index="/knowledge/collections">集合管理</el-menu-item>
          <el-menu-item index="/knowledge/documents">文档管理</el-menu-item>
          <el-menu-item index="/knowledge/playground">RAG 调试</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="sessions">
          <template #title>
            <el-icon><ChatDotRound /></el-icon>
            <span>会话观测</span>
          </template>
          <el-menu-item index="/sessions/list">会话管理</el-menu-item>
          <el-menu-item index="/sessions/messages">消息管理</el-menu-item>
          <el-menu-item index="/sessions/conversation">对话测试</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="users">
          <template #title>
            <el-icon><User /></el-icon>
            <span>用户管理</span>
          </template>
          <el-menu-item index="/users/list">用户列表</el-menu-item>
          <el-menu-item index="/users/preferences">用户偏好</el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/tools">
          <el-icon><Briefcase /></el-icon>
          <span>工具详情</span>
        </el-menu-item>

        <el-menu-item index="/system">
          <el-icon><Setting /></el-icon>
          <span>系统状态</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 右侧主体 -->
    <el-container>
      <el-header class="topbar">
        <div class="topbar-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item
              v-for="item in breadcrumbs"
              :key="item.path"
              :to="item.path ? { path: item.path } : undefined"
            >
              {{ item.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="topbar-right">
          <el-dropdown trigger="click" @command="handleUserCommand">
            <span class="user-entry">
              <el-avatar :size="32" :src="auth.avatar || undefined">
                <el-icon><UserFilled /></el-icon>
              </el-avatar>
              <span class="user-info">{{ auth.displayName }}</span>
              <el-icon class="arrow"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="avatar">修改头像</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main>
        <router-view />
      </el-main>
    </el-container>

    <!-- 修改头像弹窗 -->
    <el-dialog v-model="avatarVisible" title="修改头像" width="380px">
      <AvatarUploader v-model="draftAvatar" />
      <template #footer>
        <el-button @click="avatarVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="savingAvatar"
          :disabled="!draftAvatar || draftAvatar === auth.avatar"
          @click="saveAvatar"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { DataAnalysis, Document, ChatDotRound, User, Setting, Briefcase, UserFilled, ArrowDown } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import LogoMark from '@/components/LogoMark.vue'
import AvatarUploader from '@/components/AvatarUploader.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const avatarVisible = ref(false)
const draftAvatar = ref('')
const savingAvatar = ref(false)

/** 当前激活菜单 */
const activeMenu = computed(() => {
  const path = route.path
  if (path.startsWith('/knowledge')) return path
  if (path.startsWith('/sessions')) return path
  if (path.startsWith('/dashboard')) return '/dashboard'
  if (path.startsWith('/tools')) return '/tools'
  return path
})

/** 面包屑 */
const breadcrumbs = computed(() => {
  const items = []
  const path = route.path
  const nameMap = {
    dashboard: '仪表盘',
    'knowledge/collections': '知识库 / 集合',
    'knowledge/documents': '知识库 / 文档',
    'knowledge/playground': '知识库 / RAG 调试',
    'sessions/list': '会话观测 / 会话管理',
    'sessions/messages': '会话观测 / 消息管理',
    'sessions/conversation': '会话观测 / 对话测试',
    'users/list': '用户管理 / 用户列表',
    'users/preferences': '用户管理 / 用户偏好',
    tools: '工具详情',
    system: '系统状态',
  }

  // 分块页
  if (path.includes('/chunks')) {
    items.push({ title: '知识库 / 文档', path: '/knowledge/documents' })
    items.push({ title: '分块详情' })
    return items
  }
  // 文档表单（新建 / 编辑）
  if (path.includes('/form')) {
    items.push({ title: '知识库 / 文档', path: '/knowledge/documents' })
    items.push({ title: route.params.id ? '编辑文档' : '新建文档' })
    return items
  }

  for (const [key, title] of Object.entries(nameMap)) {
    if (path.includes(key)) {
      items.push({ title })
      break
    }
  }
  return items
})

function handleLogout() {
  auth.logout()
  router.push('/login')
}

/** 顶栏用户下拉菜单命令 */
function handleUserCommand(command) {
  if (command === 'avatar') {
    draftAvatar.value = auth.avatar
    avatarVisible.value = true
  } else if (command === 'logout') {
    handleLogout()
  }
}

/** 保存当前管理员头像 */
async function saveAvatar() {
  savingAvatar.value = true
  try {
    await auth.updateAvatar(draftAvatar.value)
    ElMessage.success('头像已更新')
    avatarVisible.value = false
  } catch {
    // 错误提示由 HTTP 拦截器统一处理
  } finally {
    savingAvatar.value = false
  }
}

onMounted(() => {
  // 拉取最新资料，回填头像/昵称
  auth.fetchProfile().catch(() => {})
})
</script>

<style scoped>
.admin-layout {
  height: 100vh;
}

.aside {
  background-color: #304156;
  overflow-y: auto;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0 12px;
}

.logo-brand {
  font-size: 17px;
  font-weight: 600;
  color: #f8fafc;
  white-space: nowrap;
  letter-spacing: 2px;
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Segoe UI', sans-serif;
}

.logo-ai {
  font-weight: 700;
  letter-spacing: 1px;
  background: linear-gradient(120deg, #7dd3fc 0%, #c4b5fd 45%, #f9a8d4 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e6e6e6;
  padding: 0 24px;
  height: 60px;
}

.topbar-left {
  display: flex;
  align-items: center;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  color: #606266;
  font-size: 14px;
}

.user-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  outline: none;
}

.user-entry .arrow {
  color: #909399;
  font-size: 12px;
}

.el-main {
  background: #f0f2f5;
  min-height: calc(100vh - 60px);
}
</style>
