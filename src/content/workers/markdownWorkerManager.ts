export class MarkdownWorkerManager {
  constructor() {
    console.log("[MarkdownWorkerManager] 🎉 新版本已加载 - 使用同步HTML到Markdown转换器 v2.0");
  }



  async convertToMarkdown(html: string): Promise<string> {
    console.log("[MarkdownWorkerManager] ✅ 新版本正在运行 - 使用同步HTML到Markdown转换");

    // 验证输入
    if (!html || typeof html !== 'string') {
      throw new Error("HTML内容无效");
    }

    try {
      // 使用同步转换方法
      return this.convertHtmlToMarkdownSync(html);
    } catch (error) {
      console.error("[MarkdownWorkerManager] 同步转换失败:", error);
      throw new Error(`Markdown转换失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 同步HTML到Markdown转换
   */
  private convertHtmlToMarkdownSync(html: string): string {
    // 创建临时DOM元素
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // 转换为Markdown
    return this.processNode(tempDiv);
  }

  /**
   * 处理DOM节点，转换为Markdown
   */
  private processNode(node: Node): string {
    let result = '';

    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent || '';
        result += text.trim() ? text : '';
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as Element;
        const tagName = element.tagName.toLowerCase();
        const content = this.processNode(element);

        switch (tagName) {
          case 'h1':
            result += `# ${content}\n\n`;
            break;
          case 'h2':
            result += `## ${content}\n\n`;
            break;
          case 'h3':
            result += `### ${content}\n\n`;
            break;
          case 'h4':
            result += `#### ${content}\n\n`;
            break;
          case 'h5':
            result += `##### ${content}\n\n`;
            break;
          case 'h6':
            result += `###### ${content}\n\n`;
            break;
          case 'p':
            result += `${content}\n\n`;
            break;
          case 'br':
            result += '\n';
            break;
          case 'strong':
          case 'b':
            result += `**${content}**`;
            break;
          case 'em':
          case 'i':
            result += `*${content}*`;
            break;
          case 'code':
            result += `\`${content}\``;
            break;
          case 'pre':
            result += `\n\`\`\`\n${content}\n\`\`\`\n\n`;
            break;
          case 'blockquote':
            const quotedContent = content.split('\n').map(line => `> ${line}`).join('\n');
            result += `${quotedContent}\n\n`;
            break;
          case 'a':
            const href = element.getAttribute('href') || '#';
            result += `[${content}](${href})`;
            break;
          case 'img':
            const src = element.getAttribute('src') || '';
            const alt = element.getAttribute('alt') || '';
            result += `![${alt}](${src})`;
            break;
          case 'ul':
          case 'ol':
            result += `${content}\n`;
            break;
          case 'li':
            result += `- ${content}\n`;
            break;
          case 'div':
          case 'span':
          case 'section':
          case 'article':
            result += content;
            break;
          default:
            result += content;
        }
      }
    }

    return result;
  }





  destroy(): void {
    // 清理资源
    console.log("[MarkdownWorkerManager] 资源已清理");
  }
} 