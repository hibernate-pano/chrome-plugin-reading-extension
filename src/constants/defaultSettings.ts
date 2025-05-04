import { StorageKeys, FONT_FAMILIES, BACKGROUND_COLORS, CODE_THEMES } from '../storage/storage';
import {
  DEFAULT_LINE_HEIGHT,
  DEFAULT_LINE_SPACING,
  DEFAULT_PARAGRAPH_SPACING
} from './options';

/**
 * 统一的默认设置对象
 * 作为所有设置的单一来源
 */
export const DEFAULT_SETTINGS = {
  theme: 'light' as 'light' | 'dark',
  fontSize: 18,
  codeFontSize: 14,
  codeTheme: 'github' as keyof typeof CODE_THEMES,
  lineHeight: DEFAULT_LINE_HEIGHT,
  lineSpacing: DEFAULT_LINE_SPACING,
  letterSpacing: 0,
  pageWidth: 1200,
  textAlign: 'justify' as 'left' | 'center' | 'right' | 'justify',
  firstLineIndent: false,
  showImages: true,
  showDirectory: true,
  fontFamily: 'songti' as keyof typeof FONT_FAMILIES,
  backgroundColor: 'warm' as keyof typeof BACKGROUND_COLORS,
  paragraphSpacing: DEFAULT_PARAGRAPH_SPACING,
  debug: false
};

/**
 * 获取完整的默认设置
 * 用于确保所有设置都有默认值
 */
export function getCompleteSettings<T extends Partial<typeof DEFAULT_SETTINGS>>(
  partialSettings: T
): typeof DEFAULT_SETTINGS {
  return {
    ...DEFAULT_SETTINGS,
    ...partialSettings
  };
}
