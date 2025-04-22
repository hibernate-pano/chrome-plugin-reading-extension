/**
 * GitHub-style Code Block Extractor
 * A modern, clean implementation of code blocks with GitHub-style design
 */

// Dynamic import of highlight.js
async function loadHighlightJs() {
  try {
    // Dynamically import highlight.js
    const hljs = await import(/* webpackChunkName: "highlight" */ 'highlight.js');

    // Dynamically import common languages
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

    // Register languages
    hljs.default.registerLanguage('javascript', javascript.default);
    hljs.default.registerLanguage('typescript', typescript.default);
    hljs.default.registerLanguage('python', python.default);
    hljs.default.registerLanguage('java', java.default);
    hljs.default.registerLanguage('css', css.default);
    hljs.default.registerLanguage('xml', xml.default);
    hljs.default.registerLanguage('html', xml.default); // HTML uses XML highlighter
    hljs.default.registerLanguage('json', json.default);
    hljs.default.registerLanguage('bash', bash.default);
    hljs.default.registerLanguage('markdown', markdown.default);

    // Register Vue language
    hljs.default.registerLanguage('vue', function () {
      return {
        name: 'Vue',
        aliases: ['vue', 'vuejs'],
        contains: [
          // HTML part
          {
            className: 'tag',
            begin: /<template[\s>]/, end: /<\/template>/,
            starts: {
              subLanguage: 'xml',
              end: /<\/template>/,
            }
          },
          // JavaScript part
          {
            className: 'tag',
            begin: /<script[\s>]/, end: /<\/script>/,
            starts: {
              subLanguage: 'javascript',
              end: /<\/script>/,
            }
          },
          // CSS part
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

    console.log('Registered language modules:', Object.keys(hljs.default.listLanguages()));
    return hljs.default;
  } catch (error) {
    console.error('Error loading highlight.js:', error);
    return null;
  }
}

// Cache highlight.js instance
let hljsInstance: any = null;

// Get highlight.js instance
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

export class GithubCodeExtractor {
  // Language mapping
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
    'vue': 'vue',
  };

  /**
   * Extract code block information from a pre element
   */
  public extractCodeBlockInfo(pre: HTMLPreElement): CodeBlockInfo {
    // Find code element
    let code = pre.querySelector('code');
    let codeText = '';
    let language = 'plaintext';

    if (code) {
      // Save original HTML to handle potentially formatted code
      const originalHtml = code.innerHTML;
      codeText = code.textContent || '';

      // If text content differs significantly from HTML content, it might be formatted code
      if (originalHtml.length > codeText.length * 1.5 && originalHtml.includes('<span')) {
        // Try to preserve original formatting but remove elements that might affect highlighting
        codeText = this.cleanFormattedCode(originalHtml);
      }

      // Try to extract language from class name
      const languageClass = Array.from(code.classList).find(cls => cls.startsWith('language-'));
      if (languageClass) {
        language = languageClass.replace('language-', '');
      }
    } else {
      codeText = pre.textContent || '';
    }

    // If language not found in class name, try other methods
    if (language === 'plaintext') {
      // Look for language in pre element attributes
      language = pre.getAttribute('data-lang') ||
        pre.getAttribute('data-language') ||
        pre.className.match(/language-(\w+)/)?.[1] ||
        pre.className.match(/brush:\s*(\w+)/)?.[1] || // Support SyntaxHighlighter format
        this.detectLanguage(codeText);
    }

    // Normalize language name
    language = this.normalizeLanguage(language);

    // Check if line numbers should be shown
    const hasLineNumbers = pre.classList.contains('line-numbers') ||
      pre.classList.contains('numbered') ||
      pre.hasAttribute('data-line-numbers') ||
      pre.classList.contains('linenums');

    // Try to get caption
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
   * Clean formatted code HTML
   */
  private cleanFormattedCode(html: string): string {
    // Create a temporary div element to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Process all text nodes recursively
    let result = '';

    function processNode(node: Node) {
      if (node.nodeType === Node.TEXT_NODE) {
        // Text node, add its text directly
        result += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Element node, process its children recursively
        const element = node as Element;

        // If it's a line break element, add a newline
        if (element.tagName === 'BR') {
          result += '\n';
        } else if (element.tagName === 'DIV' || element.tagName === 'P') {
          // For block elements, add a newline after processing
          for (let i = 0; i < element.childNodes.length; i++) {
            processNode(element.childNodes[i]);
          }
          result += '\n';
        } else {
          // Other elements, process children recursively
          for (let i = 0; i < element.childNodes.length; i++) {
            processNode(element.childNodes[i]);
          }
        }
      }
    }

    // Process all child nodes
    for (let i = 0; i < tempDiv.childNodes.length; i++) {
      processNode(tempDiv.childNodes[i]);
    }

    return result;
  }

  /**
   * Normalize language name
   */
  private normalizeLanguage(language: string): string {
    language = language.toLowerCase();
    return this.languageMap[language] || language;
  }

  /**
   * Detect code language
   */
  private detectLanguage(code: string): string {
    // Simple language detection logic
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
   * Try to get code block caption
   */
  private getCodeBlockCaption(pre: HTMLPreElement): string | undefined {
    // Check if previous element is a caption
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

    // Check for data-caption attribute
    const dataCaption = pre.getAttribute('data-caption');
    if (dataCaption) {
      return dataCaption;
    }

    // Check for data-filename attribute
    const dataFilename = pre.getAttribute('data-filename') || pre.getAttribute('data-file');
    if (dataFilename) {
      return dataFilename;
    }

    return undefined;
  }

  /**
   * Create GitHub-style code block with enhanced visual design
   */
  public async createGithubCodeBlock(codeInfo: CodeBlockInfo, codeTheme: string = 'github-light'): Promise<HTMLElement> {
    // Create main container
    const container = document.createElement('div');
    container.className = 'github-code-block';

    // Add theme attribute
    container.setAttribute('data-theme', codeTheme);

    // Add language class for language-specific styling
    container.classList.add(`lang-${codeInfo.language}`);

    // Add single-line class if needed
    if (codeInfo.lineCount === 1) {
      container.classList.add('single-line');
    }

    // Create header
    const header = document.createElement('div');
    header.className = 'github-code-header';

    // Add language badge
    const languageBadge = document.createElement('div');
    languageBadge.className = 'github-code-language';
    languageBadge.textContent = this.getDisplayLanguageName(codeInfo.language);
    header.appendChild(languageBadge);

    // Add actions container
    const actions = document.createElement('div');
    actions.className = 'github-code-actions';

    // Add copy button
    const copyButton = document.createElement('button');
    copyButton.className = 'github-code-copy-btn';
    copyButton.title = 'Copy code';
    copyButton.setAttribute('data-clipboard-text', codeInfo.code);

    // Create SVG icon
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('fill', 'currentColor');

    // Create path for copy icon
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z');

    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path2.setAttribute('d', 'M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z');

    svg.appendChild(path);
    svg.appendChild(path2);
    copyButton.appendChild(svg);
    copyButton.appendChild(document.createTextNode('Copy'));

    actions.appendChild(copyButton);
    header.appendChild(actions);
    container.appendChild(header);

    // Create content wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'github-code-content-wrapper';

    // Preprocess code
    const processedCode = this.preprocessCode(codeInfo.code);
    const codeLines = processedCode.split('\n');

    // Create line numbers if needed (more than 1 line)
    if (codeInfo.lineCount > 1) {
      const lineNumbers = document.createElement('div');
      lineNumbers.className = 'github-code-line-numbers';

      codeLines.forEach((_, index) => {
        const lineNumber = document.createElement('div');
        lineNumber.className = 'github-code-line-number';
        lineNumber.textContent = String(index + 1);
        lineNumbers.appendChild(lineNumber);
      });

      contentWrapper.appendChild(lineNumbers);
    }

    // Create code content
    const codeContent = document.createElement('div');
    codeContent.className = 'github-code-content';

    // Create code element
    const codeElement = document.createElement('code');
    codeElement.className = `language-${codeInfo.language}`;

    // Apply syntax highlighting
    try {
      const hljs = await getHighlightJs();

      if (hljs && codeInfo.language !== 'plaintext') {
        try {
          // Try to highlight with specified language
          const result = hljs.highlight(processedCode, {
            language: codeInfo.language,
            ignoreIllegals: true
          });

          // Split highlighted code into lines
          const highlightedLines = result.value.split('\n');

          // Create line elements
          highlightedLines.forEach((line, index) => {
            const lineElement = document.createElement('div');
            lineElement.className = 'github-code-line';
            lineElement.innerHTML = line || '&nbsp;';
            codeElement.appendChild(lineElement);
          });

          codeElement.classList.add('hljs');
        } catch (e) {
          // If specified language fails, try auto-detection
          console.warn(`Highlighting with language ${codeInfo.language} failed, trying auto-detection`);
          try {
            const result = hljs.highlightAuto(processedCode);

            // Split highlighted code into lines
            const highlightedLines = result.value.split('\n');

            // Create line elements
            highlightedLines.forEach((line, index) => {
              const lineElement = document.createElement('div');
              lineElement.className = 'github-code-line';
              lineElement.innerHTML = line || '&nbsp;';
              codeElement.appendChild(lineElement);
            });

            codeElement.classList.add('hljs');

            // Update language badge if a language was detected
            if (result.language) {
              languageBadge.textContent = this.getDisplayLanguageName(result.language);
            }
          } catch (autoError) {
            // If auto-detection fails, fall back to basic formatting
            this.applyBasicFormatting(codeElement, processedCode);
          }
        }
      } else {
        // For plaintext or if hljs failed to load
        this.applyBasicFormatting(codeElement, processedCode);
      }
    } catch (error) {
      console.warn('Code highlighting failed:', error);
      this.applyBasicFormatting(codeElement, processedCode);
    }

    codeContent.appendChild(codeElement);
    contentWrapper.appendChild(codeContent);
    container.appendChild(contentWrapper);

    // Add copy functionality
    this.addCopyFunctionality(copyButton);

    return container;
  }

  /**
   * Preprocess code to handle special characters and whitespace
   */
  private preprocessCode(code: string): string {
    return code
      .replace(/\t/g, '    ') // Replace tabs with 4 spaces
      .replace(/\u00A0/g, ' ') // Replace non-breaking spaces with regular spaces
      .replace(/\u2003/g, '  ') // Replace em spaces with two regular spaces
      .trim(); // Remove leading/trailing whitespace
  }

  /**
   * Apply basic formatting for code when highlighting fails
   */
  private applyBasicFormatting(codeElement: HTMLElement, codeText: string): void {
    // Clear existing content
    codeElement.innerHTML = '';

    // Split into lines
    const lines = codeText.split('\n');

    lines.forEach((line) => {
      const lineElement = document.createElement('div');
      lineElement.className = 'github-code-line';

      // Escape HTML
      const escapedLine = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

      lineElement.innerHTML = escapedLine || '&nbsp;';
      codeElement.appendChild(lineElement);
    });
  }

  /**
   * Get display name for language
   */
  private getDisplayLanguageName(language: string): string {
    const languageDisplayNames: Record<string, string> = {
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'jsx': 'JSX',
      'tsx': 'TSX',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'sass': 'Sass',
      'less': 'Less',
      'json': 'JSON',
      'python': 'Python',
      'ruby': 'Ruby',
      'java': 'Java',
      'c': 'C',
      'cpp': 'C++',
      'csharp': 'C#',
      'go': 'Go',
      'rust': 'Rust',
      'php': 'PHP',
      'swift': 'Swift',
      'kotlin': 'Kotlin',
      'scala': 'Scala',
      'bash': 'Bash',
      'shell': 'Shell',
      'sql': 'SQL',
      'xml': 'XML',
      'yaml': 'YAML',
      'markdown': 'Markdown',
      'plaintext': 'Plain Text',
      'vue': 'Vue'
    };

    return languageDisplayNames[language.toLowerCase()] || language;
  }

  /**
   * Add copy functionality to button
   */
  private addCopyFunctionality(button: HTMLButtonElement): void {
    button.addEventListener('click', async () => {
      const code = button.getAttribute('data-clipboard-text');
      if (!code) return;

      try {
        await navigator.clipboard.writeText(code);

        // Update button to show success state
        button.classList.add('copied');

        // Clear button content
        button.innerHTML = '';

        // Create check icon
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '14');
        svg.setAttribute('height', '14');
        svg.setAttribute('viewBox', '0 0 16 16');
        svg.setAttribute('fill', 'currentColor');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z');

        svg.appendChild(path);
        button.appendChild(svg);
        button.appendChild(document.createTextNode('Copied!'));

        // Show toast notification
        const codeBlock = button.closest('.github-code-block');
        if (codeBlock) {
          const toast = document.createElement('div');
          toast.className = 'github-code-toast';
          toast.textContent = 'Copied to clipboard';
          document.body.appendChild(toast);

          // Show toast with animation
          setTimeout(() => {
            toast.classList.add('show');

            // Hide and remove toast after delay
            setTimeout(() => {
              toast.classList.remove('show');
              setTimeout(() => {
                toast.remove();
              }, 300);
            }, 2000);
          }, 10);
        }

        // Reset button after delay
        setTimeout(() => {
          button.classList.remove('copied');

          // Clear button content
          button.innerHTML = '';

          // Recreate original icon
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('width', '14');
          svg.setAttribute('height', '14');
          svg.setAttribute('viewBox', '0 0 16 16');
          svg.setAttribute('fill', 'currentColor');

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', 'M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z');

          const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path2.setAttribute('d', 'M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z');

          svg.appendChild(path);
          svg.appendChild(path2);
          button.appendChild(svg);
          button.appendChild(document.createTextNode('Copy'));
        }, 2000);
      } catch (err) {
        console.error('Failed to copy code:', err);
      }
    });
  }

  /**
   * Enhance all code blocks in container
   */
  public async enhanceAllCodeBlocks(container: HTMLElement, codeTheme: string = 'github-light'): Promise<void> {
    try {
      const preElements = container.querySelectorAll('pre');

      // Process all code blocks in parallel
      await Promise.all(Array.from(preElements).map(async (pre) => {
        try {
          if (!(pre instanceof HTMLPreElement)) return;

          // Skip already processed code blocks
          if (pre.closest('.github-code-block') || pre.closest('.code-block')) return;

          // Extract code block info
          const codeInfo = this.extractCodeBlockInfo(pre);

          // Create GitHub-style code block
          const githubCodeBlock = await this.createGithubCodeBlock(codeInfo, codeTheme);

          // Replace original code block
          pre.replaceWith(githubCodeBlock);
        } catch (error) {
          console.warn('Error processing code block:', error);
        }
      }));
    } catch (error) {
      console.error('Error enhancing code blocks:', error);
    }
  }

  /**
   * Enhance inline code elements with improved styling
   */
  public enhanceInlineCode(container: HTMLElement): void {
    const inlineCodeElements = container.querySelectorAll('code:not(pre code):not(.github-code-block code)');
    inlineCodeElements.forEach(code => {
      // Skip if already processed
      if (code.classList.contains('github-inline-code')) return;

      // Add the inline code class
      code.classList.add('github-inline-code');

      // Try to detect language for syntax coloring
      const text = code.textContent || '';
      const detectedLang = this.detectSimpleLanguage(text);
      if (detectedLang && detectedLang !== 'plaintext') {
        code.classList.add(`lang-${detectedLang}`);
      }

      // Make inline code clickable to copy
      code.title = '点击复制';
      code.style.cursor = 'pointer';
      code.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(text);

          // Visual feedback
          const originalBg = code.style.backgroundColor;
          const originalColor = code.style.color;

          code.style.backgroundColor = 'var(--code-button-success-bg, rgba(46, 160, 67, 0.15))';
          code.style.color = 'var(--code-button-success-color, #2ea043)';
          code.style.borderColor = 'var(--code-button-success-color, #2ea043)';

          setTimeout(() => {
            code.style.backgroundColor = originalBg;
            code.style.color = originalColor;
            code.style.borderColor = '';
          }, 1000);
        } catch (err) {
          console.error('Failed to copy inline code:', err);
        }
      });
    });
  }

  /**
   * Simple language detection for inline code
   */
  private detectSimpleLanguage(text: string): string {
    // Very basic detection for common patterns in inline code
    if (text.startsWith('function') || text.includes('=>') || text.includes('const ') || text.includes('let ')) {
      return 'javascript';
    }
    if (text.startsWith('import ') || text.includes('from ')) {
      return 'javascript';
    }
    if (text.startsWith('<') && text.endsWith('>')) {
      return 'html';
    }
    if (text.includes(':') && text.includes(';')) {
      return 'css';
    }
    if (text.startsWith('.') || text.startsWith('#')) {
      return 'css';
    }
    if (text.startsWith('def ') || text.startsWith('import ') && !text.includes('from')) {
      return 'python';
    }

    return 'plaintext';
  }
}

// Export default instance
export const githubCodeExtractor = new GithubCodeExtractor();
