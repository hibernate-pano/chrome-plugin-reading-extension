import React, { useState, useRef, useEffect } from 'react';
import Transition from './Transition';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
  maxWidth?: number | string;
  showArrow?: boolean;
  transitionType?: 'fade' | 'slide-up' | 'slide-down' | 'zoom';
}

/**
 * 动画提示组件
 */
const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 300,
  className = '',
  maxWidth = 200,
  showArrow = true,
  transitionType = 'fade'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 显示提示
  const showTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      updatePosition();
    }, delay);
  };

  // 隐藏提示
  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setIsVisible(false);
  };

  // 更新提示位置
  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    let top = 0;
    let left = 0;
    
    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - 8;
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'bottom':
        top = triggerRect.bottom + 8;
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        left = triggerRect.left - tooltipRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        left = triggerRect.right + 8;
        break;
    }
    
    // 确保提示不超出视口
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 水平边界检查
    if (left < 10) {
      left = 10;
    } else if (left + tooltipRect.width > viewportWidth - 10) {
      left = viewportWidth - tooltipRect.width - 10;
    }
    
    // 垂直边界检查
    if (top < 10) {
      top = 10;
    } else if (top + tooltipRect.height > viewportHeight - 10) {
      top = viewportHeight - tooltipRect.height - 10;
    }
    
    setTooltipPosition({ top, left });
  };

  // 处理窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (isVisible) {
        updatePosition();
      }
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [isVisible]);

  // 清理超时
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // 箭头样式
  const arrowStyles = {
    top: 'bottom-full border-t-gray-800 dark:border-t-gray-700 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'top-full border-b-gray-800 dark:border-b-gray-700 border-l-transparent border-r-transparent border-t-transparent',
    left: 'right-full border-l-gray-800 dark:border-l-gray-700 border-t-transparent border-r-transparent border-b-transparent',
    right: 'left-full border-r-gray-800 dark:border-r-gray-700 border-t-transparent border-l-transparent border-b-transparent'
  };

  return (
    <div className="inline-block">
      {/* 触发器 */}
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
      </div>

      {/* 提示内容 */}
      <div
        ref={tooltipRef}
        className="fixed z-50 pointer-events-none"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
          visibility: 'hidden' // 初始隐藏，但保留布局以便计算位置
        }}
      >
        <Transition
          show={isVisible}
          type={transitionType}
          duration={200}
        >
          <div
            className={`bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-md py-1 px-2 shadow-lg ${className}`}
            style={{ maxWidth }}
          >
            {content}
            
            {/* 箭头 */}
            {showArrow && (
              <div
                className={`absolute w-0 h-0 border-solid border-4 ${arrowStyles[position]}`}
                style={{
                  ...(position === 'top' && { bottom: '-8px', left: 'calc(50% - 4px)' }),
                  ...(position === 'bottom' && { top: '-8px', left: 'calc(50% - 4px)' }),
                  ...(position === 'left' && { right: '-8px', top: 'calc(50% - 4px)' }),
                  ...(position === 'right' && { left: '-8px', top: 'calc(50% - 4px)' })
                }}
              />
            )}
          </div>
        </Transition>
      </div>
    </div>
  );
};

export default Tooltip;
