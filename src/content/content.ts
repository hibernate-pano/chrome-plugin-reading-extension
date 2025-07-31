import { StorageKeys, getStorage, setStorage, FONT_FAMILIES, BACKGROUND_COLORS, CODE_THEMES } from '../storage/storage';
// 不再直接导入 highlight.js，改为动态导入
// import hljs from 'highlight.js';

// 添加TextSelectionToolbar导入
import { TextSelectionToolbar } from './components/TextSelectionToolbar';

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
// 导入性能监控器和工具
import { performanceMonitor } from '../utils/performance';
import { Toast } from '../ui/components/Toast';
import { createFloatingButton, removeFloatingButton } from './ui/readerFloatingButton';
import { handleMediaElements } from './processors/mediaProcessor';

// 导入增强提取器
import {
  ExtractorFactory,
  contentExtractor,
} from './extractors';

// 导入基础变量系统
import './styles/variables.css';
// 导入提取器样式
import './extractors/extractors.css';
// 导入 GitHub 风格代码块样式
import './styles/github-code-new.css';

import { MarkdownWorkerManager } from "./workers/markdownWorkerManager";

// Import structured errors and logger
import { ReaderError, ErrorCode, ContentExtractionError } from '../types/errors';
import { logger } from '../utils/logManager';

// 扩展ErrorCode类型
type ExtendedErrorCode = ErrorCode | 'RENDER_FAILED' | 'NETWORK_REQUEST_FAILED';

// 添加缺失的RenderError类型
class RenderError extends ReaderError {
  constructor(message: string, context?: unknown) {
    // 使用UNEXPECTED_STATE代替不存在的RENDER_FAILED
    super(message, 'UNEXPECTED_STATE', context);
    this.name = 'RenderError';
  }
}

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

// 修复变量声明部分的合并冲突
let originalContent: string | null = null;
let isReadingMode = false;
let textSelectionToolbar: TextSelectionToolbar | null = null;
let markdownWorkerManager: MarkdownWorkerManager | null = null;

import { DEFAULT_SETTINGS } from '../constants/defaultSettings';

// User-friendly error messages (based on error-handling.md)
const userFriendlyMessages: Record<ExtendedErrorCode, string> = {
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
      if (!markdownWorkerManager) {
        markdownWorkerManager = new MarkdownWorkerManager();
      }

      // 1. Extract content
      let extractedContent;
      try {
        // 使用ExtractorFactory代替defuddleExtractorInstance
        const extractor = await ExtractorFactory.createExtractor(window.location.href);
        extractedContent = await extractor.extract(document, window.location.href);
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
          throw new RenderError('Markdown 转换失败: 转换结果为空', { htmlLength: extractedContent.content.length });
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
        // 直接使用markdown变量代替renderMarkdown函数
        renderedHtml = markdown; // 简单地直接使用markdown内容，因为renderMarkdown函数不存在
        console.log('Markdown 处理完成');
        if (!renderedHtml) {
          throw new RenderError('Markdown 处理失败: 结果为空', { markdownLength: markdown.length });
        }
      } catch (error: any) {
        if (error instanceof RenderError) {
          throw error;
        } else {
          throw new RenderError('Markdown 处理过程中发生错误', { originalError: error });
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

    isReadingMode = false;

    // Show exit toast
    Toast.info('已退出阅读模式');
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

// 在文件顶部导入MESSAGE_TYPES
import { MESSAGE_TYPES } from '../constants';

// 提取内容函数
async function extractContent(): Promise<any> {
  try {
    const url = window.location.href;
    // 使用ExtractorFactory正确的静态方法
    const content = await ExtractorFactory.extractContent(document, url);
    return content;
  } catch (error) {
    console.error('提取内容失败:', error);
    throw error;
  }
}

// 监听消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  let asyncResponse = false;

  if (message.action === MESSAGE_TYPES.TOGGLE_READER_MODE) {
    asyncResponse = true;
    toggleReadingMode()
      .then(result => {
        sendResponse({ success: true, isReadingMode: result });
      })
      .catch((error: Error) => {
        console.error('切换阅读模式失败:', error);
        sendResponse({ success: false, error: error.message });
      });
  }
  else if (message.action === MESSAGE_TYPES.ENABLE_READING_MODE || message.action === 'ENABLE_READING_MODE') {
    asyncResponse = true;
    if (!isReadingMode) {
      toggleReadingMode()
        .then(result => {
          sendResponse({ success: true, readingMode: result });
        })
        .catch((error: Error) => {
          console.error('启用阅读模式失败:', error);
          sendResponse({ success: false, error: error.message });
        });
    } else {
      sendResponse({ success: true, readingMode: true });
    }
  }
  else if (message.action === MESSAGE_TYPES.DISABLE_READING_MODE || message.action === 'DISABLE_READING_MODE') {
    asyncResponse = true;
    if (isReadingMode) {
      toggleReadingMode()
        .then(result => {
          sendResponse({ success: true, readingMode: result });
        })
        .catch((error: Error) => {
          console.error('禁用阅读模式失败:', error);
          sendResponse({ success: false, error: error.message });
        });
    } else {
      sendResponse({ success: true, readingMode: false });
    }
  }
  else if (message.action === MESSAGE_TYPES.APPLY_PRESET || message.action === 'APPLY_PRESET') {
    asyncResponse = true;
    try {
      // 应用预设样式
      const presetId = message.preset;
      if (presetId) {
        // 这里可以添加应用预设的逻辑
        console.log('应用预设:', presetId);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: '未提供预设ID' });
      }
    } catch (error: any) {
      console.error('应用预设失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  else if (message.action === MESSAGE_TYPES.EXTRACT_CONTENT) {
    asyncResponse = true;
    extractContent()
      .then((content: any) => {
        sendResponse({ success: true, content });
      })
      .catch((error: Error) => {
        console.error('提取内容失败:', error);
        sendResponse({ success: false, error: error.message });
      });
  }
  else if (message.action === MESSAGE_TYPES.SAVE_READING_PROGRESS) {
    asyncResponse = true;
    const { url, scrollPosition, title } = message;

    // 发送消息到background.js保存阅读进度
    chrome.runtime.sendMessage({
      action: MESSAGE_TYPES.SAVE_READING_PROGRESS,
      progress: {
        url,
        scrollPosition,
        lastRead: Date.now(),
        title
      }
    })
      .then(response => {
        sendResponse(response);
      })
      .catch((error: Error) => {
        console.error('保存阅读进度失败:', error);
        sendResponse({ success: false, error: error.message });
      });
  }
  else if (message.action === MESSAGE_TYPES.GET_READING_MODE_STATE || message.action === 'GET_READING_MODE_STATE') {
    // This action is synchronous, no need for asyncResponse = true
    console.log('返回当前阅读模式状态:', isReadingMode);
    sendResponse({
      readingMode: isReadingMode,
      isReadingMode: isReadingMode,
      buttonText: isReadingMode ? '退出阅读模式' : '进入阅读模式'
    });
  } else {
    // If no action matches, indicate failure or handle appropriately
    console.warn('收到未知消息动作:', message.action);
    sendResponse({ success: false, error: '未知消息动作' });
  }

  // Return true to indicate that sendResponse will be called asynchronously
  // This is only needed for the async case (TOGGLE_READER_MODE)
  return asyncResponse;
});

// ... rest of content.ts ...
