<template>
  <div class="page">
    <h2>消息管理</h2>

    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="filters" size="small">
        <el-form-item label="会话 ID">
          <el-input
            v-model="filters.sessionId"
            placeholder="筛选指定会话"
            clearable
            style="width: 260px"
          />
        </el-form-item>
        <el-form-item label="用户 ID">
          <el-input
            v-model="filters.userId"
            placeholder="所属用户"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="filters.role" placeholder="全部" clearable style="width: 120px">
            <el-option label="用户" value="USER" />
            <el-option label="助手" value="ASSISTANT" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容">
          <el-input
            v-model="filters.keyword"
            placeholder="消息正文关键词"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-table :data="list" v-loading="loading" stripe class="table">
      <el-table-column prop="id" label="消息 ID" width="280" show-overflow-tooltip />
      <el-table-column prop="sessionId" label="会话 ID" width="240" show-overflow-tooltip />
      <el-table-column label="会话标题" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.sessionTitle || '（未命名）' }}
        </template>
      </el-table-column>
      <el-table-column label="角色" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.role === 'user' ? 'primary' : 'success'" size="small">
            {{ row.role === 'user' ? '用户' : '助手' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="content" label="内容" min-width="220" show-overflow-tooltip />
      <el-table-column label="用户" width="120" show-overflow-tooltip>
        <template #default="{ row }">{{ row.userLabel }}</template>
      </el-table-column>
      <el-table-column prop="createdAt" label="时间" width="180">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" link @click="openDetail(row)">
            详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="pagination.page"
      v-model:page-size="pagination.pageSize"
      :total="pagination.total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      class="pagination"
      @change="fetchList"
    />

    <el-drawer v-model="drawerVisible" title="消息详情" size="520px" destroy-on-close>
      <template v-if="current">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="消息 ID">{{ current.id }}</el-descriptions-item>
          <el-descriptions-item label="会话 ID">{{ current.sessionId }}</el-descriptions-item>
          <el-descriptions-item label="会话标题">
            {{ current.sessionTitle || '（未命名）' }}
          </el-descriptions-item>
          <el-descriptions-item label="角色">
            {{ current.role === 'user' ? '用户' : '助手' }}
          </el-descriptions-item>
          <el-descriptions-item label="用户">{{ current.userLabel }}</el-descriptions-item>
          <el-descriptions-item label="时间">
            {{ formatDate(current.createdAt) }}
          </el-descriptions-item>
        </el-descriptions>
        <h4 class="content-title">正文</h4>
        <div class="content-body">{{ current.content }}</div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { listMessages } from '@/api/messages'

const route = useRoute()
const filters = reactive({
  sessionId: '',
  userId: '',
  role: '',
  keyword: '',
})
const list = ref([])
const loading = ref(false)
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })
const drawerVisible = ref(false)
const current = ref(null)

onMounted(() => {
  if (route.query.sessionId) {
    filters.sessionId = String(route.query.sessionId)
  }
  fetchList()
})

async function fetchList() {
  loading.value = true
  try {
    const res = await listMessages({
      page: pagination.page,
      pageSize: pagination.pageSize,
      sessionId: filters.sessionId || undefined,
      userId: filters.userId || undefined,
      role: filters.role || undefined,
      keyword: filters.keyword || undefined,
    })
    const data = res.data ?? {}
    list.value = data.items ?? []
    pagination.total = data.total ?? 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchList()
}

function resetFilters() {
  filters.sessionId = ''
  filters.userId = ''
  filters.role = ''
  filters.keyword = ''
  pagination.page = 1
  fetchList()
}

function openDetail(row) {
  current.value = row
  drawerVisible.value = true
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}
</script>

<style scoped>
.page { background: #fff; padding: 24px; border-radius: 4px; }
.page h2 { margin: 0 0 16px 0; }
.filter-card { margin-bottom: 16px; }
.table { margin-bottom: 16px; }
.pagination { justify-content: flex-end; }
.content-title { margin: 16px 0 8px; font-size: 14px; color: #303133; }
.content-body {
  background: #f5f7fa;
  border-radius: 4px;
  padding: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
