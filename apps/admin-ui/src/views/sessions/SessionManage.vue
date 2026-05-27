<template>
  <div class="page">
    <h2>会话管理</h2>

    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="filters" size="small">
        <el-form-item label="用户 ID">
          <el-input
            v-model="filters.userId"
            placeholder="用户或访客 ID"
            clearable
            style="width: 220px"
          />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="标题 / 用户 ID"
            clearable
            style="width: 220px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-table :data="list" v-loading="loading" stripe class="table">
      <el-table-column prop="id" label="会话 ID" width="280" show-overflow-tooltip />
      <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.title || '（未命名）' }}
        </template>
      </el-table-column>
      <el-table-column label="用户" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">
          <div>{{ row.userLabel }}</div>
          <div class="sub-text">{{ row.userId }}</div>
        </template>
      </el-table-column>
      <el-table-column prop="messageCount" label="消息数" width="90" align="center" />
      <el-table-column prop="updatedAt" label="最后活跃" width="180">
        <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" link @click="goMessages(row)">
            查看消息
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
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listSessions } from '@/api/sessions'

const router = useRouter()
const filters = reactive({ userId: '', keyword: '' })
const list = ref([])
const loading = ref(false)
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

onMounted(fetchList)

async function fetchList() {
  loading.value = true
  try {
    const res = await listSessions({
      page: pagination.page,
      pageSize: pagination.pageSize,
      userId: filters.userId || undefined,
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
  filters.userId = ''
  filters.keyword = ''
  pagination.page = 1
  fetchList()
}

function goMessages(row) {
  router.push({
    path: '/sessions/messages',
    query: { sessionId: row.id },
  })
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
.sub-text { font-size: 12px; color: #909399; margin-top: 2px; }
</style>
