<template>
  <div class="page">
    <div class="page-header">
      <h2>集合管理</h2>
      <el-button type="primary" @click="openDialog()">新建集合</el-button>
    </div>

    <el-table :data="list" v-loading="loading" stripe>
      <el-table-column prop="name" label="名称" min-width="200" />
      <el-table-column prop="description" label="描述" min-width="250" show-overflow-tooltip />
      <el-table-column prop="_count.documents" label="文档数" width="100" align="center" />
      <el-table-column prop="updatedAt" label="更新时间" width="180">
        <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openDialog(row)">编辑</el-button>
          <el-popconfirm title="确定删除该集合？仅无文档时可删" @confirm="handleDelete(row.id)">
            <template #reference>
              <el-button size="small" type="danger" :disabled="row._count?.documents > 0">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新建/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑集合' : '新建集合'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="如 travel-knowledge-base" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="集合用途说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { listCollections, createCollection, updateCollection, deleteCollection } from '@/api/knowledge'

const list = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const submitting = ref(false)
const editingId = ref(null)
const formRef = ref(null)

const form = reactive({ name: '', description: '' })
const rules = {
  name: [{ required: true, message: '请输入集合名称', trigger: 'blur' }],
}

async function fetchList() {
  loading.value = true
  try {
    const res = await listCollections()
    list.value = res.data ?? []
  } finally {
    loading.value = false
  }
}

function openDialog(row) {
  editingId.value = row?.id ?? null
  form.name = row?.name ?? ''
  form.description = row?.description ?? ''
  dialogVisible.value = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    if (editingId.value) {
      await updateCollection(editingId.value, { ...form })
      ElMessage.success('集合已更新')
    } else {
      await createCollection({ ...form })
      ElMessage.success('集合已创建')
    }
    dialogVisible.value = false
    await fetchList()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(id) {
  await deleteCollection(id)
  ElMessage.success('集合已删除')
  await fetchList()
}

function formatDate(d) {
  return d ? new Date(d).toLocaleString('zh-CN') : '-'
}

onMounted(fetchList)
</script>

<style scoped>
.page { background: #fff; padding: 24px; border-radius: 4px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header h2 { margin: 0; }
</style>
