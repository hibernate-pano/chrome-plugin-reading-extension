import { StorageKeys, getStorage, FONT_FAMILIES, BACKGROUND_COLORS, CODE_THEMES } from '../storage/storage';
// 导入 highlight.js
import hljs from 'highlight.js';

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

// 配置 highlight.js
hljs.configure({
  languages: [
    'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
    'css', 'html', 'xml', 'json', 'markdown', 'bash', 'shell',
    'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'sql'
  ]
});

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
  tableExtractor,
  mediaExtractor,
  codeExtractor,
  listExtractor
} from './extractors';

// 导入提取器样式
import './extractors/extractors.css';
// 导入极简代码块样式
import './styles/minimalist-code.css';

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

async function fetchSettings(): Promise<ReadingModeSettings> {
  return {
    theme: await getStorage<'light' | 'dark'>(StorageKeys.THEME) ?? 'light',
    fontSize: await getStorage<number>(StorageKeys.FONT_SIZE) ?? 16,
    codeFontSize: await getStorage<number>(StorageKeys.CODE_FONT_SIZE) ?? 14,
    codeTheme: await getStorage<keyof typeof CODE_THEMES>(StorageKeys.CODE_THEME) ?? 'github',
    lineHeight: await getStorage<number>(StorageKeys.LINE_HEIGHT) ?? 1.5,
    letterSpacing: await getStorage<number>(StorageKeys.LETTER_SPACING) ?? 0,
    lineSpacing: await getStorage<number>(StorageKeys.LINE_SPACING) ?? 0.5,
    pageWidth: await getStorage<number>(StorageKeys.PAGE_WIDTH) ?? 800,
    textAlign: await getStorage<'left' | 'center' | 'right' | 'justify'>(StorageKeys.TEXT_ALIGN) ?? 'left',
    firstLineIndent: await getStorage<boolean>(StorageKeys.FIRST_LINE_INDENT) ?? true,
    showImages: await getStorage<boolean>(StorageKeys.SHOW_IMAGES) ?? true,
    fontFamily: await getStorage<keyof typeof FONT_FAMILIES>(StorageKeys.FONT_FAMILY) ?? 'default',
    backgroundColor: await getStorage<keyof typeof BACKGROUND_COLORS>(StorageKeys.BACKGROUND_COLOR) ?? 'white',
    showDirectory: await getStorage<boolean>(StorageKeys.SHOW_DIRECTORY) ?? true,
    paragraphSpacing: await getStorage<number>(StorageKeys.PARAGRAPH_SPACING) ?? 1.0,
    debug: await getStorage<boolean>(StorageKeys.DEBUG) ?? false,
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

function handleCodeBlocks(container: HTMLElement | null, settings: ReadingModeSettings) {
  if (!container) return;

  // 使用代码提取器增强所有代码块
  try {
    console.log('开始处理代码块');

    // 先彻底清除所有已存在的增强代码块容器
    const existingContainers = container.querySelectorAll('.enhanced-code-container, .code-block');
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
    const codeHeaders = container.querySelectorAll('.code-header, .code-top-bar, .code-toolbar');
    codeHeaders.forEach(header => header.remove());

    const copyButtons = container.querySelectorAll('.code-copy-button');
    copyButtons.forEach(button => button.remove());

    const contentWrappers = container.querySelectorAll('.code-content-wrapper, .code-content, .code-wrapper');
    contentWrappers.forEach(wrapper => wrapper.remove());

    const lineNumbers = container.querySelectorAll('.line-numbers');
    lineNumbers.forEach(lineNumber => lineNumber.remove());

    const codeToasts = container.querySelectorAll('.code-toast');
    codeToasts.forEach(toast => toast.remove());

    // 设置代码块主题类
    const themeClass = settings.theme === 'dark' ? 'dark-theme' : 'light-theme';
    const codeTheme = settings.codeTheme || 'github';
    container.classList.remove('dark-theme', 'light-theme');
    container.classList.add(themeClass);
    container.setAttribute('data-code-theme', codeTheme);
    console.log(`应用代码块主题类: ${themeClass}, 代码主题: ${codeTheme}`);

    // 使用代码提取器增强所有代码块
    console.log('开始增强代码块');
    codeExtractor.enhanceAllCodeBlocks(container);

    // 设置代码字体大小
    if (settings.codeFontSize) {
      const codeElements = container.querySelectorAll('pre, code, .code-toolbar, .line-number');
      codeElements.forEach(element => {
        (element as HTMLElement).style.fontSize = `${settings.codeFontSize}px`;
      });

      // 特别调整行号字体大小
      const lineNumbers = container.querySelectorAll('.line-number');
      lineNumbers.forEach(element => {
        (element as HTMLElement).style.fontSize = `${Math.max(settings.codeFontSize - 2, 10)}px`;
      });
    }

    // 设置代码块容器最大宽度
    const codeBlockContainers = container.querySelectorAll('.code-block');
    codeBlockContainers.forEach(block => {
      (block as HTMLElement).style.maxWidth = '100%';

      // 确保代码块容器也有正确的主题类
      block.classList.remove('dark-theme', 'light-theme');
      block.classList.add(themeClass);

      // 传递代码主题属性
      block.setAttribute('data-code-theme', settings.codeTheme || 'github');

      // 确保代码块内的所有元素都有正确的主题类
      const codeElements = block.querySelectorAll('code');
      codeElements.forEach(code => {
        code.classList.remove('dark-theme', 'light-theme');
        code.classList.add(themeClass);
      });

      // 确保行号区域也有正确的主题类
      const lineNumbers = block.querySelector('.line-numbers');
      if (lineNumbers) {
        lineNumbers.classList.remove('dark-theme', 'light-theme');
        lineNumbers.classList.add(themeClass);
      }
    });

    // 处理代码块内容的溢出方式
    const codeContents = container.querySelectorAll('.code-content');
    codeContents.forEach(content => {
      // 默认使用水平滚动模式
      (content as HTMLElement).style.overflowX = 'auto';
      (content as HTMLElement).style.whiteSpace = 'pre';

      // 添加切换按钮
      const toolbar = (content as HTMLElement).closest('.code-block')?.querySelector('.code-toolbar');
      if (toolbar) {
        // 确保工具栏也有正确的主题类
        toolbar.classList.remove('dark-theme', 'light-theme');
        toolbar.classList.add(themeClass);
        toolbar.setAttribute('data-code-theme', settings.codeTheme || 'github');

        const wrapButton = document.createElement('button');
        wrapButton.className = 'code-wrap-button';
        wrapButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>';
        wrapButton.title = '切换换行模式';

        wrapButton.addEventListener('click', () => {
          const codeContent = (content as HTMLElement);
          const isWrapped = codeContent.style.whiteSpace === 'pre-wrap';

          if (isWrapped) {
            // 切换到滚动模式
            codeContent.style.whiteSpace = 'pre';
            codeContent.style.wordBreak = 'normal';
            codeContent.style.overflowWrap = 'normal';
            wrapButton.title = '切换换行模式';
            wrapButton.classList.remove('active');
          } else {
            // 切换到换行模式
            codeContent.style.whiteSpace = 'pre-wrap';
            codeContent.style.wordBreak = 'break-word';
            codeContent.style.overflowWrap = 'break-word';
            wrapButton.title = '切换滚动模式';
            wrapButton.classList.add('active');
          }
        });

        // 将按钮添加到工具栏中
        const rightGroup = toolbar.querySelector('.code-right-group') || toolbar;
        rightGroup.insertBefore(wrapButton, rightGroup.firstChild);
      }
    });

    // 添加代码块交互功能
    console.log('添加代码块交互功能');
    codeExtractor.addCodeBlockInteractions(container);

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
    /* 代码块基础样式 */
    pre.line-numbers {
      background-color: ${themeStyles.background} !important;
      color: ${themeStyles.text};
      font-size: ${settings.codeFontSize}px !important;
      line-height: 1.5;
      padding: 1em;
      margin: 1em 0;
      border-radius: 8px;
      overflow-x: auto;
      position: relative;
      padding-left: 3.8em !important;
      counter-reset: linenumber;
      border: 1px solid ${themeStyles.comment}40;
      box-shadow: 0 2px 4px ${themeStyles.comment}20;
    }

    /* 行号容器样式 */
    pre.line-numbers .line-numbers-rows {
      position: absolute;
      pointer-events: none;
      top: 1em;
      font-size: ${settings.codeFontSize}px !important;
      left: 0;
      width: 3em;
      letter-spacing: -1px;
      border-right: 1px solid ${themeStyles.comment}40;
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
      color: ${themeStyles.comment}80;
      display: block;
      padding-right: 0.8em;
      text-align: right;
    }

    /* 代码语法高亮 */
    .token.comment,
    .token.prolog,
    .token.doctype,
    .token.cdata {
      color: ${themeStyles.comment};
      font-style: italic;
    }

    .token.punctuation {
      color: ${themeStyles.punctuation};
    }

    .token.keyword,
    .token.operator {
      color: ${themeStyles.keyword};
    }

    .token.function {
      color: ${themeStyles.function};
    }

    .token.string {
      color: ${themeStyles.string};
    }

    .token.number {
      color: ${themeStyles.number};
    }

    .token.class-name {
      color: ${themeStyles.class};
    }

    .token.variable {
      color: ${themeStyles.variable};
    }

    /* 代码选择样式 */
    pre.line-numbers ::selection,
    pre.line-numbers ::-moz-selection {
      background: ${themeStyles.selection};
    }

    /* 内联代码样式 */
    #reading-mode-container code:not(pre code) {
      background-color: ${themeStyles.background}40;
      color: ${themeStyles.keyword};
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-size: ${settings.codeFontSize}px !important;
      font-family: 'Fira Code', Consolas, Monaco, monospace;
      border: 1px solid ${themeStyles.comment}20;
    }
  `;
}

function applyStyles(settings: ReadingModeSettings) {
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
      .code-block, .code-toolbar, .line-numbers {
        background-color: var(--code-bg);
        color: var(--code-text-color);
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

  // 处理代码块
  handleCodeBlocks(container, settings);

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
      font-size: var(--reading-font-size) !important;
    }

    /* 阅读容器样式 */
    #reading-mode-container {
      box-sizing: border-box;
      width: var(--reading-page-width);
      padding: 2rem;
      margin-left: 250px;
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
        margin: 0 auto;
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

  try {
    // 暂时禁用 pangu 自动间距功能
    // 后续可以重新实现或使用其他方法
    return true;
  } catch (error) {
    console.error('应用自动间距时发生错误:', error);
    return false;
  }
}

async function enableReadingMode() {
  // 检查是否已经处于阅读模式，避免重复进入
  if (isReadingMode) {
    console.log('已经处于阅读模式，无需重复进入');
    return;
  }

  if (!document.body) {
    console.error('文档体不存在，无法启用阅读模式');
    return;
  }

  let loadingToast;

  try {
    console.log('开始启用阅读模式');

    // 显示加载提示
    loadingToast = Toast.info('正在准备阅读模式...', {
      duration: 0,
      showProgress: true
    });

    // 开始性能监控
    performanceMonitor.start('enableReadingMode');

    // 预加载工作线程
    try {
      await getWorkerManager().initialize();
      console.log('工作线程初始化成功');
    } catch (error) {
      console.warn('初始化工作线程失败，将在主线程中处理:', error);
    }

    // 不再使用资源加载器预加载样式，改为内联样式

    // 保存原始内容
    if (!originalContent) {
      originalContent = document.documentElement.innerHTML;
    }

    const settings = await fetchSettings();

    // 使用增强的内容提取器
    performanceMonitor.start('contentExtraction');
    console.log('开始提取页面内容');

    let extractedContent;
    try {
      extractedContent = await contentExtractor.extractFromHTML(originalContent, window.location.href);
      console.log('内容提取完成');
    } catch (extractError) {
      console.error('内容提取过程中发生错误:', extractError);
      if (loadingToast) loadingToast.close();
      Toast.error('内容提取失败: ' + (extractError instanceof Error ? extractError.message : '未知错误'), {
        position: 'top',
        duration: 3000
      });
      throw new Error('内容提取失败');
    }
    performanceMonitor.end('contentExtraction');

    if (!extractedContent || !extractedContent.success) {
      console.error('无法解析页面内容:', extractedContent?.error || '未知原因');
      if (loadingToast) loadingToast.close();
      Toast.error('无法解析页面内容', {
        position: 'top',
        duration: 3000
      });
      throw new Error('无法解析页面内容');
    }

    // 创建阅读模式容器
    const container = document.createElement('div');
    container.id = 'reading-mode-container';
    container.className = settings.theme === 'dark' ? 'dark-theme' : 'light-theme';

    // 添加文章标题
    const titleElement = document.createElement('h1');
    titleElement.id = 'reading-mode-title';
    titleElement.textContent = extractedContent.title || document.title;
    container.appendChild(titleElement);

    // 添加文章内容
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = extractedContent.content;
    contentDiv.className = 'reading-mode-content';

    // 应用增强处理 - 每个增强处理都包裹在 try-catch 中
    try {
      // 增强表格
      tableExtractor.enhanceAllTables(contentDiv);
      tableExtractor.fixTableStructure(contentDiv);
    } catch (error) {
      console.warn('增强表格时发生错误:', error);
    }

    try {
      // 增强图片和媒体
      if (settings.showImages) {
        mediaExtractor.enhanceAllImages(contentDiv);
        mediaExtractor.enhanceVideos(contentDiv);
        mediaExtractor.enhanceIframes(contentDiv);
        mediaExtractor.processBackgroundImages(contentDiv);
      } else {
        // 如果不显示图片，隐藏所有媒体元素
        handleMediaElements(contentDiv, false);
      }
    } catch (error) {
      console.warn('增强媒体元素时发生错误:', error);
    }

    try {
      // 先彻底清除所有已存在的增强代码块容器
      const existingContainers = contentDiv.querySelectorAll('.enhanced-code-container');
      console.log(`内容处理中找到 ${existingContainers.length} 个现有代码块容器`);

      existingContainers.forEach((codeContainer, index) => {
        try {
          // 找到原始的pre元素，如果有的话
          const originalPre = document.createElement('pre');
          const code = (codeContainer as HTMLElement).querySelector('code');
          if (code) {
            originalPre.appendChild(code.cloneNode(true));
            codeContainer.replaceWith(originalPre);
            console.log(`成功替换内容中的代码块容器 ${index + 1}`);
          } else {
            codeContainer.remove();
            console.log(`移除内容中没有代码元素的容器 ${index + 1}`);
          }
        } catch (containerError) {
          console.error(`处理内容中的代码块容器 ${index + 1} 时出错:`, containerError);
          // 尝试直接移除容器
          try {
            codeContainer.remove();
          } catch (removeError) {
            console.error('移除容器失败:', removeError);
          }
        }
      });

      // 清除可能存在的其他代码相关元素
      const codeHeaders = contentDiv.querySelectorAll('.code-header');
      codeHeaders.forEach(header => header.remove());

      const copyButtons = contentDiv.querySelectorAll('.code-copy-button');
      copyButtons.forEach(button => button.remove());

      // 增强代码块
      console.log('开始增强内容中的代码块');
      codeExtractor.enhanceAllCodeBlocks(contentDiv);
      codeExtractor.enhanceInlineCode(contentDiv);

      // 确保代码块内容不会溢出
      const codeBlocks = contentDiv.querySelectorAll('.enhanced-code-container code');
      codeBlocks.forEach(code => {
        const codeElement = code as HTMLElement;
        codeElement.style.whiteSpace = 'pre-wrap';
        codeElement.style.wordBreak = 'break-word';
        codeElement.style.overflowWrap = 'break-word';
        codeElement.style.maxWidth = '100%';
        codeElement.style.display = 'block';
      });

      console.log('内容中的代码块处理完成');
    } catch (error) {
      console.warn('增强代码块时发生错误:', error);
    }

    try {
      // 增强列表
      listExtractor.fixListStructure(contentDiv);
      listExtractor.enhanceAllLists(contentDiv);
    } catch (error) {
      console.warn('增强列表时发生错误:', error);
    }

    // 将处理后的内容添加到容器
    container.appendChild(contentDiv);

    // 清空并重建页面
    document.body.innerHTML = '';
    document.body.appendChild(container);

    // 应用样式
    try {
      applyStyles(settings);
    } catch (error) {
      console.warn('应用样式时发生错误:', error);
    }

    // 生成目录（如果启用）
    if (settings.showDirectory) {
      try {
        generateTableOfContents(container, extractedContent.title || document.title);
      } catch (error) {
        console.warn('生成目录时发生错误:', error);
      }
    }

    // 创建退出按钮
    try {
      createFloatingButton();
    } catch (error) {
      console.warn('创建退出按钮时发生错误:', error);
    }

    // 应用自动间距
    try {
      await applyAutoSpacing();
    } catch (error) {
      console.warn('应用自动间距时发生错误:', error);
    }

    // 添加交互功能
    try {
      codeExtractor.addCodeBlockInteractions(container);
      listExtractor.addListInteractions(container);
    } catch (error) {
      console.warn('添加交互功能时发生错误:', error);
    }

    // 初始化文本选择工具栏
    try {
      if (!textSelectionToolbar) {
        textSelectionToolbar = new TextSelectionToolbar({
          options: defaultToolbarOptions,
          position: 'top',
          theme: settings.theme,
          delay: 300
        });
      }
    } catch (error) {
      console.warn('初始化文本选择工具栏时发生错误:', error);
    }

    isReadingMode = true;

    // 结束性能监控
    const perfRecord = performanceMonitor.end('enableReadingMode');
    console.info(`阅读模式启用耗时: ${perfRecord?.duration.toFixed(2)}ms`);

    // 关闭加载提示并显示成功提示
    if (loadingToast) loadingToast.close();
    Toast.success('阅读模式已启用', {
      position: 'top',
      duration: 2000
    });

  } catch (error) {
    // 显示错误提示
    if (loadingToast) loadingToast.close();
    Toast.error(`启用阅读模式失败: ${error instanceof Error ? error.message : '未知错误'}`, {
      position: 'top',
      duration: 3000
    });
    console.error('启用阅读模式时发生错误:', error);
    throw error;
  } finally {
    // 释放工作线程资源
    try {
      releaseWorkerManager();
    } catch (error) {
      console.warn('释放工作线程资源时发生错误:', error);
    }
  }
}

// 这些函数已被提取器模块替代，但为了兼容性保留了函数签名
// @ts-ignore - 已被 contentExtractor 替代
function cleanupHtml(_doc: Document) { }

// @ts-ignore - 已被 listExtractor 替代
function preserveListStyles(_doc: Document) { }

// @ts-ignore - 已被 listExtractor 替代
function processLists(_container: HTMLElement) { }

function disableReadingMode() {
  performanceMonitor.start('disableReadingMode');

  // 检查是否处于阅读模式
  if (!isReadingMode || !originalContent) {
    console.log('当前不在阅读模式中或原始内容不存在');
    performanceMonitor.end('disableReadingMode');
    return;
  }

  // 显示加载提示
  const loadingToast = Toast.info('正在返回原始页面...', {
    duration: 0,
    showProgress: true
  });

  try {
    // 移除浮动退出按钮
    removeFloatingButton();

    // 移除目录
    const toc = document.getElementById('reading-mode-toc');
    if (toc) {
      toc.remove();
    }

    // 移除所有由阅读模式添加的样式
    const stylesToRemove = [
      'reading-mode-style',
      'reading-mode-codeblock-styles',
      'reading-mode-list-styles',
      'reading-mode-hljs-styles',
      'reading-mode-custom-code-styles'
    ];

    stylesToRemove.forEach(id => {
      const styleElement = document.getElementById(id);
      if (styleElement) {
        styleElement.remove();
      }
    });

    // 移除所有事件监听器
    window.removeEventListener('scroll', handleScroll);
    document.removeEventListener('keydown', handleKeyDown);

    // 恢复原始内容
    document.documentElement.innerHTML = originalContent;

    // 重新添加初始样式，以便下次进入阅读模式时能正确加载
    try {
      // 添加必要的样式元素，但不添加内容
      // 这样可以避免样式冲突，同时确保元素存在
      const codeblockStyles = document.createElement('style');
      codeblockStyles.id = 'reading-mode-codeblock-styles';
      document.head.appendChild(codeblockStyles);

      const listStyles = document.createElement('style');
      listStyles.id = 'reading-mode-list-styles';
      document.head.appendChild(listStyles);

      // 添加 highlight.js 样式元素，但不添加内容
      const hljsStyles = document.createElement('style');
      hljsStyles.id = 'reading-mode-hljs-styles';
      document.head.appendChild(hljsStyles);

      // 添加自定义代码高亮样式元素，但不添加内容
      const customCodeStyles = document.createElement('style');
      customCodeStyles.id = 'reading-mode-custom-code-styles';
      document.head.appendChild(customCodeStyles);

      console.log('样式元素重置完成');
    } catch (styleError) {
      console.error('重置样式元素时发生错误:', styleError);
    }

    // 销毁文本选择工具栏
    if (textSelectionToolbar) {
      textSelectionToolbar.destroy();
      textSelectionToolbar = null;
    }

    // 完全重置状态
    isReadingMode = false;
    originalContent = null;
    textSelectionToolbar = null;

    // 清除可能的全局事件监听器
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('click', handleDocumentClick);

    // 清除可能的定时器
    const timers = window.setTimeout(() => { }, 0);
    for (let i = 0; i < timers; i++) {
      window.clearTimeout(i);
    }

    const perfRecord = performanceMonitor.end('disableReadingMode');
    console.info(`阅读模式禁用耗时: ${perfRecord?.duration.toFixed(2)}ms`);

    // 关闭加载提示并显示成功提示
    loadingToast.close();
    Toast.success('已返回原始页面', {
      position: 'top',
      duration: 2000
    });

    console.log('阅读模式完全禁用，状态已重置');
  } catch (error) {
    console.error('禁用阅读模式时发生错误:', error);
    throw error;
  }
}

// 事件处理函数（空实现，仅用于移除事件监听器）
function handleScroll() { }
function handleKeyDown() { }
function handleResize() { }
function handleDocumentClick() { }

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('收到消息:', request.action);

  if (request.action === 'TOGGLE_READING_MODE') {
    try {
      // 先保存当前状态
      const currentState = isReadingMode;
      console.log('当前阅读模式状态:', currentState);

      // 切换阅读模式
      if (currentState) {
        try {
          disableReadingMode();
          console.log('禁用阅读模式成功');
        } catch (disableError) {
          console.error('禁用阅读模式时发生错误:', disableError);
          throw disableError;
        }
      } else {
        try {
          enableReadingMode();
          console.log('启用阅读模式成功');
        } catch (enableError) {
          console.error('启用阅读模式时发生错误:', enableError);
          throw enableError;
        }
      }

      // 发送切换后的状态，注意这里使用的是切换后的状态
      const newState = !currentState;
      console.log('新的阅读模式状态:', newState);
      sendResponse({
        success: true,
        isReadingMode: newState,
        buttonText: newState ? '退出阅读模式' : '进入阅读模式'
      });
    } catch (error) {
      console.error('处理消息时发生错误:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      sendResponse({ success: false, error: errorMessage });
    }
  } else if (request.action === 'GET_READING_MODE_STATE') {
    console.log('返回当前阅读模式状态:', isReadingMode);
    sendResponse({
      isReadingMode,
      buttonText: isReadingMode ? '退出阅读模式' : '进入阅读模式'
    });
  }
  return true; // 保持消息通道开启
});

// 监听存储变化
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== 'local' || !isReadingMode) return;

  const settingsKeys = Object.values(StorageKeys);
  const hasSettingsChanged = Object.keys(changes).some(key =>
    settingsKeys.includes(key as any)
  );

  if (hasSettingsChanged) {
    const settings = await fetchSettings();
    applyStyles(settings);

    // 处理代码主题或字体大小变化
    if (changes[StorageKeys.CODE_THEME] || changes[StorageKeys.CODE_FONT_SIZE]) {
      const container = document.getElementById('reading-mode-container');

      // 如果是主题变化，先更新主题样式
      if (changes[StorageKeys.CODE_THEME]) {
        console.log('代码主题变化为:', settings.codeTheme);

        // 更新主题样式
        const styleElement = document.getElementById('reading-mode-style');
        if (styleElement) {
          // 重新生成主题样式
          styleElement.textContent = `
            ${generateCodeThemeStyles(settings.codeTheme, settings)}
            ${styleElement.textContent.split('/* 基础样式 */')[1] || ''}
          `;
        }

        // 更新容器的代码主题属性
        container.setAttribute('data-code-theme', settings.codeTheme);

        // 更新所有代码块的代码主题属性
        const codeBlocks = container.querySelectorAll('.code-block');
        codeBlocks.forEach(block => {
          block.setAttribute('data-code-theme', settings.codeTheme);
        });
      }

      // 重新处理代码块
      handleCodeBlocks(container, settings);

      // 如果是字体大小变化，更新工具栏字体大小
      if (changes[StorageKeys.CODE_FONT_SIZE]) {
        // 更新所有代码块工具栏的字体大小
        const toolbars = container.querySelectorAll('.code-toolbar');
        toolbars.forEach(toolbar => {
          (toolbar as HTMLElement).style.fontSize = `${settings.codeFontSize}px`;
        });
      }
    }

    // 使用提取的函数处理多媒体内容显示状态的变化
    if (changes[StorageKeys.SHOW_IMAGES]) {
      const container = document.getElementById('reading-mode-container');
      handleMediaElements(container, settings.showImages);
    }

    if (changes[StorageKeys.SHOW_DIRECTORY]) {
      const tocElement = document.getElementById('reading-mode-toc');
      const container = document.getElementById('reading-mode-container');
      if (!container) return;

      if (changes[StorageKeys.SHOW_DIRECTORY].newValue) {
        if (!tocElement) {
          generateTableOfContents(container, document.querySelector('#reading-mode-title')?.textContent || document.title);
        } else {
          tocElement.style.display = 'block';
        }
      } else {
        if (tocElement) {
          tocElement.style.display = 'none';
        }
      }
    }
  }
});

// 修改 generateTableOfContents 函数，添加显示状态的控制
function generateTableOfContents(container: HTMLElement, articleTitle: string) {
  // 如果已经存在目录，则移除
  const existingToc = document.getElementById('reading-mode-toc');
  if (existingToc) {
    existingToc.remove();
  }

  // 创建目录容器
  const tocContainer = document.createElement('div');
  tocContainer.id = 'reading-mode-toc';

  // 根据当前设置决定是否显示
  getStorage<boolean>(StorageKeys.SHOW_DIRECTORY).then(showDirectory => {
    tocContainer.style.display = showDirectory ? 'block' : 'none';
  });

  // 添加文章标题
  const tocArticleTitle = document.createElement('div');
  tocArticleTitle.className = 'toc-article-title';
  tocArticleTitle.textContent = articleTitle;
  tocContainer.appendChild(tocArticleTitle);

  // 添加目录标题
  const tocTitle = document.createElement('div');
  tocTitle.className = 'toc-title';
  tocTitle.textContent = '目录';
  tocContainer.appendChild(tocTitle);

  // 获取所有标题元素
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const toc = document.createElement('ul');

  // 如果没有标题，显示提示信息
  if (headings.length === 0) {
    const noHeadings = document.createElement('div');
    noHeadings.className = 'toc-empty';
    noHeadings.textContent = '没有找到标题';
    tocContainer.appendChild(noHeadings);
    document.body.appendChild(tocContainer);
    return;
  }

  // 创建目录项
  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName[1]);
    const li = document.createElement('li');
    li.className = `toc-level-${level}`;

    // 为每个标题添加锚点
    const id = `heading-${index}`;
    heading.id = id;

    const link = document.createElement('a');
    link.href = `#${id}`;
    link.textContent = heading.textContent || `标题 ${index + 1}`;
    link.onclick = (e) => {
      e.preventDefault();
      heading.scrollIntoView({ behavior: 'smooth' });
      // 移除其他链接的激活状态
      toc.querySelectorAll('a').forEach(a => a.classList.remove('active'));
      // 添加当前链接的激活状态
      link.classList.add('active');
    };

    li.appendChild(link);
    toc.appendChild(li);
  });

  tocContainer.appendChild(toc);
  document.body.appendChild(tocContainer);

  // 监听滚动事件，高亮当前可见的标题
  let tocLinks = Array.from(toc.getElementsByTagName('a'));
  let headingsPos = Array.from(headings).map(heading => ({
    id: heading.id,
    top: heading.getBoundingClientRect().top + window.pageYOffset
  }));

  window.addEventListener('scroll', () => {
    const scrollPos = window.pageYOffset;
    let currentHeading = headingsPos[0];

    for (let i = 0; i < headingsPos.length; i++) {
      if (scrollPos >= headingsPos[i].top - 100) {
        currentHeading = headingsPos[i];
      } else {
        break;
      }
    }

    tocLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentHeading.id}`) {
        link.classList.add('active');
      }
    });
  });
}

// 监听存储变化
chrome.storage.onChanged.addListener(async (changes) => {
  // 如果不在阅读模式下，不应用样式
  if (!isReadingMode) return;

  const container = document.getElementById('reading-mode-container');
  if (!container) return;

  const settings = await fetchSettings();

  if (changes.lineSpacing) {
    // 更新所有需要行间距的元素
    const elements = container.querySelectorAll('p, ul, ol, li');
    elements.forEach(el => {
      (el as HTMLElement).style.lineHeight = changes.lineSpacing.newValue;
    });
  }

  if (changes.paragraphSpacing) {
    // 更新段落间距和视觉分隔
    const paragraphs = container.getElementsByTagName('p');
    const newSpacing = changes.paragraphSpacing.newValue;
    for (const p of paragraphs) {
      p.style.marginBottom = `${newSpacing}em`;
      p.style.paddingBottom = newSpacing > 1 ? '0.5em' : '0';
      p.style.borderBottom = newSpacing > 1
        ? `1px solid ${settings.theme === 'dark' ? '#333' : '#eee'}`
        : 'none';
    }
  }
});

// 初始化时应用行间距和段间距
const initializeSpacing = async () => {
  // 如果不在阅读模式下，不应用样式
  if (!isReadingMode) return;

  const { lineSpacing, paragraphSpacing } = await chrome.storage.local.get(['lineSpacing', 'paragraphSpacing']);
  const settings = await fetchSettings();
  const container = document.getElementById('reading-mode-container');
  if (!container) return;

  if (lineSpacing !== undefined) {
    // 更新所有需要行间距的元素
    const elements = container.querySelectorAll('p, ul, ol, li');
    elements.forEach(el => {
      (el as HTMLElement).style.lineHeight = lineSpacing;
    });
  }

  if (paragraphSpacing !== undefined) {
    // 更新段落间距和视觉分隔
    const paragraphs = container.getElementsByTagName('p');
    for (const p of paragraphs) {
      p.style.marginBottom = `${paragraphSpacing}em`;
      p.style.paddingBottom = paragraphSpacing > 1 ? '0.5em' : '0';
      p.style.borderBottom = paragraphSpacing > 1
        ? `1px solid ${settings.theme === 'dark' ? '#333' : '#eee'}`
        : 'none';
    }
  }
};

// 在适当的时机调用初始化函数
// 只在启用阅读模式后调用
initializeSpacing();

// 更新阅读模式样式 - 此函数已被移动到 utils.ts
// 这里保留注释以供参考，实际使用时通过动态导入调用 utils.ts 中的实现
// @ts-ignore - 此函数不再直接使用
function _legacyUpdateReadingModeStyles() {
  // 此函数已被替换，保留仅作为历史记录
  console.warn('使用了已弃用的函数：updateReadingModeStyles');
}