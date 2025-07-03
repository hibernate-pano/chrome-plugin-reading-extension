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

// 状态变量
let originalContent: string | null = null;
let isReadingMode = false;
let textSelectionToolbar: TextSelectionToolbar | null = null;
let markdownWorkerManager: MarkdownWorkerManager | null = null;

// 扩展ErrorCode类型
type ExtendedErrorCode = ErrorCode | 'RENDER_FAILED' | 'NETWORK_REQUEST_FAILED';

// 添加RenderError类型
class RenderError extends ReaderError {
  constructor(message: string, context?: unknown) {
    super(message, 'UNEXPECTED_STATE', context);
    this.name = 'RenderError';
  }
}

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

  // 需要完全重新处理代码块，可以动态导入highlight.js
  console.log('开始处理代码块');
  try {
    // 动态导入highlight.js
    const hljs = await import('highlight.js');
    console.log('highlight.js加载成功');
    
    // 处理代码块的逻辑...
    // 这里简化处理，实际项目中需要完整实现
    
    console.log('代码块处理完成');
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

/**
 * 切换阅读模式
 * 这是主要的公共API，用于启用或禁用阅读模式
 */
export async function toggleReadingMode(): Promise<boolean> {
  const settings = await fetchSettings();

  if (!isReadingMode) {
    // 保存原始内容
    originalContent = document.body.innerHTML;

    let loadingToast: any; // 假设Toast.info返回一个带有close方法的对象

    try {
      // 显示加载提示
      loadingToast = Toast.info('正在准备阅读模式...', {
        duration: 0, // 无限期持续
        showProgress: true
      });

      // 初始化提取器和worker管理器（如果尚未初始化）
      if (!markdownWorkerManager) {
        markdownWorkerManager = new MarkdownWorkerManager();
      }

      // 1. 提取内容
      let extractedContent;
      try {
        // 使用ExtractorFactory创建提取器
        const extractor = await ExtractorFactory.createExtractor(window.location.href);
        extractedContent = await extractor.extract(document, window.location.href);
        console.log('内容提取完成');
        
        // 检查提取是否成功
        if (!extractedContent || !extractedContent.content) {
          throw new ContentExtractionError('内容提取失败: 未获取到有效内容', { url: window.location.href });
        }
      } catch (error: any) {
        // 如果已经是ContentExtractionError，直接重新抛出
        if (error instanceof ContentExtractionError) {
          throw error;
        } else {
          throw new ContentExtractionError('内容提取过程中发生错误', { originalError: error, url: window.location.href });
        }
      }

      // 2. 转换为Markdown
      let markdown;
      try {
        markdown = await markdownWorkerManager.convertToMarkdown(extractedContent.content);
        console.log('Markdown 转换完成');
        
        if (!markdown) {
          throw new RenderError('Markdown 转换失败: 转换结果为空', { htmlLength: extractedContent.content.length });
        }
      } catch (error: any) {
        // 如果已经是ReaderError，直接重新抛出
        if (error instanceof ReaderError) {
          throw error;
        } else {
          throw new RenderError('Markdown 转换过程中发生错误', { originalError: error });
        }
      }

      // 3. 渲染Markdown
      let renderedHtml;
      try {
        // 直接使用markdown变量
        renderedHtml = markdown;
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

      // 4. 创建阅读模式容器
      const readingModeContainer = document.createElement("div");
      readingModeContainer.id = "reading-mode-container";
      readingModeContainer.className = settings.theme === "dark" ? "dark" : "light";
      readingModeContainer.innerHTML = renderedHtml;

      // 5. 应用样式
      try {
        await applyStyles(settings);
        console.log('样式应用完成');
      } catch (error: any) {
        handleError(error, '样式应用');
        // 即使样式失败也继续执行，但记录错误
      }

      // 6. 替换页面内容
      document.body.innerHTML = "";
      document.body.appendChild(readingModeContainer);

      // 7. 初始化工具栏
      console.log('初始化文本选择工具栏');
      textSelectionToolbar = new TextSelectionToolbar();
      textSelectionToolbar.init();

      isReadingMode = true;

      // 关闭加载提示并显示成功提示
      if (loadingToast) loadingToast.close();
      Toast.success('阅读模式已启用');

      return true;
    } catch (error: any) {
      // 捕获从特定步骤重新抛出的错误或意外错误
      console.error("启用阅读模式时发生错误:", error);

      // 关闭加载提示
      if (loadingToast) loadingToast.close();

      // 使用集中式处理器处理错误
      handleError(error, '启用阅读模式');

      // 禁用阅读模式以返回原始页面
      disableReadingMode();
      
      return false;
    }
  } else {
    // 恢复原始内容
    disableReadingMode();
    return false;
  }
}

/**
 * 禁用阅读模式
 */
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

  // 恢复原始溢出状态
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';

  // 清理工具栏
  if (textSelectionToolbar) {
    textSelectionToolbar.destroy();
    textSelectionToolbar = null;
  }

  // 清理worker和提取器
  if (markdownWorkerManager) {
    markdownWorkerManager.destroy();
    markdownWorkerManager = null;
  }

  isReadingMode = false;
  console.log('阅读模式已关闭');
  
  // 显示退出提示
  Toast.info('已退出阅读模式');
}

// 监听存储变化
chrome.storage.onChanged.addListener(async (changes) => {
  // 如果不在阅读模式下，不应用样式
  if (!isReadingMode) return;

  const container = document.getElementById('reading-mode-container');
  if (!container) return;

  const settings = await fetchSettings();
  await applyStyles(settings);
}); 