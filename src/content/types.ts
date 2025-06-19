/**
 * 阅读模式设置接口
 */
export interface ReadingModeSettings {
  // 基本设置
  theme: 'light' | 'dark';
  fontSize: number;
  fontFamily: string;
  backgroundColor: string;

  // 显示设置
  showImages: boolean;

  // 样式设置
  lineHeight: number;
  paragraphSpacing: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';

  // 代码设置
  codeTheme: string;
  codeFontSize: number;
}

/**
 * 提取后的文章内容接口
 */
export interface ExtractedContent {
  title: string | null;
  author?: string | null;
  content: string;
}
