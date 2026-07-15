// const fs = require('fs')
// const path = require('path')
// const { execSync } = require('child_process')

// const scopes = fs
//   .readdirSync(path.resolve(__dirname, 'src'), { withFileTypes: true })
//   .filter(dirent => dirent.isDirectory())
//   .map(dirent => dirent.name.replace(/s$/, ''))

// // precomputed scope
// const scopeComplete = execSync('git status --porcelain || true')
//   .toString()
//   .trim()
//   .split('\n')
//   .find(r => ~r.indexOf('M  src'))
//   ?.replace(/(\/)/g, '%%')
//   ?.match(/src%%((\w|-)*)/)?.[1]
//   ?.replace(/s$/, '')

module.exports = {
  userEmoji: true,
  // ignores: [commit => commit.includes('init')],
  extends: ['git-commit-emoji'],
  rules: {
    // 'header-max-length': [2, 'always', 108],
  },
  prompt: {
    /** @use `pnpm commit :f` */
    // customScopesAlign: !scopeComplete ? 'top' : 'bottom', //  如果 scope 不完整，则将 customScopesAlign 设置为 top，否则设置为 bottom
    // defaultScope: scopeComplete, //  如果 scope 完整，则将 defaultScope 设置为 true，否则设置为 false
    // scopes: [...scopes, 'mock'],
    allowEmptyIssuePrefixs: false, //  不允许空 issue 前缀
    allowCustomIssuePrefixs: false, //  不允许自定义 issue 前缀
    // emptyScopesAlias: 'empty: 不填写',
    // customScopesAlias: 'custom: 自定义',
    skipQuestions: ['scope', 'body', 'breaking', 'footer'], // 跳过 body、breaking、footer 三个问题
    userEmoji: true,
    emojiAlign: 'left',

    messages: {
      type: '选择你要提交的类型 :',
      // scope: '选择一个提交范围 (可选):',
      // customScope: '请输入自定义的提交范围 :',
      subject: '填写简短精炼的变更描述 :\n',
      // body: '填写更加详细的变更描述 (可选)。使用 "|" 换行 :\n',
      // breaking: '列举非兼容性重大的变更 (可选)。使用 "|" 换行 :\n',
      // footerPrefixsSelect: '选择关联issue前缀 (可选):',
      // customFooterPrefixs: '输入自定义issue前缀 :',
      // footer: '列举关联issue (可选) 例如: #31, #I3244 :\n',
      confirmCommit: '是否提交或修改commit ?'
    },

    typeEnum: [
      'init',
      'feat',
      'fix',
      'docs',
      'style',
      'refactor',
      'perf',
      'test',
      'build',
      'ci',
      'chore',
      'wip',
      'workflow',
      'types',
      'versions',
      'revert'
    ],

    types: [
      { value: 'init', name: '🎉 init: 初始化项目', emoji: '🎉' },
      { value: 'feat', name: '✨ feat: 新增功能', emoji: '✨' },
      { value: 'fix', name: '🐞 fix: 修复bug', emoji: '🐞' },
      { value: 'docs', name: '📃 docs: 文档变更', emoji: '📃' },
      { value: 'style', name: '🌈 style: 代码格式（仅仅修改了空格、缩进、逗号等等，不改变代码逻辑）', emoji: '🌈' },
      { value: 'refactor', name: '🦄 refactor: 代码重构，没有加新功能或修复bug', emoji: '🦄' },
      { value: 'perf', name: '🎈 perf: 代码优化，比如提升性能、体验', emoji: '🎈' },
      { value: 'test', name: '🧪 test: 添加疏漏测试或已有测试改动', emoji: '🧪' },
      { value: 'build', name: '🔧 build: 构建流程、外部依赖变更 (如升级 npm 包、修改打包配置等)', emoji: '🔧' },
      { value: 'ci', name: '🐎 ci: 修改 CI 配置，例如对k8s、docker的配置文件的修改', emoji: '🐎' },
      { value: 'chore', name: '🐳 chore: 对构建过程或辅助工具和库的更改 (不影响源文件、测试用例)', emoji: '🐳' },
      { value: 'wip', name: '🔓️ wip: 正在开发中', emoji: '🔓️' },
      { value: 'workflow', name: '⏳️ workflow: 工作流程改进', emoji: '⏳️' },
      { value: 'types', name: '🚙 types: 类型定义文件修改', emoji: '🚙' },
      { value: 'versions', name: '🔖 versions: 类型定义文件修改', emoji: '🔖' },
      { value: 'revert', name: '↩ revert: 回滚 commit', emoji: '↩' }
    ]
  }
}
