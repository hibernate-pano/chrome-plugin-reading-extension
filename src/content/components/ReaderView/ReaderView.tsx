import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import styles from './ReaderView.module.css';
import { ExtractedContent } from '../../types';
import { readingProgressModel } from '../../../storage/models/ReadingProgressModel';
import { ReadingProgress } from './types';
import { FloatingUIManager, mountFloatingUI } from '../../ui/FloatingUIManager';
import { UserSettings } from '../../../types';

interface ReaderViewProps {
  onClose: () => void;
}

const ReaderView: React.FC<ReaderViewProps> = ({ onClose }) => {
  const [content, setContent] = useState<ExtractedContent | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia' | 'yellow'>('light');
  const [lineHeight, setLineHeight] = useState<'tight' | 'normal' | 'loose'>('normal');
  
  // 浮动UI相关状态
  const [settings, setSettings] = useState<UserSettings>({
    fontSize: 16,
    lineHeight: 1.6,
    fontFamily: 'default',
    theme: 'light',
    paragraphSpacing: 1.2,
    pageWidth: 800,
    backgroundColor: 'white',
    presets: [],
    activePreset: null,
  });
  
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const currentUrl = window.location.href;
  const saveProgressIntervalRef = useRef<number | null>(null);
  const [initialScrollApplied, setInitialScrollApplied] = useState<boolean>(false);

  // 提取内容的函数
  const extractContent = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 使用chrome.runtime.sendMessage发送消息给background.js
      const response = await chrome.runtime.sendMessage({
        action: 'EXTRACT_CONTENT',
        url: window.location.href
      });

      if (response.success) {
        setContent(response.content);
      } else {
        setError(response.error || '提取内容失败');
      }
    } catch (err) {
      setError('提取内容时发生错误');
      console.error('提取内容错误:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 重试提取内容
  const handleRetry = () => {
    extractContent();
  };

  // 保存阅读进度
  const saveReadingProgress = () => {
    if (!contentContainerRef.current || !content) return;

    const scrollPosition = contentContainerRef.current.scrollTop;
    const progress: ReadingProgress = {
      url: currentUrl,
      scrollPosition,
      lastRead: Date.now(),
      title: content.title || document.title
    };

    readingProgressModel.saveProgress(progress)
      .catch(err => console.error('保存阅读进度失败:', err));
  };

  // 恢复阅读进度
  const restoreReadingProgress = async () => {
    if (!contentContainerRef.current || !content || initialScrollApplied) return;

    try {
      const progress = await readingProgressModel.getProgress(currentUrl);
      if (progress && progress.scrollPosition) {
        contentContainerRef.current.scrollTop = progress.scrollPosition;
        setInitialScrollApplied(true);
      }
    } catch (err) {
      console.error('恢复阅读进度失败:', err);
    }
  };

  // 处理字体大小变化
  const handleFontSizeChange = (size: 'small' | 'medium' | 'large') => {
    setFontSize(size);
    applyReadingStyles();
  };

  // 处理主题变化
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'sepia' | 'yellow') => {
    setTheme(newTheme);
    applyReadingStyles();
  };

  // 处理行间距变化
  const handleLineHeightChange = (height: 'tight' | 'normal' | 'loose') => {
    setLineHeight(height);
    applyReadingStyles();
  };

  // 处理浮动UI设置变更
  const handleSettingsChange = (key: keyof UserSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    applyReadingStyles();
  };

  // 处理阅读模式切换
  const handleToggleReadingMode = () => {
    // 这里可以添加阅读模式的切换逻辑
    console.log('Toggle reading mode');
  };

  // 应用阅读样式
  const applyReadingStyles = () => {
    const container = contentContainerRef.current;
    if (!container) return;

    // 字体大小映射
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };

    // 行间距映射
    const lineHeightMap = {
      tight: '1.4',
      normal: '1.6',
      loose: '1.8'
    };

    // 主题样式映射
    const themeStyles = {
      light: {
        background: '#ffffff',
        color: '#1f2937'
      },
      dark: {
        background: '#1f2937',
        color: '#f9fafb'
      },
      sepia: {
        background: '#f5f2e9',
        color: '#4a3728'
      },
      yellow: {
        background: '#fffbf0',
        color: '#78350f'
      }
    };

    // 应用样式
    container.style.fontSize = fontSizeMap[fontSize];
    container.style.lineHeight = lineHeightMap[lineHeight];
    container.style.background = themeStyles[theme].background;
    container.style.color = themeStyles[theme].color;

    // 更新CSS变量
    document.documentElement.style.setProperty('--reading-font-size', fontSizeMap[fontSize]);
    document.documentElement.style.setProperty('--reading-line-height', lineHeightMap[lineHeight]);
    document.documentElement.style.setProperty('--reading-background', themeStyles[theme].background);
    document.documentElement.style.setProperty('--reading-color', themeStyles[theme].color);
  };

  // 组件挂载时提取内容
  useEffect(() => {
    extractContent();

    // 组件卸载时保存阅读进度
    return () => {
      if (saveProgressIntervalRef.current) {
        window.clearInterval(saveProgressIntervalRef.current);
      }
      saveReadingProgress();
    };
  }, []);

  // 内容加载完成后恢复阅读进度
  useEffect(() => {
    if (content && !isLoading) {
      restoreReadingProgress();
    }
  }, [content, isLoading]);

  // 设置定期保存阅读进度的定时器
  useEffect(() => {
    if (content && !isLoading) {
      // 每30秒保存一次阅读进度
      saveProgressIntervalRef.current = window.setInterval(saveReadingProgress, 30000);
    }

    return () => {
      if (saveProgressIntervalRef.current) {
        window.clearInterval(saveProgressIntervalRef.current);
      }
    };
  }, [content, isLoading]);

  // 监听beforeunload事件，在页面关闭前保存阅读进度
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveReadingProgress();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // 应用样式到代码块
  useEffect(() => {
    if (!content || isLoading) return;

    // 使用CSS变量统一设置代码块样式，避免直接修改行内样式
    const codeBlocks = document.querySelectorAll('.readerView pre, .readerView code');
    codeBlocks.forEach(block => {
      // 清除可能存在的行内样式，完全依赖CSS变量
      if (block.hasAttribute('style')) {
        block.removeAttribute('style');
      }
    });

  }, [content, isLoading]);

  // 内容加载完成后应用初始样式
  useEffect(() => {
    if (content && !isLoading) {
      applyReadingStyles();
    }
  }, [content, isLoading]);



  return (
    <div className={styles.readerView}>
      <div className={styles.toolbar}>
        <button className={styles.closeButton} onClick={onClose} aria-label="关闭阅读模式">
          ✕
        </button>
      </div>

      <div className={styles.contentContainer} ref={contentContainerRef}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>正在提取内容...</p>
          </div>
        ) : error ? (
          <div className={styles.errorContainer}>
            <h3>提取内容时出错</h3>
            <p>{error}</p>
            <button className={styles.retryButton} onClick={handleRetry}>
              重试
            </button>
          </div>
        ) : !content ? (
          <div className={styles.emptyState}>
            <p>无法提取有效内容</p>
            <button className={styles.extractButton} onClick={handleRetry}>
              重试
            </button>
          </div>
        ) : (
          <div className={styles.articleContainer}>
            <h1 className={styles.articleTitle}>{content.title}</h1>
            <div className={styles.articleMeta}>
              {content.author && <span>作者: {content.author}</span>}
            </div>
            <div 
              className={styles.articleContent}
              dangerouslySetInnerHTML={{ __html: content.content }}
            />
          </div>
        )}
      </div>

      {/* 浮动UI管理器 */}
      <FloatingUIManager
        isReadingModeActive={true}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onToggleReadingMode={handleToggleReadingMode}
      />
    </div>
  );
};

// 创建阅读视图的函数
export function createReaderView(): void {
  // 检查是否已经存在阅读视图
  const existingReader = document.getElementById('reader-view');
  if (existingReader) {
    existingReader.remove();
  }

  // 创建容器
  const readerContainer = document.createElement('div');
  readerContainer.id = 'reader-view';
  readerContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9997;
    background: rgba(255, 255, 255, 0.95);
    overflow: visible;
    pointer-events: none;
  `;

  // 添加到页面
  document.body.appendChild(readerContainer);

  // 创建React根节点
  const root = createRoot(readerContainer);

  // 挂载浮动UI
  const cleanupFloatingUI = mountFloatingUI({
    isReadingModeActive: true,
    settings: {
      fontSize: 16,
      lineHeight: 1.6,
      fontFamily: 'default',
      theme: 'light',
      paragraphSpacing: 1.2,
      pageWidth: 800,
      backgroundColor: 'white',
      presets: [],
      activePreset: null,
    },
    onSettingsChange: (key, value) => {
      console.log('Settings changed:', key, value);
    },
    onToggleReadingMode: () => {
      console.log('Toggle reading mode');
    },
  });

  // 渲染阅读视图组件
  root.render(
    <ReaderView
      onClose={() => {
        cleanupFloatingUI();
        root.unmount();
        readerContainer.remove();
      }}
    />
  );
}

// 清理阅读视图的函数
export function cleanupReaderView(): void {
  const readerContainer = document.getElementById('reader-view');
  if (readerContainer) {
    readerContainer.remove();
  }
  
  // 清理浮动UI
  const floatingUIContainer = document.getElementById('reading-extension-floating-ui');
  if (floatingUIContainer) {
    floatingUIContainer.remove();
  }
} 