<script setup>
import { computed } from 'vue'
import { renderMarkdown } from '@/utils/renderMarkdown'

const props = defineProps({
  source: { type: String, required: true },
})

const html = computed(() => renderMarkdown(props.source))
</script>

<template>
  <div class="markdown-body">
    <div class="md-content" v-html="html" />
  </div>
</template>

<style scoped>
.markdown-body {
  min-width: 0;
  overflow-x: auto;
}

/* 行内代码 */
.md-content :deep(:not(pre) > code) {
  background: rgba(0, 0, 0, 0.06);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
  color: #e0314e;
}

/* 代码块 */
.md-content :deep(pre.hljs) {
  margin: 8px 0;
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  padding: 0;
}

.md-content :deep(pre.hljs > code.hljs) {
  margin: 0;
  display: block;
  background: transparent;
  padding: 14px 16px;
  font-size: 13px;
  line-height: 1.6;
  font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
}

/* 表格 */
.md-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
  margin: 8px 0;
}

.md-content :deep(th) {
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(0, 0, 0, 0.04);
  padding: 8px 12px;
  font-weight: 600;
}

.md-content :deep(td) {
  border: 1px solid rgba(0, 0, 0, 0.08);
  padding: 6px 12px;
}

/* 链接 */
.md-content :deep(a) {
  color: #409eff;
}

/* 标题 */
.md-content :deep(h2),
.md-content :deep(h3),
.md-content :deep(h4) {
  margin: 10px 0 6px;
  font-weight: 600;
}

.md-content :deep(p) {
  margin: 4px 0;
}
</style>
