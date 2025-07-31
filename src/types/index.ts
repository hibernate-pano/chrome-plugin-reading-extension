// 导出所有错误类型
export * from './errors';

/**
 * 提取的内容类型
 */
export interface ExtractedContent {
  title: string | null;
  content: string;
  author?: string | null;
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
  paragraphSpacing: number; // 段落间距
  pageWidth: number;    // 页面宽度
  backgroundColor: string; // 背景颜色

  // 预设相关
  presets: any[];       // 预设列表
  activePreset: string | null; // 当前激活的预设ID
}

/**
 * 主题选项
 */
export type ThemeOption = 'light' | 'dark' | 'sepia' | 'custom';

/**
 * 消息类型
 */
export interface Message {
  action: string;  // 使用action而非type来匹配实际使用
  payload?: any;
} 