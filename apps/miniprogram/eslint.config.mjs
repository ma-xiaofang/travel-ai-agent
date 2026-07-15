// eslint.config.mjs

import globals from 'globals'
import pluginJs from '@eslint/js'
import { configs, parser } from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import eslintPluginImportX from 'eslint-plugin-import-x'
// import tsParser from '@typescript-eslint/parser'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

import { readFile } from 'node:fs/promises'

const autoImportFile = new URL('./.eslintrc-auto-import.json', import.meta.url)
const autoImportGlobals = JSON.parse(await readFile(autoImportFile, 'utf8'))

/** @type {import('eslint').Linter.Config[]} */
const config = [
  // 全局 files 指定 ESlint 匹配的文件
  {
    files: ['**/*.{js,mjs,jsx,mjsx,ts,tsx,mtsx,vue}']
  },
  // 基础配置
  {
    languageOptions: {
      // 指定全局变量
      globals: {
        ...globals.browser, // 浏览器环境
        ...globals.node, // node 环境
        ...autoImportGlobals.globals, // 自动导入配置
        $t: true,
        uni: true,
        UniApp: true,
        wx: true,
        WechatMiniprogram: true,
        getCurrentPages: true,
        UniHelper: true,
        Page: true,
        App: true,
        NodeJS: true
      },
      // parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module'
    }
  },
  pluginJs.configs.recommended,
  ...configs.recommended,
  ...pluginVue.configs['flat/essential'],
  // eslint-plugin-import-x 扩展插件
  eslintPluginImportX.flatConfigs.recommended,
  eslintPluginImportX.flatConfigs.typescript,
  // prettier 扩展插件
  eslintPluginPrettierRecommended,
  // 仅对所有 vue 文件的自定义配置
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: parser } }
  },
  // 自定义 rules
  {
    rules: {
      // 不允许存在未使用的变量
      '@typescript-eslint/no-unused-vars': 'warn',
      // vue 组件必须多单词驼峰命名，关闭它
      'vue/multi-word-component-names': 'off',
      // 禁止变量重新声明
      '@typescript-eslint/no-redeclare': 'error',
      // 禁止变量重新声明，与 @typescript-eslint 重复提示了，关闭它
      'no-redeclare': 'off',
      // 关闭 import-x 的 no-unresolved
      'import-x/no-unresolved': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-expressions': 'off'
    }
  },
  // ignores 提升为全局忽略项
  {
    ignores: ['src/uni_modules/', 'src/static/', '.vscode', '.husky']
  }
]

export default config
