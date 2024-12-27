import { Readability } from '@mozilla/readability';
import { StorageKeys, getStorage, StorageKeysType } from '../storage/storage';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/plugins/line-numbers/prism-line-numbers';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import 'prismjs/plugins/toolbar/prism-toolbar';
import 'prismjs/plugins/toolbar/prism-toolbar.css';
import 'prismjs/plugins/copy-to-clipboard/prism-copy-to-clipboard';

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
  const styleId = 'reading-mode-style';
  let style = document.getElementById(styleId);
  
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }

  // 更新所有图片的显示状态和代码块样式
  const container = document.getElementById('reading-mode-container');
  if (container) {
    // 处理图片
    const images = container.getElementsByTagName('img');
    for (const img of images) {
      img.style.display = settings.showImages ? 'block' : 'none';
      // 确保图片加载
      if (settings.showImages && !img.src && img.dataset.src) {
        img.src = img.dataset.src;
      }
    }

    // 处理代码块
    const preElements = container.getElementsByTagName('pre');
    for (const pre of preElements) {
      pre.classList.add('reading-mode-code', 'line-numbers');
      
      const code = pre.querySelector('code');
      if (code) {
        // 检查是否已经有语言类
        const hasLanguageClass = Array.from(code.classList)
          .some(cls => cls.startsWith('language-'));
        
        if (!hasLanguageClass) {
          // 尝试从父元素获取语言信息
          const preLanguage = pre.getAttribute('data-language') || 
                            pre.className.match(/language-(\w+)/)?.[1];
          
          if (preLanguage) {
            code.classList.add(`language-${preLanguage}`);
          } else {
            code.classList.add('language-plaintext');
          }
        }
        
        // 重新应用高亮
        Prism.highlightElement(code);
      } else {
        const newCode = document.createElement('code');
        newCode.classList.add('language-plaintext');
        newCode.textContent = pre.textContent || '';
        pre.textContent = '';
        pre.appendChild(newCode);
        Prism.highlightElement(newCode);
      }
    }
  }

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
      max-width: 100%;
      height: auto;
      margin: 1em auto;
    }
    .reading-mode-code {
      background-color: ${settings.theme === 'light' ? '#f5f5f5' : '#2d2d2d'} !important;
      border-radius: 6px;
      padding: 1em;
      margin: 1em 0;
      overflow-x: auto;
      font-family: 'Fira Code', 'Consolas', monospace;
      font-size: 0.9em;
      line-height: 1.4;
      position: relative;
    }
    
    .reading-mode-code code {
      display: block;
      color: ${settings.theme === 'light' ? '#24292e' : '#e1e4e8'};
      background: none !important;
      padding: 0 !important;
      font-family: inherit;
      white-space: pre;
    }
    
    /* Prism.js 样式增强 */
    .token {
      background: none !important;
    }
    
    .token.comment,
    .token.prolog,
    .token.doctype,
    .token.cdata {
      color: #8e908c;
      font-style: italic;
    }
    
    .token.operator,
    .token.punctuation {
      color: ${settings.theme === 'light' ? '#666666' : '#a9a9a9'};
    }
    
    .token.property,
    .token.tag,
    .token.boolean,
    .token.number,
    .token.constant,
    .token.symbol {
      color: #e45649;
    }
    
    .token.selector,
    .token.attr-name,
    .token.string,
    .token.char,
    .token.builtin {
      color: #50a14f;
    }
    
    .token.inserted {
      color: #50a14f;
      background: ${settings.theme === 'light' ? '#f0fff0' : '#1e3a1e'};
    }
    
    .token.deleted {
      color: #e45649;
      background: ${settings.theme === 'light' ? '#fff0f0' : '#3a1e1e'};
    }
    
    .token.keyword,
    .token.variable {
      color: #0184bc;
    }
    
    .token.function {
      color: #c18401;
    }
    
    .token.important,
    .token.bold {
      font-weight: bold;
    }
    
    .token.italic {
      font-style: italic;
    }
    
    /* 行号样式 */
    .line-numbers .line-numbers-rows {
      border-right: 1px solid #ddd;
      background: ${settings.theme === 'light' ? '#f8f8f8' : '#1e1e1e'};
    }
    
    /* 代码块工具栏 */
    div.code-toolbar > .toolbar {
      opacity: 0;
      transition: opacity 0.3s;
    }
    
    div.code-toolbar:hover > .toolbar {
      opacity: 1;
    }
    
    div.code-toolbar > .toolbar .toolbar-item {
      margin-left: 6px;
    }
    
    div.code-toolbar > .toolbar button {
      background: ${settings.theme === 'light' ? '#f1f1f1' : '#2a2a2a'};
      color: ${settings.theme === 'light' ? '#666' : '#ccc'};
      padding: 4px 8px;
      border: 1px solid ${settings.theme === 'light' ? '#ddd' : '#444'};
      border-radius: 3px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    div.code-toolbar > .toolbar button:hover {
      background: ${settings.theme === 'light' ? '#e9e9e9' : '#3a3a3a'};
      color: ${settings.theme === 'light' ? '#444' : '#fff'};
    }
  `;
}

async function enableReadingMode() {
  if (!document.body) return;
  
  // 保存原始内容
  if (!originalContent) {
    originalContent = document.body.innerHTML;
  }

  try {
    // 创建一个文档副本
    const documentClone = document.cloneNode(true) as Document;
    
    // 确保所有图片的 src 都被正确复制
    const images = documentClone.getElementsByTagName('img');
    for (const img of images) {
      if (!img.src && img.dataset.src) {
        img.src = img.dataset.src;
      }
      // 处理懒加载图片
      if (img.getAttribute('loading') === 'lazy') {
        img.removeAttribute('loading');
      }
    }

    // 正确初始化 Readability
    const reader = new Readability(documentClone);
    const article = reader.parse();
    
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
    
    // 高亮代码块
    const codeBlocks = container.querySelectorAll('pre code');
    codeBlocks.forEach(block => {
      if (!block.classList.contains('language-')) {
        block.classList.add('language-plaintext');
      }
      Prism.highlightElement(block);
    });

    isReadingMode = true;

  } catch (error) {
    console.error('启用阅读模式时发生错误:', error);
  }
}

function disableReadingMode() {
  if (!originalContent) return;
  
  document.body.innerHTML = originalContent;
  const style = document.getElementById('reading-mode-style');
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
      sendResponse({ 
        success: true, 
        isReadingMode,
        buttonText: isReadingMode ? '退出阅读模式' : '进入阅读模式'
      });
    } catch (error) {
      console.error('处理消息时发生错误:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      sendResponse({ success: false, error: errorMessage });
    }
  } else if (request.action === 'GET_READING_MODE_STATE') {
    sendResponse({ 
      isReadingMode,
      buttonText: isReadingMode ? '退出阅读模式' : '进入阅读模式'
    });
  }
  return true; // 保持消息通道开启
});

// 监听存储变化
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== 'sync' || !isReadingMode) return;

  const settingsKeys = Object.values(StorageKeys);
  const hasSettingsChanged = Object.keys(changes).some(key => 
    settingsKeys.includes(key as StorageKeysType)
  );

  if (hasSettingsChanged) {
    const settings = await getSettings();
    applyStyles(settings);
  }
}); 