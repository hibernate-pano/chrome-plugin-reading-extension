/**
 * 阅读视图组件的类型定义
 */

// 导入全局类型定义
import { ExtractedContent as GlobalExtractedContent } from '../../../types';

/**
 * 主题类型
 */
export type ThemeType = 'light' | 'dark' | 'auto';

/**
 * 阅读视图属性接口
 */
export interface ReaderViewProps {
  /**
   * 原始页面的URL
   */
  url: string;
  
  /**
   * 关闭阅读视图的回调函数
   */
  onClose: () => void;
  
  /**
   * 插入位置的DOM节点，默认为document.body
   */
  container?: HTMLElement;
  
  /**
   * 主题名称
   */
  theme?: ThemeType;
  
  /**
   * 初始滚动位置
   */
  initialScrollPosition?: number;
  
  /**
   * 是否自动提取内容
   */
  autoExtract?: boolean;
}

/**
 * 内容元数据
 */
export interface ContentMeta {
  /**
   * 作者名称
   */
  author?: string;
  
  /**
   * 发布日期
   */
  publishDate?: Date;
  
  /**
   * 预计阅读时间（分钟）
   */
  readingTime?: number;
  
  /**
   * 来源网站名称
   */
  siteName?: string;
  
  /**
   * 站点favicon
   */
  favicon?: string;
}

/**
 * 导出全局提取内容类型
 */
export type ExtractedContent = GlobalExtractedContent;

/**
 * 内容提取服务接口
 */
export interface ContentExtractor {
  extract(url: string): Promise<ExtractedContent>;
}

/**
 * 错误状态
 */
export interface ErrorState {
  message: string;
  code?: string;
  retry?: boolean;
}

/**
 * 阅读视图状态
 */
export interface ReaderViewState {
  content: ExtractedContent | null;
  isLoading: boolean;
  error: ErrorState | null;
  currentTheme: ThemeType;
  scrollPosition: number;
}

/**
 * 阅读进度
 */
export interface ReadingProgress {
  url: string;
  scrollPosition: number;
  lastRead: number; // 时间戳
  title: string;
}

/**
 * 主题配置接口
 */
export interface ThemeConfig {
  name: string;
  type: ThemeType;
  variables: Record<string, string>;
}

/**
 * 安全选项
 */
export interface SafeHtmlOptions {
  ALLOWED_TAGS?: string[];
  ALLOWED_ATTR?: string[];
  ADD_TAGS?: string[];
  ADD_ATTR?: string[];
  FORBID_TAGS?: string[];
  FORBID_ATTR?: string[];
} 