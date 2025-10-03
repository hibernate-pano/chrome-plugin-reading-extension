import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createRippleEffect } from './buttonAnimations';

interface SimpleFloatingButtonProps {
  isVisible: boolean;
  onToggleSettings: () => void;
  isReadingModeActive: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center-right' | 'center-left';
}

/**
 * 简化的浮动设置按钮
 *
 * 设计理念：
 * - 单一功能：点击打开/关闭设置面板
 * - 清晰的视觉反馈
 * - 响应式设计
 * - 无复杂手势
 */
export const SimpleFloatingButton: React.FC<SimpleFloatingButtonProps> = ({
  isVisible,
  onToggleSettings,
  isReadingModeActive,
  position = 'bottom-right'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [buttonSize, setButtonSize] = useState({ width: 56, height: 56 });
  const buttonRef = useRef<HTMLDivElement>(null);

  // 组件挂载时的日志
  useEffect(() => {
    console.log('🔘 [FloatingButton] 组件挂载', { isVisible, position, isReadingModeActive });
  }, []);

  useEffect(() => {
    console.log('🔘 [FloatingButton] 可见性变化:', isVisible);
  }, [isVisible]);

  // 根据屏幕尺寸调整按钮大小
  useEffect(() => {
    const updateSize = () => {
      if (window.innerWidth <= 480) {
        setButtonSize({ width: 64, height: 64 });
      } else if (window.innerWidth <= 768) {
        setButtonSize({ width: 60, height: 60 });
      } else {
        setButtonSize({ width: 56, height: 56 });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 计算按钮位置
  const getButtonPosition = useCallback(() => {
    const margin = window.innerWidth <= 768 ? 16 : 24;

    switch (position) {
      case 'bottom-right':
        return { right: margin, bottom: margin };
      case 'bottom-left':
        return { left: margin, bottom: margin };
      case 'top-right':
        return { right: margin, top: margin };
      case 'top-left':
        return { left: margin, top: margin };
      case 'center-right':
        return { right: margin, top: '50%', transform: 'translateY(-50%)' };
      case 'center-left':
        return { left: margin, top: '50%', transform: 'translateY(-50%)' };
      default:
        return { right: margin, bottom: margin };
    }
  }, [position]);

  // 处理点击
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (buttonRef.current) {
      createRippleEffect(buttonRef.current, e.clientX, e.clientY);
    }
    onToggleSettings();
  }, [onToggleSettings]);

  if (!isVisible) return null;

  const positionStyles = getButtonPosition();

  return (
    <div
      ref={buttonRef}
      className="fixed z-[10004] select-none group"
      style={{
        ...positionStyles,
        width: buttonSize.width,
        height: buttonSize.height,
      }}
      role="button"
      tabIndex={0}
      aria-label="打开阅读设置面板"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleSettings();
        }
      }}
    >
      <Button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "w-full h-full rounded-full shadow-lg transition-all duration-300",
          "bg-white/90 backdrop-blur-sm border-2",
          "hover:bg-white hover:shadow-2xl hover:scale-110",
          "active:scale-95",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          isReadingModeActive
            ? "border-blue-400 shadow-blue-200"
            : "border-gray-300 shadow-gray-200"
        )}
        style={{
          width: buttonSize.width,
          height: buttonSize.height
        }}
      >
        <div className="flex flex-col items-center justify-center space-y-0.5">
          {/* 图标 */}
          <span className={cn(
            "text-2xl transition-transform duration-300",
            isHovered && "scale-110"
          )}>
            {isReadingModeActive ? '📖' : '⚙️'}
          </span>

          {/* 文字提示 */}
          <span className={cn(
            "text-xs font-medium transition-opacity duration-300",
            isReadingModeActive ? "text-blue-600" : "text-gray-600",
            isHovered ? "opacity-100" : "opacity-0"
          )}>
            设置
          </span>
        </div>

        {/* 状态指示器 */}
        {isReadingModeActive && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </Button>

      {/* 悬停提示（仅桌面端） */}
      {isHovered && window.innerWidth > 768 && (
        <div
          className={cn(
            "absolute bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-10",
            "animate-in fade-in slide-in-from-bottom-2 duration-200",
            position.includes('right') ? "right-full mr-3" : "left-full ml-3"
          )}
          style={{
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        >
          点击打开设置面板
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-0 h-0 border-4",
              position.includes('right')
                ? "right-[-8px] border-l-gray-900 border-y-transparent border-r-transparent"
                : "left-[-8px] border-r-gray-900 border-y-transparent border-l-transparent"
            )}
          />
        </div>
      )}
    </div>
  );
};
