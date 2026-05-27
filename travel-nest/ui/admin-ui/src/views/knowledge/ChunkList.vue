<template>
  <div class="page">
    <div class="page-header">
      <h2>分块详情</h2>
      <el-button @click="$router.back()">返回</el-button>
    </div>

    <el-table :data="chunks" v-loading="loading" stripe>
      <el-table-column prop="chunkIndex" label="序号" width="80" align="center" />
      <el-table-column prop="content" label="内容" min-width="350" show-overflow-tooltip />
      <el-table-column prop="embeddingId" label="Embedding ID" width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.embeddingId" style="font-family: monospace; font-size: 12px">
            {{ row.embeddingId }}
          </span>
          <el-tag v-else type="info" size="small">未关联</el-tag>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { listChunks } from '@/api/knowledge'

const props = defineProps({ id: { type: String, required: true } })
const route = useRoute()
const documentId = props.id ?? route.params.id

const chunks = ref([])
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const res = await listChunks(documentId)
    chunks.value = res.data ?? []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page { background: #fff; padding: 24px; border-radius: 4px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header h2 { margin: 0; }
</style>
