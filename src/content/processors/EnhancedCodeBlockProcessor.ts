import { ContentProcessor } from './ContentProcessorManager';
import { ReadingModeSettings } from '../types';

/**
 * 代码块处理器选项
 */
export interface CodeBlockProcessorOptions {
  enableSyntaxHighlighting?: boolean;
  enableLineNumbers?: boolean;
  enableCopyButton?: boolean;
  enableThemeSwitching?: boolean;
  defaultTheme?: string;
  maxLineLength?: number;
  enableWordWrap?: boolean;
  enableFolding?: boolean;
}

/**
 * 增强的代码块处理器
 * 提供语法高亮、行号、主题切换等高级功能
 */
export class EnhancedCodeBlockProcessor implements ContentProcessor {
  public readonly name = 'EnhancedCodeBlockProcessor';
  public readonly priority = 100; // 高优先级，优先处理代码块

  private options: CodeBlockProcessorOptions;
  private supportedLanguages: Set<string> = new Set([
    'javascript', 'typescript', 'js', 'ts',
    'html', 'css', 'scss', 'sass', 'less',
    'python', 'py', 'java', 'cpp', 'c',
    'php', 'ruby', 'go', 'rust', 'swift',
    'sql', 'json', 'xml', 'yaml', 'markdown',
    'bash', 'shell', 'powershell', 'dockerfile'
  ]);

  constructor(options: Partial<CodeBlockProcessorOptions> = {}) {
    this.options = {
      enableSyntaxHighlighting: true,
      enableLineNumbers: true,
      enableCopyButton: true,
      enableThemeSwitching: true,
      defaultTheme: 'github',
      maxLineLength: 120,
      enableWordWrap: true,
      enableFolding: true,
      ...options
    };
  }

  /**
   * 检查是否可以处理此内容
   */
  public canProcess(content: string): boolean {
    return content.includes('<pre') || content.includes('<code') || content.includes('```');
  }

  /**
   * 处理HTML内容
   */
  public async process(content: string, settings?: ReadingModeSettings): Promise<string> {
    try {
      let processedContent = content;

      // 处理Markdown风格的代码块
      processedContent = this.processMarkdownCodeBlocks(processedContent);

      // 处理HTML代码块
      processedContent = this.processHTMLCodeBlocks(processedContent, settings);

      // 处理内联代码
      processedContent = this.processInlineCode(processedContent);

      return processedContent;
    } catch (error) {
      console.error('Code block processing failed:', error);
      return content; // 返回原始内容
    }
  }

  /**
   * 处理Markdown风格的代码块
   */
  private processMarkdownCodeBlocks(content: string): string {
    // 匹配 ```language 和 ``` 之间的内容
    const markdownCodeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    
    return content.replace(markdownCodeBlockRegex, (match, language, code) => {
      const lang = language || 'text';
      const cleanCode = this.cleanCodeContent(code);
      
      return this.generateEnhancedCodeBlock(cleanCode, lang);
    });
  }

  /**
   * 处理HTML代码块
   */
  private processHTMLCodeBlocks(content: string, settings?: ReadingModeSettings): string {
    // 处理 <pre><code> 组合
    const preCodeRegex = /<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi;
    
    content = content.replace(preCodeRegex, (match, code) => {
      const language = this.detectLanguage(match);
      const cleanCode = this.cleanCodeContent(code);
      
      return this.generateEnhancedCodeBlock(cleanCode, language);
    });

    // 处理单独的 <pre> 标签
    const preRegex = /<pre[^>]*>([\s\S]*?)<\/pre>/gi;
    
    content = content.replace(preRegex, (match, code) => {
      // 检查是否已经处理过
      if (match.includes('enhanced-code-container')) {
        return match;
      }
      
      const language = this.detectLanguage(match);
      const cleanCode = this.cleanCodeContent(code);
      
      return this.generateEnhancedCodeBlock(cleanCode, language);
    });

    return content;
  }

  /**
   * 处理内联代码
   */
  private processInlineCode(content: string): string {
    // 处理 `code` 格式的内联代码
    const inlineCodeRegex = /`([^`]+)`/g;
    
    return content.replace(inlineCodeRegex, (match, code) => {
      const cleanCode = this.escapeHtml(code);
      return `<code class="inline-code">${cleanCode}</code>`;
    });
  }

  /**
   * 生成增强的代码块HTML
   */
  private generateEnhancedCodeBlock(code: string, language: string): string {
    const normalizedLang = this.normalizeLanguage(language);
    const lines = code.split('\n');
    const lineCount = lines.length;
    
    // 生成行号
    const lineNumbers = this.options.enableLineNumbers 
      ? this.generateLineNumbers(lineCount)
      : '';
    
    // 生成工具栏
    const toolbar = this.generateToolbar(normalizedLang);
    
    // 生成代码内容
    const codeContent = this.generateCodeContent(lines, normalizedLang);
    
    // 生成主题切换器
    const themeSwitcher = this.options.enableThemeSwitching
      ? this.generateThemeSwitcher(normalizedLang)
      : '';
    
    return `
      <div class="enhanced-code-container" data-language="${normalizedLang}">
        ${toolbar}
        <div class="code-content-wrapper">
          ${lineNumbers}
          <pre class="enhanced-code ${normalizedLang}" data-lang="${normalizedLang}">
            <code class="language-${normalizedLang}">${codeContent}</code>
          </pre>
        </div>
        ${themeSwitcher}
      </div>
    `;
  }

  /**
   * 生成行号
   */
  private generateLineNumbers(lineCount: number): string {
    if (!this.options.enableLineNumbers) return '';
    
    let lineNumbersHtml = '<div class="line-numbers-rows">';
    for (let i = 1; i <= lineCount; i++) {
      lineNumbersHtml += `<span data-line="${i}"></span>`;
    }
    lineNumbersHtml += '</div>';
    
    return lineNumbersHtml;
  }

  /**
   * 生成工具栏
   */
  private generateToolbar(language: string): string {
    if (!this.options.enableCopyButton) return '';
    
    return `
      <div class="code-toolbar">
        <div class="toolbar-left">
          <span class="language-badge">${language}</span>
        </div>
        <div class="toolbar-right">
          <button class="copy-button" title="复制代码" onclick="copyCodeBlock(this)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          ${this.options.enableFolding ? `
            <button class="fold-button" title="折叠代码" onclick="toggleCodeFolding(this)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6,9 12,15 18,9"></polyline>
              </svg>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * 生成代码内容
   */
  private generateCodeContent(lines: string[], language: string): string {
    return lines.map((line, index) => {
      const lineNumber = index + 1;
      const isLongLine = line.length > (this.options.maxLineLength || 120);
      const lineClass = isLongLine ? 'long-line' : '';
      
      return `<span class="code-line ${lineClass}" data-line="${lineNumber}">${this.escapeHtml(line)}</span>`;
    }).join('\n');
  }

  /**
   * 生成主题切换器
   */
  private generateThemeSwitcher(language: string): string {
    if (!this.options.enableThemeSwitching) return '';
    
    const themes = ['github', 'one-dark', 'one-light', 'material-dark', 'material-light', 'night-owl', 'dracula'];
    
    return `
      <div class="theme-switcher" data-language="${language}">
        <select class="theme-select" onchange="changeCodeTheme(this, '${language}')">
          ${themes.map(theme => 
            `<option value="${theme}" ${theme === this.options.defaultTheme ? 'selected' : ''}>${theme}</option>`
          ).join('')}
        </select>
      </div>
    `;
  }

  /**
   * 检测代码语言
   */
  private detectLanguage(codeBlock: string): string {
    // 从class属性检测
    const classMatch = codeBlock.match(/class="[^"]*language-(\w+)/i);
    if (classMatch) {
      return classMatch[1];
    }
    
    // 从data属性检测
    const dataMatch = codeBlock.match(/data-lang="(\w+)"/i);
    if (dataMatch) {
      return dataMatch[1];
    }
    
    // 从内容特征检测
    if (codeBlock.includes('function') || codeBlock.includes('const') || codeBlock.includes('let')) {
      return 'javascript';
    }
    if (codeBlock.includes('import') || codeBlock.includes('export') || codeBlock.includes('interface')) {
      return 'typescript';
    }
    if (codeBlock.includes('<html') || codeBlock.includes('<div') || codeBlock.includes('<span')) {
      return 'html';
    }
    if (codeBlock.includes('{') && codeBlock.includes('}') && codeBlock.includes(':')) {
      return 'css';
    }
    
    return 'text';
  }

  /**
   * 标准化语言名称
   */
  private normalizeLanguage(language: string): string {
    const normalized = language.toLowerCase().trim();
    
    // 映射常见别名
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'sh': 'bash',
      'shell': 'bash',
      'ps1': 'powershell',
      'dockerfile': 'dockerfile',
      'yml': 'yaml',
      'md': 'markdown'
    };
    
    return languageMap[normalized] || normalized;
  }

  /**
   * 清理代码内容
   */
  private cleanCodeContent(code: string): string {
    return code
      .replace(/^\s*\n/, '') // 移除开头的空行
      .replace(/\n\s*$/, '') // 移除结尾的空行
      .replace(/\t/g, '  '); // 将制表符转换为空格
  }

  /**
   * 转义HTML字符
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 获取处理器选项
   */
  public getOptions(): CodeBlockProcessorOptions {
    return { ...this.options };
  }

  /**
   * 更新处理器选项
   */
  public updateOptions(newOptions: Partial<CodeBlockProcessorOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * 检查是否支持指定语言
   */
  public isLanguageSupported(language: string): boolean {
    return this.supportedLanguages.has(this.normalizeLanguage(language));
  }

  /**
   * 添加支持的语言
   */
  public addSupportedLanguage(language: string): void {
    this.supportedLanguages.add(this.normalizeLanguage(language));
  }

  /**
   * 移除支持的语言
   */
  public removeSupportedLanguage(language: string): boolean {
    return this.supportedLanguages.delete(this.normalizeLanguage(language));
  }

  /**
   * 获取所有支持的语言
   */
  public getSupportedLanguages(): string[] {
    return Array.from(this.supportedLanguages).sort();
  }
}

// 导出默认实例
export const enhancedCodeBlockProcessor = new EnhancedCodeBlockProcessor();
