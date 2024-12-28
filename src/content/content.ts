import { Readability } from '@mozilla/readability';
import { StorageKeys, getStorage, StorageKeysType, FONT_FAMILIES, BACKGROUND_COLORS } from '../storage/storage';
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
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-go';
import pangu from 'pangu';

interface ReadingModeSettings {
  theme: 'light' | 'dark';
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  pageWidth: number;
  textAlign: 'left' | 'center' | 'right';
  firstLineIndent: boolean;
  showImages: boolean;
  fontFamily: keyof typeof FONT_FAMILIES;
  backgroundColor: keyof typeof BACKGROUND_COLORS;
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
    fontFamily: await getStorage<keyof typeof FONT_FAMILIES>(StorageKeys.FONT_FAMILY) ?? 'default',
    backgroundColor: await getStorage<keyof typeof BACKGROUND_COLORS>(StorageKeys.BACKGROUND_COLOR) ?? 'white',
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
      // 设置显示状态
      img.style.display = settings.showImages ? 'block' : 'none';
      
      // 如果图片应该显示但还没有加载，尝试加载
      if (settings.showImages) {
        if (!img.src && img.dataset.src) {
          img.src = img.dataset.src;
        }
        if (!img.src && img.getAttribute('data-original')) {
          img.src = img.getAttribute('data-original')!;
        }
        // 移除可能阻止加载的属性
        img.removeAttribute('loading');
        img.style.visibility = 'visible';
        img.style.opacity = '1';
      }
    }

    // 处理代码块
    const preElements = container.getElementsByTagName('pre');
    for (const pre of preElements) {
      // 确保 pre 元素有正确的类名
      pre.classList.add('line-numbers');
      
      // 获取或创建 code 元素
      let code = pre.querySelector('code');
      if (!code) {
        code = document.createElement('code');
        code.textContent = pre.textContent || '';
        pre.textContent = '';
        pre.appendChild(code);
      }

      // 确保 code 元素有语言类
      const hasLanguageClass = Array.from(code.classList).some(cls => cls.startsWith('language-'));
      if (!hasLanguageClass) {
        const preLanguage = pre.getAttribute('data-lang') || 
                          pre.getAttribute('data-language') ||
                          pre.className.match(/language-(\w+)/)?.[1];
        
        code.classList.add(`language-${preLanguage || 'plaintext'}`);
      }

      // 确保代码内容被正确格式化
      const codeContent = code.textContent || '';
      const lineCount = (codeContent.match(/\n/g) || []).length + 1;
      
      // 添加行号容器（如果不存在）
      if (!pre.querySelector('.line-numbers-rows')) {
        const lineNumbersRows = document.createElement('span');
        lineNumbersRows.className = 'line-numbers-rows';
        for (let i = 0; i < lineCount; i++) {
          const lineSpan = document.createElement('span');
          lineNumbersRows.appendChild(lineSpan);
        }
        code.after(lineNumbersRows);
      }

      // 重新应用高亮
      Prism.highlightElement(code);
    }
  }

  style.textContent = `
    body {
      margin: 0;
      padding: 20px;
      background-color: ${settings.theme === 'dark' ? '#1a1a1a' : BACKGROUND_COLORS[settings.backgroundColor]} !important;
      color: ${settings.theme === 'dark' ? '#e0e0e0' : '#2c3e50'};
    }
    #reading-mode-container {
      max-width: ${settings.pageWidth}px;
      margin: 0 auto;
      font-size: ${settings.fontSize}px;
      line-height: ${settings.lineHeight};
      letter-spacing: ${settings.letterSpacing}px;
      text-align: ${settings.textAlign};
      font-family: ${FONT_FAMILIES[settings.fontFamily]};
      background-color: ${settings.theme === 'dark' ? '#1a1a1a' : BACKGROUND_COLORS[settings.backgroundColor]} !important;
      color: ${settings.theme === 'dark' ? '#e0e0e0' : '#2c3e50'};
      padding: 2rem;
    }

    /* 标题样式 */
    #reading-mode-container h1 {
      font-size: 2em;
      font-weight: 600;
      margin: 1.5em 0 0.8em;
      line-height: 1.3;
      color: ${settings.theme === 'dark' ? '#ffffff' : '#1a1a1a'};
    }

    #reading-mode-container h2 {
      font-size: 1.5em;
      font-weight: 600;
      margin: 1.4em 0 0.8em;
      line-height: 1.3;
      color: ${settings.theme === 'dark' ? '#f0f0f0' : '#2c3e50'};
    }

    #reading-mode-container h3 {
      font-size: 1.3em;
      font-weight: 600;
      margin: 1.3em 0 0.7em;
      line-height: 1.3;
      color: ${settings.theme === 'dark' ? '#e0e0e0' : '#34495e'};
    }

    #reading-mode-container h4 {
      font-size: 1.2em;
      font-weight: 600;
      margin: 1.2em 0 0.6em;
      line-height: 1.3;
      color: ${settings.theme === 'dark' ? '#d0d0d0' : '#3c4858'};
    }

    #reading-mode-container h5 {
      font-size: 1.1em;
      font-weight: 600;
      margin: 1.1em 0 0.5em;
      line-height: 1.3;
      color: ${settings.theme === 'dark' ? '#c0c0c0' : '#4a5568'};
    }

    #reading-mode-container h6 {
      font-size: 1em;
      font-weight: 600;
      margin: 1em 0 0.5em;
      line-height: 1.3;
      color: ${settings.theme === 'dark' ? '#b0b0b0' : '#4a5568'};
    }

    /* 段落样式 */
    #reading-mode-container p {
      margin: 1em 0;
      ${settings.firstLineIndent ? 'text-indent: 2em;' : ''}
      line-height: ${settings.lineHeight};
    }

    /* 列表样式 */
    #reading-mode-container ul,
    #reading-mode-container ol {
      margin: 1em 0;
      padding-left: 2em;
      line-height: ${settings.lineHeight};
    }

    #reading-mode-container ul {
      list-style-type: disc;
    }

    #reading-mode-container ul ul {
      list-style-type: circle;
    }

    #reading-mode-container ul ul ul {
      list-style-type: square;
    }

    #reading-mode-container ol {
      list-style-type: decimal;
    }

    #reading-mode-container ol ol {
      list-style-type: lower-alpha;
    }

    #reading-mode-container ol ol ol {
      list-style-type: lower-roman;
    }

    #reading-mode-container li {
      margin: 0.5em 0;
      padding-left: 0.5em;
    }

    /* 引用样式 */
    #reading-mode-container blockquote {
      margin: 1.5em 0;
      padding: 1em 2em;
      border-left: 4px solid ${settings.theme === 'dark' ? '#404040' : '#e5e7eb'};
      background-color: ${settings.theme === 'dark' ? '#2d2d2d' : '#f8f9fa'};
      color: ${settings.theme === 'dark' ? '#b0b0b0' : '#4a5568'};
      font-style: italic;
    }

    /* 链接样式 */
    #reading-mode-container a {
      color: ${settings.theme === 'dark' ? '#60a5fa' : '#3b82f6'};
      text-decoration: none;
      transition: color 0.2s;
    }

    #reading-mode-container a:hover {
      color: ${settings.theme === 'dark' ? '#93c5fd' : '#2563eb'};
      text-decoration: underline;
    }

    /* 图片样式 */
    #reading-mode-container img {
      max-width: 100%;
      height: auto;
      margin: 1.5em auto;
      display: block;
      border-radius: 4px;
      box-shadow: ${settings.theme === 'dark' ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)'};
    }

    /* 表格样式 */
    #reading-mode-container table {
      width: 100%;
      margin: 1.5em 0;
      border-collapse: collapse;
      border: 1px solid ${settings.theme === 'dark' ? '#404040' : '#e5e7eb'};
    }

    #reading-mode-container th,
    #reading-mode-container td {
      padding: 0.75em 1em;
      border: 1px solid ${settings.theme === 'dark' ? '#404040' : '#e5e7eb'};
    }

    #reading-mode-container th {
      background-color: ${settings.theme === 'dark' ? '#2d2d2d' : '#f8f9fa'};
      font-weight: 600;
    }

    #reading-mode-container tr:nth-child(even) {
      background-color: ${settings.theme === 'dark' ? '#262626' : '#f8f9fa'};
    }

    /* 代码块和行号样式增强 */
    pre.line-numbers {
      position: relative;
      padding-left: 3.8em !important;
      counter-reset: linenumber;
      white-space: pre;
      font-family: 'Fira Code', 'Consolas', monospace;
      font-size: 0.9em;
      line-height: 1.4;
      background-color: ${settings.theme === 'dark' ? '#2d2d2d' : '#f5f5f5'} !important;
      border: 1px solid ${settings.theme === 'dark' ? '#404040' : '#e0e0e0'};
      border-radius: 6px;
      padding: 1em;
      margin: 1em 0;
      overflow-x: auto;
    }

    pre.line-numbers > code {
      position: relative;
      white-space: inherit;
      font-family: inherit;
    }

    .line-numbers .line-numbers-rows {
      position: absolute;
      pointer-events: none;
      top: 0;
      left: -3.8em;
      width: 3em;
      letter-spacing: -1px;
      border-right: 1px solid ${settings.theme === 'dark' ? '#404040' : '#999'};
      user-select: none;
    }

    .line-numbers-rows > span {
      display: block;
      counter-increment: linenumber;
      pointer-events: none;
    }

    .line-numbers-rows > span:before {
      content: counter(linenumber);
      display: block;
      padding-right: 0.8em;
      text-align: right;
      color: ${settings.theme === 'dark' ? '#666' : '#999'};
    }

    /* Prism.js 样式增强 */
    .token {
      background: none !important;
    }
    
    .token.comment,
    .token.prolog,
    .token.doctype,
    .token.cdata {
      color: ${settings.theme === 'dark' ? '#6a9955' : '#8e908c'};
      font-style: italic;
    }
    
    .token.operator,
    .token.punctuation {
      color: ${settings.theme === 'dark' ? '#d4d4d4' : '#666666'};
    }
    
    .token.property,
    .token.tag,
    .token.boolean,
    .token.number,
    .token.constant,
    .token.symbol {
      color: ${settings.theme === 'dark' ? '#b5cea8' : '#e45649'};
    }
    
    .token.selector,
    .token.attr-name,
    .token.string,
    .token.char,
    .token.builtin {
      color: ${settings.theme === 'dark' ? '#ce9178' : '#50a14f'};
    }
    
    .token.inserted {
      color: ${settings.theme === 'dark' ? '#b5cea8' : '#50a14f'};
      background: ${settings.theme === 'dark' ? '#1e3a1e' : '#f0fff0'};
    }
    
    .token.deleted {
      color: ${settings.theme === 'dark' ? '#f14c4c' : '#e45649'};
      background: ${settings.theme === 'dark' ? '#3a1e1e' : '#fff0f0'};
    }
    
    .token.keyword,
    .token.variable {
      color: ${settings.theme === 'dark' ? '#569cd6' : '#0184bc'};
    }
    
    .token.function {
      color: ${settings.theme === 'dark' ? '#dcdcaa' : '#c18401'};
    }
    
    .token.important,
    .token.bold {
      font-weight: bold;
    }
    
    .token.italic {
      font-style: italic;
    }
  `;
}

function createFloatingButton() {
  const button = document.createElement('button');
  button.id = 'reading-mode-exit-button';
  button.textContent = '退出阅读模式';
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
    disableReadingMode();
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

  // 直接使用 pangu.spacingElementByClassName 处理整个容器
  await pangu.spacingElementByTagName('div');
}

async function enableReadingMode() {
  if (!document.body) return;
  
  // 保存原始内容
  if (!originalContent) {
    originalContent = document.body.innerHTML;
  }

  try {
    // 创建一个文档副本
    const documentClone = document.implementation.createHTMLDocument();
    documentClone.documentElement.innerHTML = document.documentElement.innerHTML;
    
    // 处理所有图片，确保它们能正确加载
    const images = documentClone.getElementsByTagName('img');
    for (const img of images) {
      // 处理 data-src
      if (!img.src && img.dataset.src) {
        img.src = img.dataset.src;
      }
      
      // 处理 data-original
      if (!img.src && img.getAttribute('data-original')) {
        img.src = img.getAttribute('data-original')!;
      }
      
      // 处理其他常见的懒加载属性
      const lazyAttributes = [
        'data-lazy-src',
        'data-lazy',
        'data-echo',
        'data-img',
        'data-original-src'
      ];
      
      for (const attr of lazyAttributes) {
        if (!img.src && img.getAttribute(attr)) {
          img.src = img.getAttribute(attr)!;
          break;
        }
      }

      // 移除懒加载相关属性
      img.removeAttribute('loading');
      img.removeAttribute('data-src');
      img.removeAttribute('data-original');
      img.removeAttribute('data-lazy-src');
      img.removeAttribute('data-lazy');
      img.removeAttribute('data-echo');
      img.classList.remove('lazyload', 'lazy');
      
      // 确保图片可见
      img.style.display = 'block';
      img.style.visibility = 'visible';
      img.style.opacity = '1';
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

    // 应用自动空格（在添加到 DOM 之后）
    await applyAutoSpacing();

    // 添加浮动退出按钮
    createFloatingButton();

    // 再次处理新容器中的图片
    const containerImages = container.getElementsByTagName('img');
    for (const img of containerImages) {
      // 设置图片加载事件监听
      img.addEventListener('error', function() {
        // 如果加载失败，尝试其他可能的图片源
        const originalSrc = img.getAttribute('data-original');
        const lazySrc = img.getAttribute('data-lazy-src');
        if (!img.src.includes(originalSrc || '') && originalSrc) {
          img.src = originalSrc;
        } else if (!img.src.includes(lazySrc || '') && lazySrc) {
          img.src = lazySrc;
        }
      });

      // 根据设置显示或隐藏图片
      img.style.display = settings.showImages ? 'block' : 'none';
    }

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
  
  // 移除浮动退出按钮
  removeFloatingButton();
  
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
    settingsKeys.includes(key as any)
  );

  if (hasSettingsChanged) {
    const settings = await getSettings();
    applyStyles(settings);
  }
}); 