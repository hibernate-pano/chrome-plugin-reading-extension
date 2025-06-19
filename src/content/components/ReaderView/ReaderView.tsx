import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import styles from './ReaderView.module.css';
// import { extractContent } from '../../extractors'; // 删除此行
import { ExtractedContent } from '../../types';

interface ReaderViewProps {
  onClose: () => void;
}

const ReaderView: React.FC<ReaderViewProps> = ({ onClose }) => {
  const [content, setContent] = useState<ExtractedContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [theme, setTheme] = useState<'light' | 'dark'>('light'); // 删除此行
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // 处理初始主题设置 (不再需要，因为主题由 content.ts 统一管理)
  // useEffect(() => {
  //   const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  //   setTheme(prefersDark ? 'dark' : 'light');
  // }, []);

  // 内容提取 (现在应通过消息传递或 Web Worker 处理)
  useEffect(() => {
    const extractPageContent = async () => {
      setIsLoading(true);
      try {
        // 假设内容通过其他机制获取，这里仅模拟
        // const extractedContent = await extractContent(document); // 移除直接调用
        // setContent(extractedContent);
        // setError(null);
        setContent({ title: '无法自动提取，请切换到阅读模式', content: '<p>请确保您已点击插件图标启用阅读模式。</p>' });
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

  }, [content, isLoading]); // 移除 theme 依赖

  // 切换主题 (不再需要，因为主题由 content.ts 统一管理)
  // const toggleTheme = () => {
  //   setTheme(prev => prev === 'light' ? 'dark' : 'light');
  // };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    // 模拟重试逻辑，实际应通过消息传递或 Web Worker
    // extractContent(document)
    //   .then(extractedContent => {
    //     setContent(extractedContent);
    //     setIsLoading(false);
    //   })
    //   .catch(err => {
    //     console.error('内容提取重试失败:', err);
    //     setError('重试失败，请尝试刷新页面');
    //     setIsLoading(false);
    //   });
    setContent({ title: '无法自动提取，请切换到阅读模式', content: '<p>请确保您已点击插件图标启用阅读模式。</p>' });
    setIsLoading(false);
  };

  return (
    <div className={styles.readerView}> {/* 移除 data-theme={theme} */}
      <div className={styles.toolbar}>
        <button className={styles.closeButton} onClick={onClose} aria-label="关闭阅读模式">
          ✕
        </button>
        {/* 移除主题切换按钮 */}
        {/* <button className={styles.themeButton} onClick={toggleTheme} aria-label="切换主题">
          {theme === 'light' ? '🌙' : '☀️'}
        </button> */}
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
    </div>
  );
};

// 追踪当前阅读模式实例的ID，避免多个实例
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
  // readerContainer.setAttribute('data-theme', settings.theme); // Theme is now handled by content.ts
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
}

export default ReaderView; 