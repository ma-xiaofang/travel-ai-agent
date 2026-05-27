<template>
  <div class="page">
    <div class="page-header">
      <h2>文档管理</h2>
      <el-button type="primary" @click="$router.push('/knowledge/documents/form')">新建文档</el-button>
    </div>

    <!-- 筛选区 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="filters" size="small">
        <el-form-item label="分类">
          <el-select v-model="filters.category" placeholder="全部" clearable style="width: 150px">
            <el-option
              v-for="cat in categories"
              :key="cat.value"
              :label="cat.label"
              :value="cat.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="草稿" value="DRAFT" />
            <el-option label="处理中" value="PROCESSING" />
            <el-option label="已索引" value="INDEXED" />
            <el-option label="失败" value="FAILED" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" placeholder="标题搜索" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchList">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-table :data="list" v-loading="loading" stripe class="table">
      <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
      <el-table-column prop="category" label="分类" width="130" />
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="chunkCount" label="分块数" width="80" align="center" />
      <el-table-column prop="source" label="来源" width="120" show-overflow-tooltip />
      <el-table-column prop="updatedAt" label="更新时间" width="180">
        <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="handleEdit(row)">编辑</el-button>
          <el-button
            v-if="row.status !== 'INDEXED'"
            size="small"
            type="success"
            @click="handleIndex(row)"
          >
            入库
          </el-button>
          <el-button size="small" @click="$router.push(`/knowledge/documents/${row.id}/chunks`)">
            分块
          </el-button>
          <el-popconfirm title="确定删除该文档？" @confirm="handleDelete(row.id)">
            <template #reference>
              <el-button size="small" type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination
      v-model:current-page="pagination.page"
      v-model:page-size="pagination.pageSize"
      :total="pagination.total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      @change="fetchList"
      style="margin-top: 16px; justify-content: flex-end"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { listDocuments, deleteDocument, indexDocument } from '@/api/knowledge'

const router = useRouter()
const list = ref([])
const loading = ref(false)

const filters = reactive({ category: '', status: '', keyword: '' })
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

const categories = [
  { value: 'GENERAL', label: '未归类' },
  { value: 'ATTRACTION_GUIDE', label: '景点攻略' },
  { value: 'ATTRACTION_FACT', label: '景点资料' },
  { value: 'VISA', label: '签证' },
  { value: 'DESTINATION', label: '目的地' },
  { value: 'TRANSPORT', label: '交通' },
  { value: 'ACCOMMODATION', label: '住宿' },
  { value: 'FOOD', label: '美食' },
  { value: 'CUSTOMS', label: '海关' },
  { value: 'SAFETY', label: '安全' },
  { value: 'CULTURE', label: '文化' },
  { value: 'POLICY', label: '政策' },
]

function statusType(s) {
  return s === 'INDEXED' ? 'success' : s === 'FAILED' ? 'danger' : s === 'PROCESSING' ? 'warning' : 'info'
}

function statusLabel(s) {
  return { DRAFT: '草稿', PROCESSING: '处理中', INDEXED: '已索引', FAILED: '失败' }[s] ?? s
}

async function fetchList() {
  loading.value = true
  try {
    const res = await listDocuments({
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...(filters.category && { category: filters.category }),
      ...(filters.status && { status: filters.status }),
      ...(filters.keyword && { keyword: filters.keyword }),
    })
    list.value = res.data?.items ?? []
    pagination.total = res.data?.total ?? 0
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.category = ''
  filters.status = ''
  filters.keyword = ''
  pagination.page = 1
  fetchList()
}

function handleEdit(row) {
  router.push(`/knowledge/documents/${row.id}/form`)
}

async function handleIndex(row) {
  try {
    await indexDocument(row.id)
    ElMessage.success('已触发入库')
    await fetchList()
  } catch {
    // http 拦截器已提示
  }
}

async function handleDelete(id) {
  await deleteDocument(id)
  ElMessage.success('文档已删除')
  await fetchList()
}

function formatDate(d) {
  return d ? new Date(d).toLocaleString('zh-CN') : '-'
}

onMounted(fetchList)
</script>

<style scoped>
.page { background: #fff; padding: 24px; border-radius: 4px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { margin: 0; }
.filter-card { margin-bottom: 16px; }
.table { margin-top: 0; }
</style>
