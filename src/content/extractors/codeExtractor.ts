/**
 * 代码提取器
 * 用于增强代码块的提取和显示
 */

// 不再直接导入 highlight.js，改为动态导入
// import hljs from 'highlight.js';
// import javascript from 'highlight.js/lib/languages/javascript';
// import typescript from 'highlight.js/lib/languages/typescript';
// 等等...

// 定义一个异步函数来加载和配置 highlight.js
async function loadHighlightJs() {
  try {
    // 动态导入 highlight.js
    const hljs = await import(/* webpackChunkName: "highlight" */ 'highlight.js');

    // 动态导入常用语言
    const [javascript, typescript, python, java, css, xml, json, bash, markdown] = await Promise.all([
      import(/* webpackChunkName: "hljs-js" */ 'highlight.js/lib/languages/javascript'),
      import(/* webpackChunkName: "hljs-ts" */ 'highlight.js/lib/languages/typescript'),
      import(/* webpackChunkName: "hljs-py" */ 'highlight.js/lib/languages/python'),
      import(/* webpackChunkName: "hljs-java" */ 'highlight.js/lib/languages/java'),
      import(/* webpackChunkName: "hljs-css" */ 'highlight.js/lib/languages/css'),
      import(/* webpackChunkName: "hljs-xml" */ 'highlight.js/lib/languages/xml'),
      import(/* webpackChunkName: "hljs-json" */ 'highlight.js/lib/languages/json'),
      import(/* webpackChunkName: "hljs-bash" */ 'highlight.js/lib/languages/bash'),
      import(/* webpackChunkName: "hljs-md" */ 'highlight.js/lib/languages/markdown')
    ]);

    // 注册语言
    hljs.default.registerLanguage('javascript', javascript.default);
    hljs.default.registerLanguage('typescript', typescript.default);
    hljs.default.registerLanguage('python', python.default);
    hljs.default.registerLanguage('java', java.default);
    hljs.default.registerLanguage('css', css.default);
    hljs.default.registerLanguage('xml', xml.default);
    hljs.default.registerLanguage('html', xml.default); // HTML 使用 XML 高亮器
    hljs.default.registerLanguage('json', json.default);
    hljs.default.registerLanguage('bash', bash.default);
    hljs.default.registerLanguage('markdown', markdown.default);

    // 自定义语言处理
    // 为 npm 创建一个简单的语法高亮器 - 基于 JSON
    hljs.default.registerLanguage('npm', function () {
      return {
        name: 'NPM',
        aliases: ['package.json'],
        subLanguage: 'json',  // 使用 JSON 高亮器作为基础
        contains: [
          {
            className: 'comment',
            begin: /\/\//,
            end: /$/
          }
        ]
      };
    });

    // 为 Vue 创建一个简单的语法高亮器 - 组合 HTML, JS 和 CSS
    hljs.default.registerLanguage('vue', function () {
      return {
        name: 'Vue',
        aliases: ['vue', 'vuejs'],
        contains: [
          // HTML 部分
          {
            className: 'tag',
            begin: /<template[\s>]/, end: /<\/template>/,
            starts: {
              subLanguage: 'xml',
              end: /<\/template>/,
            }
          },
          // JavaScript 部分
          {
            className: 'tag',
            begin: /<script[\s>]/, end: /<\/script>/,
            starts: {
              subLanguage: 'javascript',
              end: /<\/script>/,
            }
          },
          // CSS 部分
          {
            className: 'tag',
            begin: /<style[\s>]/, end: /<\/style>/,
            starts: {
              subLanguage: 'css',
              end: /<\/style>/,
            }
          }
        ]
      };
    });

    console.log('已注册语言模块:', Object.keys(hljs.default.listLanguages()));

    return hljs.default;
  } catch (error) {
    console.error('加载 highlight.js 时发生错误:', error);
    return null;
  }
}

// 缓存 highlight.js 实例
let hljsInstance = null;

// 获取 highlight.js 实例
async function getHighlightJs() {
  if (!hljsInstance) {
    hljsInstance = await loadHighlightJs();
  }
  return hljsInstance;
}

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
    // 添加新的语言映射
    'npm': 'npm',
    'vue': 'vue',
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
      // 先保存原始 HTML，以处理可能的格式化代码
      const originalHtml = code.innerHTML;
      codeText = code.textContent || '';

      // 如果文本内容与 HTML 内容差异很大，可能是已经格式化的代码
      if (originalHtml.length > codeText.length * 1.5 && originalHtml.includes('<span')) {
        // 尝试保留原始格式化，但去除可能影响高亮的元素
        codeText = this.cleanFormattedCode(originalHtml);
      }

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
        pre.className.match(/brush:\s*(\w+)/)?.[1] || // 支持 SyntaxHighlighter 格式
        this.detectLanguage(codeText);
    }

    // 规范化语言名称
    language = this.normalizeLanguage(language);

    // 检查是否有行号
    const hasLineNumbers = pre.classList.contains('line-numbers') ||
      pre.classList.contains('numbered') ||
      pre.hasAttribute('data-line-numbers') ||
      pre.classList.contains('linenums');

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
   * 清理已格式化的代码 HTML
   */
  private cleanFormattedCode(html: string): string {
    // 创建一个临时 div 元素来解析 HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // 递归处理所有文本节点
    let result = '';

    function processNode(node: Node) {
      if (node.nodeType === Node.TEXT_NODE) {
        // 文本节点，直接添加其文本
        result += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // 元素节点，递归处理其子节点
        const element = node as Element;

        // 如果是换行元素，添加换行符
        if (element.tagName === 'BR') {
          result += '\n';
        } else if (element.tagName === 'DIV' || element.tagName === 'P') {
          // 对于块级元素，处理完后添加换行
          for (let i = 0; i < element.childNodes.length; i++) {
            processNode(element.childNodes[i]);
          }
          result += '\n';
        } else {
          // 其他元素，递归处理子节点
          for (let i = 0; i < element.childNodes.length; i++) {
            processNode(element.childNodes[i]);
          }
        }
      }
    }

    // 处理所有子节点
    for (let i = 0; i < tempDiv.childNodes.length; i++) {
      processNode(tempDiv.childNodes[i]);
    }

    return result;
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
   * 创建优雅的代码块 - 现代设计与顶部工具栏
   */
  public async createEnhancedCodeBlock(codeInfo: CodeBlockInfo): Promise<HTMLElement> {
    // 创建主容器
    const container = document.createElement('div');
    container.className = 'code-block';

    // 添加行数属性
    container.setAttribute('data-lines', String(codeInfo.lineCount));

    // 添加语言类
    container.classList.add(`lang-${codeInfo.language}`);

    // 从父容器继承主题类
    const parentContainer = document.getElementById('reading-mode-container');
    if (parentContainer) {
      // 继承主题类
      const themeClass = parentContainer.classList.contains('dark-theme') ? 'dark-theme' : 'light-theme';
      container.classList.add(themeClass);
    }

    // 创建代码块头部
    const header = document.createElement('div');
    header.className = 'code-header';

    // 添加语言标签
    const languageLabel = document.createElement('span');
    languageLabel.className = 'code-language';
    languageLabel.textContent = this.getDisplayLanguageName(codeInfo.language);
    header.appendChild(languageLabel);

    // 添加标题（如果有）
    if (codeInfo.caption) {
      const caption = document.createElement('span');
      caption.className = 'code-caption';
      caption.textContent = codeInfo.caption;
      caption.style.marginLeft = '8px';
      header.appendChild(caption);
    }

    // 创建操作按钮容器
    const actions = document.createElement('div');
    actions.className = 'code-actions';
    header.appendChild(actions);

    // 添加复制按钮
    const copyButton = document.createElement('button');
    copyButton.className = 'code-copy-button';
    copyButton.title = '复制代码';

    // 创建 SVG 元素，避免使用 innerHTML 以防止 CSP 错误
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '12');
    svg.setAttribute('height', '12');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    // 创建 SVG 内部元素
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '9');
    rect.setAttribute('y', '9');
    rect.setAttribute('width', '13');
    rect.setAttribute('height', '13');
    rect.setAttribute('rx', '2');
    rect.setAttribute('ry', '2');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1');

    // 添加 SVG 元素
    svg.appendChild(rect);
    svg.appendChild(path);
    copyButton.appendChild(svg);

    // 添加文本节点
    const textNode = document.createTextNode('复制');
    copyButton.appendChild(textNode);

    copyButton.setAttribute('data-clipboard-text', codeInfo.code);
    actions.appendChild(copyButton);

    // 添加头部到容器
    container.appendChild(header);

    // 创建代码内容区域包装器
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'code-content-wrapper';

    // 预处理代码，处理特殊字符和空格
    const processedCode = this.preprocessCode(codeInfo.code);

    // 创建左侧行号区域
    const lineNumbers = document.createElement('div');
    lineNumbers.className = 'line-numbers';

    // 添加行号
    const lines = processedCode.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const lineNumber = document.createElement('span');
      lineNumber.className = 'line-number';
      lineNumber.textContent = String(i + 1);
      lineNumbers.appendChild(lineNumber);
    }

    // 创建代码内容区域
    const pre = document.createElement('pre');
    pre.className = 'code-content';

    // 创建代码元素
    const code = document.createElement('code');
    code.className = `language-${codeInfo.language}`;

    // 将代码分行处理，每行包装在一个 span 中
    const codeLines = processedCode.split('\n');
    codeLines.forEach((line, index) => {
      const lineSpan = document.createElement('span');
      lineSpan.className = 'code-line';
      lineSpan.textContent = line;
      code.appendChild(lineSpan);

      // 如果不是最后一行，添加换行符
      if (index < codeLines.length - 1) {
        code.appendChild(document.createTextNode('\n'));
      }
    });

    // 添加代码元素到pre
    pre.appendChild(code);

    // 添加行号和代码区域到包装器
    contentWrapper.appendChild(lineNumbers);
    contentWrapper.appendChild(pre);

    // 添加代码内容包装器到容器
    container.appendChild(contentWrapper);

    // 使用 highlight.js 进行代码高亮
    try {
      // 先清除代码元素的内容，准备重新填充
      code.innerHTML = '';

      // 动态加载 highlight.js
      const hljs = await getHighlightJs();

      // 如果加载失败，使用纯文本模式
      if (!hljs) {
        console.warn('加载 highlight.js 失败，使用纯文本模式');
        this.applyBasicFormattingWithLines(code, processedCode);
        return container;
      }

      // 使用 highlight.js 进行高亮
      if (codeInfo.language && codeInfo.language !== 'plaintext') {
        try {
          // 尝试使用指定语言高亮
          const result = hljs.highlight(processedCode, { language: codeInfo.language, ignoreIllegals: true });

          // 将高亮后的代码分行处理
          const highlightedLines = result.value.split('\n');
          highlightedLines.forEach((line: string, index: number) => {
            const lineSpan = document.createElement('span');
            lineSpan.className = 'code-line';
            lineSpan.innerHTML = line || ' '; // 空行使用空格保持高度
            code.appendChild(lineSpan);

            // 如果不是最后一行，添加换行符
            if (index < highlightedLines.length - 1) {
              code.appendChild(document.createTextNode('\n'));
            }
          });

          code.classList.add('hljs');
          container.classList.add(`lang-${codeInfo.language}`);
        } catch (e) {
          // 如果指定语言失败，尝试自动检测
          console.warn(`使用语言 ${codeInfo.language} 高亮失败，尝试自动检测`);
          try {
            const result = hljs.highlightAuto(processedCode);

            // 将高亮后的代码分行处理
            const highlightedLines = result.value.split('\n');
            highlightedLines.forEach((line: string, index: number) => {
              const lineSpan = document.createElement('span');
              lineSpan.className = 'code-line';
              lineSpan.innerHTML = line || ' '; // 空行使用空格保持高度
              code.appendChild(lineSpan);

              // 如果不是最后一行，添加换行符
              if (index < highlightedLines.length - 1) {
                code.appendChild(document.createTextNode('\n'));
              }
            });

            code.classList.add('hljs');
            // 添加检测到的语言类
            if (result.language) {
              container.classList.add(`lang-${result.language}`);
              // 更新语言标签
              languageLabel.textContent = this.getDisplayLanguageName(result.language);
            }
          } catch (autoError) {
            // 如果自动检测也失败，回退到基本的 HTML 转义
            this.applyBasicFormattingWithLines(code, processedCode);
            container.classList.add('lang-plaintext');
          }
        }
      } else {
        // 如果是纯文本，仅进行 HTML 转义
        this.applyBasicFormattingWithLines(code, processedCode);
        code.classList.add('plaintext');
        container.classList.add('lang-plaintext');
      }

      // 如果代码行数少于2，隐藏行号
      if (lines.length < 2) {
        lineNumbers.style.display = 'none';
      }

      // 添加代码行数信息
      container.setAttribute('data-lines', String(lines.length));

    } catch (error) {
      console.warn('代码高亮失败:', error);
      // 如果高亮失败，回退到基本的 HTML 转义
      this.applyBasicFormattingWithLines(code, processedCode);
      container.classList.add('lang-plaintext');
      container.classList.add('error');

      // 更新语言标签以显示错误状态
      if (languageLabel) {
        languageLabel.textContent = 'Error: ' + this.getDisplayLanguageName(codeInfo.language);
      }

      // 添加错误提示
      const toast = document.createElement('div');
      toast.className = 'code-toast';
      toast.textContent = '代码高亮失败，已使用基本格式化';
      container.appendChild(toast);

      // 短暂显示错误提示
      setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
          toast.classList.remove('show');
          setTimeout(() => toast.remove(), 300);
        }, 2000);
      }, 100);
    }

    return container;
  }

  /**
   * 预处理代码，处理特殊字符和空格
   */
  private preprocessCode(code: string): string {
    // 处理特殊字符和空格
    return code
      // 保留缩进和空格
      .replace(/\t/g, '    ') // 将制表符替换为4个空格
      // 处理特殊的空白字符
      .replace(/\u00A0/g, ' ') // 将不间断空格替换为普通空格
      .replace(/\u2003/g, '  ') // 将全角空格替换为两个空格
      .trim(); // 去除首尾空白
  }

  /**
   * 应用基本的HTML转义格式化
   */
  private applyBasicFormatting(codeElement: HTMLElement, codeText: string): void {
    codeElement.innerHTML = codeText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      // 保留空格和缩进
      .replace(/ /g, '&nbsp;')
      .replace(/\n/g, '<br>');
  }

  /**
   * 应用基本的HTML转义格式化，并保留行结构
   */
  private applyBasicFormattingWithLines(codeElement: HTMLElement, codeText: string): void {
    // 清除现有内容
    codeElement.innerHTML = '';

    // 分行处理
    const lines = codeText.split('\n');
    lines.forEach((line, index) => {
      const lineSpan = document.createElement('span');
      lineSpan.className = 'code-line';

      // 转义处理
      const escapedLine = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/ /g, '&nbsp;');

      lineSpan.innerHTML = escapedLine || ' '; // 空行使用空格保持高度
      codeElement.appendChild(lineSpan);

      // 如果不是最后一行，添加换行符
      if (index < lines.length - 1) {
        codeElement.appendChild(document.createTextNode('\n'));
      }
    });
  }

  /**
   * 获取可读的语言名称
   */
  private getDisplayLanguageName(language: string): string {
    const languageDisplayNames: Record<string, string> = {
      'js': 'JavaScript',
      'javascript': 'JavaScript',
      'ts': 'TypeScript',
      'typescript': 'TypeScript',
      'jsx': 'JSX',
      'tsx': 'TSX',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'sass': 'Sass',
      'less': 'Less',
      'json': 'JSON',
      'py': 'Python',
      'python': 'Python',
      'rb': 'Ruby',
      'ruby': 'Ruby',
      'java': 'Java',
      'c': 'C',
      'cpp': 'C++',
      'cs': 'C#',
      'csharp': 'C#',
      'go': 'Go',
      'rust': 'Rust',
      'php': 'PHP',
      'swift': 'Swift',
      'kotlin': 'Kotlin',
      'scala': 'Scala',
      'shell': 'Shell',
      'bash': 'Bash',
      'sh': 'Shell',
      'sql': 'SQL',
      'xml': 'XML',
      'yaml': 'YAML',
      'yml': 'YAML',
      'markdown': 'Markdown',
      'md': 'Markdown',
      'plaintext': 'Plain Text',
      'txt': 'Plain Text',
      // 添加新的语言显示名称
      'npm': 'NPM',
      'vue': 'Vue'
    };

    return languageDisplayNames[language.toLowerCase()] || language;
  }

  /**
   * 增强页面中的所有代码块
   */
  public async enhanceAllCodeBlocks(container: HTMLElement): Promise<void> {
    try {
      const preElements = container.querySelectorAll('pre');
      // 使用 Promise.all 并行处理所有代码块
      await Promise.all(Array.from(preElements).map(async (pre) => {
        try {
          if (!(pre instanceof HTMLPreElement)) return;

          // 跳过已经处理过的代码块
          if (pre.closest('.code-block') || pre.closest('.enhanced-code-container')) return;

          // 提取代码块信息
          const codeInfo = this.extractCodeBlockInfo(pre);

          // 创建增强的代码块
          const enhancedCodeBlock = await this.createEnhancedCodeBlock(codeInfo);

          // 替换原始代码块
          pre.replaceWith(enhancedCodeBlock);
        } catch (error) {
          console.warn('处理代码块时发生错误:', error);
          // 继续处理下一个代码块
        }
      }));
    } catch (error) {
      console.error('增强代码块时发生错误:', error);
    }
  }

  /**
   * 处理内联代码
   */
  public enhanceInlineCode(container: HTMLElement): void {
    const inlineCodeElements = container.querySelectorAll('code:not(pre code)');
    inlineCodeElements.forEach(code => {
      code.classList.add('elegant-inline-code');
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

            // 清除按钮内容
            while (button.firstChild) {
              button.removeChild(button.firstChild);
            }

            // 创建新的 SVG 元素，避免使用 innerHTML
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '14');
            svg.setAttribute('height', '14');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('fill', 'none');
            svg.setAttribute('stroke', 'currentColor');
            svg.setAttribute('stroke-width', '2');
            svg.setAttribute('stroke-linecap', 'round');
            svg.setAttribute('stroke-linejoin', 'round');

            // 创建对勾 SVG 元素
            const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            polyline.setAttribute('points', '20 6 9 17 4 12');
            svg.appendChild(polyline);

            button.appendChild(svg);
            button.appendChild(document.createTextNode(' 已复制'));

            // 显示成功提示
            const codeBlock = button.closest('.code-block');
            if (codeBlock) {
              const toast = document.createElement('div');
              toast.className = 'code-toast';
              toast.textContent = '已复制到剪贴板';
              codeBlock.appendChild(toast);

              // 添加动画类
              setTimeout(() => {
                toast.classList.add('show');
              }, 10);

              // 1.5秒后移除提示
              setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                  toast.remove();
                }, 300); // 等待消失动画完成
              }, 1500);
            }

            // 2秒后恢复原样
            setTimeout(() => {
              button.classList.remove('copied');

              // 清除按钮内容
              while (button.firstChild) {
                button.removeChild(button.firstChild);
              }

              // 创建原始 SVG 元素
              const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
              svg.setAttribute('width', '14');
              svg.setAttribute('height', '14');
              svg.setAttribute('viewBox', '0 0 24 24');
              svg.setAttribute('fill', 'none');
              svg.setAttribute('stroke', 'currentColor');
              svg.setAttribute('stroke-width', '2');
              svg.setAttribute('stroke-linecap', 'round');
              svg.setAttribute('stroke-linejoin', 'round');

              // 创建复制图标元素
              const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
              rect.setAttribute('x', '9');
              rect.setAttribute('y', '9');
              rect.setAttribute('width', '13');
              rect.setAttribute('height', '13');
              rect.setAttribute('rx', '2');
              rect.setAttribute('ry', '2');

              const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              path.setAttribute('d', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1');

              svg.appendChild(rect);
              svg.appendChild(path);
              button.appendChild(svg);
              button.appendChild(document.createTextNode(' 复制'));
            }, 2000);
          }).catch(err => {
            console.error('复制失败:', err);
          });
        }
      });
    });

    // 为代码块添加悬停交互
    const codeBlocks = container.querySelectorAll('.code-block');
    codeBlocks.forEach(block => {
      // 鼠标悬停时高亮行号
      block.addEventListener('mouseenter', () => {
        block.classList.add('hover');
      });

      block.addEventListener('mouseleave', () => {
        block.classList.remove('hover');
      });
    });
  }
}

// 导出默认实例
export const codeExtractor = new CodeExtractor();
