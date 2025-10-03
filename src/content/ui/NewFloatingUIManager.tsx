import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { SimpleFloatingButton } from './SimpleFloatingButton';
import { ImprovedSettingsPanel } from './ImprovedSettingsPanel';
import { UserSettings } from '../../types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NewFloatingUIManagerProps {
  isReadingModeActive: boolean;
  settings: UserSettings;
  onSettingsChange: (key: keyof UserSettings, value: any) => void;
  onToggleReadingMode: () => void;
}

/**
 * 新版浮动UI管理器
 *
 * 改进点：
 * - 使用简化的浮动按钮
 * - 位置选择集成到设置面板
 * - 添加首次使用引导
 * - 减少不必要的提示
 */
export const NewFloatingUIManager: React.FC<NewFloatingUIManagerProps> = ({
  isReadingModeActive,
  settings,
  onSettingsChange,
  onToggleReadingMode,
}) => {
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [buttonPosition, setButtonPosition] = useState<string>('bottom-right');
  const [showWelcome, setShowWelcome] = useState(false);

  // 从本地存储恢复按钮位置
  useEffect(() => {
    const saved = localStorage.getItem('reading-button-position');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'string') {
          setButtonPosition(parsed);
        }
      } catch (e) {
        console.warn('Failed to restore button position');
      }
    }
  }, []);

  // 检查是否首次使用
  useEffect(() => {
    if (isReadingModeActive) {
      const isFirstTime = !localStorage.getItem('reading-extension-welcomed');
      if (isFirstTime) {
        setShowWelcome(true);
      }
    }
  }, [isReadingModeActive]);

  // 处理欢迎提示关闭
  const handleWelcomeClose = useCallback((dontShowAgain: boolean) => {
    setShowWelcome(false);
    if (dontShowAgain) {
      localStorage.setItem('reading-extension-welcomed', 'true');
    }
  }, []);

  // 处理设置面板切换
  const handleToggleSettings = useCallback(() => {
    setShowSettingsPanel(prev => !prev);
  }, []);

  // 处理按钮位置变化
  const handleButtonPositionChange = useCallback((position: string) => {
    setButtonPosition(position);
    try {
      localStorage.setItem('reading-button-position', JSON.stringify(position));
    } catch (e) {
      console.warn('Failed to save button position');
    }
  }, []);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
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
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isReadingModeActive, showSettingsPanel]);

  return (
    <>
      {/* 浮动设置按钮 */}
      <SimpleFloatingButton
        isVisible={isReadingModeActive}
        onToggleSettings={handleToggleSettings}
        isReadingModeActive={isReadingModeActive}
        position={buttonPosition as any}
      />

      {/* 设置面板 */}
      <ImprovedSettingsPanel
        isVisible={showSettingsPanel}
        settings={settings}
        onSettingsChange={onSettingsChange}
        onClose={() => setShowSettingsPanel(false)}
        onToggleReadingMode={onToggleReadingMode}
        isReadingModeActive={isReadingModeActive}
        currentButtonPosition={buttonPosition}
        onButtonPositionChange={handleButtonPositionChange}
      />

      {/* 欢迎引导 */}
      {showWelcome && (
        <WelcomeGuide onClose={handleWelcomeClose} />
      )}
    </>
  );
};

/**
 * 欢迎引导组件
 */
const WelcomeGuide: React.FC<{ onClose: (dontShowAgain: boolean) => void }> = ({ onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: '欢迎使用阅读模式 📖',
      content: '我们已为您优化了页面布局，让阅读更加舒适。',
      icon: '👋'
    },
    {
      title: '浮动设置按钮 ⚙️',
      content: '点击右下角的设置按钮，可以调整字体、主题等阅读设置。',
      icon: '🎯'
    },
    {
      title: '自定义按钮位置 📍',
      content: '在设置面板的"布局位置"标签页，可以调整按钮的位置。',
      icon: '🎨'
    },
    {
      title: '快捷键提示 ⌨️',
      content: '按 Ctrl/Cmd + , 可快速打开设置面板，按 Esc 关闭。',
      icon: '⚡'
    }
  ];

  const currentStep = steps[step];

  return (
    <div
      className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-guide-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-[90%] animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* 步骤指示器 */}
        <div className="flex justify-center mb-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-2 h-2 rounded-full mx-1 transition-all duration-300",
                index === step
                  ? "w-6 bg-blue-500"
                  : index < step
                    ? "bg-green-500"
                    : "bg-gray-300"
              )}
            />
          ))}
        </div>

        {/* 内容 */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">{currentStep.icon}</div>
          <h3 id="welcome-guide-title" className="text-xl font-bold text-gray-800 mb-2">
            {currentStep.title}
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            {currentStep.content}
          </p>
        </div>

        {/* 不再显示选项 */}
        {step === steps.length - 1 && (
          <div className="flex items-center justify-center mb-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">不再显示此引导</span>
            </label>
          </div>
        )}

        {/* 按钮 */}
        <div className="flex space-x-2">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="flex-1"
            >
              上一步
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              className="flex-1"
            >
              下一步
            </Button>
          ) : (
            <Button
              onClick={() => onClose(dontShowAgain)}
              className="flex-1"
            >
              开始使用
            </Button>
          )}
        </div>

        {/* 跳过按钮 */}
        {step < steps.length - 1 && (
          <button
            onClick={() => onClose(false)}
            className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            跳过引导
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * 创建并挂载新版浮动UI
 */
export function createNewFloatingUI(
  container: HTMLElement,
  props: NewFloatingUIManagerProps
): () => void {
  try {
    console.log('🎨 [FloatingUI] 创建React根节点...');
    const root = createRoot(container);
    console.log('🎨 [FloatingUI] 渲染React组件...');
    root.render(<NewFloatingUIManager {...props} />);
    console.log('✅ [FloatingUI] React组件渲染成功');

    return () => {
      try {
        console.log('🎨 [FloatingUI] 卸载React根节点');
        root.unmount();
      } catch (e) {
        console.error('❌ [FloatingUI] 卸载失败:', e);
      }
    };
  } catch (e) {
    console.error('❌ [FloatingUI] 创建失败:', e);
    return () => {};
  }
}

/**
 * 在页面中挂载新版浮动UI
 */
export function mountNewFloatingUI(props: NewFloatingUIManagerProps): () => void {
  try {
    console.log('🎨 [FloatingUI] 开始挂载浮动UI...', {
      isReadingModeActive: props.isReadingModeActive,
      settings: props.settings
    });

    // 移除旧的UI容器
    const existingContainer = document.getElementById('reading-extension-floating-ui');
    if (existingContainer) {
      console.log('🎨 [FloatingUI] 移除旧的UI容器');
      existingContainer.remove();
    }

    // 创建新容器
    const container = document.createElement('div');
    container.id = 'reading-extension-floating-ui';
    container.className = 'reading-extension-root'; // 添加命名空间类
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10003;
      overflow: visible;
    `;

    // 添加子容器
    const innerContainer = document.createElement('div');
    innerContainer.style.cssText = 'pointer-events: auto; width: 100%; height: 100%;';
    container.appendChild(innerContainer);

    // 添加到页面
    document.body.appendChild(container);
    console.log('🎨 [FloatingUI] 容器已添加到页面');

    // 创建浮动UI
    const cleanup = createNewFloatingUI(innerContainer, props);
    console.log('🎨 [FloatingUI] 浮动UI已创建');

    // 返回清理函数
    return () => {
      try {
        console.log('🎨 [FloatingUI] 清理浮动UI');
        cleanup();
        container.remove();
      } catch (e) {
        console.error('❌ [FloatingUI] 清理失败:', e);
      }
    };
  } catch (e) {
    console.error('❌ [FloatingUI] 挂载失败:', e);
    return () => {};
  }
}
