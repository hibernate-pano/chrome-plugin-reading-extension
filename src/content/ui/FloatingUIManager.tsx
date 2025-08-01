import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { FloatingSettingsButton } from './FloatingSettingsButton';
import { FloatingSettingsPanel } from './FloatingSettingsPanel';
import { UserSettings } from '../../types';

interface FloatingUIManagerProps {
  isReadingModeActive: boolean;
  settings: UserSettings;
  onSettingsChange: (key: keyof UserSettings, value: any) => void;
  onToggleReadingMode: () => void;
}

/**
 * 浮动UI管理器
 * 
 * 功能：
 * - 管理浮动设置按钮的显示/隐藏
 * - 管理配置面板的显示/隐藏
 * - 协调用户交互
 * - 处理键盘快捷键
 */
export const FloatingUIManager: React.FC<FloatingUIManagerProps> = ({
  isReadingModeActive,
  settings,
  onSettingsChange,
  onToggleReadingMode,
}) => {
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showSettingsButton, setShowSettingsButton] = useState(false);

  // 控制设置按钮的显示
  useEffect(() => {
    // 在阅读模式中始终显示设置按钮
    setShowSettingsButton(true);
  }, []);

  // 处理设置面板的切换
  const handleToggleSettings = () => {
    setShowSettingsPanel(!showSettingsPanel);
  };

  // 处理设置面板的关闭
  const handleCloseSettings = () => {
    setShowSettingsPanel(false);
  };

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + , 打开设置面板
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        if (isReadingModeActive) {
          setShowSettingsPanel(!showSettingsPanel);
        }
      }
      
      // Esc 关闭设置面板
      if (e.key === 'Escape' && showSettingsPanel) {
        setShowSettingsPanel(false);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isReadingModeActive, showSettingsPanel]);

  return (
    <>
      {/* 浮动设置按钮 */}
      <FloatingSettingsButton
        isVisible={showSettingsButton}
        onToggleSettings={handleToggleSettings}
        isReadingModeActive={isReadingModeActive}
      />

      {/* 浮动配置面板 */}
      <FloatingSettingsPanel
        isVisible={showSettingsPanel}
        settings={settings}
        onSettingsChange={onSettingsChange}
        onClose={handleCloseSettings}
        onToggleReadingMode={onToggleReadingMode}
        isReadingModeActive={isReadingModeActive}
      />
      
      {/* 调试信息 */}
      {showSettingsButton && (
        <div style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          background: 'red',
          color: 'white',
          padding: '5px',
          zIndex: 10005,
          fontSize: '12px'
        }}>
          浮动按钮已显示
        </div>
      )}
    </>
  );
};

/**
 * 创建并挂载浮动UI管理器
 */
export function createFloatingUI(
  container: HTMLElement,
  props: FloatingUIManagerProps
): () => void {
  const root = createRoot(container);
  root.render(<FloatingUIManager {...props} />);

  // 返回清理函数
  return () => {
    root.unmount();
  };
}

/**
 * 在页面中创建浮动UI
 */
export function mountFloatingUI(props: FloatingUIManagerProps): () => void {
  // 创建容器
  const container = document.createElement('div');
  container.id = 'reading-extension-floating-ui';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.pointerEvents = 'auto';
  container.style.zIndex = '10003';
  container.style.overflow = 'visible';
  container.style.background = 'transparent';
  container.style.pointerEvents = 'none';

  // 添加到页面
  document.body.appendChild(container);

  // 创建浮动UI
  const cleanup = createFloatingUI(container, props);

  // 返回清理函数
  return () => {
    cleanup();
    container.remove();
  };
} 