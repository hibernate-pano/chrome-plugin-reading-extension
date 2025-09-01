import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createRippleEffect, fadeInButton, fadeOutButton } from './buttonAnimations';

interface FloatingSettingsButtonProps {
  isVisible: boolean;
  onToggleSettings: () => void;
  isReadingModeActive: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center-right' | 'center-left';
}

/**
 * 优化后的浮动设置按钮组件
 * 
 * 新增特性：
 * - 触摸手势支持（点击、长按、滑动）
 * - 响应式设计，适配不同屏幕尺寸
 * - 平滑的动画效果和视觉反馈
 * - 增强的无障碍功能
 * - 智能位置调整和边界检测
 * - 移动端友好的交互体验
 */
export const FloatingSettingsButton: React.FC<FloatingSettingsButtonProps> = ({
  isVisible,
  onToggleSettings,
  isReadingModeActive,
  position = 'bottom-right'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [buttonSize, setButtonSize] = useState({ width: 48, height: 48 });
  const [currentPosition, setCurrentPosition] = useState(position);
  
  const buttonRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout>();
  const touchStartTimeRef = useRef<number>(0);
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 检测设备类型和屏幕尺寸
  useEffect(() => {
    const checkDeviceType = () => {
      const isMobileDevice = window.innerWidth <= 768 || 
                           'ontouchstart' in window || 
                           navigator.maxTouchPoints > 0;
      setIsMobile(isMobileDevice);
      
      // 根据屏幕尺寸调整按钮大小
      if (window.innerWidth <= 480) {
        setButtonSize({ width: 56, height: 56 });
      } else if (window.innerWidth <= 768) {
        setButtonSize({ width: 52, height: 52 });
      } else {
        setButtonSize({ width: 48, height: 48 });
      }
    };

    checkDeviceType();
    window.addEventListener('resize', checkDeviceType);
    return () => window.removeEventListener('resize', checkDeviceType);
  }, []);

  // 从本地存储恢复位置偏好
  useEffect(() => {
    const savedPosition = localStorage.getItem('reading-button-position');
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition);
        if (['bottom-right', 'bottom-left', 'top-right', 'top-left', 'center-right', 'center-left'].includes(parsed)) {
          setCurrentPosition(parsed);
        }
      } catch (e) {
        console.warn('Failed to restore button position:', e);
      }
    }
  }, []);

  // 保存位置偏好到本地存储
  const savePosition = useCallback((pos: string) => {
    try {
      localStorage.setItem('reading-button-position', JSON.stringify(pos));
    } catch (e) {
      console.warn('Failed to save button position:', e);
    }
  }, []);

  // 计算按钮位置
  const getButtonPosition = useCallback(() => {
    const margin = isMobile ? 16 : 24;
    const { width, height } = buttonSize;
    
    switch (currentPosition) {
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
  }, [currentPosition, buttonSize, isMobile]);

  // 触摸事件处理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartTimeRef.current = Date.now();
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    
    // 开始长按计时器
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressed(true);
      // 长按触发震动反馈（如果支持）
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 500);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);
    
    // 如果移动距离过大，取消长按
    if (deltaX > 10 || deltaY > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
      setIsLongPressed(false);
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - touchStartTimeRef.current;
    
    // 清除长按计时器
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    
    // 如果是长按，显示位置选择菜单
    if (isLongPressed) {
      e.preventDefault();
      showPositionMenu();
      setIsLongPressed(false);
      return;
    }
    
    // 短按触发设置面板
    if (touchDuration < 500) {
      onToggleSettings();
    }
    
    setIsLongPressed(false);
  }, [isLongPressed, onToggleSettings]);

  // 显示位置选择菜单
  const showPositionMenu = useCallback(() => {
    const positions = [
      { key: 'bottom-right', label: '右下角', icon: '↘️' },
      { key: 'bottom-left', label: '左下角', icon: '↙️' },
      { key: 'top-right', label: '右上角', icon: '↗️' },
      { key: 'top-left', label: '左上角', icon: '↖️' },
      { key: 'center-right', label: '右侧中央', icon: '➡️' },
      { key: 'center-left', label: '左侧中央', icon: '⬅️' }
    ];
    
    // 创建位置选择菜单
    const menu = document.createElement('div');
    menu.className = 'fixed z-[10006] bg-white/95 backdrop-blur-sm border rounded-lg shadow-xl p-2';
    menu.style.cssText = `
      left: ${getButtonPosition().right ? 'auto' : '16px'};
      right: ${getButtonPosition().right ? '16px' : 'auto'};
      top: ${getButtonPosition().bottom ? 'auto' : '16px'};
      bottom: ${getButtonPosition().bottom ? '16px' : 'auto'};
      transform: ${getButtonPosition().transform || 'none'};
    `;
    
    positions.forEach(pos => {
      const button = document.createElement('button');
      button.className = 'block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded transition-colors';
      button.innerHTML = `${pos.icon} ${pos.label}`;
      button.onclick = () => {
        setCurrentPosition(pos.key as any);
        savePosition(pos.key);
        menu.remove();
      };
      menu.appendChild(button);
    });
    
    // 添加关闭按钮
    const closeButton = document.createElement('button');
    closeButton.className = 'block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded transition-colors border-t mt-2';
    closeButton.innerHTML = '✕ 关闭';
    closeButton.onclick = () => menu.remove();
    menu.appendChild(closeButton);
    
    document.body.appendChild(menu);
    
    // 点击外部关闭菜单
    const handleClickOutside = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('click', handleClickOutside);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);
  }, [getButtonPosition, savePosition]);

  // 按钮进入动画
  useEffect(() => {
    if (isVisible && buttonRef.current) {
      fadeInButton(buttonRef.current, 300);
    }
  }, [isVisible]);

  // 按钮退出动画
  useEffect(() => {
    if (!isVisible && buttonRef.current) {
      fadeOutButton(buttonRef.current, 300);
    }
  }, [isVisible]);

  // 处理按钮点击
  const handleClick = useCallback((e: React.MouseEvent) => {
    // 创建波纹效果
    if (buttonRef.current) {
      createRippleEffect(buttonRef.current, e.clientX, e.clientY);
    }
    
    // 触发设置面板
    onToggleSettings();
  }, [onToggleSettings]);

  // 处理鼠标按下
  const handleMouseDown = useCallback(() => {
    setIsPressed(true);
  }, []);

  // 处理鼠标抬起
  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  // 处理鼠标进入
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  // 处理鼠标离开
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setIsPressed(false);
  }, []);

  if (!isVisible) return null;

  const positionStyles = getButtonPosition();

  return (
    <div 
      ref={buttonRef}
      className="fixed z-[10004] select-none"
      style={{ 
        ...positionStyles,
        width: buttonSize.width,
        height: buttonSize.height,
        pointerEvents: 'auto'
      }}
      role="button"
      tabIndex={0}
      aria-label="阅读设置按钮，点击打开设置面板，长按可选择按钮位置"
      aria-describedby="settings-button-description"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleSettings();
        }
      }}
    >
      <div id="settings-button-description" className="sr-only">
        浮动设置按钮，用于快速访问阅读设置。支持触摸操作，长按可选择按钮在屏幕上的位置。
      </div>
      
      <Button
        variant="default"
        size="icon"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn(
          "w-full h-full rounded-full shadow-lg transition-all duration-200",
          "bg-white/90 backdrop-blur-sm border border-gray-200",
          "hover:bg-white hover:shadow-xl hover:scale-110",
          "active:scale-95 active:shadow-lg",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          isReadingModeActive && "bg-blue-50 border-blue-200 shadow-blue-200",
          isHovered && "shadow-xl scale-110",
          isPressed && "scale-95 shadow-lg",
          isLongPressed && "scale-90 shadow-2xl",
          isMobile && "touch-manipulation"
        )}
        style={{
          width: buttonSize.width,
          height: buttonSize.height
        }}
      >
        <div className="flex flex-col items-center justify-center space-y-1">
          <span className={cn(
            "transition-all duration-200",
            isLongPressed && "animate-pulse"
          )}>
            {isReadingModeActive ? '📖' : '⚙️'}
          </span>
          
          {/* 悬停时显示标签 */}
          {(isHovered || isMobile) && (
            <span className={cn(
              "text-xs text-gray-600 font-medium transition-all duration-200",
              isMobile ? "text-sm" : "text-xs"
            )}>
              {isReadingModeActive ? '阅读中' : '设置'}
            </span>
          )}
          
          {/* 长按指示器 */}
          {isLongPressed && (
            <span className="text-xs text-blue-600 font-medium animate-pulse">
              选择位置
            </span>
          )}
        </div>
        
        {/* 状态指示器 */}
        {isReadingModeActive && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        )}
        
        {/* 触摸提示（仅在移动端显示） */}
        {isMobile && (
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 text-center whitespace-nowrap">
            长按选择位置
          </div>
        )}
      </Button>
    </div>
  );
}; 