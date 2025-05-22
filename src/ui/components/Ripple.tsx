import React, { useState, useEffect } from 'react';

export interface RippleProps {
  color?: string;
  duration?: number;
  className?: string;
}

/**
 * 水波纹动画组件
 * 用于按钮点击和其他交互的视觉反馈
 */
const Ripple: React.FC<RippleProps> = ({
  color = 'rgba(255, 255, 255, 0.3)',
  duration = 300, // Adjusted default duration to be faster
  className = ''
}) => {
  const [ripples, setRipples] = useState<Array<{
    id: number;
    x: number;
    y: number;
    size: number;
  }>>([]);

  // 添加水波纹
  const addRipple = (event: React.MouseEvent<HTMLDivElement>) => {
    const rippleContainer = event.currentTarget.getBoundingClientRect();
    const size = Math.max(rippleContainer.width, rippleContainer.height);
    const x = event.clientX - rippleContainer.left - size / 2;
    const y = event.clientY - rippleContainer.top - size / 2;
    const id = Date.now();

    setRipples([...ripples, { id, x, y, size }]);
  };

  // 移除水波纹
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (ripples.length > 0) {
      timeoutId = setTimeout(() => {
        setRipples(ripples.slice(1));
      }, duration);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [ripples, duration]);

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      onClick={addRipple}
    >
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute rounded-full opacity-0 animate-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            backgroundColor: color,
            animationDuration: `${duration}ms`
          }}
        />
      ))}
    </div>
  );
};

// 添加到全局样式
const addRippleStyles = () => {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ripple {
      0% {
        transform: scale(0);
        opacity: 0.5;
      }
      100% {
        transform: scale(1);
        opacity: 0;
      }
    }
    
    .animate-ripple {
      animation-name: ripple;
      animation-timing-function: ease-out;
    }
  `;
  document.head.appendChild(style);
};

// 添加样式
addRippleStyles();

export default Ripple;
