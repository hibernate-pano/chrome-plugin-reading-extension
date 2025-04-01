interface AppState {
  theme: 'light' | 'dark';
  fontSize: number;
  codeFontSize: number;
  readingMode: boolean;
  lineHeight: number;
  lineSpacing: number;
  letterSpacing: number;
  pageWidth: number; // 现在存储像素值而不是百分比
  textAlign: 'left' | 'center' | 'justify';
  firstLineIndent: boolean;
  showImages: boolean;
  showDirectory: boolean;
  paragraphSpacing: number;
}

const initialState: AppState = {
  theme: 'light',
  fontSize: 16,
  codeFontSize: 14,
  readingMode: false,
  lineHeight: 1.6,
  lineSpacing: 0.05,
  letterSpacing: 0.5,
  pageWidth: 800, // 默认宽度为 800px
  textAlign: 'left',
  firstLineIndent: true,
  showImages: true,
  showDirectory: true,
  paragraphSpacing: 1.0,
}; 