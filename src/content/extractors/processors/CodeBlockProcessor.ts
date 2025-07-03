/**
 * 代码块处理器接口
 */
export interface ContentProcessor {
  process(content: string): string;
}

/**
 * 代码块处理器
 * 用于增强代码块的显示
 */
export class CodeBlockProcessor implements ContentProcessor {
  /**
   * 处理HTML内容，增强代码块的显示
   * @param content HTML内容
   * @returns 处理后的HTML内容
   */
  public process(content: string): string {
    // 查找所有代码块
    const codeBlockRegex = /<pre><code(?:\s+class="([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g;
    
    // 替换为带行号的代码块
    return content.replace(codeBlockRegex, (match, language, code) => {
      // 解码HTML实体
      const decodedCode = this.decodeHtmlEntities(code);
      
      // 分割代码行
      const lines = decodedCode.split('\n');
      
      // 构建行号HTML
      const lineNumbersHtml = this.generateLineNumbers(lines.length);
      
      // 确定语言类名
      const languageClass = language ? `language-${language}` : '';
      
      // 构建增强的代码块HTML
      return `
        <pre class="line-numbers ${languageClass}">
          <code class="${languageClass}">${decodedCode}</code>
          <span class="line-numbers-rows">${lineNumbersHtml}</span>
        </pre>
      `;
    });
  }
  
  /**
   * 生成行号HTML
   * @param lineCount 代码行数
   * @returns 行号HTML
   */
  private generateLineNumbers(lineCount: number): string {
    let lineNumbersHtml = '';
    for (let i = 0; i < lineCount; i++) {
      lineNumbersHtml += '<span></span>';
    }
    return lineNumbersHtml;
  }
  
  /**
   * 解码HTML实体
   * @param html 包含HTML实体的字符串
   * @returns 解码后的字符串
   */
  private decodeHtmlEntities(html: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = html;
    return textarea.value;
  }
}

// 导出默认实例
export const codeBlockProcessor = new CodeBlockProcessor(); 