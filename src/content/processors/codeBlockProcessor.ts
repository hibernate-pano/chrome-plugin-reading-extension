import { CODE_THEMES } from '../../storage/storage';
import { ReadingModeSettings } from '../types';
// import { githubCodeExtractor } from '../extractors/githubCodeExtractor';

// 代码主题的样式映射
const CODE_THEME_STYLES = {
  'github': {
    background: '#ffffff',
    text: '#24292e',
    selection: '#b3d4fc',
    comment: '#6a737d',
    punctuation: '#24292e',
    keyword: '#d73a49',
    function: '#6f42c1',
    string: '#032f62',
    number: '#005cc5',
    class: '#22863a',
    variable: '#24292e',
  },
  'one-dark': {
    background: '#282c34',
    text: '#abb2bf',
    selection: '#3e4451',
    comment: '#5c6370',
    punctuation: '#abb2bf',
    keyword: '#c678dd',
    function: '#61afef',
    string: '#98c379',
    number: '#d19a66',
    class: '#e5c07b',
    variable: '#e06c75',
  },
  'one-light': {
    background: '#fafafa',
    text: '#383a42',
    selection: '#e5e5e6',
    comment: '#a0a1a7',
    punctuation: '#383a42',
    keyword: '#a626a4',
    function: '#4078f2',
    string: '#50a14f',
    number: '#986801',
    class: '#c18401',
    variable: '#e45649',
  },
  'material-dark': {
    background: '#263238',
    text: '#eeffff',
    selection: '#80cbc4',
    comment: '#546e7a',
    punctuation: '#89ddff',
    keyword: '#c792ea',
    function: '#82aaff',
    string: '#c3e88d',
    number: '#f78c6c',
    class: '#ffcb6b',
    variable: '#eeffff',
  },
  'material-light': {
    background: '#fafafa',
    text: '#90a4ae',
    selection: '#80cbc4',
    comment: '#90a4ae',
    punctuation: '#39adb5',
    keyword: '#7c4dff',
    function: '#6182b8',
    string: '#91b859',
    number: '#f76d47',
    class: '#f6a434',
    variable: '#90a4ae',
  },
  'night-owl': {
    background: '#011627',
    text: '#d6deeb',
    selection: '#1d3b53',
    comment: '#637777',
    punctuation: '#7fdbca',
    keyword: '#c792ea',
    function: '#82aaff',
    string: '#ecc48d',
    number: '#f78c6c',
    class: '#ffcb8b',
    variable: '#d7dbe0',
  },
  'dracula': {
    background: '#282a36',
    text: '#f8f8f2',
    selection: '#44475a',
    comment: '#6272a4',
    punctuation: '#f8f8f2',
    keyword: '#ff79c6',
    function: '#50fa7b',
    string: '#f1fa8c',
    number: '#bd93f9',
    class: '#8be9fd',
    variable: '#f8f8f2',
  },
  'solarized-dark': {
    background: '#002b36',
    text: '#839496',
    selection: '#073642',
    comment: '#586e75',
    punctuation: '#839496',
    keyword: '#859900',
    function: '#268bd2',
    string: '#2aa198',
    number: '#d33682',
    class: '#b58900',
    variable: '#b58900',
  },
  'solarized-light': {
    background: '#fdf6e3',
    text: '#657b83',
    selection: '#eee8d5',
    comment: '#93a1a1',
    punctuation: '#657b83',
    keyword: '#859900',
    function: '#268bd2',
    string: '#2aa198',
    number: '#d33682',
    class: '#b58900',
    variable: '#b58900',
  },
} as const;

// 生成代码主题的 CSS
function generateCodeThemeStyles(theme: keyof typeof CODE_THEMES, settings: ReadingModeSettings) {
  const themeStyles = CODE_THEME_STYLES[theme] || CODE_THEME_STYLES['github'];

  return `
    /* 代码块主题变量 */
    :root {
      --code-bg-color: ${themeStyles.background};
      --code-text-color: ${themeStyles.text};
      --code-selection-color: ${themeStyles.selection};
      --code-comment-color: ${themeStyles.comment};
      --code-punctuation-color: ${themeStyles.punctuation};
      --code-keyword-color: ${themeStyles.keyword};
      --code-function-color: ${themeStyles.function};
      --code-string-color: ${themeStyles.string};
      --code-number-color: ${themeStyles.number};
      --code-class-color: ${themeStyles.class};
      --code-variable-color: ${themeStyles.variable};
      --code-border-color: ${themeStyles.comment}40;
      --code-shadow-color: ${themeStyles.comment}20;
      --code-font-size: ${settings.codeFontSize}px;
    }

    /* 代码块基础样式 */
    pre.line-numbers,
    .enhanced-code-container pre,
    .code-block pre {
      background-color: var(--code-bg-color) !important;
      color: var(--code-text-color) !important;
      font-size: var(--code-font-size) !important;
      line-height: 1.5;
      padding: 1em;
      margin: 1em 0;
      border-radius: 8px;
      overflow-x: auto;
      position: relative;
      padding-left: 3.8em !important;
      counter-reset: linenumber;
      border: 1px solid var(--code-border-color);
      box-shadow: 0 2px 4px var(--code-shadow-color);
    }

    /* 代码工具栏样式 */
    .code-toolbar {
      background-color: var(--code-bg-color) !important;
      color: var(--code-text-color) !important;
      border-bottom: 1px solid var(--code-border-color);\
      font-size: var(--code-font-size) !important;
    }

    /* 行号容器样式 */
    pre.line-numbers .line-numbers-rows,
    .enhanced-code-container .line-numbers-rows,
    .code-block .line-numbers-rows {
      position: absolute;
      pointer-events: none;
      top: 1em;
      font-size: var(--code-font-size) !important;
      left: 0;
      width: 3em;
      letter-spacing: -1px;
      border-right: 1px solid var(--code-border-color);
      user-select: none;
    }

    /* 行号样式 */
    .line-numbers-rows > span {
      display: block;
      counter-increment: linenumber;
      pointer-events: none;
    }

    .line-numbers-rows > span:before {
      content: counter(linenumber);
      color: var(--code-comment-color)80;
      display: block;
      padding-right: 0.8em;
      text-align: right;
    }

    /* 代码语法高亮 */
    .token.comment,
    .token.prolog,
    .token.doctype,
    .token.cdata {
      color: var(--code-comment-color) !important;
      font-style: italic;
    }

    .token.punctuation {
      color: var(--code-punctuation-color) !important;
    }

    .token.keyword,
    .token.operator {
      color: var(--code-keyword-color) !important;
    }

    .token.function {
      color: var(--code-function-color) !important;
    }

    .token.string {
      color: var(--code-string-color) !important;
    }

    .token.number {
      color: var(--code-number-color) !important;
    }

    .token.class-name {
      color: var(--code-class-color) !important;
    }

    .token.variable {
      color: var(--code-variable-color) !important;
    }

    /* 代码选择样式 */
    pre.line-numbers ::selection,
    pre.line-numbers ::-moz-selection,
    .enhanced-code-container ::selection,
    .enhanced-code-container ::-moz-selection,
    .code-block ::selection,
    .code-block ::-moz-selection {
      background: var(--code-selection-color) !important;
    }

    /* 内联代码样式 */
    #reading-mode-container code:not(pre code) {
      background-color: var(--code-bg-color)40;
      color: var(--code-keyword-color);
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-size: var(--code-font-size) !important;
      font-family: 'Fira Code', Consolas, Monaco, monospace;
      border: 1px solid var(--code-border-color);
    }

    /* 确保代码块工具栏按钮样式正确 */
    .code-toolbar .toolbar-item button {
      color: var(--code-text-color) !important;
      background-color: var(--code-bg-color) !important;
      border: 1px solid var(--code-border-color) !important;
      font-size: calc(var(--code-font-size) * 0.9) !important;
    }

    .code-toolbar .toolbar-item button:hover {
      background-color: var(--code-selection-color) !important;
    }
  `;
}

/**
 * 应用代码主题样式
 */
function applyCodeThemeStyles(css: string): void {
  // 检查是否已存在样式元素
  let styleElement = document.getElementById('reading-mode-code-theme');
  
  if (!styleElement) {
    // 创建新的样式元素
    styleElement = document.createElement('style');
    styleElement.id = 'reading-mode-code-theme';
    document.head.appendChild(styleElement);
  }
  
  // 更新样式内容
  styleElement.textContent = css;
}

async function handleCodeBlocks(container: HTMLElement | null, settings: ReadingModeSettings, forceReprocess: boolean = false) {
  if (!container) return;

  // 检查页面是否有代码块
  const preElements = container.querySelectorAll('pre');
  const existingContainers = container.querySelectorAll('.github-code-block, .code-block, .enhanced-code-container');
  const hasExistingCodeBlocks = existingContainers.length > 0;

  if (preElements.length === 0 && !hasExistingCodeBlocks) {
    console.log('页面没有代码块，跳过代码高亮库加载');
    return;
  }

  // 确定代码主题
  let codeTheme: string;
  switch (settings.codeTheme) {
    case 'github':
      codeTheme = settings.theme === 'dark' ? 'github-dark' : 'github-light';
      break;
    case 'one-dark':
      codeTheme = 'one-dark';
      break;
    case 'dracula':
      codeTheme = 'dracula';
      break;
    default:
      codeTheme = settings.theme === 'dark' ? 'github-dark' : 'github-light';
  }

  // 设置代码块主题类
  const themeClass = settings.theme === 'dark' ? 'dark-theme' : 'light-theme';
  container.classList.remove('dark-theme', 'light-theme');
  container.classList.add(themeClass);

  // 如果已有代码块且不需要强制重新处理，只更新样式
  if (hasExistingCodeBlocks && !forceReprocess) {
    console.log('更新现有代码块样式');
    // 更新代码块主题属性和主题类
    existingContainers.forEach(block => {
      block.setAttribute('data-code-theme', codeTheme);
      block.classList.remove('dark-theme', 'light-theme');
      block.classList.add(themeClass);
    });

    // 更新代码字体大小
    if (settings.codeFontSize) {
      const codeElements = container.querySelectorAll(
        '.github-code-block, .github-code-block code, .github-code-language, ' +
        '.github-code-copy-btn, .github-code-line-number, .github-inline-code'
      );

      codeElements.forEach(element => {
        if (element.classList.contains('github-code-line-number')) {
          // 行号字体稍小
          (element as HTMLElement).style.fontSize = `${Math.max(settings.codeFontSize - 2, 10)}px`;
        } else if (element.classList.contains('github-code-language') ||
          element.classList.contains('github-code-copy-btn')) {
          // 工具栏元素字体稍小
          (element as HTMLElement).style.fontSize = `${Math.max(settings.codeFontSize - 1, 11)}px`;
        } else {
          (element as HTMLElement).style.fontSize = `${settings.codeFontSize}px`;
        }
      });
    }
    return;
  }

  // 需要完全重新处理代码块
  console.log('开始处理代码块');
  try {
    // 先清除所有已存在的代码块容器
    console.log(`找到 ${existingContainers.length} 个现有代码块容器`);

    existingContainers.forEach((codeContainer, index) => {
      try {
        // 找到原始的pre元素，如果有的话
        const originalPre = document.createElement('pre');
        const code = (codeContainer as HTMLElement).querySelector('code');
        if (code) {
          originalPre.appendChild(code.cloneNode(true));
          codeContainer.replaceWith(originalPre);
          console.log(`成功替换代码块容器 ${index + 1}`);
        } else {
          codeContainer.remove();
          console.log(`移除没有代码元素的容器 ${index + 1}`);
        }
      } catch (containerError) {
        console.error(`处理代码块容器 ${index + 1} 时出错:`, containerError);
        // 尝试直接移除容器
        try {
          codeContainer.remove();
        } catch (removeError) {
          console.error('移除容器失败:', removeError);
        }
      }
    });

    // 清除可能存在的其他代码相关元素
    const codeElements = container.querySelectorAll(
      '.github-code-header, .github-code-actions, .github-code-content-wrapper, ' +
      '.code-header, .code-top-bar, .code-toolbar, .code-copy-button, ' +
      '.code-content-wrapper, .code-content, .code-wrapper, .line-numbers, .code-toast'
    );
    codeElements.forEach(element => element.remove());

    console.log(`应用代码块主题: ${codeTheme}`);

    // 应用代码主题
    const codeThemeCSS = generateCodeThemeStyles(
      codeTheme as keyof typeof CODE_THEMES, 
      settings
    );
    applyCodeThemeStyles(codeThemeCSS);

    // 增强代码块
    // await githubCodeExtractor.enhanceAllCodeBlocks(container, codeTheme);
    
    // 增强内联代码
    // githubCodeExtractor.enhanceInlineCode(container);

    // 设置代码字体大小
    if (settings.codeFontSize) {
      const codeElements = container.querySelectorAll(
        '.github-code-block, .github-code-block code, .github-code-language, ' +
        '.github-code-copy-btn, .github-code-line-number, .github-inline-code'
      );

      codeElements.forEach(element => {
        if (element.classList.contains('github-code-line-number')) {
          // 行号字体稍小
          (element as HTMLElement).style.fontSize = `${Math.max(settings.codeFontSize - 2, 10)}px`;
        } else if (element.classList.contains('github-code-language') ||
          element.classList.contains('github-code-copy-btn')) {
          // 工具栏元素字体稍小
          (element as HTMLElement).style.fontSize = `${Math.max(settings.codeFontSize - 1, 11)}px`;
        } else {
          (element as HTMLElement).style.fontSize = `${settings.codeFontSize}px`;
        }
      });
    }

    console.log('代码块处理完成');
  } catch (error) {
    console.error('处理代码块时发生错误:', error);
  }
}

export { handleCodeBlocks, CODE_THEME_STYLES, generateCodeThemeStyles }; 