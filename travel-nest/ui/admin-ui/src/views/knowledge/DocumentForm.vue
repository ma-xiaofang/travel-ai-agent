<template>
  <div class="page">
    <h2>{{ isEdit ? '编辑文档' : '新建文档' }}</h2>

    <el-card shadow="never" style="max-width: 900px; margin-top: 16px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" size="large">
        <el-form-item label="集合" prop="collectionId">
          <el-select v-model="form.collectionId" placeholder="选择知识库集合" style="width: 100%">
            <el-option
              v-for="col in collections"
              :key="col.id"
              :label="col.name"
              :value="col.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="文档标题" />
        </el-form-item>

        <el-form-item label="分类" prop="category">
          <el-select v-model="form.category" placeholder="选择分类" style="width: 100%">
            <el-option
              v-for="cat in categories"
              :key="cat.value"
              :label="cat.label"
              :value="cat.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="标签">
          <el-select
            v-model="form.tags"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="输入标签后回车添加"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="来源">
          <el-input v-model="form.source" placeholder="如原始 URL 或出处" />
        </el-form-item>

        <el-form-item label="内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="14"
            placeholder="输入文档正文（支持 Markdown）"
          />
        </el-form-item>

        <el-form-item>
          <el-button @click="$router.back()">取消</el-button>
          <el-button type="primary" :loading="saving" @click="handleSaveDraft">保存草稿</el-button>
          <el-button type="success" :loading="indexing" @click="handleSaveAndIndex">
            保存并入库
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { computed, ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { listCollections, getDocument, createDocument, updateDocument, indexDocument } from '@/api/knowledge'

const props = defineProps({ id: { type: String, default: '' } })
const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!props.id)
const formRef = ref(null)
const saving = ref(false)
const indexing = ref(false)
const collections = ref([])

const form = reactive({
  collectionId: '',
  title: '',
  category: 'GENERAL',
  tags: [],
  source: '',
  content: '',
})

const rules = {
  collectionId: [{ required: true, message: '请选择集合', trigger: 'change' }],
  content: [{ required: true, message: '请输入文档内容', trigger: 'blur' }],
}

const categories = [
  { value: 'GENERAL', label: '未归类 / 综合' },
  { value: 'ATTRACTION_GUIDE', label: '景点攻略' },
  { value: 'ATTRACTION_FACT', label: '景点资料' },
  { value: 'VISA', label: '签证与出入境' },
  { value: 'DESTINATION', label: '目的地概览' },
  { value: 'TRANSPORT', label: '交通' },
  { value: 'ACCOMMODATION', label: '住宿' },
  { value: 'FOOD', label: '美食' },
  { value: 'CUSTOMS', label: '海关边防' },
  { value: 'SAFETY', label: '安全应急' },
  { value: 'CULTURE', label: '文化礼仪' },
  { value: 'POLICY', label: '政策法规' },
]

onMounted(async () => {
  // 加载集合列表
  try {
    const res = await listCollections()
    collections.value = res.data ?? []
  } catch { /* 静默 */ }

  // 编辑模式加载文档数据
  if (isEdit.value) {
    try {
      const res = await getDocument(props.id)
      const doc = res.data
      if (doc) {
        form.collectionId = doc.collectionId ?? ''
        form.title = doc.title ?? ''
        form.category = doc.category ?? 'GENERAL'
        form.tags = doc.tags ?? []
        form.source = doc.source ?? ''
        form.content = doc.content ?? ''
      }
    } catch { /* 静默 */ }
  }
})

async function doSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return false

  const data = {
    collectionId: form.collectionId,
    title: form.title,
    category: form.category,
    tags: form.tags,
    source: form.source,
    content: form.content,
  }

  if (isEdit.value) {
    const res = await updateDocument(props.id, data)
    return res.data?.id ?? props.id
  } else {
    const res = await createDocument(data)
    return res.data?.id
  }
}

async function handleSaveDraft() {
  saving.value = true
  try {
    const id = await doSave()
    if (id) {
      ElMessage.success('草稿已保存')
      if (!isEdit.value) router.replace(`/knowledge/documents/${id}/form`)
    }
  } finally {
    saving.value = false
  }
}

async function handleSaveAndIndex() {
  indexing.value = true
  try {
    const id = await doSave()
    if (id) {
      await indexDocument(id)
      ElMessage.success('文档已保存并入库')
      router.push('/knowledge/documents')
    }
  } finally {
    indexing.value = false
  }
}
</script>

<style scoped>
.page { background: #fff; padding: 24px; border-radius: 4px; }
.page h2 { margin: 0 0 16px 0; }
</style>
