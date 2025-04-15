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
  if (settings.theme === 'dark') {
    // 深色主题特殊处理
    root.style.setProperty('--reading-bg-color', '#121212');
    root.style.setProperty('--reading-content-bg-color', '#1e1e1e');
    root.style.setProperty('--reading-content-shadow', '0 2px 8px rgba(0, 0, 0, 0.5)');
    root.style.setProperty('--reading-text-color', '#e0e0e0');
    root.style.setProperty('--reading-heading-color', '#ffffff');
    root.style.setProperty('--reading-link-color', '#90caf9');
    root.style.setProperty('--reading-border-color', '#333333');
    root.style.setProperty('--reading-code-bg-color', '#2d2d2d');
    root.style.setProperty('--reading-blockquote-color', '#aaaaaa');
    root.style.setProperty('--reading-blockquote-border', '#444444');
    root.style.setProperty('--reading-table-border', '#444444');
    root.style.setProperty('--reading-table-header-bg', '#333333');
    root.style.setProperty('--reading-table-row-odd', '#262626');
    root.style.setProperty('--reading-table-row-even', '#2a2a2a');

    // 添加深色主题类
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');
  } else {
    // 浅色主题
    root.style.setProperty('--reading-bg-color', BACKGROUND_COLORS[settings.backgroundColor]);
    root.style.setProperty('--reading-content-bg-color', '#ffffff');
    root.style.setProperty('--reading-content-shadow', '0 1px 3px rgba(0, 0, 0, 0.1)');
    root.style.setProperty('--reading-text-color', '#2c3e50');
    root.style.setProperty('--reading-heading-color', '#1a1a1a');
    root.style.setProperty('--reading-link-color', '#1976d2');
    root.style.setProperty('--reading-border-color', '#e0e0e0');
    root.style.setProperty('--reading-code-bg-color', '#f5f5f5');
    root.style.setProperty('--reading-blockquote-color', '#666666');
    root.style.setProperty('--reading-blockquote-border', '#dddddd');
    root.style.setProperty('--reading-table-border', '#e0e0e0');
    root.style.setProperty('--reading-table-header-bg', '#f5f5f5');
    root.style.setProperty('--reading-table-row-odd', '#ffffff');
    root.style.setProperty('--reading-table-row-even', '#f9f9f9');

    // 添加浅色主题类
    document.body.classList.add('light-theme');
    document.body.classList.remove('dark-theme');
  }

  // 设置文本对齐方式
  const container = document.querySelector('.reading-mode-content');
  if (container instanceof HTMLElement) {
    container.style.textAlign = settings.textAlign || 'left';
  }

  // 设置首行缩进
  root.style.setProperty('--reading-first-line-indent', settings.firstLineIndent ? '2em' : '0');
}
