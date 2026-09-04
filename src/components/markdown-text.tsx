import { memo, useMemo, type ComponentProps } from 'react';
import { Platform, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

interface MarkdownTextProps {
  /** Markdown 源文本 */
  content: string;
}

/**
 * 主题化 Markdown 渲染（基于 react-native-markdown-display）。
 * - style 用 useMemo 依赖 theme 生成，引用稳定；
 * - 库组件内置 memo，父级流式 patch 时仅 content 变化的消息会重新解析；
 * - 链接点击仅在 http/https 时交给系统打开。
 */
export const MarkdownText = memo(function MarkdownText({
  content,
}: MarkdownTextProps) {
  const theme = useTheme();
  const mdStyle = useMemo(() => buildStyle(theme), [theme]);

  if (!content) return null;

  return (
    <Markdown
      style={mdStyle as ComponentProps<typeof Markdown>['style']}
      onLinkPress={(url) => /^https?:\/\//i.test(url)}
    >
      {content}
    </Markdown>
  );
});

/**
 * 库的样式继承规则：叶子文本节点会沿父链聚合「文本属性」（fontSize/color 等），
 * 因此这里不可以在 styles.text 上设置 fontSize（会把标题/代码的字号全部抹平），
 * 字号统一放 body，标题/代码块再各自覆盖。
 */
function buildStyle(theme: ThemeColors) {
  const { text, textSecondary, tint } = theme;
  const codeInlineBg = 'rgba(127, 127, 127, 0.16)';
  const codeBlockBg = 'rgba(127, 127, 127, 0.1)';
  const blockquoteBg = 'rgba(127, 127, 127, 0.08)';

  const headingBase = {
    color: text,
    fontWeight: '700' as const,
    marginTop: 8,
    marginBottom: 4,
    lineHeight: 28,
  };

  return {
    // 正文基线：叶子文本会继承 body 的 fontSize/lineHeight/color
    body: { color: text, fontSize: 16, lineHeight: 24 },
    text: { color: text },
    paragraph: { marginVertical: 0 },

    heading1: { ...headingBase, fontSize: 22 },
    heading2: { ...headingBase, fontSize: 19 },
    heading3: { ...headingBase, fontSize: 17 },
    heading4: { ...headingBase, fontSize: 16 },
    heading5: { ...headingBase, fontSize: 15 },
    heading6: { ...headingBase, fontSize: 14 },

    strong: { fontWeight: '700' },
    em: { fontStyle: 'italic' },
    del: { textDecorationLine: 'line-through' },

    link: { color: tint },
    hr: {
      backgroundColor: textSecondary,
      height: StyleSheet.hairlineWidth,
      marginVertical: 10,
    },

    code_inline: {
      color: text,
      fontFamily: MONO,
      fontSize: 14,
      backgroundColor: codeInlineBg,
      borderRadius: 4,
      paddingHorizontal: 4,
    },
    code_block: {
      color: text,
      fontFamily: MONO,
      fontSize: 14,
      lineHeight: 20,
      backgroundColor: codeBlockBg,
      borderRadius: 6,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: textSecondary,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginVertical: 6,
    },
    fence: {
      color: text,
      fontFamily: MONO,
      fontSize: 14,
      lineHeight: 20,
      backgroundColor: codeBlockBg,
      borderRadius: 6,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: textSecondary,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginVertical: 6,
    },

    bullet_list: { marginVertical: 2 },
    ordered_list: { marginVertical: 2 },
    list_item: { marginVertical: 2 },
    bullet_list_icon: { color: text },
    ordered_list_icon: { color: text },

    blockquote: {
      backgroundColor: blockquoteBg,
      borderLeftWidth: 3,
      borderLeftColor: tint,
      borderRadius: 4,
      paddingHorizontal: 10,
      paddingVertical: 2,
      marginVertical: 4,
    },
  };
}
