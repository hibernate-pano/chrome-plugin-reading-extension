/**
 * 代码提取器
 * 用于增强代码块的提取和显示
 */

export interface CodeBlockInfo {
  code: string;
  language: string;
  lineCount: number;
  hasLineNumbers: boolean;
  caption?: string;
}

export class CodeExtractor {
  // 支持的语言映射
  private languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'jsx',
    'ts': 'typescript',
    'tsx': 'tsx',
    'py': 'python',
    'rb': 'ruby',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'php': 'php',
    'rust': 'rust',
    'swift': 'swift',
    'kotlin': 'kotlin',
    'scala': 'scala',
    'html': 'html',
    'xml': 'xml',
    'css': 'css',
    'scss': 'scss',
    'less': 'less',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'markdown': 'markdown',
    'md': 'markdown',
    'sql': 'sql',
    'shell': 'bash',
    'bash': 'bash',
    'sh': 'bash',
    'powershell': 'powershell',
    'ps': 'powershell',
    'dockerfile': 'dockerfile',
    'docker': 'dockerfile',
    'plaintext': 'plaintext',
    'text': 'plaintext',
    'txt': 'plaintext',
  };

  /**
   * 从代码块元素提取信息
   */
  public extractCodeBlockInfo(pre: HTMLPreElement): CodeBlockInfo {
    // 查找 code 元素
    let code = pre.querySelector('code');
    let codeText = '';
    let language = 'plaintext';
    
    if (code) {
      codeText = code.textContent || '';
      
      // 尝试从类名中提取语言
      const languageClass = Array.from(code.classList).find(cls => cls.startsWith('language-'));
      if (languageClass) {
        language = languageClass.replace('language-', '');
      }
    } else {
      codeText = pre.textContent || '';
    }
    
    // 如果没有从类名中找到语言，尝试其他方法
    if (language === 'plaintext') {
      // 从 pre 元素的属性中查找
      language = pre.getAttribute('data-lang') || 
                pre.getAttribute('data-language') || 
                pre.className.match(/language-(\w+)/)?.[1] || 
                this.detectLanguage(codeText);
    }
    
    // 规范化语言名称
    language = this.normalizeLanguage(language);
    
    // 检查是否有行号
    const hasLineNumbers = pre.classList.contains('line-numbers') || 
                          pre.classList.contains('numbered') ||
                          pre.hasAttribute('data-line-numbers');
    
    // 尝试获取标题
    const caption = this.getCodeBlockCaption(pre);
    
    return {
      code: codeText.trim(),
      language,
      lineCount: codeText.split('\n').length,
      hasLineNumbers,
      caption
    };
  }

  /**
   * 规范化语言名称
   */
  private normalizeLanguage(language: string): string {
    language = language.toLowerCase();
    return this.languageMap[language] || language;
  }

  /**
   * 尝试检测代码语言
   */
  private detectLanguage(code: string): string {
    // 简单的语言检测逻辑
    if (code.includes('function') && (code.includes('{') || code.includes('=>'))) {
      return 'javascript';
    }
    if (code.includes('def ') && code.includes(':')) {
      return 'python';
    }
    if (code.includes('class ') && code.includes('{') && code.includes('public')) {
      return 'java';
    }
    if (code.includes('<html') || code.includes('<!DOCTYPE')) {
      return 'html';
    }
    if (code.includes('import ') && code.includes('from ')) {
      return 'python';
    }
    if (code.includes('package ') && code.includes('func ')) {
      return 'go';
    }
    if (code.includes('#include') && (code.includes('<iostream>') || code.includes('<stdio.h>'))) {
      return 'cpp';
    }
    
    return 'plaintext';
  }

  /**
   * 尝试获取代码块标题
   */
  private getCodeBlockCaption(pre: HTMLPreElement): string | undefined {
    // 检查前一个元素是否是标题
    const prevElement = pre.previousElementSibling;
    if (prevElement) {
      if (
        prevElement.classList.contains('code-caption') ||
        prevElement.classList.contains('code-title') ||
        prevElement.classList.contains('filename')
      ) {
        return prevElement.textContent?.trim();
      }
    }
    
    // 检查是否有 data-caption 属性
    const dataCaption = pre.getAttribute('data-caption');
    if (dataCaption) {
      return dataCaption;
    }
    
    // 检查是否有 data-filename 属性
    const dataFilename = pre.getAttribute('data-filename') || pre.getAttribute('data-file');
    if (dataFilename) {
      return dataFilename;
    }
    
    return undefined;
  }

  /**
   * 创建增强的代码块
   */
  public createEnhancedCodeBlock(codeInfo: CodeBlockInfo): HTMLElement {
    const container = document.createElement('div');
    container.className = 'enhanced-code-container';
    
    // 添加代码块标题栏
    const header = document.createElement('div');
    header.className = 'code-header';
    
    // 添加语言标签
    const languageLabel = document.createElement('span');
    languageLabel.className = 'code-language';
    languageLabel.textContent = codeInfo.language;
    header.appendChild(languageLabel);
    
    // 添加标题（如果有）
    if (codeInfo.caption) {
      const caption = document.createElement('span');
      caption.className = 'code-caption';
      caption.textContent = codeInfo.caption;
      header.appendChild(caption);
    }
    
    // 添加复制按钮
    const copyButton = document.createElement('button');
    copyButton.className = 'code-copy-button';
    copyButton.title = '复制代码';
    copyButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
    copyButton.setAttribute('data-clipboard-text', codeInfo.code);
    header.appendChild(copyButton);
    
    container.appendChild(header);
    
    // 创建代码块
    const pre = document.createElement('pre');
    pre.className = codeInfo.hasLineNumbers ? 'line-numbers' : '';
    
    const code = document.createElement('code');
    code.className = `language-${codeInfo.language}`;
    code.textContent = codeInfo.code;
    
    pre.appendChild(code);
    container.appendChild(pre);
    
    return container;
  }

  /**
   * 增强页面中的所有代码块
   */
  public enhanceAllCodeBlocks(container: HTMLElement): void {
    const preElements = container.querySelectorAll('pre');
    preElements.forEach(pre => {
      if (!(pre instanceof HTMLPreElement)) return;
      
      // 跳过已经处理过的代码块
      if (pre.closest('.enhanced-code-container')) return;
      
      // 提取代码块信息
      const codeInfo = this.extractCodeBlockInfo(pre);
      
      // 创建增强的代码块
      const enhancedCodeBlock = this.createEnhancedCodeBlock(codeInfo);
      
      // 替换原始代码块
      pre.replaceWith(enhancedCodeBlock);
    });
  }

  /**
   * 处理内联代码
   */
  public enhanceInlineCode(container: HTMLElement): void {
    const inlineCodeElements = container.querySelectorAll('code:not(pre code)');
    inlineCodeElements.forEach(code => {
      code.classList.add('enhanced-inline-code');
    });
  }

  /**
   * 添加代码块交互功能
   */
  public addCodeBlockInteractions(container: HTMLElement): void {
    // 为复制按钮添加点击事件
    const copyButtons = container.querySelectorAll('.code-copy-button');
    copyButtons.forEach(button => {
      button.addEventListener('click', () => {
        const code = button.getAttribute('data-clipboard-text');
        if (code) {
          navigator.clipboard.writeText(code).then(() => {
            // 显示复制成功提示
            button.classList.add('copied');
            button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            
            // 2秒后恢复原样
            setTimeout(() => {
              button.classList.remove('copied');
              button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
            }, 2000);
          }).catch(err => {
            console.error('复制失败:', err);
          });
        }
      });
    });
  }
}

// 导出默认实例
export const codeExtractor = new CodeExtractor();
