import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/dashboard/DashboardView.vue') },
      { path: 'knowledge/collections', name: 'Collections', component: () => import('@/views/knowledge/CollectionList.vue') },
      { path: 'knowledge/documents', name: 'Documents', component: () => import('@/views/knowledge/DocumentList.vue') },
      { path: 'knowledge/documents/form', name: 'DocumentForm', component: () => import('@/views/knowledge/DocumentForm.vue') },
      { path: 'knowledge/documents/:id/form', name: 'DocumentEdit', component: () => import('@/views/knowledge/DocumentForm.vue'), props: true },
      { path: 'knowledge/documents/:id/chunks', name: 'Chunks', component: () => import('@/views/knowledge/ChunkList.vue'), props: true },
      { path: 'knowledge/playground', name: 'Playground', component: () => import('@/views/knowledge/Playground.vue') },
      { path: 'sessions', redirect: '/sessions/list' },
      {
        path: 'sessions/list',
        name: 'SessionManage',
        component: () => import('@/views/sessions/SessionManage.vue'),
      },
      {
        path: 'sessions/messages',
        name: 'MessageList',
        component: () => import('@/views/sessions/MessageList.vue'),
      },
      {
        path: 'sessions/conversation',
        name: 'Conversation',
        component: () => import('@/views/sessions/ConversationView.vue'),
      },
      {
        path: 'users',
        redirect: '/users/list',
        children: [
          { path: 'list', name: 'Users', component: () => import('@/views/users/UserList.vue') },
          { path: 'preferences', name: 'UserPreferences', component: () => import('@/views/users/UserPreferences.vue') },
        ],
      },
      { path: 'tools', name: 'Tools', component: () => import('@/views/tools/ToolDetail.vue') },
      { path: 'system', name: 'System', component: () => import('@/views/system/SystemStatus.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to) => {
  if (to.meta.public) return true
  const auth = useAuthStore()
  if (!auth.isLoggedIn) return { name: 'Login' }
  return true
})

export default router
