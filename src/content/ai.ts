import { StorageKeys, getStorage } from '../storage/storage';
import { marked } from 'marked';
import { formatWithAI } from '../api/ai';

let originalContent: string | null = null;
let isAIMode = false;

interface AIModeSettings {
  theme: 'light' | 'dark';
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  pageWidth: number;
  showImages: boolean;
}

async function fetchAISettings(): Promise<AIModeSettings> {
  return {
    theme: await getStorage<'light' | 'dark'>(StorageKeys.THEME) ?? 'light',
    fontSize: await getStorage<number>(StorageKeys.FONT_SIZE) ?? 16,
    lineHeight: await getStorage<number>(StorageKeys.LINE_HEIGHT) ?? 1.5,
    letterSpacing: await getStorage<number>(StorageKeys.LETTER_SPACING) ?? 0,
    pageWidth: await getStorage<number>(StorageKeys.PAGE_WIDTH) ?? 800,
    showImages: await getStorage<boolean>(StorageKeys.SHOW_IMAGES) ?? true,
  };
}

function applyAIStyles(settings: AIModeSettings) {
  const styleId = 'ai-mode-style';
  let style = document.getElementById(styleId);

  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }

  style.textContent = `
    body {
      margin: 0;
      padding: 0;
      background-color: ${settings.theme === 'dark' ? '#1a1a1a' : '#ffffff'};
      color: ${settings.theme === 'dark' ? '#e0e0e0' : '#2c3e50'};
      min-height: 100vh;
      display: flex;
      justify-content: center;
    }

    #ai-mode-container {
      width: ${settings.pageWidth}px;
      padding: 2rem;
      margin: 0 auto;
      font-size: ${settings.fontSize}px;
      line-height: ${settings.lineHeight};
      letter-spacing: ${settings.letterSpacing}px;
      font-family: system-ui, -apple-system, sans-serif;
    }

    #ai-mode-container img {
      max-width: 100%;
      height: auto;
      display: ${settings.showImages ? 'block' : 'none'};
    }

    #ai-mode-container h1,
    #ai-mode-container h2,
    #ai-mode-container h3,
    #ai-mode-container h4,
    #ai-mode-container h5,
    #ai-mode-container h6 {
      color: ${settings.theme === 'dark' ? '#ffffff' : '#2c3e50'};
      margin: 1.5em 0 1em;
    }

    #ai-mode-container p {
      margin: 1em 0;
    }

    #ai-mode-container code {
      background-color: ${settings.theme === 'dark' ? '#2d2d2d' : '#f5f5f5'};
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: 'Fira Code', monospace;
    }

    #ai-mode-container pre {
      background-color: ${settings.theme === 'dark' ? '#2d2d2d' : '#f5f5f5'};
      padding: 1em;
      border-radius: 5px;
      overflow-x: auto;
    }

    #ai-mode-container pre code {
      background-color: transparent;
      padding: 0;
    }

    #ai-mode-container blockquote {
      border-left: 4px solid ${settings.theme === 'dark' ? '#4a4a4a' : '#e5e7eb'};
      margin: 1em 0;
      padding: 0.5em 1em;
      background-color: ${settings.theme === 'dark' ? '#2d2d2d' : '#f8f9fa'};
    }

    #ai-mode-container a {
      color: ${settings.theme === 'dark' ? '#60a5fa' : '#3b82f6'};
      text-decoration: none;
    }

    #ai-mode-container a:hover {
      text-decoration: underline;
    }
  `;
}

export async function enableAIMode() {
  if (!document.body) return;

  try {
    // 保存原始内容
    if (!originalContent) {
      originalContent = document.documentElement.innerHTML;
    }

    // 获取设置
    const settings = await fetchAISettings();

    // 创建 AI 模式容器
    const container = document.createElement('div');
    container.id = 'ai-mode-container';

    // 获取当前页面内容
    const content = document.body.innerText;

    // 使用 AI 格式化内容
    const result = await formatWithAI(content);
    if (!result.success || !result.data) {
      throw new Error(result.error || '格式化失败');
    }

    // 将格式化的内容转换为 HTML
    const htmlContent = marked(result.data) as string;
    container.innerHTML = htmlContent;

    // 清空并重建页面
    document.body.innerHTML = '';
    document.body.appendChild(container);

    // 应用样式
    applyAIStyles(settings);

    // 创建退出按钮
    createExitButton();

    isAIMode = true;

  } catch (error) {
    console.error('启用 AI 模式时发生错误:', error);
    throw error;
  }
}

export function disableAIMode() {
  if (!originalContent) return;

  try {
    // 移除退出按钮
    const exitButton = document.getElementById('ai-mode-exit-button');
    if (exitButton) {
      exitButton.remove();
    }

    // 恢复原始内容
    document.documentElement.innerHTML = originalContent;

    // 移除样式
    const style = document.getElementById('ai-mode-style');
    if (style) {
      style.remove();
    }

    isAIMode = false;
    originalContent = null;
  } catch (error) {
    console.error('禁用 AI 模式时发生错误:', error);
    throw error;
  }
}

function createExitButton() {
  const button = document.createElement('button');
  button.id = 'ai-mode-exit-button';
  button.textContent = '退出 AI 模式';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    padding: 8px 16px;
    background-color: #1a73e8;
    color: white;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    font-size: 14px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;
    opacity: 0.8;
  `;

  button.addEventListener('mouseover', () => {
    button.style.opacity = '1';
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
  });

  button.addEventListener('mouseout', () => {
    button.style.opacity = '0.8';
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
  });

  button.addEventListener('click', () => {
    disableAIMode();
  });

  document.body.appendChild(button);
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'TOGGLE_AI_MODE') {
    try {
      if (isAIMode) {
        disableAIMode();
      } else {
        enableAIMode();
      }
      sendResponse({
        success: true,
        isAIMode,
        buttonText: isAIMode ? '退出 AI 模式' : '进入 AI 模式'
      });
    } catch (error) {
      console.error('处理消息时发生错误:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      sendResponse({ success: false, error: errorMessage });
    }
  } else if (request.action === 'GET_AI_MODE_STATE') {
    sendResponse({
      isAIMode,
      buttonText: isAIMode ? '退出 AI 模式' : '进入 AI 模式'
    });
  }
  return true; // 保持消息通道开启
}); 