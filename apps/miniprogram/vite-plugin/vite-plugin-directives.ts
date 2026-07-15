import { Plugin } from 'vite'
import { parse } from 'vue/compiler-sfc'

const vitePluginDirectives = ({ directives = 'v-perms' }): Plugin => {
  return {
    name: 'vite-plugin-directives',
    // code 是源码，path 是文件路径
    transform(code, path) {
      try {
        if (!/.vue$/.test(path)) return null //  如果不是vue文件，则返回null
        const parseCode = parse(code) // parse 的作用是将源码解析成 ast
        if (!parseCode) return null //  如果解析失败，则返回null
        if (!parseCode.descriptor?.template?.content) return null // 如果没有模板内容，则返回null

        // 正则匹配 (根据传入的指令名称) /v-perms="([^"]+)"/g
        const reg = new RegExp(`${directives}="([^"]+)"`, 'g') // 匹配指令
        const checkPermsName = directives.slice(2) // 检查函数名称 与 指令名称一致
        const $code = parseCode.descriptor.template.content.replace(reg, `v-if="$${checkPermsName}($1)"`) // 模板内容
        return {
          code: code.replace(parseCode.descriptor.template.content, $code)
        }
      } catch (error) {
        return null
      }
    }
  }
}

export default vitePluginDirectives
