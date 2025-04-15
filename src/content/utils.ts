import { ReadingModeSettings } from './types';
import { FONT_FAMILIES, BACKGROUND_COLORS } from '../storage/storage';

/**
 * 更新阅读模式样式 - 使用 CSS 变量
 * 这个函数提供了一种使用 CSS 变量设置阅读模式样式的方法
 */
export function updateReadingModeStyles(settings: ReadingModeSettings): void {
  const root = document.documentElement;
  
  // 设置 CSS 变量
  root.style.setProperty('--reading-font-size', `${settings.fontSize}px`);
  root.style.setProperty('--reading-line-height', settings.lineHeight.toString());
  root.style.setProperty('--reading-letter-spacing', `${settings.letterSpacing}px`);
  root.style.setProperty('--reading-page-width', `${settings.pageWidth}px`);
  root.style.setProperty('--reading-line-spacing', `${settings.lineSpacing}rem`);
  root.style.setProperty('--reading-paragraph-spacing', `${settings.paragraphSpacing}rem`);
  
  // 设置字体
  root.style.setProperty('--reading-font-family', FONT_FAMILIES[settings.fontFamily]);
  
  // 设置背景颜色
  root.style.setProperty('--reading-bg-color', BACKGROUND_COLORS[settings.backgroundColor]);
  root.style.setProperty('--reading-content-bg-color', settings.theme === 'dark' ? '#1a1a1a' : '#ffffff');
  root.style.setProperty('--reading-content-shadow', settings.theme === 'dark' ? '0 1px 3px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.1)');
  
  // 设置文本对齐方式
  const container = document.querySelector('.reading-mode-content');
  if (container instanceof HTMLElement) {
    container.style.textAlign = settings.textAlign || 'left';
  }
  
  // 设置首行缩进
  root.style.setProperty('--reading-first-line-indent', settings.firstLineIndent ? '2em' : '0');
}
