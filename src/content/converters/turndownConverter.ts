/**
 * Markdown 转换器
 * 使用 turndown 将 HTML 转换为 Markdown 格式
 */
import TurndownService from "turndown";

export interface TurndownOptions {
  headingStyle?: "setext" | "atx";
  codeBlockStyle?: "indented" | "fenced";
  emDelimiter?: "_" | "*";
  bulletListMarker?: "-" | "*" | "+";
  strongDelimiter?: "__" | "**";
  linkStyle?: "inlined" | "referenced";
  linkReferenceStyle?: "full" | "collapsed" | "shortcut";
}

export function convertToMarkdown(html: string, options: TurndownOptions = {}): string {
  // 创建 Turndown 实例，合并默认选项和用户选项
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    bulletListMarker: "-",
    ...options
  });

  // 自定义规则：保留代码块语言标记
  turndownService.addRule("codeBlocks", {
    filter: (node) => {
      return (
        node.nodeName === "PRE" &&
        node.firstChild &&
        node.firstChild.nodeName === "CODE"
      );
    },
    replacement: (content, node) => {
      const code = node.firstChild as HTMLElement;
      const className = code.getAttribute("class") || "";
      const language = className.replace(/^language-/, "");
      return "\n```" + language + "\n" + code.textContent + "\n```\n";
    },
  });

  // 自定义规则：处理图片和图片说明
  turndownService.addRule("images", {
    filter: "figure",
    replacement: (content, node) => {
      const img = node.querySelector("img");
      const figcaption = node.querySelector("figcaption");

      if (!img) return content;

      const alt = img.getAttribute("alt") || "";
      const src = img.getAttribute("src") || "";
      const caption = figcaption ? figcaption.textContent : "";

      return `![${alt}](${src})${caption ? "\n*" + caption + "*" : ""}`;
    },
  });

  // 自定义规则：保留表格结构
  turndownService.addRule("tables", {
    filter: "table",
    replacement: function(content, node) {
      // 这里使用 turndown 默认的表格处理
      return turndownService.defaultRules.table.replacement(content, node as HTMLElement);
    }
  });

  // 转换 HTML 为 Markdown
  return turndownService.turndown(html);
}

// 导出默认实例
export const turndownConverter = {
  convertToMarkdown
};