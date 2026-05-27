import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/common'
import MarkdownIt from 'markdown-it'
import multimdTable from 'markdown-it-multimd-table'

/**
 * 模型 / IME 常混入全角反引号、零宽字符，需归一化
 */
function normalizeMarkdownSource(input) {
  return input
    .replace(/｀/g, '`')
    .replace(/[​-‍﻿⁠]/g, '')
    .replace(/\\(`)/g, '$1')
}

/** 围栏语言标识（防 XSS，仅允许常见语言名） */
function safeFenceLang(raw) {
  const name = (raw.trim().toLowerCase().split(/\s+/)[0] ?? '')
  if (/^[a-z0-9][a-z0-9+#.-]{0,39}$/i.test(name)) return name
  return ''
}

function highlightFence(code, rawInfo) {
  const lang = safeFenceLang(rawInfo)
  try {
    if (lang && hljs.getLanguage(lang)) {
      const { value } = hljs.highlight(code, { language: lang, ignoreIllegals: true })
      return `<pre class="hljs"><code class="hljs language-${lang}">${value}</code></pre>`
    }
    if (lang) {
      const { value } = hljs.highlight(code, { language: 'plaintext', ignoreIllegals: true })
      return `<pre class="hljs"><code class="hljs language-${lang}">${value}</code></pre>`
    }
    const { value } = hljs.highlightAuto(code)
    return `<pre class="hljs"><code class="hljs">${value}</code></pre>`
  } catch {
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<pre class="hljs"><code class="hljs">${escaped}</code></pre>`
  }
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: true,
  highlight: highlightFence,
}).use(multimdTable, {
  multiline: false,
  rowspan: true,
  headerless: true,
  multibody: true,
  aotolabel: true,
})

const defaultLinkOpen =
  md.renderer.rules.link_open ??
  ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options))

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  const href = token?.attrGet('href')
  if (href && /^https?:\/\//i.test(href)) {
    token.attrPush(['target', '_blank'])
    token.attrPush(['rel', 'noopener noreferrer'])
  }
  return defaultLinkOpen(tokens, idx, options, env, self)
}

/** 将 Markdown 转为可安全用于 v-html 的 HTML */
export function renderMarkdown(source) {
  if (!source) return ''
  return DOMPurify.sanitize(md.render(normalizeMarkdownSource(source)), {
    ADD_ATTR: ['rowspan', 'colspan'],
  })
}
