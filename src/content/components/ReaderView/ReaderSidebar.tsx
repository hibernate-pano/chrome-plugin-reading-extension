import React, { useState } from 'react';
import styles from './ReaderSidebar.module.css';

interface ReaderSidebarProps {
  onClose: () => void;
  onFontSizeChange: (size: 'small' | 'medium' | 'large') => void;
  onThemeChange: (theme: 'light' | 'dark' | 'sepia' | 'yellow') => void;
  onLineHeightChange: (height: 'tight' | 'normal' | 'loose') => void;
  currentFontSize: 'small' | 'medium' | 'large';
  currentTheme: 'light' | 'dark' | 'sepia' | 'yellow';
  currentLineHeight: 'tight' | 'normal' | 'loose';
}

const ReaderSidebar: React.FC<ReaderSidebarProps> = ({
  onClose,
  onFontSizeChange,
  onThemeChange,
  onLineHeightChange,
  currentFontSize,
  currentTheme,
  currentLineHeight
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300); // 等待动画完成
  };

  const fontSizeOptions = [
    { value: 'small', label: '小', icon: '🔤' },
    { value: 'medium', label: '中', icon: '🔤' },
    { value: 'large', label: '大', icon: '🔤' }
  ];

  const themeOptions = [
    { value: 'light', label: '白', icon: '☀️' },
    { value: 'dark', label: '黑', icon: '🌙' },
    { value: 'sepia', label: '黄', icon: '📜' },
    { value: 'yellow', label: '护眼', icon: '👁️' }
  ];

  const lineHeightOptions = [
    { value: 'tight', label: '紧凑', icon: '📏' },
    { value: 'normal', label: '正常', icon: '📏' },
    { value: 'loose', label: '宽松', icon: '📏' }
  ];

  return (
    <div className={`${styles.sidebar} ${isOpen ? styles.open : styles.closed}`}>
      <div className={styles.sidebarContent}>
        {/* 头部 */}
        <div className={styles.header}>
          <h3 className={styles.title}>阅读设置</h3>
          <button 
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="关闭设置"
          >
            ✕
          </button>
        </div>

        {/* 字体大小设置 */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>字体大小</h4>
          <div className={styles.buttonGroup}>
            {fontSizeOptions.map((option) => (
              <button
                key={option.value}
                className={`${styles.optionButton} ${
                  currentFontSize === option.value ? styles.active : ''
                }`}
                onClick={() => onFontSizeChange(option.value as 'small' | 'medium' | 'large')}
              >
                <span className={styles.icon}>{option.icon}</span>
                <span className={styles.label}>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 主题设置 */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>主题</h4>
          <div className={styles.buttonGroup}>
            {themeOptions.map((option) => (
              <button
                key={option.value}
                className={`${styles.optionButton} ${
                  currentTheme === option.value ? styles.active : ''
                }`}
                onClick={() => onThemeChange(option.value as 'light' | 'dark' | 'sepia' | 'yellow')}
              >
                <span className={styles.icon}>{option.icon}</span>
                <span className={styles.label}>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 行间距设置 */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>行间距</h4>
          <div className={styles.buttonGroup}>
            {lineHeightOptions.map((option) => (
              <button
                key={option.value}
                className={`${styles.optionButton} ${
                  currentLineHeight === option.value ? styles.active : ''
                }`}
                onClick={() => onLineHeightChange(option.value as 'tight' | 'normal' | 'loose')}
              >
                <span className={styles.icon}>{option.icon}</span>
                <span className={styles.label}>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 快捷操作 */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>快捷操作</h4>
          <div className={styles.quickActions}>
            <button className={styles.actionButton}>
              <span className={styles.icon}>📖</span>
              <span className={styles.label}>重置</span>
            </button>
            <button className={styles.actionButton}>
              <span className={styles.icon}>💾</span>
              <span className={styles.label}>保存</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReaderSidebar; 