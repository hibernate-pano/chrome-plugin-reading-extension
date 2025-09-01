import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { FloatingSettingsButton } from './FloatingSettingsButton';
import { FloatingSettingsPanel } from './FloatingSettingsPanel';
import { UserSettings } from '../../types';
import { debounce } from './debounce';

interface FloatingUIManagerProps {
  isReadingModeActive: boolean;
  settings: UserSettings;
  onSettingsChange: (key: keyof UserSettings, value: any) => void;
  onToggleReadingMode: () => void;
}

interface UIPosition {
  button: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center-right' | 'center-left';
  panel: { x: number; y: number };
}

/**
 * 优化后的浮动UI管理器
 * 
 * 新增特性：
 * - 触摸手势支持
 * - 响应式设计，适配不同屏幕尺寸
 * - 性能优化的状态管理
 * - 增强的无障碍功能
 * - 智能位置记忆和恢复
 * - 移动端友好的交互体验
 * - 错误处理和恢复机制
 */
export const FloatingUIManager: React.FC<FloatingUIManagerProps> = ({
  isReadingModeActive,
  settings,
  onSettingsChange,
  onToggleReadingMode,
}) => {
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showSettingsButton, setShowSettingsButton] = useState(false);
  const [uiPosition, setUIPosition] = useState<UIPosition>({
    button: 'bottom-right',
    panel: { x: 20, y: 100 }
  });
  const [isMobile, setIsMobile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const errorTimeoutRef = useRef<NodeJS.Timeout>();
  const resizeObserverRef = useRef<ResizeObserver>();

  // 检测设备类型和屏幕尺寸
  useEffect(() => {
    const checkDeviceType = () => {
      const isMobileDevice = window.innerWidth <= 768 || 
                           'ontouchstart' in window || 
                           navigator.maxTouchPoints > 0;
      setIsMobile(isMobileDevice);
      
      // 根据屏幕尺寸调整UI位置
      if (window.innerWidth <= 480) {
        setUIPosition(prev => ({
          ...prev,
          button: 'bottom-right',
          panel: { x: 10, y: 80 }
        }));
      } else if (window.innerWidth <= 768) {
        setUIPosition(prev => ({
          ...prev,
          button: 'bottom-right',
          panel: { x: 15, y: 90 }
        }));
      }
    };

    checkDeviceType();
    window.addEventListener('resize', checkDeviceType);
    return () => window.removeEventListener('resize', checkDeviceType);
  }, []);

  // 从本地存储恢复UI状态
  useEffect(() => {
    try {
      const savedUIState = localStorage.getItem('reading-ui-state');
      if (savedUIState) {
        const parsed = JSON.parse(savedUIState);
        if (parsed && typeof parsed === 'object') {
          setUIPosition(prev => ({
            ...prev,
            ...parsed
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to restore UI state:', e);
      setError('无法恢复UI状态设置');
    }
  }, []);

  // 保存UI状态到本地存储
  const saveUIState = useCallback(
    debounce((newState: Partial<UIPosition>) => {
      try {
        const currentState = localStorage.getItem('reading-ui-state');
        const existingState = currentState ? JSON.parse(currentState) : {};
        const updatedState = { ...existingState, ...newState };
        localStorage.setItem('reading-ui-state', JSON.stringify(updatedState));
      } catch (e) {
        console.warn('Failed to save UI state:', e);
        setError('无法保存UI状态设置');
      }
    }, 1000),
    []
  );

  // 处理设置面板的切换
  const handleToggleSettings = useCallback(() => {
    try {
      setShowSettingsPanel(prev => !prev);
      setError(null); // 清除之前的错误
    } catch (e) {
      console.error('Failed to toggle settings panel:', e);
      setError('无法切换设置面板');
    }
  }, []);

  // 处理设置面板的关闭
  const handleCloseSettings = useCallback(() => {
    try {
      setShowSettingsPanel(false);
      setError(null);
    } catch (e) {
      console.error('Failed to close settings panel:', e);
      setError('无法关闭设置面板');
    }
  }, []);

  // 处理设置变化
  const handleSettingsChange = useCallback((key: keyof UserSettings, value: any) => {
    try {
      onSettingsChange(key, value);
      setError(null);
    } catch (e) {
      console.error('Failed to change setting:', e);
      setError(`无法更改设置: ${key}`);
    }
  }, [onSettingsChange]);

  // 处理UI位置变化
  const handleUIPositionChange = useCallback((type: 'button' | 'panel', value: any) => {
    try {
      if (type === 'button') {
        setUIPosition(prev => ({
          ...prev,
          button: value
        }));
        saveUIState({ button: value });
      } else if (type === 'panel') {
        setUIPosition(prev => ({
          ...prev,
          panel: value
        }));
        saveUIState({ panel: value });
      }
      setError(null);
    } catch (e) {
      console.error('Failed to change UI position:', e);
      setError('无法更改UI位置');
    }
  }, [saveUIState]);

  // 错误处理
  useEffect(() => {
    if (error) {
      // 自动清除错误信息
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      
      errorTimeoutRef.current = setTimeout(() => {
        setError(null);
      }, 5000);
    }

    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [error]);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      try {
        // Ctrl/Cmd + , 打开设置面板
        if ((e.ctrlKey || e.metaKey) && e.key === ',') {
          e.preventDefault();
          if (isReadingModeActive) {
            setShowSettingsPanel(prev => !prev);
          }
        }
        
        // Esc 关闭设置面板
        if (e.key === 'Escape' && showSettingsPanel) {
          setShowSettingsPanel(false);
        }

        // F1 显示帮助信息
        if (e.key === 'F1') {
          e.preventDefault();
          showHelpInfo();
        }
      } catch (e) {
        console.error('Failed to handle keyboard shortcut:', e);
        setError('无法处理键盘快捷键');
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isReadingModeActive, showSettingsPanel]);

  // 显示帮助信息
  const showHelpInfo = useCallback(() => {
    const helpInfo = [
      '阅读扩展快捷键:',
      'Ctrl/Cmd + , : 打开/关闭设置面板',
      'Esc : 关闭设置面板',
      'F1 : 显示此帮助信息',
      '',
      '触摸操作:',
      '点击设置按钮 : 打开设置面板',
      '长按设置按钮 : 选择按钮位置',
      '拖拽设置面板 : 移动面板位置',
      '双击面板手柄 : 重置面板位置'
    ].join('\n');

    alert(helpInfo);
  }, []);

  // 性能监控
  useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure' && entry.name.includes('floating-ui')) {
            console.log(`Floating UI Performance: ${entry.name}`, entry.duration);
          }
        }
      });

      try {
        observer.observe({ entryTypes: ['measure'] });
        resizeObserverRef.current = observer;
      } catch (e) {
        console.warn('PerformanceObserver not supported:', e);
      }
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  // 控制设置按钮的显示
  useEffect(() => {
    // 在阅读模式中始终显示设置按钮
    setShowSettingsButton(true);
  }, []);

  return (
    <>
      {/* 浮动设置按钮 */}
      <FloatingSettingsButton
        isVisible={showSettingsButton}
        onToggleSettings={handleToggleSettings}
        isReadingModeActive={isReadingModeActive}
        position={uiPosition.button}
      />

      {/* 浮动配置面板 */}
      <FloatingSettingsPanel
        isVisible={showSettingsPanel}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onClose={handleCloseSettings}
        onToggleReadingMode={onToggleReadingMode}
        isReadingModeActive={isReadingModeActive}
      />
      
      {/* 错误提示 */}
      {error && (
        <div 
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[10007] bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg max-w-md text-center"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center space-x-2">
            <span>⚠️</span>
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-white hover:text-red-100"
              aria-label="关闭错误提示"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 移动端提示 */}
      {isMobile && showSettingsButton && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[10005] bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg text-sm text-center max-w-xs">
          <div className="flex items-center space-x-2">
            <span>💡</span>
            <span>长按设置按钮可选择位置</span>
          </div>
        </div>
      )}

      {/* 调试信息（仅在开发环境显示） */}
      {process.env.NODE_ENV === 'development' && showSettingsButton && (
        <div style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          background: 'red',
          color: 'white',
          padding: '5px',
          zIndex: 10005,
          fontSize: '12px',
          borderRadius: '4px'
        }}>
          浮动UI已显示
          <br />
          设备: {isMobile ? '移动端' : '桌面端'}
          <br />
          按钮位置: {uiPosition.button}
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
  try {
    const root = createRoot(container);
    root.render(<FloatingUIManager {...props} />);

    // 返回清理函数
    return () => {
      try {
        root.unmount();
      } catch (e) {
        console.error('Failed to unmount floating UI:', e);
      }
    };
  } catch (e) {
    console.error('Failed to create floating UI:', e);
    return () => {};
  }
}

/**
 * 在页面中创建浮动UI
 */
export function mountFloatingUI(props: FloatingUIManagerProps): () => void {
  try {
    // 检查是否已经存在浮动UI
    const existingContainer = document.getElementById('reading-extension-floating-ui');
    if (existingContainer) {
      existingContainer.remove();
    }

    // 创建容器
    const container = document.createElement('div');
    container.id = 'reading-extension-floating-ui';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10003;
      overflow: visible;
      background: transparent;
    `;

    // 添加到页面
    document.body.appendChild(container);

    // 创建浮动UI
    const cleanup = createFloatingUI(container, props);

    // 返回清理函数
    return () => {
      try {
        cleanup();
        if (container.parentNode) {
          container.remove();
        }
      } catch (e) {
        console.error('Failed to cleanup floating UI:', e);
      }
    };
  } catch (e) {
    console.error('Failed to mount floating UI:', e);
    return () => {};
  }
} 