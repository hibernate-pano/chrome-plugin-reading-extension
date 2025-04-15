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
  showDirectory: boolean;

  // 样式设置
  lineHeight: number;
  lineSpacing: number;
  paragraphSpacing: number;
  letterSpacing: number;
  pageWidth: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  firstLineIndent: boolean;

  // 代码设置
  codeTheme: string;
  codeFontSize: number;
}
