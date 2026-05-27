<template>
  <div class="dashboard">
    <h2>仪表盘</h2>

    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <el-statistic title="文档总数" :value="stats.totalDocs" />
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <el-statistic title="已索引" :value="stats.indexedDocs">
            <template #suffix>
              <el-tag type="success" size="small">正常</el-tag>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <el-statistic title="处理中" :value="stats.processingDocs">
            <template #suffix>
              <el-tag type="warning" size="small">进行中</el-tag>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <el-statistic title="入库失败" :value="stats.failedDocs">
            <template #suffix>
              <el-tag v-if="stats.failedDocs > 0" type="danger" size="small">需处理</el-tag>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>快捷操作</template>
          <el-space wrap>
            <el-button type="primary" @click="$router.push('/knowledge/documents/form')">
              新建文档
            </el-button>
            <el-button @click="$router.push('/knowledge/playground')">RAG 调试</el-button>
            <el-button @click="$router.push('/knowledge/documents')">文档管理</el-button>
          </el-space>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <template #header>系统概况</template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="会话总数">{{ stats.totalSessions ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="消息总数">{{ stats.totalMessages ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="今日入库">{{ stats.todayDocs ?? '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { reactive, onMounted } from 'vue'
import { getStats } from '@/api/knowledge'

const stats = reactive({
  totalDocs: 0,
  indexedDocs: 0,
  processingDocs: 0,
  failedDocs: 0,
  totalSessions: 0,
  totalMessages: 0,
  todayDocs: 0,
})

onMounted(async () => {
  try {
    const res = await getStats()
    Object.assign(stats, res.data ?? {})
  } catch {
    // 静默降级
  }
})
</script>

<style scoped>
.dashboard h2 {
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
}
</style>
