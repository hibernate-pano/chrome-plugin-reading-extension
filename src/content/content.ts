import { Readability } from '@mozilla/readability';
import { StorageKeys, getStorage } from '../storage/storage';

interface ReadingModeSettings {
  theme: 'light' | 'dark';
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  pageWidth: number;
  textAlign: 'left' | 'center' | 'right';
  firstLineIndent: boolean;
  showImages: boolean;
}

let originalContent: string | null = null;
let isReadingMode = false;

async function getSettings(): Promise<ReadingModeSettings> {
  return {
    theme: await getStorage<'light' | 'dark'>(StorageKeys.THEME) ?? 'light',
    fontSize: await getStorage<number>(StorageKeys.FONT_SIZE) ?? 16,
    lineHeight: await getStorage<number>(StorageKeys.LINE_HEIGHT) ?? 1.5,
    letterSpacing: await getStorage<number>(StorageKeys.LETTER_SPACING) ?? 0,
    pageWidth: await getStorage<number>(StorageKeys.PAGE_WIDTH) ?? 800,
    textAlign: await getStorage<'left' | 'center' | 'right'>(StorageKeys.TEXT_ALIGN) ?? 'left',
    firstLineIndent: await getStorage<boolean>(StorageKeys.FIRST_LINE_INDENT) ?? true,
    showImages: await getStorage<boolean>(StorageKeys.SHOW_IMAGES) ?? true,
  };
}

function applyStyles(settings: ReadingModeSettings) {
  const style = document.createElement('style');
  style.textContent = `
    body {
      margin: 0;
      padding: 20px;
      background-color: ${settings.theme === 'light' ? '#ffffff' : '#222222'};
      color: ${settings.theme === 'light' ? '#000000' : '#eeeeee'};
    }
    #reading-mode-container {
      max-width: ${settings.pageWidth}px;
      margin: 0 auto;
      font-size: ${settings.fontSize}px;
      line-height: ${settings.lineHeight};
      letter-spacing: ${settings.letterSpacing}px;
      text-align: ${settings.textAlign};
      font-family: system-ui, -apple-system, sans-serif;
    }
    #reading-mode-container p {
      margin: 1em 0;
      ${settings.firstLineIndent ? 'text-indent: 2em;' : ''}
    }
    #reading-mode-container img {
      display: ${settings.showImages ? 'block' : 'none'};
      max-width: 100%;
      height: auto;
      margin: 1em auto;
    }
  `;
  document.head.appendChild(style);
}

async function enableReadingMode() {
  if (!document.body) return;
  
  // 保存原始内容
  if (!originalContent) {
    originalContent = document.body.innerHTML;
  }

  try {
    const article = new Readability(document.cloneNode(true) as Document).parse();
    if (!article) {
      console.error('无法解析页面内容');
      return;
    }

    const settings = await getSettings();
    
    // 创建阅读模式容器
    const container = document.createElement('div');
    container.id = 'reading-mode-container';
    container.innerHTML = article.content;

    // 清空页面并添加阅读模式内容
    document.body.innerHTML = '';
    document.body.appendChild(container);

    // 应用样式
    applyStyles(settings);
    isReadingMode = true;

  } catch (error) {
    console.error('启用阅读模式时发生错误:', error);
  }
}

function disableReadingMode() {
  if (!originalContent) return;
  
  document.body.innerHTML = originalContent;
  const style = document.querySelector('style');
  if (style) {
    style.remove();
  }
  isReadingMode = false;
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'TOGGLE_READING_MODE') {
    try {
      if (isReadingMode) {
        disableReadingMode();
      } else {
        enableReadingMode();
      }
      sendResponse({ success: true, isReadingMode });
    } catch (error) {
      console.error('处理消息时发生错误:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      sendResponse({ success: false, error: errorMessage });
    }
  }
  return true; // 保持消息通道开启
}); 