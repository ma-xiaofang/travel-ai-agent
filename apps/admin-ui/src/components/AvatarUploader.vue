<template>
  <div class="avatar-uploader">
    <el-avatar :size="size" :src="preview || undefined">
      <el-icon :size="size * 0.5"><UserFilled /></el-icon>
    </el-avatar>

    <el-upload
      :show-file-list="false"
      :http-request="doUpload"
      :before-upload="beforeUpload"
      accept="image/jpeg,image/png,image/webp,image/gif"
    >
      <el-button size="small" :loading="uploading">选择图片</el-button>
    </el-upload>

    <p class="tip">支持 JPG / PNG / WebP / GIF，大小不超过 2MB</p>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { UserFilled } from '@element-plus/icons-vue'
import { uploadAvatar } from '@/api/upload'

const props = defineProps({
  /** 当前头像 URL（v-model） */
  modelValue: { type: String, default: '' },
  /** 预览头像尺寸 */
  size: { type: Number, default: 80 },
})
const emit = defineEmits(['update:modelValue'])

const preview = ref(props.modelValue)
const uploading = ref(false)

watch(
  () => props.modelValue,
  (val) => {
    preview.value = val
  },
)

/** 上传前校验：类型 + 体积 */
function beforeUpload(file) {
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return false
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 2MB')
    return false
  }
  return true
}

/** 自定义上传：走 /api/upload/avatar，成功后回传 URL */
async function doUpload({ file, onSuccess, onError }) {
  uploading.value = true
  try {
    const res = await uploadAvatar(file)
    const url = res.data.url
    preview.value = url
    emit('update:modelValue', url)
    onSuccess?.(res.data)
  } catch (err) {
    onError?.(err)
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.avatar-uploader {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.tip {
  margin: 0;
  font-size: 12px;
  color: #909399;
}
</style>