/**
 * 阅读模式功能模块
 * 负责处理阅读模式的切换、样式应用和交互
 */

import { StorageKeys, getStorage, FONT_FAMILIES, BACKGROUND_COLORS, CODE_THEMES } from '../../storage/storage';
import { DEFAULT_SETTINGS } from '../../constants/defaultSettings';
import { ReaderError, ErrorCode, ContentExtractionError } from '../../types/errors';
import { logger } from '../../utils/logManager';
import { TextSelectionToolbar } from '../components/TextSelectionToolbar';
import { MarkdownWorkerManager } from '../workers/markdownWorkerManager';
import { ExtractorFactory } from '../extractors/ExtractorFactory';
import { ContentExtractor } from '../extractors/contentExtractor';
import { ReadabilityExtractor } from '../extractors/ReadabilityExtractor';
import { DOMUtils } from '../../utils/dom';
import { RenderError } from '../../types/errors';

// Toast通知组件（简化版，实际项目中可能需要导入或实现）
const Toast = {
  info: (message: string, options?: any) => {
    console.log(`[INFO] ${message}`);
    return { close: () => {} };
  },
  success: (message: string, options?: any) => {
    console.log(`[SUCCESS] ${message}`);
  },
  error: (message: string, options?: any) => {
    console.log(`[ERROR] ${message}`);
  }
};

// 单例MarkdownWorkerManager
let markdownWorkerManager: MarkdownWorkerManager | null = null;

// 自定义渲染错误类型
class RenderError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'RenderError';
  }
}

// 阅读模式状态
let isReaderMode = false;
let originalScrollY = 0;
let originalContent: Node[] = [];
let extractedContent: string = '';

// 扩展ErrorCode类型
type ExtendedErrorCode = ErrorCode | 'RENDER_FAILED' | 'NETWORK_REQUEST_FAILED';

// 用户友好的错误消息
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

// 阅读模式设置接口
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

/**
 * 集中式错误处理函数
 */
function handleError(error: unknown, context: string): void {
  // 确保错误是ReaderError类型，或将其包装为ReaderError
  const readerError = error instanceof ReaderError ? error : new ReaderError(
    error instanceof Error ? error.message : String(error),
    'UNEXPECTED_STATE', // 未知错误的默认代码
    { context, originalError: error }
  );

  console.error(`[阅读模式错误] ${context}:`, readerError); // 输出到控制台
  logger.logError(readerError); // 记录到IndexedDB

  // 根据错误代码显示用户友好的提示
  const message = userFriendlyMessages[readerError.code] || userFriendlyMessages.UNEXPECTED_STATE;
  Toast.error(message);
}

/**
 * 获取阅读模式设置
 */
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

/**
 * 处理代码块
 */
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
    // 获取所有代码块
    const codeBlocks = container.querySelectorAll('pre code');
    if (codeBlocks.length > 0) {
      console.log(`发现${codeBlocks.length}个代码块需要高亮处理`);
      
              // 加载highlight.js的CDN脚本
      if (!document.getElementById('highlight-js-cdn')) {
        const script = document.createElement('script');
        script.id = 'highlight-js-cdn';
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js';
        script.async = true;
        
        // 添加CSS
        const style = document.createElement('link');
        style.rel = 'stylesheet';
        style.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github.min.css';
        
        document.head.appendChild(style);
        
        script.onload = () => {
          console.log('highlight.js加载成功');
          // 应用高亮
          if (window.hljs) {
            codeBlocks.forEach(block => {
              window.hljs.highlightElement(block);
            });
          }
        };
        
        document.head.appendChild(script);
      } else if (window.hljs) {
        // 如果已加载，直接应用高亮
        codeBlocks.forEach(block => {
          window.hljs.highlightElement(block);
        });
      }
      if (!document.getElementById('highlight-js-cdn')) {
        const script = document.createElement('script');
        script.id = 'highlight-js-cdn';
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js';
        script.onload = () => {
          // 脚本加载完成后高亮代码块
          if (window.hljs) {
            codeBlocks.forEach(block => {
              window.hljs.highlightElement(block);
            });
            console.log('代码块高亮处理完成');
          }
        };
        document.head.appendChild(script);
        
        // 加载对应主题的CSS
        const linkCSS = document.createElement('link');
        linkCSS.rel = 'stylesheet';
        linkCSS.href = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/${codeTheme}.min.css`;
        document.head.appendChild(linkCSS);
      } else {
        // 如果脚本已加载，直接应用高亮
        if (window.hljs) {
          codeBlocks.forEach(block => {
            window.hljs.highlightElement(block);
          });
          console.log('代码块高亮处理完成');
        }
      }
    }
  } catch (error) {
    console.error('处理代码块时发生错误:', error);
  }
}

/**
 * 应用阅读模式样式
 */
async function applyStyles(settings: ReadingModeSettings) {
  // 移除旧样式
  const oldStyles = document.getElementById('reading-mode-dynamic-styles');
  if (oldStyles) {
    oldStyles.remove();
  }

  // 创建新样式
  const readerStyles = document.createElement('style');
  readerStyles.id = 'reading-mode-dynamic-styles';
  
  // 应用字体
  const fontFamily = FONT_FAMILIES[settings.fontFamily] || FONT_FAMILIES.system;
  
  // 应用背景色
  const backgroundColor = BACKGROUND_COLORS[settings.backgroundColor] || BACKGROUND_COLORS.white;
  const darkBackgroundColor = BACKGROUND_COLORS.dark;
  
  // 设置CSS变量
  readerStyles.textContent = `
    :root {
      --reader-font-size: ${settings.fontSize}px;
      --reader-line-height: ${settings.lineHeight};
      --reader-paragraph-spacing: ${settings.paragraphSpacing}px;
      --reader-font-family: ${fontFamily};
      --reader-background-color: ${backgroundColor};
      --reader-dark-background-color: ${darkBackgroundColor};
      --reader-text-color: #333;
      --reader-dark-text-color: #eee;
    }
    
    #reading-mode-container {
      font-family: var(--reader-font-family);
      font-size: var(--reader-font-size);
      line-height: var(--reader-line-height);
      background-color: var(--reader-background-color);
      color: var(--reader-text-color);
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
      text-align: ${settings.textAlign};
    }
    
    .dark #reading-mode-container {
      background-color: var(--reader-dark-background-color);
      color: var(--reader-dark-text-color);
    }
    
    #reading-mode-container p {
      margin-bottom: var(--reader-paragraph-spacing);
    }
    
    #reading-mode-container img {
      max-width: 100%;
      height: auto;
      display: ${settings.showImages ? 'block' : 'none'};
      margin: 1rem auto;
    }
    
    .reader-content-container {
      color: var(--reader-text-color);
    }
    
    .dark .reader-content-container {
      color: var(--reader-dark-text-color);
    }
  `;
  
  document.head.appendChild(readerStyles);
}

/**
 * 创建浮动按钮
 */
function createFloatingButton() {
  // 检查是否已存在浮动按钮
  if (document.getElementById('reading-mode-floating-button')) {
    return;
  }
  
  const button = document.createElement('button');
  button.id = 'reading-mode-floating-button';
  button.textContent = '阅读模式';
  button.style.position = 'fixed';
  button.style.bottom = '20px';
  button.style.right = '20px';
  button.style.zIndex = '9999';
  button.style.padding = '8px 12px';
  button.style.backgroundColor = '#4285f4';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.cursor = 'pointer';
  button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  
  button.addEventListener('click', () => {
    toggleReadingMode();
  });
  
  document.body.appendChild(button);
}

/**
 * 移除浮动按钮
 */
function removeFloatingButton() {
  const button = document.getElementById('reading-mode-floating-button');
  if (button) {
    button.remove();
  }
}

function getMarkdownWorkerManager(): MarkdownWorkerManager {
  if (!markdownWorkerManager) {
    markdownWorkerManager = new MarkdownWorkerManager();
  }
  return markdownWorkerManager;
}

/**
 * 切换阅读模式
 * @returns 切换后的阅读模式状态
 */
export async function toggleReadingMode(): Promise<boolean> {
  try {
    if (isReaderMode) {
      // 禁用阅读模式
      disableReadingMode();
      isReaderMode = false;
      console.log('返回当前阅读模式状态:', isReaderMode);
      return isReaderMode;
    } else {
      // 启用阅读模式
      isReaderMode = await enableReadingMode();
      console.log('返回当前阅读模式状态:', isReaderMode);
      return isReaderMode;
    }
  } catch (error) {
    // 处理错误
    isReaderMode = false;
    console.error('切换阅读模式时发生错误:', error);
    
    // 记录详细错误信息以帮助调试
    if (error instanceof RenderError) {
      console.error('[阅读模式错误] 启用阅读模式:', error);
    } else if (error instanceof Error) {
      console.error('[阅读模式错误] 未捕获错误:', error.message, error.stack);
    }
    
    // 确保在发生错误时恢复到原始状态
    try {
      if (originalContent.length > 0) {
        disableReadingMode();
      }
    } catch (cleanupError) {
      console.error('清理阅读模式失败:', cleanupError);
    }
    
    // 返回当前状态（应该是false）
    return isReaderMode;
  }
}

/**
 * 启用阅读模式
 */
async function enableReadingMode(): Promise<boolean> {
  try {
    // 保存当前滚动位置和内容
    originalScrollY = window.scrollY;
    originalContent = Array.from(document.body.childNodes);
    
    // 提取内容
    const extractor = new ReadabilityExtractor();
    const extractionResult = await extractor.extract(document);
    console.log('内容提取完成');
    
    if (!extractionResult || !extractionResult.content) {
      throw new ReaderError('内容提取失败', 'EXTRACTION_FAILED');
    }
    
    extractedContent = extractionResult.content;
    
    // 获取MarkdownWorkerManager实例
    const workerManager = getMarkdownWorkerManager();
    
    try {
      // 转换为Markdown（异步）
      const markdown = await workerManager.convertToMarkdown(extractedContent);
      
      // 渲染阅读模式
      renderReadingMode(markdown, extractionResult.title || document.title);
      return true;
    } catch (markdownError) {
      console.error('Markdown转换失败:', markdownError);
      
      // 如果Markdown转换失败，尝试直接使用HTML内容作为降级方案
      console.log('尝试使用直接HTML渲染作为降级方案');
      renderReadingModeWithHtml(extractedContent, extractionResult.title || document.title);
      return true;
    }
  } catch (error) {
    // 转换为RenderError
    if (error instanceof Error) {
      throw new RenderError('Markdown 转换过程中发生错误', { cause: error });
    } else {
      throw new RenderError('启用阅读模式时发生未知错误');
    }
  }
}

/**
 * 禁用阅读模式
 */
function disableReadingMode(): void {
  // 清空body
  document.body.innerHTML = '';
  
  // 恢复原始内容
  originalContent.forEach(node => {
    document.body.appendChild(node.cloneNode(true));
  });
  
  // 恢复滚动位置
  window.scrollTo(0, originalScrollY);
  
  // 重置变量
  originalContent = [];
  extractedContent = '';
}

/**
 * 渲染阅读模式（使用Markdown）
 */
function renderReadingMode(markdown: string, title: string): void {
  // 创建阅读视图容器
  const container = document.createElement('div');
  container.className = 'reader-view-container';
  
  // 添加标题
  const titleElement = document.createElement('h1');
  titleElement.textContent = title;
  titleElement.className = 'reader-view-title';
  container.appendChild(titleElement);
  
  // 渲染Markdown内容
  const contentElement = document.createElement('div');
  contentElement.className = 'reader-view-content';
  
  // 此处假设使用marked或其他Markdown渲染库
  // 实际项目中，可以引入marked库
  contentElement.innerHTML = renderMarkdown(markdown);
  
  container.appendChild(contentElement);
  
  // 清空body并添加阅读视图
  document.body.innerHTML = '';
  document.body.appendChild(container);
  
  // 添加阅读模式样式
  addReadingModeStyles();
  
  // 滚动到顶部
  window.scrollTo(0, 0);
}

/**
 * 降级方案：直接使用HTML渲染阅读模式
 */
function renderReadingModeWithHtml(html: string, title: string): void {
  // 创建阅读视图容器
  const container = document.createElement('div');
  container.className = 'reader-view-container';
  
  // 添加标题
  const titleElement = document.createElement('h1');
  titleElement.textContent = title;
  titleElement.className = 'reader-view-title';
  container.appendChild(titleElement);
  
  // 渲染HTML内容
  const contentElement = document.createElement('div');
  contentElement.className = 'reader-view-content';
  
  // 直接使用HTML内容
  contentElement.innerHTML = html;
  
  container.appendChild(contentElement);
  
  // 清空body并添加阅读视图
  document.body.innerHTML = '';
  document.body.appendChild(container);
  
  // 添加阅读模式样式
  addReadingModeStyles();
  
  // 滚动到顶部
  window.scrollTo(0, 0);
}

/**
 * 添加阅读模式样式
 */
function addReadingModeStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    body {
      margin: 0;
      padding: 0;
      background-color: #f8f9fa;
      color: #333;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
    }
    
    .reader-view-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #fff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .reader-view-title {
      font-size: 28px;
      margin-top: 20px;
      margin-bottom: 20px;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    }
    
    .reader-view-content {
      font-size: 18px;
    }
    
    .reader-view-content p {
      margin-bottom: 16px;
    }
    
    .reader-view-content img {
      max-width: 100%;
      height: auto;
      margin: 20px 0;
    }
    
    .reader-view-content pre {
      background-color: #f5f7f9;
      border-radius: 4px;
      padding: 16px;
      overflow-x: auto;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 14px;
      line-height: 1.45;
    }
    
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #1a1a1a;
        color: #e0e0e0;
      }
      
      .reader-view-container {
        background-color: #262626;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }
      
      .reader-view-title {
        border-bottom-color: #333;
      }
      
      .reader-view-content pre {
        background-color: #333;
      }
    }
  `;
  
  document.head.appendChild(style);
}

/**
 * 简单的Markdown渲染函数
 * 实际项目中应该使用成熟的Markdown渲染库
 */
function renderMarkdown(markdown: string): string {
  // 非常简单的Markdown转换，仅作演示
  // 在实际项目中，应该使用marked、markdown-it等库
  
  // 转义HTML
  const escaped = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // 处理标题
  let html = escaped
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  
  // 处理段落
  html = html.replace(/^(?!<h[1-6]>)(.+)$/gm, '<p>$1</p>');
  
  // 处理代码块
  html = html.replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>');
  
  // 处理行内代码
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // 处理粗体
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // 处理斜体
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // 处理链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // 处理图片
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  
  return html;
}

// 监听存储变化
chrome.storage.onChanged.addListener(async (changes) => {
  // 如果不在阅读模式下，不应用样式
  if (!isReaderMode) return;

  const container = document.getElementById('reading-mode-container');
  if (!container) return;

  const settings = await fetchSettings();
  await applyStyles(settings);
}); 