// import { ReadingModeSettings } from './types'; // 删除此行，ReadingModeSettings 不再在此文件使用
// import { FONT_FAMILIES, BACKGROUND_COLORS } from '../storage/storage'; // 删除此行

/**
 * 更新阅读模式样式 - 使用 CSS 变量
 * 这个函数提供了一种使用 CSS 变量设置阅读模式样式的方法
 * @param settings 阅读模式设置
 * @param isReadingMode 是否处于阅读模式
 */
export function updateReadingModeStyles(settings: ReadingModeSettings, isReadingMode: boolean = false): void {
  // 如果不在阅读模式下，不应用样式
  if (!isReadingMode) {
    return;
  }
  const root = document.documentElement;

  // 设置 CSS 变量
  root.style.setProperty('--reading-font-size', `${settings.fontSize}px`);
  root.style.setProperty('--reading-line-height', settings.lineHeight.toString());
  root.style.setProperty('--reading-letter-spacing', `${settings.letterSpacing}px`);
  root.style.setProperty('--reading-page-width', `${settings.pageWidth}px`);
  root.style.setProperty('--reading-line-spacing', `${settings.lineSpacing}rem`);
  root.style.setProperty('--reading-paragraph-spacing', `${settings.paragraphSpacing}rem`);
  root.style.setProperty('--reading-code-font-size', `${settings.codeFontSize || 14}px`);
  // 保持与代码块样式的兼容性
  root.style.setProperty('--code-font-size', `${settings.codeFontSize || 14}px`);
  root.style.setProperty('--list-font-size', `${settings.fontSize - 1}px`);
  root.style.setProperty('--list-line-height', `${settings.lineHeight + 0.1}`);

  // 设置字体
  root.style.setProperty('--reading-font-family', FONT_FAMILIES[settings.fontFamily]);

  // 设置动态内容宽度和内边距
  root.style.setProperty('--reading-content-padding', 'clamp(1rem, 5vw, 2rem)');

  // 设置滚动条颜色
  if (settings.theme === 'dark') {
    // 添加深色主题类，但只应用于阅读模式容器，而不是整个 body
    const readingContainer = document.getElementById('reading-mode-container');
    if (readingContainer) {
      readingContainer.classList.add('dark-theme');
      readingContainer.classList.remove('light-theme');
    }
    // 保留 body 类以兼容现有代码
    document.body.classList.add('dark-theme');
    document.body.classList.remove('light-theme');

    // 设置深色主题下的颜色变量
    root.style.setProperty('--reading-bg-color', 'var(--color-background)');
    root.style.setProperty('--reading-content-bg-color', 'var(--color-background-alt)');
    root.style.setProperty('--reading-text-color', 'var(--color-text)');
    root.style.setProperty('--reading-muted-color', 'var(--color-text-muted)');
    root.style.setProperty('--reading-border-color', 'var(--color-border)');
    root.style.setProperty('--reading-accent-color', 'var(--color-accent)');

    // 设置滚动条颜色
    root.style.setProperty('--reading-scrollbar-thumb', 'rgba(255, 255, 255, 0.2)');
    root.style.setProperty('--reading-scrollbar-thumb-hover', 'rgba(255, 255, 255, 0.3)');

    // 设置引用块颜色
    root.style.setProperty('--reading-blockquote-bg', 'rgba(255, 255, 255, 0.05)');
    root.style.setProperty('--reading-blockquote-border', 'rgba(255, 255, 255, 0.1)');
    root.style.setProperty('--reading-blockquote-text', 'rgba(255, 255, 255, 0.7)');
  } else {
    // 添加浅色主题类，但只应用于阅读模式容器，而不是整个 body
    const readingContainer = document.getElementById('reading-mode-container');
    if (readingContainer) {
      readingContainer.classList.add('light-theme');
      readingContainer.classList.remove('dark-theme');
    }
    // 保留 body 类以兼容现有代码
    document.body.classList.add('light-theme');
    document.body.classList.remove('dark-theme');

    // 设置浅色主题下的颜色变量
    root.style.setProperty('--reading-bg-color', BACKGROUND_COLORS[settings.backgroundColor]);
    root.style.setProperty('--reading-content-bg-color', 'var(--color-white)');
    root.style.setProperty('--reading-text-color', 'var(--color-text)');
    root.style.setProperty('--reading-muted-color', 'var(--color-text-muted)');
    root.style.setProperty('--reading-border-color', 'var(--color-border)');
    root.style.setProperty('--reading-accent-color', 'var(--color-accent)');

    // 设置滚动条颜色
    root.style.setProperty('--reading-scrollbar-thumb', 'rgba(0, 0, 0, 0.2)');
    root.style.setProperty('--reading-scrollbar-thumb-hover', 'rgba(0, 0, 0, 0.3)');

    // 设置引用块颜色
    root.style.setProperty('--reading-blockquote-bg', 'var(--color-gray-50)');
    root.style.setProperty('--reading-blockquote-border', 'var(--color-gray-300)');
    root.style.setProperty('--reading-blockquote-text', 'var(--color-gray-700)');
  }

  // 设置文本对齐方式
  const container = document.querySelector('.reading-mode-content');
  if (container instanceof HTMLElement) {
    container.style.textAlign = settings.textAlign || 'left';
  }

  // 根据目录显示状态调整容器位置
  const readingContainer = document.getElementById('reading-mode-container');
  if (readingContainer) {
    readingContainer.style.margin = settings.showDirectory ? '0 0 0 250px' : '0 auto';
  }

  // 设置首行缩进
  root.style.setProperty('--reading-first-line-indent', settings.firstLineIndent ? '2em' : '0');
}

// 这个文件现在应该只包含通用的、不与特定阅读模式功能绑定的工具函数
// 暂时留空，后续可能会添加其他通用工具函数
