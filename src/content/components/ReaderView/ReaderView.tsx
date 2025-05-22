import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import styles from './ReaderView.module.css';
import { extractContent } from '../../extractors';
import { ExtractedContent } from '../../types';

interface ReaderViewProps {
  onClose: () => void;
}

const ReaderView: React.FC<ReaderViewProps> = ({ onClose }) => {
import Button from '../../../../src/ui/components/Button'; // Adjusted path
import Menu, { MenuItem } from '../../../../src/ui/components/Menu'; // Adjusted path
import { SettingsPanel } from '../../../../src/popup/components/SettingsPanel'; // Import SettingsPanel

// Helper for SVG Icons (placeholders for now, ideally use real SVGs)
const IconPlaceholder = ({ name, className = "w-6 h-6" }: { name: string, className?: string }) => (
  <span className={className}>{name}</span>
);


const ReaderView: React.FC<ReaderViewProps> = ({ onClose }) => {
  const [content, setContent] = useState<ExtractedContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('light');
  const [isFabExpanded, setIsFabExpanded] = useState(false); // FAB state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // State for Settings Drawer
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const readerViewContainerRef = useRef<HTMLDivElement | null>(null);
  const moreMenuTriggerRef = useRef<HTMLButtonElement>(null);


  // Effect to find the root container for theme attribute
  useEffect(() => {
    if (contentContainerRef.current) {
      const container = contentContainerRef.current.closest('.reader-view-container');
      if (container instanceof HTMLDivElement) {
        readerViewContainerRef.current = container;
      }
    }
  }, []);


  // 处理初始主题设置 & Update data-theme attribute on the container
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = prefersDark ? 'dark' : 'light';
    setTheme(initialTheme);
    
    // Moved theme application to a separate effect to handle theme changes
  }, []);

  useEffect(() => {
    if (readerViewContainerRef.current) {
      readerViewContainerRef.current.setAttribute('data-theme', theme);
    }
    // Fallback or if targeting body/document element for global themes
    // document.body.setAttribute('data-theme', theme); 
    // document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // 内容提取
  useEffect(() => {
    const extractPageContent = async () => {
      setIsLoading(true);
      try {
        const extractedContent = await extractContent(document);
        setContent(extractedContent);
        setError(null);
      } catch (err) {
        console.error('内容提取失败:', err);
        setError('无法提取页面内容');
      } finally {
        setIsLoading(false);
      }
    };

    extractPageContent();
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

  }, [content, isLoading, theme]);

  // 切换主题 - cycle through light, dark, sepia
  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'sepia';
      return 'light';
    });
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    extractContent(document)
      .then(extractedContent => {
        setContent(extractedContent);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('内容提取重试失败:', err);
        setError('重试失败，请尝试刷新页面');
        setIsLoading(false);
      });
  };

  // Determine icon for theme button
  const getThemeIcon = () => {
    if (theme === 'light') return '🌙'; // Moon for switching to dark
    if (theme === 'dark') return '🎨'; // Palette for switching to sepia (or sun if only 2 themes)
    return '☀️'; // Sun for switching to light
  };

  };

  return (
    <div className={styles.readerView}>
      {/* Old toolbar removed */}

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
              {content.date && <span>日期: {new Date(content.date).toLocaleDateString()}</span>}
              {content.readingTime && <span>阅读时间: {content.readingTime} 分钟</span>}
            </div>
            <div
              className={styles.articleContent}
              dangerouslySetInnerHTML={{ __html: content.content }}
            />
          </div>
        )}
      </div>

      {/* FAB Container */}
      <div className={styles.fabContainer}>
        {isFabExpanded && (
          <div className={`${styles.fabActions} ${styles.fabActionsVisible}`}>
            {/* Settings Action */}
            <Button
              variant="contained"
              color="primary"
              className={`${styles.fabActionItem} rounded-full !w-12 !h-12`}
              onClick={() => { setIsSettingsOpen(true); setIsFabExpanded(false); }}
              aria-label="Settings"
              aria-haspopup="true" // For drawer/dialog
              aria-expanded={isSettingsOpen}
            >
              <IconPlaceholder name="S" />
            </Button>
             {/* Font Size Action */}
             <Button
              variant="contained"
              color="primary"
              className={`${styles.fabActionItem} rounded-full !w-12 !h-12`}
              onClick={() => console.log('Font size clicked')}
              aria-label="Adjust font size"
            >
              <IconPlaceholder name="Aa" />
            </Button>
            {/* Theme Switch Action */}
            <Button
              variant="contained"
              color="primary"
              className={`${styles.fabActionItem} rounded-full !w-12 !h-12`}
              onClick={toggleTheme}
              aria-label="Switch theme"
            >
              <IconPlaceholder name={getThemeIcon()} />
            </Button>
             {/* Close Action */}
             <Button
              variant="contained"
              color="primary" // Or perhaps 'error' or a neutral color
              className={`${styles.fabActionItem} rounded-full !w-12 !h-12`}
              onClick={onClose}
              aria-label="Close reader view"
            >
              <IconPlaceholder name="X" />
            </Button>
            {/* More Actions Menu Trigger */}
            <Menu
              trigger={
                <Button
                  ref={moreMenuTriggerRef}
                  variant="contained"
                  color="primary"
                  className={`${styles.fabActionItem} rounded-full !w-12 !h-12`}
                  aria-label="More options"
                >
                  <IconPlaceholder name="..." />
                </Button>
              }
              position="top-right" 
              closeOnClick={true}
            >
              <MenuItem onClick={() => console.log('Toggle TOC')}>Toggle Table of Contents</MenuItem>
              <MenuItem onClick={() => console.log('Toggle Fullscreen')}>Toggle Fullscreen</MenuItem>
            </Menu>
          </div>
        )}
        <Button
          variant="contained"
          color="secondary"
          className={`${styles.mainFab} rounded-full !w-14 !h-14 shadow-md-dp6`}
          onClick={() => setIsFabExpanded(!isFabExpanded)}
          aria-expanded={isFabExpanded}
          aria-label={isFabExpanded ? "Close actions menu" : "Open actions menu"}
        >
          {/* Change icon based on expanded state: + when closed, X or ^ when open */}
          <IconPlaceholder name={isFabExpanded ? "✕" : "+"} />
        </Button>
      </div>

      <SettingsPanel 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
};

// Track current reader view instance ID to avoid multiple instances
let currentReaderViewId: string | null = null;

// 用于存储原始样式的全局变量
let originalOverflowStyle: string | null = null;
let originalBodyOverflowStyle: string | null = null;

export function createReaderView(): void {
  // 如果已经存在阅读模式，先清理它
  cleanupReaderView();

  // 生成唯一ID
  const readerViewId = `reader-view-${Date.now()}`;
  currentReaderViewId = readerViewId;

  // 保存原始溢出状态
  originalOverflowStyle = document.documentElement.style.overflow;
  originalBodyOverflowStyle = document.body.style.overflow;

  // 防止页面滚动
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  // 创建容器
  const readerContainer = document.createElement('div');
  readerContainer.id = readerViewId;
  readerContainer.setAttribute('class', 'reader-view-container');
  document.body.appendChild(readerContainer);

  // 渲染组件
  const root = createRoot(readerContainer);
  root.render(
    <ReaderView
      onClose={() => {
        if (readerViewId === currentReaderViewId) {
          cleanupReaderView();
        }
      }}
    />
  );
}

export function cleanupReaderView(): void {
  // 查找当前的阅读模式容器
  const existingContainer = currentReaderViewId 
    ? document.getElementById(currentReaderViewId)
    : document.querySelector('.reader-view-container');

  if (existingContainer) {
    // 卸载React组件
    const root = existingContainer._reactRootContainer;
    if (root) {
      // @ts-ignore - 尝试使用未公开的卸载方法
      if (typeof root.unmount === 'function') root.unmount();
    }

    // 移除容器元素
    existingContainer.remove();
  }

  // 恢复原始溢出样式
  if (originalOverflowStyle !== null) {
    document.documentElement.style.overflow = originalOverflowStyle;
  } else {
    document.documentElement.style.removeProperty('overflow');
  }

  if (originalBodyOverflowStyle !== null) {
    document.body.style.overflow = originalBodyOverflowStyle;
  } else {
    document.body.style.removeProperty('overflow');
  }

  // 清除文档级别的主题设置
  document.documentElement.removeAttribute('data-theme');
  
  // 重置当前阅读模式ID
  currentReaderViewId = null;
  
  // 重置原始样式引用
  originalOverflowStyle = null;
  originalBodyOverflowStyle = null;
  
  // Ensure data-theme is removed from the active container if it was set there by ID
  // The global documentElement.removeAttribute('data-theme') might be too broad if other things use it.
  // However, if we set it on the specific reader container, this is handled by its removal.
}

export default ReaderView;