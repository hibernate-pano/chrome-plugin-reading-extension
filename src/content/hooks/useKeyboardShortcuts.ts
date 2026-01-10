import { useEffect } from 'react';

/**
 * 键盘快捷键配置
 */
export interface KeyboardShortcuts {
  toggleReadingMode?: () => void;
  toggleSettings?: () => void;
  increaseFontSize?: () => void;
  decreaseFontSize?: () => void;
  toggleTheme?: () => void;
}

/**
 * 键盘快捷键Hook
 * 提供常用的阅读模式快捷键支持
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 如果焦点在输入框中，不处理快捷键
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ctrl/Cmd + Shift + R: 切换阅读模式
      if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        shortcuts.toggleReadingMode?.();
        return;
      }

      // Ctrl/Cmd + Shift + S: 切换设置面板
      if (event.ctrlKey && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        shortcuts.toggleSettings?.();
        return;
      }

      // Ctrl/Cmd + Shift + +(=): 增大字号
      if (event.ctrlKey && event.shiftKey && (event.key === '+' || event.key === '=')) {
        event.preventDefault();
        shortcuts.increaseFontSize?.();
        return;
      }

      // Ctrl/Cmd + Shift + -: 减小字号
      if (event.ctrlKey && event.shiftKey && event.key === '-') {
        event.preventDefault();
        shortcuts.decreaseFontSize?.();
        return;
      }

      // Ctrl/Cmd + Shift + T: 切换主题
      if (event.ctrlKey && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        shortcuts.toggleTheme?.();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
}
