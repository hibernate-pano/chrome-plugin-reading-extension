import { StorageKeys, getStorage, setStorage, FONT_FAMILIES, BACKGROUND_COLORS, CODE_THEMES } from '../storage/storage';
// 不再直接导入 highlight.js，改为动态导入
// import hljs from 'highlight.js';

// 先导入自定义样式
// 注意：直接在代码中定义样式，避免导入文件的问题
const codeblockStyles = document.createElement('style');
codeblockStyles.id = 'reading-mode-codeblock-styles';
document.head.appendChild(codeblockStyles);

const listStyles = document.createElement('style');
listStyles.id = 'reading-mode-list-styles';
document.head.appendChild(listStyles);

// 添加 highlight.js 样式
const hljsStyles = document.createElement('style');
hljsStyles.id = 'reading-mode-hljs-styles';
hljsStyles.textContent = `
  /* 代码高亮主题 - 基于 One Dark Pro */

  /* 代码块基本样式 */
  .hljs {
    display: block;
    overflow-x: auto;
    padding: 1em;
    color: #abb2bf;
    background: transparent;
    font-family: 'Fira Code', Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
  }

  /* 注释 */
  .hljs-comment,
  .hljs-quote {
    color: #7f848e;
    font-style: italic;
  }

  /* 关键字 */
  .hljs-keyword,
  .hljs-selector-tag,
  .hljs-addition {
    color: #c678dd;
  }

  /* 字符串和数字 */
  .hljs-number,
  .hljs-string,
  .hljs-meta .hljs-meta-string,
  .hljs-literal,
  .hljs-doctag,
  .hljs-regexp {
    color: #98c379;
  }

  /* 函数名和类名 */
  .hljs-title,
  .hljs-section,
  .hljs-name,
  .hljs-selector-id,
  .hljs-selector-class {
    color: #e06c75;
  }

  /* 属性和变量 */
  .hljs-attribute,
  .hljs-attr,
  .hljs-variable,
  .hljs-template-variable,
  .hljs-class .hljs-title,
  .hljs-type {
    color: #d19a66;
  }

  /* 特殊符号 */
  .hljs-symbol,
  .hljs-bullet,
  .hljs-subst,
  .hljs-meta,
  .hljs-meta .hljs-keyword,
  .hljs-selector-attr,
  .hljs-selector-pseudo,
  .hljs-link {
    color: #61afef;
  }

  /* 内置函数 */
  .hljs-built_in,
  .hljs-deletion {
    color: #e6c07b;
  }

  /* 强调 */
  .hljs-emphasis {
    font-style: italic;
  }

  .hljs-strong {
    font-weight: bold;
  }

  /* 标点符号 */
  .hljs-punctuation {
    color: #abb2bf;
  }

  /* 标签 */
  .hljs-tag {
    color: #e06c75;
  }

  /* 标签属性 */
  .hljs-attr {
    color: #d19a66;
  }

  /* 标签内容 */
  .hljs-tag .hljs-name {
    color: #e06c75;
  }

  /* 暗色主题下的颜色调整 */
  .dark .hljs {
    color: #abb2bf;
  }

  /* 暗色主题下的注释 */
  .dark .hljs-comment,
  .dark .hljs-quote {
    color: #7f848e;
  }

  /* 暗色主题下的关键字 */
  .dark .hljs-keyword,
  .dark .hljs-selector-tag,
  .dark .hljs-addition {
    color: #c678dd;
  }

  /* 暗色主题下的字符串和数字 */
  .dark .hljs-number,
  .dark .hljs-string,
  .dark .hljs-meta .hljs-meta-string,
  .dark .hljs-literal,
  .dark .hljs-doctag,
  .dark .hljs-regexp {
    color: #98c379;
  }

  /* 暗色主题下的函数名和类名 */
  .dark .hljs-title,
  .dark .hljs-section,
  .dark .hljs-name,
  .dark .hljs-selector-id,
  .dark .hljs-selector-class {
    color: #e06c75;
  }

  /* 暗色主题下的属性和变量 */
  .dark .hljs-attribute,
  .dark .hljs-attr,
  .dark .hljs-variable,
  .dark .hljs-template-variable,
  .dark .hljs-class .hljs-title,
  .dark .hljs-type {
    color: #d19a66;
  }

  /* 暗色主题下的特殊符号 */
  .dark .hljs-symbol,
  .dark .hljs-bullet,
  .dark .hljs-subst,
  .dark .hljs-meta,
  .dark .hljs-meta .hljs-keyword,
  .dark .hljs-selector-attr,
  .dark .hljs-selector-pseudo,
  .dark .hljs-link {
    color: #61afef;
  }

  /* 暗色主题下的内置函数 */
  .dark .hljs-built_in,
  .dark .hljs-deletion {
    color: #e6c07b;
  }

  /* 暗色主题下的标点符号 */
  .dark .hljs-punctuation {
    color: #abb2bf;
  }
`;
document.head.appendChild(hljsStyles);

// 添加自定义代码高亮样式
const customCodeStyles = document.createElement('style');
customCodeStyles.id = 'reading-mode-custom-code-styles';
customCodeStyles.textContent = `
  pre.line-numbers {
    position: relative;
    padding-left: 3.5em;
    counter-reset: linenumber;
    white-space: pre-wrap;
    margin: 0;
    padding-top: 1em;
    padding-bottom: 1em;
    background-color: #fafafa;
    border-top: none;
  }

  .dark pre.line-numbers {
    background-color: #282c34;
  }

  pre.line-numbers > code {
    position: relative;
    white-space: inherit;
    font-family: 'Fira Code', Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
  }

  .line-numbers-rows {
    position: absolute;
    pointer-events: none;
    top: 1em;
    left: 0;
    width: 3.2em;
    letter-spacing: -1px;
    border-right: 1px solid rgba(0, 0, 0, 0.05);
    user-select: none;
    height: calc(100% - 2em);
  }

  .line-numbers-rows > span {
    display: block;
    counter-increment: linenumber;
    pointer-events: none;
    padding: 0 0.5em;
    height: 1.5em;
    line-height: 1.5em;
  }

  .line-numbers-rows > span:before {
    content: counter(linenumber);
    color: #bbb;
    display: block;
    padding-right: 0.5em;
    text-align: right;
    font-size: 0.8em;
    font-family: 'Fira Code', Consolas, Monaco, monospace;
  }

  .dark .line-numbers-rows {
    border-right: 1px solid rgba(255, 255, 255, 0.05);
  }

  .dark .line-numbers-rows > span:before {
    color: #666;
  }

  .enhanced-code-container {
    position: relative;
    margin: 1.5em 0;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background-color: #fafafa;
  }

  .dark .enhanced-code-container {
    background-color: #282c34;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5em 1em;
    background: #f5f5f5;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 0.8em;
  }

  .dark .code-header {
    background: #21252b;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .code-language {
    font-weight: 500;
    color: #666;
    font-size: 0.9em;
  }

  .dark .code-language {
    color: #aaa;
  }

  .code-caption {
    color: #666;
    margin-left: 1em;
    font-style: italic;
  }

  .dark .code-caption {
    color: #aaa;
  }

  .code-copy-button {
    background: transparent;
    border: none;
    padding: 0.25em 0.5em;
    font-size: 0.9em;
    color: #888;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.3em;
    opacity: 0.7;
    transition: opacity 0.2s ease;
  }

  .code-copy-button:hover {
    opacity: 1;
  }

  .code-copy-button.copied {
    color: #4caf50;
  }

  .dark .code-copy-button {
    color: #888;
  }

  .dark .code-copy-button:hover {
    color: #ccc;
  }

  .dark .code-copy-button.copied {
    color: #4caf50;
  }

  /* 纯文本代码样式 */
  .plaintext {
    display: block;
    overflow-x: auto;
    padding: 1em;
    background: #fafafa;
    color: #333;
    tab-size: 4;
  }

  .dark .plaintext {
    background: #282c34;
    color: #abb2bf;
  }

  /* 代码块内容区域 */
  .hljs {
    padding: 0 1em !important;
    background: transparent !important;
    line-height: 1.5;
    font-size: 0.95em;
  }
`;
document.head.appendChild(customCodeStyles);

// highlight.js 配置将在动态导入时进行
// hljs.configure({
//   languages: [
//     'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
//     'css', 'html', 'xml', 'json', 'markdown', 'bash', 'shell',
//     'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'sql'
//   ]
// });

// 导入 highlight.js 样式
// 不通过导入文件的方式，而是直接在代码中定义样式
// import 'highlight.js/styles/atom-one-light.css';
// 注释掉 pangu 导入，暂时不使用
// import pangu from 'pangu';

// 导入性能监控器和工具
import { performanceMonitor } from '../utils/performance';
// 不再使用资源加载器
// import { /* resourceLoader, LoadPriority */ } from '../utils/resourceLoader';
import { Toast } from '../ui/components/Toast';
import { createFloatingButton, removeFloatingButton } from './ui/readerFloatingButton';
import { handleMediaElements } from './processors/mediaProcessor';

// 导入增强提取器
import {
  ExtractorFactory,
  contentExtractor,
  // defuddleExtractor, // 移除此行
  // tableExtractor, // 移除此行
  // mediaExtractor, // 移除此行
  // enhancedMediaExtractor, // 移除此行
  // codeExtractor, // 移除此行
  // listExtractor // 移除此行
} from './extractors';

// 导入基础变量系统
import './styles/variables.css';
// 导入提取器样式
import './extractors/extractors.css';
// 导入 GitHub 风格代码块样式
import './styles/github-code-new.css';

interface ReadingModeSettings {
  theme: 'light' | 'dark';
  fontSize: number;
  codeFontSize: number;
  codeTheme: keyof typeof CODE_THEMES;
  lineHeight: number;
  paragraphSpacing: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  showImages: boolean;
  fontFamily: keyof typeof FONT_FAMILIES;
  backgroundColor: keyof typeof BACKGROUND_COLORS;
}

let originalContent: string | null = null;
let isReadingMode = false;

import { DEFAULT_SETTINGS } from '../constants/defaultSettings';

async function fetchSettings(): Promise<ReadingModeSettings> {
  const [theme, fontSize, codeFontSize, codeTheme, lineHeight, paragraphSpacing, textAlign, showImages, fontFamily, backgroundColor] = await Promise.all([
    getStorage<'light' | 'dark'>(StorageKeys.THEME),
    getStorage<number>(StorageKeys.FONT_SIZE),
    getStorage<number>(StorageKeys.CODE_FONT_SIZE),
    getStorage<keyof typeof CODE_THEMES>(StorageKeys.CODE_THEME),
    getStorage<number>(StorageKeys.LINE_HEIGHT),
    getStorage<number>(StorageKeys.PARAGRAPH_SPACING),
    getStorage<'left' | 'center' | 'right' | 'justify'>(StorageKeys.TEXT_ALIGN),
    getStorage<boolean>(StorageKeys.SHOW_IMAGES),
    getStorage<keyof typeof FONT_FAMILIES>(StorageKeys.FONT_FAMILY),
    getStorage<keyof typeof BACKGROUND_COLORS>(StorageKeys.BACKGROUND_COLOR),
  ]);

  return {
    theme: theme ?? DEFAULT_SETTINGS.theme,
    fontSize: fontSize ?? DEFAULT_SETTINGS.fontSize,
    codeFontSize: codeFontSize ?? DEFAULT_SETTINGS.codeFontSize,
    codeTheme: codeTheme ?? DEFAULT_SETTINGS.codeTheme,
    lineHeight: lineHeight ?? DEFAULT_SETTINGS.lineHeight,
    paragraphSpacing: paragraphSpacing ?? DEFAULT_SETTINGS.paragraphSpacing,
    textAlign: textAlign ?? DEFAULT_SETTINGS.textAlign,
    showImages: showImages ?? DEFAULT_SETTINGS.showImages,
    fontFamily: fontFamily ?? DEFAULT_SETTINGS.fontFamily,
    backgroundColor: backgroundColor ?? DEFAULT_SETTINGS.backgroundColor,
  };
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

    // 统一处理所有代码块
    await handleCodeBlocks(container, settings, true);

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


async function applyStyles(settings: ReadingModeSettings) {
  const rootElement = document.documentElement;
  const bodyElement = document.body;

  // 应用主题
  rootElement.setAttribute('data-theme', settings.theme);
  bodyElement.setAttribute('data-theme', settings.theme);

  // 应用字体大小
  rootElement.style.setProperty('--reader-font-size', `${settings.fontSize}px`);

  // 应用行高
  rootElement.style.setProperty('--reader-line-height', `${settings.lineHeight}`);

  // 应用段间距
  rootElement.style.setProperty('--reader-paragraph-spacing', `${settings.paragraphSpacing}em`);

  // 应用文本对齐
  rootElement.style.setProperty('--reader-text-align', settings.textAlign);

  // 应用字体家族
  rootElement.style.setProperty('--reader-font-family', FONT_FAMILIES[settings.fontFamily] || FONT_FAMILIES.default);

  // 应用背景颜色
  rootElement.style.setProperty('--reader-background-color', BACKGROUND_COLORS[settings.backgroundColor] || BACKGROUND_COLORS.white);

  // 处理媒体元素（图片等）的显示
  handleMediaElements(bodyElement, settings.showImages);

  // 处理代码块样式
  await handleCodeBlocks(bodyElement, settings);

  // 更新阅读模式下特定元素的样式
  const readerContent = document.querySelector('.reader-content-container');
  if (readerContent) {
    const readerStyles = document.createElement('style');
    readerStyles.id = 'reading-mode-dynamic-styles';
    readerStyles.textContent = `
      .reader-content-container p,
      .reader-content-container li,
      .reader-content-container blockquote,
      .reader-content-container pre {
        line-height: var(--reader-line-height);
        margin-bottom: var(--reader-paragraph-spacing);
        text-align: var(--reader-text-align);
      }
      .reader-content-container {
        font-family: var(--reader-font-family);
        font-size: var(--reader-font-size);
        background-color: var(--reader-background-color);
        color: var(--reader-text-color); /* 定义在 CSS Modules 中 */
      }
      .dark .reader-content-container {
        color: var(--reader-dark-text-color);
      }
    `;
    document.head.appendChild(readerStyles);
  }
}

// 将 createFloatingButton 和 removeFloatingButton 移动到 src/content/ui/readerFloatingButton.ts

async function enableReadingMode() {
  if (isReadingMode) return;

  const originalBodyClassName = document.body.className;
  const originalHtmlClassName = document.documentElement.className;
  const originalBodyStyle = document.body.style.cssText;
  const originalHtmlStyle = document.documentElement.style.cssText;

  // 存储原始HTML
  originalContent = document.documentElement.outerHTML;

  // 恢复到初始的overflow状态
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';

  // 动态导入 Readability，减少初始加载体积
  const { Readability } = await import('@mozilla/readability');
  const { ExtractorFactory } = await import('./extractors');

  // 使用 JSDOM 解析原始 HTML，避免直接操作活动 DOM
  // const dom = new JSDOM(originalContent);
  // const documentClone = dom.window.document;

  // 尝试提取主要内容
  const reader = new Readability(document);
  const article = reader.parse();

  if (article) {
    // 获取用户设置
    const settings = await fetchSettings();

    // 创建阅读模式容器
    const readerContainer = document.createElement('div');
    readerContainer.id = 'panbo-reader-view';
    readerContainer.className = 'panbo-reader-view-container'; // 添加类名以便样式控制
    readerContainer.setAttribute('data-theme', settings.theme); // 应用主题类
    document.body.appendChild(readerContainer);

    // 注入阅读模式CSS
    const readerModeCss = document.createElement('style');
    readerModeCss.id = 'panbo-reader-mode-css';
    readerModeCss.textContent = `
      html.reader-mode-active, body.reader-mode-active {
        overflow: hidden !important;
      }
      .panbo-reader-view-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 99999;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        background-color: var(--reader-background-color); /* 使用CSS变量 */
        color: var(--reader-text-color);
        transition: background-color 0.3s ease, color 0.3s ease;
      }

      /* 针对滚动条的样式，使其更美观 */
      .panbo-reader-view-container::-webkit-scrollbar {
        width: 8px;
        background-color: transparent;
      }
      .panbo-reader-view-container::-webkit-scrollbar-thumb {
        background-color: #ccc;
        border-radius: 4px;
      }
      .panbo-reader-view-container::-webkit-scrollbar-thumb:hover {
        background-color: #aaa;
      }

      .panbo-reader-view-container .reader-content-wrapper {
        max-width: 800px; /* 限制内容宽度，提供舒适阅读体验 */
        margin: 0 auto;
        padding: 40px 20px; /* 增加内边距 */
        box-sizing: border-box;
      }

      .panbo-reader-view-container h1, .panbo-reader-view-container h2, .panbo-reader-view-container h3, .panbo-reader-view-container h4, .panbo-reader-view-container h5, .panbo-reader-view-container h6 {
        font-family: var(--reader-font-family);
        color: inherit;
        line-height: 1.3;
        margin-top: 1.5em;
        margin-bottom: 0.8em;
      }
      .panbo-reader-view-container h1 { font-size: 2.2em; }
      .panbo-reader-view-container h2 { font-size: 1.8em; }
      .panbo-reader-view-container h3 { font-size: 1.5em; }
      .panbo-reader-view-container h4 { font-size: 1.2em; }

      .panbo-reader-view-container p, .panbo-reader-view-container li {
        font-size: var(--reader-font-size);
        line-height: var(--reader-line-height);
        margin-bottom: var(--reader-paragraph-spacing);
        text-align: var(--reader-text-align);
        font-family: var(--reader-font-family);
        color: inherit;
      }

      .panbo-reader-view-container a {
        color: var(--reader-link-color);
        text-decoration: none;
        border-bottom: 1px solid var(--reader-link-color);
        transition: border-color 0.2s ease;
      }
      .panbo-reader-view-container a:hover {
        border-bottom-color: transparent;
      }

      .panbo-reader-view-container blockquote {
        border-left: 4px solid var(--reader-quote-border-color);
        padding-left: 1em;
        margin: 1em 0;
        color: var(--reader-quote-text-color);
        font-style: italic;
      }

      .panbo-reader-view-container img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 1.5em auto;
        border-radius: 8px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
      }

      .panbo-reader-view-container pre {
        background-color: var(--reader-code-background-color);
        padding: 1em;
        border-radius: 8px;
        overflow-x: auto;
        font-family: var(--reader-code-font-family);
        font-size: var(--reader-code-font-size);
        line-height: 1.5;
        color: var(--reader-code-text-color);
        margin-bottom: var(--reader-paragraph-spacing);
      }
      .panbo-reader-view-container pre code {
        font-size: var(--reader-code-font-size);
        line-height: 1.5;
      }

      /* 暗色模式变量 */
      .dark {
        --reader-text-color: #e0e0e0;
        --reader-link-color: #90caf9;
        --reader-quote-border-color: #616161;
        --reader-quote-text-color: #bdbdbd;
        --reader-code-background-color: #282c34;
        --reader-code-text-color: #abb2bf;
      }

      /* 亮色模式变量 */
      .light {
        --reader-text-color: #333;
        --reader-link-color: #1a73e8;
        --reader-quote-border-color: #e0e0e0;
        --reader-quote-text-color: #666;
        --reader-code-background-color: #f6f8fa;
        --reader-code-text-color: #24292e;
      }
    `;
    document.head.appendChild(readerModeCss);

    // 禁用页面原有滚动，只允许阅读模式容器滚动
    document.documentElement.classList.add('reader-mode-active');
    document.body.classList.add('reader-mode-active');

    // 生成并插入 HTML
    const extractor = await ExtractorFactory.createExtractor(window.location.href);
    const extractedArticle = await extractor.extract(document, window.location.href);

    if (extractedArticle && extractedArticle.content) {
      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'reader-content-wrapper';
      contentWrapper.innerHTML = `
        <h1 class="reader-article-title">${extractedArticle.title || document.title}</h1>
        <div class="reader-article-meta">
          ${extractedArticle.author ? `<span>作者: ${extractedArticle.author}</span>` : ''}
        </div>
        <div class="reader-article-content">${extractedArticle.content}</div>
      `;
      readerContainer.appendChild(contentWrapper);

      // 应用设置
      await applyStyles(settings);

      // 自动高亮代码块
      await handleCodeBlocks(readerContainer, settings);

      createFloatingButton();

      isReadingMode = true;
      console.log('阅读模式已开启');
    } else {
      console.error('未能成功提取文章内容。');
      disableReadingMode(); // 提取失败则关闭阅读模式
      alert('无法进入阅读模式，请刷新页面后重试。');
    }
  } else {
    console.error('Readability 无法解析当前页面。');
    disableReadingMode(); // 解析失败则关闭阅读模式
    alert('无法进入阅读模式，请刷新页面后重试。');
  }
}

function disableReadingMode() {
  if (!isReadingMode) return;

  // 恢复原始HTML内容
  if (originalContent) {
    document.documentElement.outerHTML = originalContent;
    originalContent = null;
  }

  // 移除阅读模式的CSS和容器
  const readerModeCss = document.getElementById('panbo-reader-mode-css');
  if (readerModeCss) {
    readerModeCss.remove();
  }

  const readerContainer = document.getElementById('panbo-reader-view');
  if (readerContainer) {
    readerContainer.remove();
  }

  // 移除全局类名
  document.documentElement.classList.remove('reader-mode-active');
  document.body.classList.remove('reader-mode-active');

  // 清理 highlight.js 的样式
  const hljsStyles = document.getElementById('reading-mode-hljs-styles');
  if (hljsStyles) {
    hljsStyles.remove();
  }
  const customCodeStyles = document.getElementById('reading-mode-custom-code-styles');
  if (customCodeStyles) {
    customCodeStyles.remove();
  }
  const readerViewDynamicStyles = document.getElementById('reading-mode-dynamic-styles');
  if (readerViewDynamicStyles) {
    readerViewDynamicStyles.remove();
  }

  removeFloatingButton();

  // 恢复原始溢出状态 (如果需要的话，但通常 enableReadingMode 已经处理了)
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';

  isReadingMode = false;
  console.log('阅读模式已关闭');
}

// 监听存储变化
chrome.storage.onChanged.addListener(async (changes) => {
  // 如果不在阅读模式下，不应用样式
  if (!isReadingMode) return;

  const container = document.getElementById('panbo-reader-view');
  if (!container) return;

  const settings = await fetchSettings();

  await applyStyles(settings);
});