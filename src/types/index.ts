// 导出所有错误类型
export * from './errors';

/**
 * 提取的内容类型
 */
export interface ExtractedContent {
  title: string;
  content: string;
  author?: string;
  publishDate?: string;
  url: string;
  domain: string;
  readingTime: number; // 估计阅读时间（分钟）
  wordCount: number;
  imageCount: number;
  excerpt?: string;
  images: ImageInfo[];
  favicon?: string;
  language?: string;
}

/**
 * 图片信息
 */
export interface ImageInfo {
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
}

/**
 * 用户设置
 */
export interface UserSettings {
  // 显示设置
  fontSize: number;     // 字体大小，单位 px
  lineHeight: number;   // 行高
  fontFamily: string;   // 字体族
  theme: ThemeOption;   // 主题选择
  margin: number;       // 页面边距
  maxWidth: number;     // 内容最大宽度
  paragraphSpacing: number; // 段落间距
  
  // 功能设置
  automaticTheme: boolean; // 自动跟随系统主题
  rememberReadingProgress: boolean; // 记住阅读进度
  enableImageZoom: boolean; // 允许图片缩放
  hideAnnotations: boolean; // 隐藏注释
  
  // 快捷键设置
  keyboardShortcuts: {
    toggleReader: string;
    toggleTheme: string;
    increaseFontSize: string;
    decreaseFontSize: string;
  };
}

/**
 * 主题选项
 */
export type ThemeOption = 'light' | 'dark' | 'sepia' | 'custom';

/**
 * 主题配置
 */
export interface ThemeConfig {
  id: string;
  name: string;
  isDark: boolean;
  colors: {
    background: string;
    text: string;
    primary: string;
    secondary: string;
    border: string;
    highlight: string;
  };
  typography: {
    fontFamily: string;
    headingFontFamily: string;
    codeFontFamily: string;
    baseFontSize: number;
    baseLineHeight: number;
  };
  customCss?: string; // 自定义CSS
}

/**
 * 阅读历史项
 */
export interface HistoryItem {
  url: string;
  title: string;
  favicon?: string;
  lastVisit: number; // 时间戳
  readingProgress: number; // 百分比 0-100
  scrollPosition: number; // 像素位置
  wordCount: number;
  readingTime: number;
  excerpt?: string;
}

/**
 * 注释项
 */
export interface Annotation {
  id: string;
  url: string;
  text: string;
  note?: string;
  color: string;
  createdAt: number;
  updatedAt: number;
  range?: {
    startContainer: string; // XPath
    startOffset: number;
    endContainer: string; // XPath
    endOffset: number;
  };
}

/**
 * 内容提取规则
 */
export interface ExtractorRule {
  domain: string;
  selectors: {
    content?: string;
    title?: string;
    author?: string;
    date?: string;
    nextPage?: string;
  };
  remove?: string[]; // 要移除的元素选择器
  custom?: Record<string, string>; // 自定义选择器
}

/**
 * 消息类型
 */
export interface Message {
  type: string;
  payload?: any;
} 