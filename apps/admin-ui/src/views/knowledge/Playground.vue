<template>
  <div class="page">
    <h2>RAG 调试</h2>

    <el-card shadow="never" style="max-width: 960px; margin-top: 16px">
      <!-- 输入区 -->
      <el-form :inline="true" :model="form" size="large">
        <el-form-item label="问题">
          <el-input v-model="form.question" placeholder="输入检索问题" style="width: 400px" />
        </el-form-item>
        <el-form-item label="topK">
          <el-input-number v-model="form.topK" :min="1" :max="10" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="searching" @click="handleSearch">检索</el-button>
          <el-button type="success" :loading="querying" @click="handleQuery">问答</el-button>
        </el-form-item>
      </el-form>

      <!-- 检索结果 -->
      <el-tabs v-model="activeTab" style="margin-top: 16px">
        <el-tab-pane label="向量检索" name="search">
          <el-empty v-if="searchResults.length === 0 && !searchDone" description="输入问题后点击「检索」" />
          <el-empty v-if="searchResults.length === 0 && searchDone" description="未检索到相关内容" />
          <div v-for="(item, i) in searchResults" :key="i" class="result-item">
            <div class="result-index">#{{ i + 1 }}</div>
            <div class="result-content">{{ item.content }}</div>
            <div class="result-meta">
              <el-tag size="small">{{ item.metadata?.source ?? '-' }}</el-tag>
              <span v-if="item.metadata?.docId">doc: {{ item.metadata.docId }}</span>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="RAG 问答" name="query">
          <el-empty v-if="!queryResult" description="输入问题后点击「问答」" />
          <template v-if="queryResult">
            <el-alert type="success" :closable="false" style="margin-bottom: 16px">
              <template #title>{{ queryResult.answer }}</template>
            </el-alert>
            <h4>参考来源</h4>
            <div v-for="(src, i) in queryResult.sources" :key="i" class="result-item">
              <div class="result-index">#{{ i + 1 }} ({{ (src.similarity * 100).toFixed(1) }}%)</div>
              <div class="result-content">{{ src.content }}</div>
              <div class="result-meta">
                <el-tag size="small">{{ src.source ?? '-' }}</el-tag>
              </div>
            </div>
          </template>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { searchRag, queryRag } from '@/api/rag'

const form = reactive({ question: '', topK: 3 })
const activeTab = ref('search')
const searching = ref(false)
const querying = ref(false)
const searchDone = ref(false)
const searchResults = ref([])
const queryResult = ref(null)

async function handleSearch() {
  if (!form.question.trim()) return
  searching.value = true
  searchDone.value = false
  try {
    const res = await searchRag(form.question, form.topK)
    searchResults.value = res.data ?? []
    activeTab.value = 'search'
    searchDone.value = true
  } finally {
    searching.value = false
  }
}

async function handleQuery() {
  if (!form.question.trim()) return
  querying.value = true
  try {
    const res = await queryRag(form.question, form.topK)
    queryResult.value = res.data ?? null
    activeTab.value = 'query'
  } finally {
    querying.value = false
  }
}
</script>

<style scoped>
.page { background: #fff; padding: 24px; border-radius: 4px; }
.page h2 { margin: 0; }

.result-item {
  background: #f5f7fa;
  border-radius: 4px;
  padding: 12px 16px;
  margin-bottom: 8px;
}

.result-index {
  font-weight: bold;
  color: #409eff;
  margin-bottom: 6px;
}

.result-content {
  color: #303133;
  line-height: 1.6;
  margin-bottom: 6px;
}

.result-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 12px;
  color: #909399;
}
</style>
