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
  showArrow = false, // Default to false for Material Design
  transitionType = 'fade'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipInnerRef = useRef<HTMLDivElement>(null); // Ref for the actual tooltip content div for ID
  const tooltipRef = useRef<HTMLDivElement>(null); // Ref for the fixed positioned container
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const tooltipId = React.useId ? React.useId() : `tooltip-${Math.random().toString(36).substring(2, 9)}`;

  // 显示提示
  const showTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      // updatePosition will be called by useEffect when isVisible changes and tooltipInnerRef is available
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
  
  // Handle aria-describedby on trigger
  useEffect(() => {
    const triggerElement = triggerRef.current;
    if (triggerElement) {
      if (isVisible) {
        triggerElement.setAttribute('aria-describedby', tooltipId);
      } else {
        triggerElement.removeAttribute('aria-describedby');
      }
    }
    // Cleanup on unmount or if triggerElement changes (though not expected here)
    return () => {
      if (triggerElement) {
        triggerElement.removeAttribute('aria-describedby');
      }
    };
  }, [isVisible, tooltipId]);


  // 更新提示位置 - needs tooltipInnerRef for accurate measurement
  const updatePosition = () => {
    if (!triggerRef.current || !tooltipInnerRef.current) return; // Use tooltipInnerRef
    
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipInnerRef.current.getBoundingClientRect(); // Use tooltipInnerRef for size
    
    let top = 0;
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
    
    // Update position when isVisible changes and tooltip is rendered
    if (isVisible && tooltipInnerRef.current) {
      updatePosition();
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true); // Use capture phase for scroll
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isVisible]); // updatePosition will be called if isVisible is true

  // 清理超时
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Define a consistent dark gray for tooltip background, approximating Material's "inverse surface" or tooltip color.
  // e.g., Material Design uses #616161 (grey 700) for tooltips.
  // Using bg-gray-700 as an approximation if neutral-700 is not defined.
  const tooltipBgColor = 'bg-gray-700/90'; // Using Tailwind's gray-700 with 90% opacity.
  const tooltipTextColor = 'text-white';
  const tooltipPadding = 'px-3 py-1.5'; // 12px horizontal, 6px vertical
  const tooltipRounded = 'rounded-sm'; // 4dp
  const tooltipShadow = 'shadow-md'; // Approximating shadow-md-dp2

  // Arrow styles - will only be applied if showArrow is true
  // Arrow color needs to match the tooltipBgColor. This is tricky with Tailwind opacity modifiers.
  // For simplicity, if an arrow is shown, it will use a solid color that matches the tooltip's base color.
  const arrowBaseColor = 'border-gray-700'; // Matching the base of tooltipBgColor

  const arrowStyles = {
    top: `bottom-full border-t-${arrowBaseColor} border-l-transparent border-r-transparent border-b-transparent`,
    bottom: `top-full border-b-${arrowBaseColor} border-l-transparent border-r-transparent border-t-transparent`,
    left: `right-full border-l-${arrowBaseColor} border-t-transparent border-r-transparent border-b-transparent`,
    right: `left-full border-r-${arrowBaseColor} border-t-transparent border-l-transparent border-b-transparent`
  };
  
  // Ensure arrow dynamic classes are fully generated for Tailwind JIT
  // border-t-gray-700 border-b-gray-700 border-l-gray-700 border-r-gray-700

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
            ref={tooltipInnerRef} // Ref for the actual content box
            id={tooltipId}
            role="tooltip"
            className={`
              ${tooltipBgColor} ${tooltipTextColor} 
              text-sm 
              ${tooltipRounded} ${tooltipPadding} ${tooltipShadow}
              ${className}
            `}
            style={{ maxWidth }}
          >
            {content}
            
            {/* Arrow - Conditionally rendered */}
            {showArrow && (
              <div
                className={`absolute w-0 h-0 border-solid border-4 ${arrowStyles[position] || ''}`}
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
