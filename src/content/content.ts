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
import { /* resourceLoader, LoadPriority */ } from '../utils/resourceLoader';
import { getWorkerManager, releaseWorkerManager } from '../workers/workerManager';
import { TextSelectionToolbar, defaultToolbarOptions } from './components/TextSelectionToolbar';
import { Toast } from '../ui/components/Toast';

// 导入增强提取器
import {
  contentExtractor,
  defuddleExtractor,
  tableExtractor,
  mediaExtractor,
  enhancedMediaExtractor,
  codeExtractor,
  listExtractor
} from './extractors';

// 导入 GitHub 风格代码块提取器
import { githubCodeExtractor } from './extractors/githubCodeExtractor';

// 导入基础变量系统
import './styles/variables.css';
// 导入提取器样式
import './extractors/extractors.css';
// 导入 GitHub 风格代码块样式
import './styles/github-code-new.css';

import { MarkdownWorkerManager } from "./workers/markdownWorkerManager";
import { DefuddleExtractor } from "./extractors/defuddleExtractor";
import { renderMarkdown } from "./renderers/markdownRenderer";

// Import structured errors and logger
import { ReaderError, ErrorCode, ContentExtractionError, RenderError } from '../types/errors';
import { logger } from '../utils/logManager';

interface ReadingModeSettings {
  theme: 'light' | 'dark';
  fontSize: number;
  codeFontSize: number;
  codeTheme: keyof typeof CODE_THEMES;
  lineHeight: number;
  letterSpacing: number;
  lineSpacing: number;
  pageWidth: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  firstLineIndent: boolean;
  showImages: boolean;
  fontFamily: keyof typeof FONT_FAMILIES;
  backgroundColor: keyof typeof BACKGROUND_COLORS;
  showDirectory: boolean;
  paragraphSpacing: number;
  debug?: boolean;
}

let originalContent: string | null = null;
let isReadingMode = false;
let textSelectionToolbar: TextSelectionToolbar | null = null;
let markdownWorkerManager: MarkdownWorkerManager | null = null;
let defuddleExtractorInstance: DefuddleExtractor | null = null;

import { DEFAULT_SETTINGS } from '../constants/defaultSettings';

// User-friendly error messages (based on error-handling.md)
const userFriendlyMessages: Record<ErrorCode, string> = {
  CONTENT_EXTRACTION_FAILED: '无法提取页面内容，请尝试其他页面。',
  STORAGE_OPERATION_FAILED: '存储操作失败，您的设置可能未保存。',
  NETWORK_REQUEST_FAILED: '网络连接出现问题，请检查您的网络设置。',
  RENDER_FAILED: '显示内容时出现问题。',
  PERMISSION_DENIED: '缺少所需权限，请尝试重新启用插件。',
  TIMEOUT_EXCEEDED: '操作超时，请稍后重试。',
  VALIDATION_FAILED: '输入验证失败。',
  UNEXPECTED_STATE: '发生意外错误。',
};

// Centralized Error Handling Function
function handleError(error: unknown, context: string): void {
  // Ensure the error is a ReaderError or wrap it
  const readerError = error instanceof ReaderError ? error : new ReaderError(
    error instanceof Error ? error.message : String(error),
    'UNEXPECTED_STATE', // Default code for unknown errors
    { context, originalError: error }
  );

  console.error(`[阅读模式错误] ${context}:`, readerError); // Log to console
  logger.logError(readerError); // Log to IndexedDB

  // Show a user-friendly toast message based on the error code
  const message = userFriendlyMessages[readerError.code] || userFriendlyMessages.UNEXPECTED_STATE;
  Toast.error(message);
  // TODO: Consider showing a more detailed error UI if needed, possibly based on specific error types
}

async function fetchSettings(): Promise<ReadingModeSettings> {
  return {
    theme: await getStorage<'light' | 'dark'>(StorageKeys.THEME) ?? DEFAULT_SETTINGS.theme,
    fontSize: await getStorage<number>(StorageKeys.FONT_SIZE) ?? DEFAULT_SETTINGS.fontSize,
    codeFontSize: await getStorage<number>(StorageKeys.CODE_FONT_SIZE) ?? DEFAULT_SETTINGS.codeFontSize,
    codeTheme: await getStorage<keyof typeof CODE_THEMES>(StorageKeys.CODE_THEME) ?? DEFAULT_SETTINGS.codeTheme,
    lineHeight: await getStorage<number>(StorageKeys.LINE_HEIGHT) ?? DEFAULT_SETTINGS.lineHeight,
    letterSpacing: await getStorage<number>(StorageKeys.LETTER_SPACING) ?? DEFAULT_SETTINGS.letterSpacing,
    lineSpacing: await getStorage<number>(StorageKeys.LINE_SPACING) ?? DEFAULT_SETTINGS.lineSpacing,
    pageWidth: await getStorage<number>(StorageKeys.PAGE_WIDTH) ?? DEFAULT_SETTINGS.pageWidth,
    textAlign: await getStorage<'left' | 'center' | 'right' | 'justify'>(StorageKeys.TEXT_ALIGN) ?? DEFAULT_SETTINGS.textAlign,
    firstLineIndent: await getStorage<boolean>(StorageKeys.FIRST_LINE_INDENT) ?? DEFAULT_SETTINGS.firstLineIndent,
    showImages: await getStorage<boolean>(StorageKeys.SHOW_IMAGES) ?? DEFAULT_SETTINGS.showImages,
    fontFamily: await getStorage<keyof typeof FONT_FAMILIES>(StorageKeys.FONT_FAMILY) ?? DEFAULT_SETTINGS.fontFamily,
    backgroundColor: await getStorage<keyof typeof BACKGROUND_COLORS>(StorageKeys.BACKGROUND_COLOR) ?? DEFAULT_SETTINGS.backgroundColor,
    showDirectory: await getStorage<boolean>(StorageKeys.SHOW_DIRECTORY) ?? DEFAULT_SETTINGS.showDirectory,
    paragraphSpacing: await getStorage<number>(StorageKeys.PARAGRAPH_SPACING) ?? DEFAULT_SETTINGS.paragraphSpacing,
    debug: await getStorage<boolean>(StorageKeys.DEBUG) ?? DEFAULT_SETTINGS.debug,
  };
}

function handleMediaElements(container: HTMLElement | null, showImages: boolean) {
  if (!container) return;

  // 首先处理所有图片容器
  const imageContainers = container.querySelectorAll('.enhanced-image-container, .background-image-container, figure');
  imageContainers.forEach(container => {
    const containerElement = container as HTMLElement;
    containerElement.style.display = showImages ? 'block' : 'none';
  });

  // 处理所有图片标题
  const imageCaptions = container.querySelectorAll('.image-caption, figcaption');
  imageCaptions.forEach(caption => {
    const captionElement = caption as HTMLElement;
    captionElement.style.display = showImages ? 'block' : 'none';
  });

  const mediaSelectors = [
    'img', 'svg', 'video', 'audio', 'iframe',
    'canvas', 'object', 'embed', 'picture', 'source'
  ];
  mediaSelectors.forEach(selector => {
    const elements = container.getElementsByTagName(selector);
    for (const element of elements) {
      const htmlElement = element as HTMLElement;
      htmlElement.style.display = showImages ? 'block' : 'none';

      if (showImages && element instanceof HTMLImageElement) {
        // 处理懒加载图片
        const lazyAttributes = [
          'data-src', 'data-srcset', 'data-original', 'data-lazy-src',
          'data-lazy', 'data-src-lazy', 'data-original-src', 'data-load-src',
          'data-img-src', 'data-origin', 'data-lazyload', 'data-srcset-lazy',
          'data-lazy-srcset', 'data-lazy-original'
        ];

        // 如果图片没有 src，尝试从懒加载属性中获取
        if (!element.src || element.src.trim() === '' || element.src.includes('data:image/gif;base64')) {
          for (const attr of lazyAttributes) {
            const value = element.getAttribute(attr);
            if (value) {
              element.src = value;
              break;
            }
          }
        }

        // 确保图片可见
        element.removeAttribute('loading');
        element.removeAttribute('decoding');
        element.removeAttribute('importance');
        element.removeAttribute('loading-strategy');
        element.removeAttribute('fetchpriority');
        htmlElement.style.visibility = 'visible';
        htmlElement.style.opacity = '1';

        // 如果图片在增强容器中，确保容器可见
        const container = element.closest('.enhanced-image-container');
        if (container) {
          (container as HTMLElement).style.display = 'block';
        }

        // 如果图片有 srcset，确保它被正确加载
        if (element.srcset === '' && element.getAttribute('data-srcset')) {
          element.srcset = element.getAttribute('data-srcset')!;
        }

        // 触发图片加载
        if (element.complete) {
          const event = new Event('load');
          element.dispatchEvent(event);
        }
      }
    }
  });

  // 处理背景图片
  const elementsWithBgImage = container.querySelectorAll('[style*="background-image"]');
  elementsWithBgImage.forEach(element => {
    if (!showImages) {
      (element as HTMLElement).style.backgroundImage = 'none';
    } else {
      // 检查是否有懒加载的背景图片
      const lazyAttributes = [
        'data-background', 'data-bg', 'data-background-image',
        'data-lazy-background', 'data-background-src'
      ];

      for (const attr of lazyAttributes) {
        const value = element.getAttribute(attr);
        if (value && element instanceof HTMLElement) {
          element.style.backgroundImage = `url(${value})`;
          break;
        }
      }
    }
  });

  // 处理图片占位符
  const placeholders = container.querySelectorAll('.image-placeholder');
  placeholders.forEach(placeholder => {
    const placeholderElement = placeholder as HTMLElement;
    placeholderElement.style.display = showImages ? 'flex' : 'none';
  });
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

    // 使用 GitHub 风格代码块提取器增强所有代码块
    console.log('开始增强代码块');
    await githubCodeExtractor.enhanceAllCodeBlocks(container, codeTheme);

    // 增强内联代码
    githubCodeExtractor.enhanceInlineCode(container);

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
      border-bottom: 1px solid var(--code-border-color);
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

async function applyStyles(settings: ReadingModeSettings) {
  const styleId = 'reading-mode-style';
  let style = document.getElementById(styleId);

  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }

  // 应用代码块样式
  const codeblockStyles = document.getElementById('reading-mode-codeblock-styles');
  if (codeblockStyles) {
    // 设置代码块主题
    const themeClass = settings.theme === 'dark' ? 'dark-theme' : 'light-theme';

    // 添加主题类到容器
    const container = document.getElementById('reading-mode-container');
    if (container) {
      container.classList.remove('dark-theme', 'light-theme');
      container.classList.add(themeClass);
    }

    // 设置代码字体大小变量
    codeblockStyles.textContent = `
      :root {
        --code-font-size: ${settings.codeFontSize}px;
      }

      /* 确保工具栏字体大小与代码内容一致 */
      .code-toolbar {
        font-size: var(--code-font-size, ${settings.codeFontSize}px);
      }

      /* 确保代码块主题颜色统一 */
      .code-toolbar, .line-numbers {
        border-color: var(--code-border);
      }

      /* 行号字体大小特别调整 */
      .line-number {
        font-size: ${Math.max(settings.codeFontSize - 2, 10)}px;
      }
    `;
  }

  // 应用列表样式
  const listStyles = document.getElementById('reading-mode-list-styles');
  if (listStyles) {
    // 设置列表样式
    listStyles.textContent = `
      /* 列表样式 */
      .enhanced-list {
        margin: 1.5em 0;
        padding-left: 2em;
        list-style-position: outside;
        font-size: ${settings.fontSize - 1}px;
        color: ${settings.theme === 'dark' ? '#adbac7' : '#24292f'};
      }

      .enhanced-list-item {
        margin: 0.75em 0;
        padding-left: 0.5em;
        position: relative;
        line-height: ${settings.lineHeight + 0.1};
      }

      /* 无序列表样式 */
      .enhanced-unordered-list {
        list-style: none;
      }

      .enhanced-unordered-list > .enhanced-list-item {
        padding-left: 1.75em;
        position: relative;
      }

      .enhanced-unordered-list > .enhanced-list-item::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0.65em;
        width: 8px;
        height: 8px;
        background-color: ${settings.theme === 'dark' ? '#539bf5' : '#0969da'};
        border-radius: 50%;
        transform: scale(0.8);
        transition: transform 0.2s ease, background-color 0.2s ease;
      }

      .enhanced-unordered-list > .enhanced-list-item:hover::before {
        transform: scale(1);
        background-color: ${settings.theme === 'dark' ? '#6cb6ff' : '#0550ae'};
      }

      /* 有序列表样式 */
      .enhanced-ordered-list {
        list-style: none;
        counter-reset: item;
      }

      .enhanced-ordered-list > .enhanced-list-item {
        counter-increment: item;
        padding-left: 0.5em;
      }

      .enhanced-ordered-list > .enhanced-list-item::before {
        content: counter(item) ".";
        position: absolute;
        left: -1.75em;
        top: 0;
        color: ${settings.theme === 'dark' ? '#539bf5' : '#0969da'};
        font-weight: 600;
        transition: color 0.2s ease;
      }

      .enhanced-ordered-list > .enhanced-list-item:hover::before {
        color: ${settings.theme === 'dark' ? '#6cb6ff' : '#0550ae'};
      }

      /* 嵌套列表样式 */
      .enhanced-list .enhanced-list {
        margin: 0.75em 0 0.75em 0.5em;
      }
    `;
  }

  const container = document.getElementById('reading-mode-container');

  // 处理媒体元素
  handleMediaElements(container, settings.showImages);

  // 处理代码块 - 初始化时需要完全处理
  await handleCodeBlocks(container, settings, true);

  // 使用工具模块中的函数更新 CSS 变量
  // 从 utils.ts 导入的 updateReadingModeStyles 函数
  import('./utils').then(({ updateReadingModeStyles }) => {
    updateReadingModeStyles(settings, isReadingMode);
  }).catch(error => {
    console.error('加载样式工具时发生错误:', error);
  });

  // 合并基础样式和代码主题样式
  style.textContent = `
    ${generateCodeThemeStyles(settings.codeTheme, settings)}

    /* 基础样式 */
    body {
      margin: 0;
      padding: 0;
      background-color: var(--reading-bg-color) !important;
      color: var(--reading-text-color);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: flex-start; /* 确保内容从顶部开始 */
      font-size: var(--reading-font-size) !important;
    }

    /* 阅读容器样式 */
    #reading-mode-container {
      box-sizing: border-box;
      width: var(--reading-page-width);
      padding: 2rem;
      margin: ${settings.showDirectory ? '0 0 0 250px' : '0 auto'};
      font-size: var(--reading-font-size) !important;
      line-height: var(--reading-line-height);
      letter-spacing: var(--reading-letter-spacing);
      text-align: ${settings.textAlign};
      font-family: var(--reading-font-family);
      background-color: var(--reading-content-bg-color) !important;
      color: var(--reading-text-color);
      transition: all 0.3s ease;
      box-shadow: var(--reading-content-shadow);
      border-radius: 8px;
    }

    /* 确保所有文本元素都使用正确的字体大小 */
    #reading-mode-container * {
      font-size: inherit;
    }

    /* 响应式布局 */
    @media screen and (max-width: ${settings.pageWidth + 250}px) {
      #reading-mode-toc {
        transform: translateX(-100%);
        transition: transform 0.3s ease;
      }

      #reading-mode-toc:hover {
        transform: translateX(0);
      }

      #reading-mode-container {
        width: min(${settings.pageWidth}px, 100vw - 4rem);
        margin: 0 auto !important; /* 强制居中，覆盖之前的设置 */
        padding: 2rem;
      }
    }

    @media screen and (max-width: 600px) {
      #reading-mode-container {
        width: calc(100vw - 2rem);
        margin: 0 auto;
        padding: 1rem;
      }
    }

    /* 文章标题样式 */
    #reading-mode-container h1:first-child {
      font-size: calc(var(--reading-font-size) * 1.8) !important;
      font-weight: 700;
      margin: 0 0 1em;
      line-height: 1.2;
      color: var(--reading-heading-color);
      letter-spacing: -0.02em;
    }

    /* 标题层级样式 */
    #reading-mode-container h2 {
      font-size: calc(var(--reading-font-size) * 1.5) !important;
      font-weight: 600;
      margin: 2em 0 0.8em;
      line-height: 1.3;
      color: var(--reading-heading-color);
      letter-spacing: -0.01em;
      border-bottom: 1px solid var(--reading-border-color);
      padding-bottom: 0.3em;
    }

    #reading-mode-container h3 {
      font-size: calc(var(--reading-font-size) * 1.3) !important;
      font-weight: 600;
      margin: 1.8em 0 0.7em;
      line-height: 1.3;
      color: var(--reading-heading-color);
    }

    #reading-mode-container h4 {
      font-size: calc(var(--reading-font-size) * 1.1) !important;
      font-weight: 600;
      margin: 1.5em 0 0.7em;
      line-height: 1.3;
      color: var(--reading-heading-color);
    }

    #reading-mode-container h5, #reading-mode-container h6 {
      font-size: calc(var(--reading-font-size) * 1.05) !important;
      font-weight: 600;
      margin: 1.2em 0 0.5em;
      line-height: 1.3;
      color: var(--reading-heading-color);
    }

    /* 段落样式 */
    #reading-mode-container p {
      margin: 0;
      margin-bottom: ${settings.paragraphSpacing}em;
      line-height: ${settings.lineSpacing};
      letter-spacing: ${settings.letterSpacing}px;
      opacity: 0.95;
      text-indent: ${settings.firstLineIndent ? '2em' : '0'};
      font-size: var(--reading-font-size) !important;
    }

    /* 覆盖特殊段落的缩进 */
    #reading-mode-container blockquote p,
    #reading-mode-container li p,
    #reading-mode-container .no-indent {
      text-indent: 0;
    }

    /* 列表样式优化 */
    #reading-mode-container ul,
    #reading-mode-container ol {
      margin: 1.2em 0;
      padding-left: 2.5em;
      line-height: ${settings.lineSpacing}; /* 与段落保持一致的行间距 */
      list-style-position: outside;
      font-size: var(--reading-font-size) !important;
    }

    #reading-mode-container li {
      margin: 0.6em 0;
      padding-left: 0.3em;
      position: relative;
      font-size: var(--reading-font-size) !important;
    }

    #reading-mode-container ul {
      list-style: none;
    }

    #reading-mode-container ul > li {
      padding-left: 1.5em;
    }

    #reading-mode-container ul > li::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0.6em;
      width: 6px;
      height: 6px;
      background-color: ${settings.theme === 'dark' ? '#60a5fa' : '#3b82f6'};
      border-radius: 50%;
      transform: scale(0.75);
    }

    #reading-mode-container ol {
      list-style: none;
      counter-reset: item;
    }

    #reading-mode-container ol > li {
      counter-increment: item;
    }

    #reading-mode-container ol > li::before {
      content: counter(item) ".";
      position: absolute;
      left: -1.5em;
      color: ${settings.theme === 'dark' ? '#60a5fa' : '#3b82f6'};
      font-weight: 600;
    }

    #reading-mode-container ul ul,
    #reading-mode-container ul ol,
    #reading-mode-container ol ul,
    #reading-mode-container ol ol {
      margin: 0.5em 0 0.5em 1em;
    }

    #reading-mode-container ol ol {
      counter-reset: subitem;
    }

    #reading-mode-container ol ol > li {
      counter-increment: subitem;
    }

    #reading-mode-container ol ol > li::before {
      content: counter(subitem, lower-alpha) ".";
      color: ${settings.theme === 'dark' ? '#93c5fd' : '#60a5fa'};
    }

    #reading-mode-container li > p {
      margin: 0.25em 0 !important;
      text-indent: 0 !important;
    }

    #reading-mode-container li::marker {
      color: ${settings.theme === 'dark' ? '#808080' : '#666666'};
    }

    /* 引用块样式优化 */
    #reading-mode-container blockquote {
      margin: 2em 0;
      padding: 1em 2em;
      border-left: 4px solid var(--reading-blockquote-border);
      background-color: var(--reading-code-bg-color);
      color: var(--reading-blockquote-color);
      font-style: italic;
      border-radius: 0.25em;
      transition: all 0.3s ease;
      font-size: var(--reading-font-size) !important;
    }

    #reading-mode-container blockquote p {
      margin: 0.5em 0;
      text-indent: 0;
    }

    /* 链接样式优化 */
    #reading-mode-container a {
      color: var(--reading-link-color);
      text-decoration: none;
      transition: all 0.2s ease;
      border-bottom: 1px solid transparent;
      font-size: inherit !important;
    }

    #reading-mode-container a:hover {
      color: ${settings.theme === 'dark' ? '#93c5fd' : '#2563eb'};
      border-bottom-color: currentColor;
    }

    /* 图片容器样式 */
    #reading-mode-container figure {
      margin: 2em 0;
      text-align: center;
    }

    #reading-mode-container figcaption {
      margin-top: 0.8em;
      font-size: 0.9em;
      color: ${settings.theme === 'dark' ? '#9ca3af' : '#6b7280'};
      font-style: italic;
    }

    /* 图片样式优化 */
    #reading-mode-container img {
      max-width: 100%;
      height: auto;
      margin: 0 auto;
      display: block;
      border-radius: 0.5em;
      box-shadow: ${settings.theme === 'dark' ?
      '0 4px 6px rgba(0, 0, 0, 0.3)' :
      '0 4px 6px rgba(0, 0, 0, 0.1)'};
      transition: all 0.3s ease;
    }

    /* 水平分割线样式 */
    #reading-mode-container hr {
      margin: 2.5em 0;
      border: none;
      height: 1px;
      background: ${settings.theme === 'dark' ? '#404040' : '#e5e7eb'};
      transition: background-color 0.3s ease;
    }

    /* 文字选择样式 */
    #reading-mode-container ::selection {
      background-color: ${settings.theme === 'dark' ? '#4a5d7c' : '#bfdbfe'};
      color: ${settings.theme === 'dark' ? '#ffffff' : '#1e40af'};
    }

    /* 滚动条样式 */
    #reading-mode-container::-webkit-scrollbar {
      width: 12px;
    }

    #reading-mode-container::-webkit-scrollbar-track {
      background: ${settings.theme === 'dark' ? '#2d2d2d' : '#f1f1f1'};
      border-radius: 6px;
    }

    #reading-mode-container::-webkit-scrollbar-thumb {
      background: ${settings.theme === 'dark' ? '#404040' : '#c1c1c1'};
      border-radius: 6px;
      border: 3px solid ${settings.theme === 'dark' ? '#2d2d2d' : '#f1f1f1'};
    }

    #reading-mode-container::-webkit-scrollbar-thumb:hover {
      background: ${settings.theme === 'dark' ? '#4a4a4a' : '#a1a1a1'};
    }

    /* 目录样式 */
    #reading-mode-toc {
      position: fixed;
      left: 0;
      top: 0;
      height: 100vh;
      width: 250px;
      overflow-y: auto;
      background-color: ${settings.theme === 'dark' ? '#2a2a2a' : '#ffffff'};
      box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
      padding: 20px;
      font-size: 14px;
      z-index: 1000;
      transition: all 0.3s ease;
      border-right: 1px solid ${settings.theme === 'dark' ? '#404040' : '#e5e7eb'};
    }

    #reading-mode-toc .toc-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid ${settings.theme === 'dark' ? '#404040' : '#eee'};
      color: ${settings.theme === 'dark' ? '#fff' : '#333'};
    }

    #reading-mode-toc .toc-empty {
      color: ${settings.theme === 'dark' ? '#888' : '#999'};
      font-style: italic;
      text-align: center;
      padding: 20px 0;
    }

    #reading-mode-toc::-webkit-scrollbar {
      width: 4px;
    }

    #reading-mode-toc::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 2px;
    }

    #reading-mode-toc ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    #reading-mode-toc li {
      margin: 4px 0;
      line-height: 1.4;
    }

    #reading-mode-toc a {
      color: ${settings.theme === 'dark' ? '#e0e0e0' : '#333'};
      text-decoration: none;
      display: block;
      padding: 4px 8px;
      border-radius: 4px;
      transition: all 0.2s ease;
      border-left: 2px solid transparent;
    }

    #reading-mode-toc a:hover {
      background-color: ${settings.theme === 'dark' ? '#3a3a3a' : '#f0f0f0'};
      border-left-color: ${settings.theme === 'dark' ? '#666' : '#ddd'};
    }

    #reading-mode-toc a.active {
      background-color: ${settings.theme === 'dark' ? '#3a3a3a' : '#f0f0f0'};
      border-left-color: ${settings.theme === 'dark' ? '#60a5fa' : '#3b82f6'};
      color: ${settings.theme === 'dark' ? '#60a5fa' : '#3b82f6'};
    }

    #reading-mode-toc .toc-level-1 { margin-left: 0; }
    #reading-mode-toc .toc-level-2 { margin-left: 12px; }
    #reading-mode-toc .toc-level-3 { margin-left: 24px; }
    #reading-mode-toc .toc-level-4 { margin-left: 36px; }
    #reading-mode-toc .toc-level-5 { margin-left: 48px; }
    #reading-mode-toc .toc-level-6 { margin-left: 60px; }

    /* 调整阅读容器的边距，为目录留出空间 */
    #reading-mode-container {
      margin-left: 250px !important;
      width: calc(${settings.pageWidth}px - 250px) !important;
    }

    @media screen and (max-width: ${settings.pageWidth + 250}px) {
      #reading-mode-toc {
        transform: translateX(-100%);
        transition: transform 0.3s ease;
      }

      #reading-mode-toc:hover {
        transform: translateX(0);
      }

      #reading-mode-container {
        margin-left: 0 !important;
        width: ${settings.pageWidth}px !important;
      }
    }

    body {
      margin: 0;
      padding: 20px;
      background-color: ${BACKGROUND_COLORS[settings.backgroundColor]};
    }

    #reading-mode-title {
      font-size: 2em;
      font-weight: bold;
      color: ${settings.theme === 'dark' ? '#ffffff' : '#333333'};
      margin: 1em 0 1.5em;
      padding: 0;
      text-align: center;
      font-family: ${FONT_FAMILIES[settings.fontFamily]};
    }

    .toc-article-title {
      font-size: 1.5em;
      font-weight: bold;
      color: ${settings.theme === 'dark' ? '#ffffff' : '#333333'};
      margin: 0 0 1em;
      padding: 0 1em;
      text-align: center;
      font-family: ${FONT_FAMILIES[settings.fontFamily]};
      border-bottom: 1px solid ${settings.theme === 'dark' ? '#666666' : '#dddddd'};
      padding-bottom: 0.5em;
    }

    .toc-title {
      font-size: 1.2em;
      font-weight: bold;
      color: ${settings.theme === 'dark' ? '#ffffff' : '#333333'};
      margin: 1em 0;
      padding: 0 1em;
      text-align: center;
      font-family: ${FONT_FAMILIES[settings.fontFamily]};
    }

    /* 段落间距样式 */
    #reading-mode-container p {
      margin-bottom: ${settings.paragraphSpacing}em;
    }

    /* 首行缩进样式 */
    #reading-mode-container p {
      text-indent: ${settings.firstLineIndent ? '2em' : '0'};
    }
  `;

  // 移除工具栏（如果存在）
  const toolbar = document.getElementById('reading-mode-toolbar');
  if (toolbar) {
    toolbar.remove();
  }
}

function createFloatingButton() {
  // 创建退出按钮
  const button = document.createElement('button');
  button.id = 'reading-mode-exit-button';
  button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6L6 18"></path>
      <path d="M6 6l12 12"></path>
    </svg>
    <span>退出阅读模式</span>
  `;
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    padding: 10px 20px;
    background-color: var(--reading-accent-color, #3b82f6);
    color: white;
    border: none;
    border-radius: 30px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    opacity: 0.85;
    display: flex;
    align-items: center;
    gap: 8px;
    backdrop-filter: blur(4px);
    animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both;
  `;

  // 添加动画样式
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translate(-50%, 20px);
      }
      to {
        opacity: 0.85;
        transform: translate(-50%, 0);
      }
    }
  `;
  document.head.appendChild(style);

  // 添加事件监听器
  button.addEventListener('mouseover', () => {
    button.style.opacity = '1';
    button.style.transform = 'translateX(-50%) scale(1.05)';
    button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
  });

  button.addEventListener('mouseout', () => {
    button.style.opacity = '0.85';
    button.style.transform = 'translateX(-50%) scale(1)';
    button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  });

  button.addEventListener('click', () => {
    // 添加退出动画
    document.getElementById('reading-mode-container')?.classList.add('exit-animation');

    // 延迟退出，以便显示动画
    setTimeout(() => {
      disableReadingMode();
    }, 300);
  });

  document.body.appendChild(button);
}

function removeFloatingButton() {
  const button = document.getElementById('reading-mode-exit-button');
  if (button) {
    button.remove();
  }
}

async function applyAutoSpacing() {
  const container = document.getElementById('reading-mode-container');
  if (!container) return;

  try {
    // 暂时禁用 pangu 自动间距功能
    // 后续可以重新实现或使用其他方法
    return true;
  } catch (error) {
    console.error('应用自动间距时发生错误:', error);
    return false;
  }
}

async function toggleReadingMode() {
  const settings = await fetchSettings();

  if (!isReadingMode) {
    // Save original content
    originalContent = document.body.innerHTML;

    let loadingToast: any; // Assuming Toast.info returns an object with a close method

    try {
      // Show loading toast
      loadingToast = Toast.info('正在准备阅读模式...', {
        duration: 0, // Indefinite duration
        showProgress: true
      });

      // Initialize extractor and worker manager if not already
      if (!defuddleExtractorInstance) {
        defuddleExtractorInstance = new DefuddleExtractor();
      }
      if (!markdownWorkerManager) {
        markdownWorkerManager = new MarkdownWorkerManager();
      }

      // 1. Extract content
      let extractedContent;
      try {
        extractedContent = await defuddleExtractorInstance.extract(document);
        console.log('内容提取完成');
        // Check if extraction was successful based on ExtractedContent interface (if applicable)
        if (!extractedContent || !extractedContent.content) { // Assuming extractedContent has a 'content' property
            throw new ContentExtractionError('内容提取失败: 未获取到有效内容', { url: window.location.href });
        }
      } catch (error: any) {
        // If it's already a ContentExtractionError, re-throw it.
        // Otherwise, wrap it in ContentExtractionError.
        if (error instanceof ContentExtractionError) {
             throw error;
        } else {
            throw new ContentExtractionError('内容提取过程中发生错误', { originalError: error, url: window.location.href });
        }
      }

      // 2. Convert to Markdown
      let markdown;
      try {
        markdown = await markdownWorkerManager.convertToMarkdown(extractedContent.content);
        console.log('Markdown 转换完成');
        if (!markdown) {
             throw new ReaderError('Markdown 转换失败: 转换结果为空', 'RENDER_FAILED', { htmlLength: extractedContent.content.length });
        }
      } catch (error: any) {
        // If it's already a ReaderError, re-throw it.
        // Otherwise, wrap it in a generic RenderError (since conversion is part of rendering pipeline)
        if (error instanceof ReaderError) {
            throw error;
        } else {
            throw new RenderError('Markdown 转换过程中发生错误', { originalError: error });
        }
      }

      // 3. Render Markdown
      let renderedHtml;
      try {
        renderedHtml = renderMarkdown(markdown);
        console.log('Markdown 渲染完成');
        if (!renderedHtml) {
             throw new RenderError('Markdown 渲染失败: 渲染结果为空', { markdownLength: markdown.length });
        }
      } catch (error: any) {
         if (error instanceof RenderError) {
            throw error;
        } else {
            throw new RenderError('Markdown 渲染过程中发生错误', { originalError: error });
        }
      }

      // 4. Create reading mode container
      const readingModeContainer = document.createElement("div");
      readingModeContainer.id = "reading-mode-container";
      readingModeContainer.className =
        settings.theme === "dark" ? "dark" : "light"; // Corrected: Removed extra backslashes
      readingModeContainer.innerHTML = renderedHtml;

      // 5. Apply styles
      try {
        await applyStyles(settings); // applyStyles is async, AWAIT IT
        console.log('样式应用完成');
      } catch (error: any) {
        handleError(error, '样式应用');
        // Continue execution even if styles fail, but log the error
      }

      // 6. Replace page content
      document.body.innerHTML = "";
      document.body.appendChild(readingModeContainer);

      // 7. Initialize toolbar
      // initToolbar(settings); // Removed: Function not defined
      // TODO: Initialize text selection toolbar (TextSelectionToolbar is imported but not initialized)
      console.log('TODO: 初始化文本选择工具栏');

      isReadingMode = true;

      // Close loading toast and show success toast
      if (loadingToast) loadingToast.close();
      Toast.success('阅读模式已启用');

    } catch (error: any) {
      // This catches errors re-thrown from specific steps or unexpected errors
      console.error("启用阅读模式时发生错误:", error);

      // Close loading toast
      if (loadingToast) loadingToast.close();

      // Handle the error using the centralized handler
      handleError(error, '启用阅读模式');

      // Disable reading mode to return to the original page
      // TODO: Implement graceful degradation instead of always disabling
      disableReadingMode();
    }
  } else {
    // Restore original content
    if (originalContent) {
      document.body.innerHTML = originalContent;
      originalContent = null;
    }

    // Clean up toolbar
    if (textSelectionToolbar) {
      textSelectionToolbar.destroy();
      textSelectionToolbar = null;
    }

    // Clean up worker and extractor
    if (markdownWorkerManager) {
      markdownWorkerManager.destroy();
      markdownWorkerManager = null;
    }
    defuddleExtractorInstance = null;

    isReadingMode = false;

    // Show exit toast
    Toast.info('已退出阅读模式');
  }
}

function disableReadingMode() {
  // Restore original content
  if (originalContent) {
    document.body.innerHTML = originalContent;
    originalContent = null;
  }

  // Clean up toolbar
  if (textSelectionToolbar) {
    textSelectionToolbar.destroy();
    textSelectionToolbar = null;
  }

  // Clean up worker and extractor
  if (markdownWorkerManager) {
    markdownWorkerManager.destroy();
    markdownWorkerManager = null;
  }
  defuddleExtractorInstance = null;

  isReadingMode = false;
}

// Listener for messages from other parts of the extension (e.g., popup)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('收到消息:', message.action);

    // Indicate that sendResponse will be called asynchronously
    let asyncResponse = false;

    if (message.action === 'TOGGLE_READING_MODE') {
        asyncResponse = true;
        toggleReadingMode()
            .then(() => {
                // Send success response with current state
                sendResponse({
                    success: true,
                    isReadingMode: isReadingMode, // Use the updated state
                    buttonText: isReadingMode ? '退出阅读模式' : '进入阅读模式'
                });
            })
            .catch((error: any) => {
                console.error('处理TOGGLE_READING_MODE消息时发生错误:', error);
                // Send error response with extracted error info
                sendResponse({
                    success: false,
                    error: {
                        message: error instanceof Error ? error.message : String(error),
                        stack: error instanceof Error ? error.stack : undefined,
                        // Include specific error code if available
                        code: error instanceof ReaderError ? error.code : 'UNEXPECTED_STATE',
                    },
                });
            });
    } else if (message.action === 'GET_READING_MODE_STATE') {
        // This action is synchronous, no need for asyncResponse = true
        console.log('返回当前阅读模式状态:', isReadingMode);
        sendResponse({
            isReadingMode: isReadingMode,
            buttonText: isReadingMode ? '退出阅读模式' : '进入阅读模式'
        });
    } else {
        // If no action matches, indicate failure or handle appropriately
        console.warn('收到未知消息动作:', message.action);
        sendResponse({ success: false, error: '未知消息动作' });
    }

    // Return true to indicate that sendResponse will be called asynchronously
    // This is only needed for the async case (TOGGLE_READING_MODE)
    return asyncResponse;
});

// ... rest of content.ts ...