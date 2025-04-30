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

import { DEFAULT_SETTINGS } from '../constants/defaultSettings';

const initialState: AppState = {
  theme: DEFAULT_SETTINGS.theme,
  fontSize: DEFAULT_SETTINGS.fontSize,
  codeFontSize: DEFAULT_SETTINGS.codeFontSize,
  readingMode: false, // 这个不是持久化设置，始终默认为 false
  lineHeight: DEFAULT_SETTINGS.lineHeight,
  lineSpacing: DEFAULT_SETTINGS.lineSpacing,
  letterSpacing: DEFAULT_SETTINGS.letterSpacing,
  pageWidth: DEFAULT_SETTINGS.pageWidth,
  textAlign: DEFAULT_SETTINGS.textAlign,
  firstLineIndent: DEFAULT_SETTINGS.firstLineIndent,
  showImages: DEFAULT_SETTINGS.showImages,
  showDirectory: DEFAULT_SETTINGS.showDirectory,
  paragraphSpacing: DEFAULT_SETTINGS.paragraphSpacing,
};