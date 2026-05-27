<template>
  <div class="page">
    <h2>系统状态</h2>

    <!-- 服务健康 -->
    <el-card shadow="never" class="section">
      <template #header>服务健康</template>
      <el-descriptions :column="2" border size="small" v-loading="loading">
        <el-descriptions-item label="服务状态">
          <el-tag :type="health?.status === 'ok' ? 'success' : 'danger'">
            {{ health?.status === 'ok' ? '正常' : (health?.status ?? '检测中...') }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="模型">{{ health?.model ?? '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 数据总览 -->
    <el-card shadow="never" class="section">
      <template #header>数据总览</template>
      <el-descriptions :column="3" border size="small" v-loading="statsLoading">
        <el-descriptions-item label="文档总数">{{ stats.totalDocs ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="已索引文档">{{ stats.indexedDocs ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="处于失败">{{ stats.failedDocs ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="会话总数">{{ stats.totalSessions ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="消息总数">{{ stats.totalMessages ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="今日入库">{{ stats.todayDocs ?? '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 说明 -->
    <el-card shadow="never" class="section">
      <template #header>数据流说明</template>
      <el-timeline>
        <el-timeline-item>
          <strong>知识入库</strong>：admin-ui → Admin API → RagService.loadDocuments → 分块 → PGVector + Prisma
        </el-timeline-item>
        <el-timeline-item>
          <strong>Agent 对话</strong>：C 端用户提问 → Tool 调用 fetchKnowledgeContext → PGVector 检索 → LLM 回答
        </el-timeline-item>
        <el-timeline-item>
          <strong>兜底机制</strong>：RAG 无结果 → Tavily 联网搜索 → Tool 内置 mock 数据
        </el-timeline-item>
      </el-timeline>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'
import { getStats } from '@/api/knowledge'

const loading = ref(true)
const statsLoading = ref(true)
const health = reactive({ status: null, model: '' })
const stats = reactive({ totalDocs: 0, indexedDocs: 0, failedDocs: 0, totalSessions: 0, totalMessages: 0, todayDocs: 0 })

onMounted(async () => {
  // 健康检查
  try {
    const res = await axios.get('/api/agent/health')
    health.status = 'ok'
    health.model = res.data?.data?.model ?? res.data?.model ?? '-'
  } catch {
    health.status = 'error'
  } finally {
    loading.value = false
  }

  // 统计
  try {
    const res = await getStats()
    Object.assign(stats, res.data ?? {})
  } finally {
    statsLoading.value = false
  }
})
</script>

<style scoped>
.page { background: #fff; padding: 24px; border-radius: 4px; }
.page h2 { margin: 0 0 24px 0; }
.section { max-width: 960px; margin-bottom: 20px; }
</style>
