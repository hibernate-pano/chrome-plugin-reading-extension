/**
 * Markdown 渲染器
 * 使用 markdown-it 将 Markdown 渲染为 HTML
 */
import MarkdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import markdownItToc from "markdown-it-toc-done-right";
import markdownItHighlightjs from "markdown-it-highlightjs";
import markdownItTaskLists from "markdown-it-task-lists";

export interface MarkdownRendererOptions {
  html?: boolean;
  linkify?: boolean;
  typographer?: boolean;
  breaks?: boolean;
  highlight?: (str: string, lang: string) => string;
  plugins?: {
    anchor?: boolean;
    toc?: boolean;
    highlightjs?: boolean;
    taskLists?: boolean;
  };
}

export function renderMarkdown(markdown: string, options: MarkdownRendererOptions = {}): string {
  // 默认选项
  const defaultOptions: MarkdownRendererOptions = {
    html: true,
    linkify: true,
    typographer: true,
    breaks: false,
    plugins: {
      anchor: true,
      toc: true,
      highlightjs: true,
      taskLists: true
    }
  };

  // 合并选项
  const mergedOptions = { ...defaultOptions, ...options };
  const pluginOptions = { ...defaultOptions.plugins, ...options.plugins };

  // 创建 markdown-it 实例
  const md = new MarkdownIt({
    html: mergedOptions.html,
    linkify: mergedOptions.linkify,
    typographer: mergedOptions.typographer,
    breaks: mergedOptions.breaks,
    highlight: mergedOptions.highlight
  });

  // 配置插件
  if (pluginOptions.anchor) {
    md.use(markdownItAnchor, {
      permalink: true,
      permalinkSymbol: "#",
      permalinkBefore: true,
    });
  }

  if (pluginOptions.toc) {
    md.use(markdownItToc, {
      listType: "ul",
      containerClass: "reading-mode-toc",
    });
  }

  if (pluginOptions.highlightjs) {
    md.use(markdownItHighlightjs);
  }

  if (pluginOptions.taskLists) {
    md.use(markdownItTaskLists);
  }

  // 渲染 Markdown 为 HTML
  return md.render(markdown);
}

// 导出默认实例
export const markdownRenderer = {
  renderMarkdown
};