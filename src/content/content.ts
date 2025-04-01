import { Readability } from '@mozilla/readability';
import { StorageKeys, getStorage, FONT_FAMILIES, BACKGROUND_COLORS, CODE_THEMES } from '../storage/storage';
import Prism from 'prismjs';
// 先导入主题样式
import 'prismjs/themes/prism.css';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';
import 'prismjs/plugins/toolbar/prism-toolbar.css';
// 再导入语言支持
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-go';
// 最后导入插件
import 'prismjs/plugins/line-numbers/prism-line-numbers';
import 'prismjs/plugins/toolbar/prism-toolbar';
import 'prismjs/plugins/copy-to-clipboard/prism-copy-to-clipboard';
import pangu from 'pangu';

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
}

let originalContent: string | null = null;
let isReadingMode = false;

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
  };
}

function handleMediaElements(container: HTMLElement | null, showImages: boolean) {
  if (!container) return;
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
        if (!element.src && element.dataset.src) element.src = element.dataset.src;
        if (!element.src && element.getAttribute('data-original')) element.src = element.getAttribute('data-original')!;
        element.removeAttribute('loading');
        htmlElement.style.visibility = 'visible';
        htmlElement.style.opacity = '1';
      }
    }
  });
  const elementsWithBgImage = container.querySelectorAll('[style*="background-image"]');
  elementsWithBgImage.forEach(element => {
    if (!showImages) {
      (element as HTMLElement).style.backgroundImage = 'none';
    }
  });
}

function handleCodeBlocks(container: HTMLElement | null, settings: ReadingModeSettings) {
  if (!container) return;

  const preElements = container.getElementsByTagName('pre');
  for (const pre of preElements) {
    // 添加行号类
    pre.classList.add('line-numbers');

    let code = pre.querySelector('code');
    if (!code) {
      code = document.createElement('code');
      code.textContent = pre.textContent;
      pre.textContent = '';
      pre.appendChild(code);
    }

    // 设置代码字体
    pre.style.fontFamily = 'Fira Code, Consolas, Monaco, monospace';
    code.style.fontFamily = 'inherit';

    // 确保代码块有语言类名
    const hasLanguageClass = Array.from(code.classList).some(cls => cls.startsWith('language-'));
    if (!hasLanguageClass) {
      const preLanguage = pre.getAttribute('data-lang') ||
        pre.getAttribute('data-language') ||
        pre.className.match(/language-(\w+)/)?.[1];
      code.classList.add(`language-${preLanguage || 'plaintext'}`);
    }

    // 重新高亮代码
    Prism.highlightElement(code);
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

  const container = document.getElementById('reading-mode-container');

  // 处理媒体元素
  handleMediaElements(container, settings.showImages);

  // 处理代码块
  handleCodeBlocks(container, settings);

  // 合并基础样式和代码主题样式
  style.textContent = `
    ${generateCodeThemeStyles(settings.codeTheme, settings)}
    
    /* 基础样式 */
    body {
      margin: 0;
      padding: 0;
      background-color: ${settings.theme === 'dark' ? '#1a1a1a' : BACKGROUND_COLORS[settings.backgroundColor]} !important;
      color: ${settings.theme === 'dark' ? '#e0e0e0' : '#2c3e50'};
      min-height: 100vh;
      display: flex;
      justify-content: center;
    }

    /* 阅读容器样式 */
    #reading-mode-container {
      box-sizing: border-box;
      width: ${settings.pageWidth}px;
      padding: 2rem;
      margin-left: 250px;
      font-size: ${settings.fontSize}px;
      line-height: ${settings.lineHeight};
      letter-spacing: ${settings.letterSpacing}px;
      text-align: ${settings.textAlign};
      font-family: ${FONT_FAMILIES[settings.fontFamily]};
      background-color: ${settings.theme === 'dark' ? '#1a1a1a' : BACKGROUND_COLORS[settings.backgroundColor]} !important;
      color: ${settings.theme === 'dark' ? '#e0e0e0' : '#2c3e50'};
      transition: all 0.3s ease;
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
      font-size: 2.5em;
      font-weight: 700;
      margin: 0 0 1em;
      line-height: 1.2;
      color: ${settings.theme === 'dark' ? '#ffffff' : '#1a1a1a'};
      letter-spacing: -0.02em;
    }

    /* 标题层级样式 */
    #reading-mode-container h2 {
      font-size: 1.75em;
      font-weight: 600;
      margin: 2em 0 0.8em;
      line-height: 1.3;
      color: ${settings.theme === 'dark' ? '#f0f0f0' : '#2c3e50'};
      letter-spacing: -0.01em;
    }

    #reading-mode-container h3 {
      font-size: 1.4em;
      font-weight: 600;
      margin: 1.8em 0 0.7em;
      line-height: 1.3;
      color: ${settings.theme === 'dark' ? '#e0e0e0' : '#34495e'};
    }

    /* 段落样式 */
    #reading-mode-container p {
      margin: 0;
      ${settings.firstLineIndent ? 'text-indent: 2em;' : ''}
      line-height: ${settings.lineSpacing}; /* 直接使用行间距值控制行高 */
      margin-bottom: ${settings.paragraphSpacing}em; /* 段间距 */
      padding-bottom: ${settings.paragraphSpacing > 1 ? '0.5em' : '0'}; /* 当段间距较大时添加下边框 */
      border-bottom: ${settings.paragraphSpacing > 1 ? `1px solid ${settings.theme === 'dark' ? '#333' : '#eee'}` : 'none'}; /* 视觉分隔 */
      letter-spacing: ${settings.letterSpacing}px;
      opacity: 0.95;
    }

    /* 列表样式优化 */
    #reading-mode-container ul,
    #reading-mode-container ol {
      margin: 1.2em 0;
      padding-left: 2.5em;
      line-height: ${settings.lineSpacing}; /* 与段落保持一致的行间距 */
      list-style-position: outside;
    }

    #reading-mode-container li {
      margin: 0.6em 0;
      padding-left: 0.3em;
      position: relative;
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
      border-left: 4px solid ${settings.theme === 'dark' ? '#404040' : '#e5e7eb'};
      background-color: ${settings.theme === 'dark' ? '#2d2d2d' : '#f8f9fa'};
      color: ${settings.theme === 'dark' ? '#b0b0b0' : '#4a5568'};
      font-style: italic;
      border-radius: 0.25em;
      transition: all 0.3s ease;
    }

    #reading-mode-container blockquote p {
      margin: 0.5em 0;
      text-indent: 0;
    }

    /* 链接样式优化 */
    #reading-mode-container a {
      color: ${settings.theme === 'dark' ? '#60a5fa' : '#3b82f6'};
      text-decoration: none;
      transition: all 0.2s ease;
      border-bottom: 1px solid transparent;
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

  // 直接使用 pangu.spacingElementByClassName 处理整个容器
  await pangu.spacingElementByTagName('div');
}

async function enableReadingMode() {
  if (!document.body) return;

  try {
    // 保存原始内容
    if (!originalContent) {
      originalContent = document.documentElement.innerHTML;
    }

    // 创建新的文档用于解析
    const documentClone = document.implementation.createHTMLDocument();
    documentClone.documentElement.innerHTML = originalContent;

    // 清理和规范化 HTML
    cleanupHtml(documentClone);

    // 预处理列表样式
    preserveListStyles(documentClone);

    // 使用 Readability 解析内容
    const reader = new Readability(documentClone);
    const article = reader.parse();

    if (!article) {
      console.error('无法解析页面内容');
      return;
    }

    const settings = await fetchSettings();

    // 创建阅读模式容器
    const container = document.createElement('div');
    container.id = 'reading-mode-container';

    // 添加文章标题
    const titleElement = document.createElement('h1');
    titleElement.id = 'reading-mode-title';
    titleElement.textContent = article.title || document.title;
    container.appendChild(titleElement);

    // 添加文章内容
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = article.content;
    
    // 处理列表结构
    processLists(tempDiv);
    
    // 将处理后的内容添加到容器
    container.appendChild(tempDiv);

    // 清空并重建页面
    document.body.innerHTML = '';
    document.body.appendChild(container);

    // 应用样式
    applyStyles(settings);

    // 生成目录（如果启用）
    if (settings.showDirectory) {
      generateTableOfContents(container, article.title || document.title);
    }

    // 创建退出按钮
    createFloatingButton();

    // 应用自动间距
    await applyAutoSpacing();

    isReadingMode = true;

  } catch (error) {
    console.error('启用阅读模式时发生错误:', error);
    throw error;
  }
}

// 清理和规范化 HTML
function cleanupHtml(doc: Document) {
  // 移除空的列表项
  const emptyListItems = doc.querySelectorAll('li:empty');
  emptyListItems.forEach(item => item.remove());

  // 修复嵌套错误的列表
  const lists = doc.querySelectorAll('ul, ol');
  lists.forEach(list => {
    // 确保列表项直接在列表元素下
    const directChildren = Array.from(list.children);
    directChildren.forEach(child => {
      if (child.tagName !== 'LI') {
        // 如果不是列表项，将其包装在列表项中
        const li = doc.createElement('li');
        child.parentNode?.insertBefore(li, child);
        li.appendChild(child);
      }
    });

    // 修复嵌套列表的位置
    const nestedLists = list.querySelectorAll('ul, ol');
    nestedLists.forEach(nestedList => {
      const parent = nestedList.parentElement;
      if (parent && parent.tagName !== 'LI') {
        // 如果嵌套列表不在列表项中，将其移动到前一个列表项中
        const previousLi = nestedList.previousElementSibling;
        if (previousLi && previousLi.tagName === 'LI') {
          previousLi.appendChild(nestedList);
        } else {
          // 如果没有前一个列表项，创建一个新的
          const li = doc.createElement('li');
          nestedList.parentNode?.insertBefore(li, nestedList);
          li.appendChild(nestedList);
        }
      }
    });
  });

  // 修复列表项中的段落
  const listItems = doc.querySelectorAll('li');
  listItems.forEach(li => {
    const paragraphs = li.getElementsByTagName('p');
    if (paragraphs.length === 1) {
      // 如果只有一个段落，去掉段落标签
      const p = paragraphs[0];
      li.innerHTML = p.innerHTML;
    }
  });
}

// 预处理列表样式
function preserveListStyles(doc: Document) {
  const lists = doc.querySelectorAll('ul, ol');
  lists.forEach(list => {
    // 添加自定义属性来标记列表类型
    list.setAttribute('data-list-type', list.tagName.toLowerCase());
    
    // 保存列表样式类型
    const style = window.getComputedStyle(list);
    const listStyleType = style.getPropertyValue('list-style-type');
    if (listStyleType && listStyleType !== 'none') {
      list.setAttribute('data-list-style', listStyleType);
    }
  });
}

// 处理列表结构的函数
function processLists(container: HTMLElement) {
  // 处理所有列表
  const lists = container.querySelectorAll('ul, ol');
  lists.forEach(list => {
    // 恢复列表类型
    const listType = list.getAttribute('data-list-type');
    if (listType) {
      list.classList.add(`list-${listType}`);
    }

    // 恢复列表样式
    const listStyle = list.getAttribute('data-list-style');
    if (listStyle && list instanceof HTMLElement) {
      list.style.listStyleType = listStyle;
    }

    // 处理列表项
    const items = list.querySelectorAll('li');
    items.forEach(item => {
      if (!(item instanceof HTMLElement)) return;
      
      // 移除可能影响样式的属性
      item.removeAttribute('style');
      
      // 处理嵌套列表
      const nestedLists = item.querySelectorAll('ul, ol');
      nestedLists.forEach(nestedList => {
        // 确保嵌套列表在 li 的直接子级
        if (nestedList.parentElement !== item) {
          item.appendChild(nestedList);
        }
      });

      // 处理列表项内容的格式
      const textContent = item.textContent?.trim();
      if (textContent) {
        // 移除多余的空白字符
        item.innerHTML = item.innerHTML.replace(/\s+/g, ' ').trim();
      }
    });
  });
}

function disableReadingMode() {
  if (!originalContent) return;

  try {
    // 移除浮动退出按钮
    removeFloatingButton();

    // 移除目录
    const toc = document.getElementById('reading-mode-toc');
    if (toc) {
      toc.remove();
    }

    // 恢复原始内容
    document.documentElement.innerHTML = originalContent;

    // 移除样式
    const style = document.getElementById('reading-mode-style');
    if (style) {
      style.remove();
    }

    isReadingMode = false;
    originalContent = null;
  } catch (error) {
    console.error('禁用阅读模式时发生错误:', error);
    throw error;
  }
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
  if (areaName !== 'local' || !isReadingMode) return;

  const settingsKeys = Object.values(StorageKeys);
  const hasSettingsChanged = Object.keys(changes).some(key =>
    settingsKeys.includes(key as any)
  );

  if (hasSettingsChanged) {
    const settings = await fetchSettings();
    applyStyles(settings);

    // 处理代码主题变化
    if (changes[StorageKeys.CODE_THEME]) {
      const container = document.getElementById('reading-mode-container');
      handleCodeBlocks(container, settings);
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
initializeSpacing();

// 更新阅读模式样式
function updateReadingModeStyles(settings: any) {
  const root = document.documentElement;
  
  // 设置CSS变量
  root.style.setProperty('--reading-font-size', `${settings.fontSize}px`);
  root.style.setProperty('--reading-line-height', settings.lineHeight.toString());
  root.style.setProperty('--reading-letter-spacing', `${settings.letterSpacing}px`);
  root.style.setProperty('--reading-page-width', `${settings.pageWidth}px`);
  root.style.setProperty('--reading-line-spacing', `${settings.lineSpacing}rem`);
  root.style.setProperty('--reading-paragraph-spacing', `${settings.paragraphSpacing}rem`);
  
  // 设置字体
  root.style.setProperty('--reading-font-family', settings.fontFamily || 'Georgia, serif');
  
  // 设置背景颜色
  root.style.setProperty('--reading-bg-color', settings.backgroundColor || '#f8f5f1');
  root.style.setProperty('--reading-content-bg-color', '#ffffff');
  root.style.setProperty('--reading-content-shadow', '0 1px 3px rgba(0, 0, 0, 0.1)');
  
  // 设置文本对齐方式
  const container = document.getElementById('reading-mode-content');
  if (container) {
    container.style.textAlign = settings.textAlign || 'left';
  }
  
  // 设置首行缩进
  root.style.setProperty('--reading-first-line-indent', settings.firstLineIndent ? '2em' : '0');
}