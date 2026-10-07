<template>
  <view class="itin-card">
    <!-- 头部：标题 + 来源 + 编辑开关 -->
    <view class="itin-head">
      <view class="itin-head-main">
        <text class="itin-title">🗺️ 行程卡</text>
        <text class="itin-meta">
          {{ artifact.destination }} · {{ artifact.days }}天<text v-if="artifact.style"> · {{ artifact.style }}</text>
        </text>
      </view>
      <view class="itin-head-side">
        <text class="itin-source">{{ sourceLabel }}</text>
        <text class="itin-edit" @click="toggleEditing">{{ editing ? '保存' : '编辑' }}</text>
      </view>
    </view>

    <text v-if="artifact.summary" class="itin-summary">{{ artifact.summary }}</text>

    <!-- 逐日行程 -->
    <view v-for="(day, di) in artifact.plan" :key="di" class="day">
      <view class="day-head" @click="toggleDay(di)">
        <text class="day-badge">D{{ day.day }}</text>
        <input v-if="editing" class="day-theme-input" v-model="day.theme" placeholder="当日主题"
          placeholder-style="color:#bbb" />
        <text v-else class="day-theme">{{ day.theme || '当日安排' }}</text>
        <text v-if="day.dailyBudget" class="day-budget">{{ day.dailyBudget }}</text>
        <text class="day-arrow">{{ isOpen(di) ? '▾' : '▸' }}</text>
      </view>

      <view v-if="isOpen(di)" class="day-body">
        <view v-for="(item, ii) in day.items" :key="ii" class="item">
          <view class="item-row">
            <text class="period-tag">{{ item.period }}</text>
            <input v-if="editing" class="item-title-input" v-model="item.title" placeholder="安排标题"
              placeholder-style="color:#bbb" />
            <text v-else class="item-title">{{ item.title }}</text>
          </view>

          <textarea v-if="editing" class="item-textarea" v-model="item.detail" placeholder="玩法 / 看点 / 避坑"
            placeholder-style="color:#bbb" auto-height />
          <text v-else-if="item.detail" class="item-detail">{{ item.detail }}</text>

          <view class="item-foot">
            <template v-if="editing">
              <input class="item-tag-input" v-model="item.transport" placeholder="交通" placeholder-style="color:#bbb" />
              <input class="item-tag-input" v-model="item.budget" placeholder="花费参考" placeholder-style="color:#bbb" />
            </template>
            <template v-else>
              <text v-if="item.transport" class="item-tag">🚕 {{ item.transport }}</text>
              <text v-if="item.budget" class="item-tag">💰 {{ item.budget }}</text>
            </template>
          </view>

          <text v-if="editing" class="item-del" @click="removeItem(day, ii)">删除这条安排</text>
        </view>

        <text v-if="!day.items.length" class="day-empty">暂无安排，可点右上角「编辑」补充</text>
      </view>
    </view>

    <!-- 底部提示 -->
    <view class="itin-foot">
      <text v-if="editing" class="itin-hint">改完点「保存」即存入账号，换设备也能看到</text>
      <text v-else class="itin-hint">数据来源：{{ sourceLabel }}，出行前请二次核实</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import type { ItineraryArtifact, ItineraryDay } from '@/types/api'

const props = defineProps<{ artifact: ItineraryArtifact }>()

const emit = defineEmits<{ save: [artifact: ItineraryArtifact] }>()

/** 是否处于编辑态 */
const editing = ref(false)

/** 切换编辑态；退出编辑（点「保存」）时把编辑后的行程抛给父组件落库 */
function toggleEditing() {
  if (editing.value) {
    editing.value = false
    emit('save', props.artifact)
  } else {
    editing.value = true
  }
}

/** 折叠状态：undefined 视为展开 */
const collapsed = reactive<Record<number, boolean>>({})

function isOpen(index: number): boolean {
  return collapsed[index] !== true
}

function toggleDay(index: number) {
  collapsed[index] = !collapsed[index]
}

function removeItem(day: ItineraryDay, index: number) {
  day.items.splice(index, 1)
}

/** 数据来源标签 */
const SOURCE_LABEL: Record<string, string> = {
  rag: '📚 知识库',
  tavily: '🌐 联网搜索',
  api: '📡 实时数据',
  mock: '📋 内置参考',
}

const sourceLabel = computed(
  () => SOURCE_LABEL[props.artifact.source ?? ''] ?? '📋 内置参考',
)
</script>

<style scoped>
.itin-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx 24rpx 16rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
  border: 1rpx solid #F0F0F0;
}

/* ======== 头部 ======== */
.itin-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.itin-head-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.itin-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1A1A1A;
}

.itin-meta {
  font-size: 24rpx;
  color: #888;
  margin-top: 6rpx;
}

.itin-head-side {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.itin-source {
  font-size: 22rpx;
  color: #FF6B3D;
  background: #FFF5F0;
  border-radius: 8rpx;
  padding: 4rpx 10rpx;
  margin-right: 12rpx;
}

.itin-edit {
  font-size: 24rpx;
  color: #666;
  border: 1rpx solid #E5E5E5;
  border-radius: 8rpx;
  padding: 4rpx 14rpx;
}

.itin-edit:active {
  background: #F5F5F5;
}

.itin-summary {
  display: block;
  font-size: 26rpx;
  color: #555;
  line-height: 1.5;
  margin-top: 12rpx;
  padding: 12rpx 16rpx;
  background: #FAFAFA;
  border-radius: 12rpx;
}

/* ======== 每日 ======== */
.day {
  margin-top: 20rpx;
}

.day-head {
  display: flex;
  align-items: center;
  padding: 8rpx 0;
}

.day-badge {
  font-size: 24rpx;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #FF6B3D, #FF8F5E);
  border-radius: 8rpx;
  padding: 4rpx 12rpx;
  margin-right: 14rpx;
  flex-shrink: 0;
}

.day-theme {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
  flex: 1;
  min-width: 0;
}

.day-theme-input {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
  flex: 1;
  min-width: 0;
  border-bottom: 1rpx dashed #E0E0E0;
  padding-bottom: 2rpx;
}

.day-budget {
  font-size: 22rpx;
  color: #999;
  margin-left: 12rpx;
  flex-shrink: 0;
}

.day-arrow {
  font-size: 22rpx;
  color: #CCC;
  margin-left: 12rpx;
  flex-shrink: 0;
}

/* ======== 单条安排 ======== */
.day-body {
  padding-left: 12rpx;
  border-left: 4rpx solid #FFF0E9;
  margin-left: 8rpx;
}

.item {
  padding: 14rpx 0;
  border-bottom: 1rpx solid #F5F5F5;
}

.item:last-child {
  border-bottom: none;
}

.item-row {
  display: flex;
  align-items: center;
}

.period-tag {
  font-size: 22rpx;
  color: #FF6B3D;
  background: #FFF5F0;
  border-radius: 6rpx;
  padding: 2rpx 10rpx;
  margin-right: 12rpx;
  flex-shrink: 0;
}

.item-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
  flex: 1;
  min-width: 0;
}

.item-title-input {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A1A;
  flex: 1;
  min-width: 0;
  border-bottom: 1rpx dashed #E0E0E0;
  padding-bottom: 2rpx;
}

.item-detail {
  display: block;
  font-size: 25rpx;
  color: #666;
  line-height: 1.5;
  margin-top: 6rpx;
}

.item-textarea {
  width: 100%;
  box-sizing: border-box;
  font-size: 25rpx;
  color: #666;
  line-height: 1.5;
  margin-top: 8rpx;
  padding: 8rpx 12rpx;
  background: #FAFAFA;
  border-radius: 8rpx;
}

.item-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 8rpx;
}

.item-tag {
  font-size: 22rpx;
  color: #888;
  background: #F7F7F7;
  border-radius: 6rpx;
  padding: 2rpx 10rpx;
  margin-right: 10rpx;
}

.item-tag-input {
  font-size: 23rpx;
  color: #666;
  background: #FAFAFA;
  border-radius: 6rpx;
  padding: 6rpx 12rpx;
  margin-right: 10rpx;
  width: 200rpx;
}

.item-del {
  display: inline-block;
  font-size: 22rpx;
  color: #C0392B;
  margin-top: 10rpx;
}

.day-empty {
  display: block;
  font-size: 24rpx;
  color: #BBB;
  padding: 12rpx 0;
}

/* ======== 底部 ======== */
.itin-foot {
  margin-top: 16rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid #F5F5F5;
}

.itin-hint {
  font-size: 22rpx;
  color: #AAA;
  line-height: 1.4;
}
</style>