import http from './http'

/**
 * 上传头像图片
 * @param {File} file 图片文件
 * @returns {Promise<{ code: number, message: string, data: { url: string } }>}
 */
export function uploadAvatar(file) {
  const form = new FormData()
  form.append('file', file)
  return http.post('/upload/avatar', form)
}