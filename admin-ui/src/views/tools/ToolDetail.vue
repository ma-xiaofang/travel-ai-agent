<template>
  <div class="tools-page">
    <div class="page-header">
      <h2>旅行工具集</h2>
      <p>共 {{ tools.length }} 个专业工具协同工作，覆盖天气、景点、行程、预算、签证、货币、打包、翻译等旅行全场景</p>
    </div>

    <!-- 瀑布流布局 -->
    <div class="waterfall">
      <div v-for="tool in tools" :key="tool.name" class="tool-card">
        <!-- 卡片头部 -->
        <div class="card-header">
          <span class="tool-icon">{{ tool.icon }}</span>
          <div class="card-title-wrap">
            <h3 class="tool-name">{{ tool.label }}</h3>
            <span class="tool-eng">{{ tool.name }}</span>
          </div>
          <el-tag :type="tool.tagType" size="small" effect="plain">{{ tool.category }}</el-tag>
        </div>

        <!-- 工具描述 -->
        <p class="tool-desc">{{ tool.description }}</p>

        <!-- 工作原理 -->
        <div class="card-section">
          <h4 class="section-title">
            <el-icon><Guide /></el-icon> 工作原理
          </h4>
          <p class="section-text">{{ tool.workflow }}</p>
        </div>

        <!-- 数据优先级 -->
        <div class="card-section">
          <h4 class="section-title">
            <el-icon><Connection /></el-icon> 数据来源
          </h4>
          <div class="priority-chain">
            <span
              v-for="(src, i) in tool.dataSources"
              :key="src"
              class="priority-item"
              :class="{ primary: i === 0, fallback: i > 0 }"
            >
              {{ src }}
              <span v-if="i < tool.dataSources.length - 1" class="arrow">→</span>
            </span>
          </div>
        </div>

        <!-- 参数列表 -->
        <div class="card-section">
          <h4 class="section-title">
            <el-icon><Operation /></el-icon> 输入参数
          </h4>
          <div class="params-table">
            <div v-for="p in tool.params" :key="p.name" class="param-row">
              <span class="param-name" :class="{ required: p.required }">{{ p.name }}</span>
              <span class="param-type">{{ p.type }}</span>
              <span class="param-desc">{{ p.desc }}</span>
            </div>
          </div>
        </div>

        <!-- 底部 REST 端点 -->
        <div class="card-footer">
          <code class="endpoint">POST /api/tools/{{ tool.routePath }}</code>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Guide, Connection, Operation } from '@element-plus/icons-vue'

/** 全部工具的完整元数据 */
const tools = [
  {
    name: 'get_weather',
    label: '天气查询',
    icon: '🌤️',
    category: '实时数据',
    tagType: 'warning',
    routePath: 'weather',
    description: '查询指定城市的实时天气、温度、湿度与穿衣建议。支持国内外主要城市。',
    workflow: '先通过 Tavily 联网搜索获取目标城市最新天气信息，若网络不可用则回退到 OpenWeatherMap API，均失败时使用内置 12 个热门城市模拟数据。不走知识库（RAG），保证信息时效性。',
    dataSources: ['Tavily 联网搜索', 'OpenWeatherMap API', '内置模拟数据'],
    params: [
      { name: 'city', type: 'string', required: true, desc: '城市或省份，如：郑州、河南、巴黎、北京' },
    ],
  },
  {
    name: 'get_attractions',
    label: '景点推荐',
    icon: '🏛️',
    category: '内容推荐',
    tagType: 'success',
    routePath: 'attractions',
    description: '根据目的地和兴趣偏好推荐热门景点，含评分、开放时间、门票等实用信息。',
    workflow: '首先检索知识库（PGVector 向量搜索）中的景点文档，命中则返回结构化景点数据；未命中时通过 Tavily 联网搜索实时景点信息，最后回退到内置 12 个城市的 mock 景点数据。',
    dataSources: ['RAG 知识库', 'Tavily 联网搜索', '内置模拟数据'],
    params: [
      { name: 'city', type: 'string', required: true, desc: '目的地城市' },
      { name: 'interests', type: 'string[]', required: false, desc: '兴趣偏好：文化、美食、购物等' },
      { name: 'limit', type: 'number', required: false, desc: '返回数量，默认 5 个' },
    ],
  },
  {
    name: 'generate_itinerary',
    label: '行程生成',
    icon: '🗺️',
    category: '核心规划',
    tagType: '',
    routePath: 'itinerary',
    description: '根据目的地、天数、旅行风格和预算档次，自动生成每日详细行程安排。',
    workflow: '从知识库检索目的地行程模板，结合 Tavily 搜索当地最新活动和景点，由 LLM 整合生成包含早中晚安排的逐日行程。支持慢节奏、深度、美食、文化、购物等多种风格。',
    dataSources: ['RAG 知识库', 'Tavily 联网搜索', '内置模拟数据'],
    params: [
      { name: 'destination', type: 'string', required: true, desc: '目的地，如：河南、巴黎、巴厘岛' },
      { name: 'days', type: 'number', required: true, desc: '旅行天数' },
      { name: 'style', type: 'string', required: false, desc: '风格：慢节奏 / 深度 / 美食 / 文化 / 购物' },
      { name: 'budget_level', type: 'string', required: false, desc: '预算：经济 / 中等 / 豪华' },
      { name: 'interests', type: 'string[]', required: false, desc: '兴趣标签' },
    ],
  },
  {
    name: 'calculate_budget',
    label: '预算估算',
    icon: '💰',
    category: '核心规划',
    tagType: '',
    routePath: 'budget',
    description: '按住宿、餐饮、交通、门票、购物等维度估算旅行总花费，支持不同预算档次。',
    workflow: '检索知识库中的目的地消费数据（酒店均价、餐饮水平等），辅以 Tavily 搜索最新价格信息，按人均/天计算各项开支并汇总。可选择性包含往返机票估算。',
    dataSources: ['RAG 知识库', 'Tavily 联网搜索', '内置模拟数据'],
    params: [
      { name: 'destination', type: 'string', required: true, desc: '目的地' },
      { name: 'days', type: 'number', required: true, desc: '旅行天数' },
      { name: 'people', type: 'number', required: false, desc: '出行人数，默认 1 人' },
      { name: 'budget_level', type: 'string', required: false, desc: '预算档次：经济 / 中等 / 豪华' },
      { name: 'include_flight', type: 'boolean', required: false, desc: '是否包含机票估算' },
    ],
  },
  {
    name: 'check_visa',
    label: '签证查询',
    icon: '🛂',
    category: '行前准备',
    tagType: 'danger',
    routePath: 'visa',
    description: '查询目的地国家对中国的签证政策，包含免签/落地签/电子签/使馆签等类型及办理流程。',
    workflow: '优先从知识库获取签证政策文档，若信息过时则通过 Tavily 以 news 主题 + 月级别时间范围搜索最新签证动态（如免签新政），确保信息的时效性和准确性。',
    dataSources: ['RAG 知识库', 'Tavily 新闻搜索', '内置模拟数据'],
    params: [
      { name: 'destination', type: 'string', required: true, desc: '目的地国家，如：日本、泰国、法国' },
    ],
  },
  {
    name: 'convert_currency',
    label: '货币换算',
    icon: '💱',
    category: '实时数据',
    tagType: 'warning',
    routePath: 'currency',
    description: '实时汇率换算，并提供目的地消费参考（一顿饭、一瓶水、打车起步价等）。',
    workflow: '优先调用 Frankfurter 免费 API（欧洲央行参考汇率，支持 11 种货币）获取实时汇率；若 API 不可用则通过 Tavily 财经搜索获取最新汇率；均失败时使用内置汇率参考表。不走 RAG。',
    dataSources: ['Frankfurter 实时 API', 'Tavily 财经搜索', '内置汇率参考表'],
    params: [
      { name: 'amount', type: 'number', required: true, desc: '金额' },
      { name: 'from_currency', type: 'string', required: true, desc: '原始货币：日元、美元、欧元、泰铢等' },
      { name: 'to_currency', type: 'string', required: false, desc: '目标货币，默认人民币' },
    ],
  },
  {
    name: 'generate_packing_list',
    label: '打包清单',
    icon: '🧳',
    category: '行前准备',
    tagType: 'info',
    routePath: 'packing',
    description: '根据目的地、季节、天数和活动类型，生成个性化旅行打包清单。',
    workflow: '检索知识库中对应目的地和季节的打包模板，结合 Tavily 搜索当地气候和特殊注意事项（如宗教场所着装要求），生成分类清单（衣物、证件、电子设备、药品、洗漱用品等）。',
    dataSources: ['RAG 知识库', 'Tavily 联网搜索', '内置模拟数据'],
    params: [
      { name: 'destination', type: 'string', required: true, desc: '目的地' },
      { name: 'days', type: 'number', required: true, desc: '旅行天数' },
      { name: 'season', type: 'string', required: true, desc: '季节：夏 / 冬 / 春 / 秋' },
      { name: 'activities', type: 'string[]', required: false, desc: '活动：海滩 / 徒步 / 购物 / 文化参观等' },
    ],
  },
  {
    name: 'translate_phrases',
    label: '短语翻译',
    icon: '🌐',
    category: '行中助手',
    tagType: 'info',
    routePath: 'translate',
    description: '提供目的地常用旅行短语翻译，覆盖问路、点餐、购物、紧急情况等场景。',
    workflow: '从知识库检索目的地常用语料库，结合 Tavily 获取地道表达和最新俚语，按场景分类输出原文、译文和发音提示。支持日语、泰语、韩语、法语、英语等。',
    dataSources: ['RAG 知识库', 'Tavily 联网搜索', '内置模拟数据'],
    params: [
      { name: 'text', type: 'string', required: false, desc: '要翻译的中文文本' },
      { name: 'target_language', type: 'string', required: false, desc: '目标语言：日语 / 泰语 / 韩语 / 法语 / 英语' },
      { name: 'destination', type: 'string', required: false, desc: '目的地（自动推断目标语言）' },
    ],
  },
  {
    name: 'web_search',
    label: '联网搜索',
    icon: '🔍',
    category: '基础设施',
    tagType: '',
    routePath: 'web-search',
    description: 'Agent 主动调用的实时联网搜索工具，用于补充最新旅行资讯和政策信息。',
    workflow: '直接调用 Tavily Search API 进行联网检索，支持 general（综合）、news（新闻）、finance（财经）三种搜索主题，可按天/周/月/年过滤时间范围。Agent 在知识库数据不足时自动触发。',
    dataSources: ['Tavily Search API'],
    params: [
      { name: 'query', type: 'string', required: true, desc: '搜索关键词或问题' },
      { name: 'topic', type: 'enum', required: false, desc: '搜索类型：general / news / finance' },
      { name: 'timeRange', type: 'enum', required: false, desc: '时间范围：day / week / month / year' },
    ],
  },
  {
    name: 'update_session_title',
    label: '会话标题',
    icon: '📝',
    category: 'Agent 专用',
    tagType: 'info',
    routePath: null,
    description: 'Agent 内部工具，根据用户旅行意图自动设置会话标题。不暴露 REST 端点。',
    workflow: 'Agent 在对话开始时根据用户描述的旅行需求，自动生成 6-15 字中文会话标题并通过 SessionService 写入数据库，方便会话列表展示和检索。',
    dataSources: ['LLM 生成 → SessionService 写入'],
    params: [
      { name: 'title', type: 'string', required: true, desc: '6-15 字中文会话标题，概括用户旅行需求' },
    ],
  },
]
</script>

<style scoped>
.tools-page {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 22px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 6px;
}

.page-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

/* ========== 瀑布流布局 ========== */
.waterfall {
  column-count: 3;
  column-gap: 16px;
}

.tool-card {
  break-inside: avoid;
  margin-bottom: 16px;
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  border: 1px solid #ebeef5;
  transition: box-shadow 0.25s, transform 0.25s;
}

.tool-card:hover {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

/* ---- 卡片头部 ---- */
.card-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;
}

.tool-icon {
  font-size: 32px;
  line-height: 1;
  flex-shrink: 0;
}

.card-title-wrap {
  flex: 1;
  min-width: 0;
}

.tool-name {
  margin: 0 0 2px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.tool-eng {
  font-size: 12px;
  color: #909399;
  font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
}

/* ---- 描述 ---- */
.tool-desc {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  margin: 0 0 16px;
}

/* ---- 分区 ---- */
.card-section {
  margin-bottom: 14px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px;
}

.section-title .el-icon {
  color: #409EFF;
  font-size: 15px;
}

.section-text {
  margin: 0;
  font-size: 12.5px;
  color: #606266;
  line-height: 1.65;
}

/* ---- 数据优先级链 ---- */
.priority-chain {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.priority-item {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.priority-item.primary {
  background: #ecf5ff;
  color: #409EFF;
  font-weight: 500;
}

.priority-item.fallback {
  background: #f5f7fa;
  color: #909399;
}

.arrow {
  color: #c0c4cc;
  margin: 0 2px;
  font-weight: 600;
}

/* ---- 参数表 ---- */
.params-table {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
}

.param-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 7px 10px;
  font-size: 12px;
  border-bottom: 1px solid #f2f3f5;
}

.param-row:last-child {
  border-bottom: 0;
}

.param-name {
  flex-shrink: 0;
  min-width: 70px;
  font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
  font-weight: 500;
  color: #303133;
  padding-top: 1px;
}

.param-name.required::after {
  content: ' *';
  color: #F56C6C;
}

.param-type {
  flex-shrink: 0;
  min-width: 56px;
  color: #409EFF;
  font-size: 11px;
  background: #ecf5ff;
  padding: 1px 5px;
  border-radius: 3px;
  text-align: center;
}

.param-desc {
  color: #909399;
  line-height: 1.5;
  flex: 1;
}

/* ---- 底部端点 ---- */
.card-footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed #ebeef5;
}

.endpoint {
  font-size: 12px;
  color: #67C23A;
  background: #f0f9eb;
  padding: 4px 10px;
  border-radius: 4px;
  font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
}

/* ========== 响应式 ========== */
@media (max-width: 1200px) {
  .waterfall { column-count: 2; }
}

@media (max-width: 768px) {
  .waterfall { column-count: 1; }
}
</style>
