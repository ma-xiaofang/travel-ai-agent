<template>
  <div class="page">
    <h2>用户偏好</h2>
    <p class="subtitle">展示所有用户的旅行画像与偏好数据（UserTravelProfile）</p>

    <!-- 表格 -->
    <el-table :data="items" v-loading="loading" stripe>
      <el-table-column label="用户" min-width="160">
        <template #default="{ row }">
          <div>{{ row.userLabel }}</div>
          <div style="font-size: 12px; color: #909399;">{{ row.userId }}</div>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.isGuest ? 'warning' : 'success'" size="small">
            {{ row.isGuest ? '访客' : '注册' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="summary" label="旅行摘要" min-width="200">
        <template #default="{ row }">
          <span v-if="row.summary" class="text-ellipsis">{{ row.summary }}</span>
          <span v-else style="color: #c0c4cc;">暂无</span>
        </template>
      </el-table-column>
      <el-table-column label="偏好字段" width="120" align="center">
        <template #default="{ row }">
          {{ row.prefKeys?.length ?? 0 }} 项
        </template>
      </el-table-column>
      <el-table-column prop="updatedAt" label="最近更新" width="170">
        <template #default="{ row }">{{ fmt(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="openDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrap" v-if="total > 0">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next, sizes"
        :page-sizes="[10, 20, 50]"
        @current-change="fetchData"
        @size-change="onPageSizeChange"
      />
    </div>

    <!-- 偏好详情弹窗 -->
    <el-dialog v-model="detailVisible" title="用户偏好详情" width="640px">
      <el-descriptions :column="2" border style="margin-bottom: 16px">
        <el-descriptions-item label="用户">{{ detail.userLabel }}</el-descriptions-item>
        <el-descriptions-item label="类型">
          <el-tag :type="detail.isGuest ? 'warning' : 'success'" size="small">
            {{ detail.isGuest ? '访客' : '注册' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="User ID" :span="2">{{ detail.userId }}</el-descriptions-item>
        <el-descriptions-item label="最近更新" :span="2">{{ fmt(detail.updatedAt) }}</el-descriptions-item>
      </el-descriptions>

      <el-form label-width="80px">
        <el-form-item label="旅行摘要">
          <el-input
            v-model="editSummary"
            type="textarea"
            :rows="3"
            placeholder="AI 自动生成的用户旅行偏好摘要"
          />
        </el-form-item>
        <el-form-item label="偏好数据">
          <el-input
            v-model="editPrefs"
            type="textarea"
            :rows="10"
            placeholder='JSON 格式偏好数据，如 { "preferredDestinations": ["日本", "欧洲"] }'
          />
          <div v-if="jsonError" style="color: #f56c6c; font-size: 12px; margin-top: 4px;">
            JSON 格式无效: {{ jsonError }}
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="detailVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" :disabled="!!jsonError" @click="handleSavePrefs">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { listPreferences, getUserPreferences, updateUserPreferences } from '@/api/admin-users'

const items = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const detailVisible = ref(false)
const saving = ref(false)
const detail = reactive({
  userId: '',
  userLabel: '',
  isGuest: false,
  summary: '',
  preferences: {},
  updatedAt: '',
})
const editSummary = ref('')
const editPrefs = ref('')

/** 实时校验 JSON */
const jsonError = computed(() => {
  if (!editPrefs.value.trim()) return ''
  try {
    JSON.parse(editPrefs.value)
    return ''
  } catch (e) {
    return e.message
  }
})

function fmt(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('zh-CN', { hour12: false })
}

async function fetchData() {
  loading.value = true
  try {
    const res = await listPreferences({ page: page.value, pageSize: pageSize.value })
    const list = res.data.items ?? []
    items.value = list.map((item) => {
      const prefs = item.preferences ?? {}
      return {
        ...item,
        prefKeys: typeof prefs === 'object' ? Object.keys(prefs) : [],
      }
    })
    total.value = res.data.total ?? 0
  } catch {
    // 401 等错误由 HTTP 拦截器统一处理
  } finally {
    loading.value = false
  }
}

function onPageSizeChange(size) {
  pageSize.value = size
  page.value = 1
  fetchData()
}

async function openDetail(row) {
  saving.value = false
  try {
    const res = await getUserPreferences(row.userId)
    const d = res.data
    detail.userId = d.userId
    detail.userLabel = d.userLabel
    detail.isGuest = d.isGuest
    detail.summary = d.summary
    detail.preferences = d.preferences
    detail.updatedAt = d.updatedAt
    editSummary.value = d.summary ?? ''
    editPrefs.value = JSON.stringify(d.preferences, null, 2)
    detailVisible.value = true
  } catch {
    // get 失败时 fallback 到列表数据
    detail.userId = row.userId
    detail.userLabel = row.userLabel
    detail.isGuest = row.isGuest
    detail.summary = row.summary
    detail.preferences = row.preferences
    detail.updatedAt = row.updatedAt
    editSummary.value = row.summary ?? ''
    editPrefs.value = JSON.stringify(row.preferences ?? {}, null, 2)
    detailVisible.value = true
  }
}

async function handleSavePrefs() {
  if (jsonError.value) return
  saving.value = true
  try {
    const prefs = JSON.parse(editPrefs.value || '{}')
    await updateUserPreferences(detail.userId, {
      summary: editSummary.value || undefined,
      preferences: prefs,
    })
    ElMessage.success('保存成功')
    detailVisible.value = false
    fetchData()
  } catch {
    // 401 等错误由 HTTP 拦截器统一处理
  } finally {
    saving.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.page { background: #fff; padding: 24px; border-radius: 4px; }
.page h2 { margin: 0 0 4px 0; }
.subtitle { margin: 0 0 16px 0; font-size: 13px; color: #909399; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
.text-ellipsis {
  display: block;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
