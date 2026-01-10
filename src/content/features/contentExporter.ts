/**
 * 导出功能
 * 支持导出文章为Markdown、HTML、PDF等格式
 */

interface ExportOptions {
  format: 'markdown' | 'html' | 'text';
  filename?: string;
  includeImages?: boolean;
  includeMetadata?: boolean;
}

interface ArticleMetadata {
  title: string;
  author?: string;
  url: string;
  date?: string;
  excerpt?: string;
}

class ContentExporter {
  /**
   * 导出文章内容
   */
  async exportArticle(content: string, metadata: ArticleMetadata, options: ExportOptions): Promise<void> {
    let exportContent = '';
    const filename = options.filename || this.generateFilename(metadata.title, options.format);

    // 添加元数据
    if (options.includeMetadata) {
      exportContent += this.formatMetadata(metadata, options.format);
    }

    // 根据格式处理内容
    switch (options.format) {
      case 'markdown':
        exportContent += this.toMarkdown(content, options);
        break;
      case 'html':
        exportContent += this.toHTML(content, metadata, options);
        break;
      case 'text':
        exportContent += this.toPlainText(content);
        break;
    }

    // 下载文件
    this.downloadFile(exportContent, filename);
  }

  /**
   * 转换为Markdown格式
   */
  private toMarkdown(content: string, options: ExportOptions): string {
    // 使用已有的Turndown库（如果项目中有）
    // 这里提供简单的实现
    let markdown = content;

    if (!options.includeImages) {
      // 移除图片
      markdown = markdown.replace(/<img[^>]*>/g, '');
    }

    return markdown;
  }

  /**
   * 转换为HTML格式
   */
  private toHTML(content: string, metadata: ArticleMetadata, options: ExportOptions): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metadata.title}</title>
  <style>
    body {
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #333;
    }
    h1 { color: #2c3e50; }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
    }
    pre {
      background: #f4f4f4;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    .metadata {
      color: #666;
      font-size: 14px;
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid #eee;
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>
    `.trim();
  }

  /**
   * 转换为纯文本格式
   */
  private toPlainText(content: string): string {
    const temp = document.createElement('div');
    temp.innerHTML = content;
    return temp.textContent || temp.innerText || '';
  }

  /**
   * 格式化元数据
   */
  private formatMetadata(metadata: ArticleMetadata, format: 'markdown' | 'html' | 'text'): string {
    if (format === 'markdown') {
      return `# ${metadata.title}

${metadata.author ? `**作者**: ${metadata.author}` : ''}
${metadata.date ? `**日期**: ${metadata.date}` : ''}
**来源**: [${metadata.url}](${metadata.url})

---

`;
    } else if (format === 'html') {
      return `
<div class="metadata">
  <h1>${metadata.title}</h1>
  ${metadata.author ? `<p>作者: ${metadata.author}</p>` : ''}
  ${metadata.date ? `<p>日期: ${metadata.date}</p>` : ''}
  <p>来源: <a href="${metadata.url}">${metadata.url}</a></p>
</div>
`;
    } else {
      return `${metadata.title}
${metadata.author ? `作者: ${metadata.author}` : ''}
${metadata.date ? `日期: ${metadata.date}` : ''}
来源: ${metadata.url}

---

`;
    }
  }

  /**
   * 生成文件名
   */
  private generateFilename(title: string, format: string): string {
    // 清理标题，移除特殊字符
    const cleanTitle = title
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100);

    const timestamp = new Date().toISOString().split('T')[0];
    const extension = format === 'html' ? 'html' : format === 'markdown' ? 'md' : 'txt';

    return `${cleanTitle}-${timestamp}.${extension}`;
  }

  /**
   * 下载文件
   */
  private downloadFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 释放URL对象
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * 复制到剪贴板
   */
  async copyToClipboard(content: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch (error) {
      console.error('复制到剪贴板失败:', error);
      return false;
    }
  }
}

export const contentExporter = new ContentExporter();
