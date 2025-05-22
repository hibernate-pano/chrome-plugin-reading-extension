import React, { useState, useEffect } from 'react';

export interface TransitionProps {
  show: boolean;
  children: React.ReactNode;
  type?: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'zoom' | 'none';
  duration?: number;
  className?: string;
  onEnter?: () => void;
  onEntered?: () => void;
  onExit?: () => void;
  onExited?: () => void;
}

/**
 * 过渡动画组件
 */
const Transition: React.FC<TransitionProps> = ({
  show,
  children,
  type = 'fade',
  duration = 300,
  className = '',
  onEnter,
  onEntered,
  onExit,
  onExited
}) => {
  const [shouldRender, setShouldRender] = useState(show);
  const [animationClass, setAnimationClass] = useState('');

  // 动画类型映射
  const transitionClasses = {
    enter: {
      'fade': 'opacity-0',
      'slide-up': 'opacity-0 translate-y-4',
      'slide-down': 'opacity-0 -translate-y-4',
      'slide-left': 'opacity-0 translate-x-4',
      'slide-right': 'opacity-0 -translate-x-4',
      'zoom': 'opacity-0 scale-95',
      'none': ''
    },
    enterActive: {
      'fade': 'opacity-100',
      'slide-up': 'opacity-100 translate-y-0',
      'slide-down': 'opacity-100 translate-y-0',
      'slide-left': 'opacity-100 translate-x-0',
      'slide-right': 'opacity-100 translate-x-0',
      'zoom': 'opacity-100 scale-100',
      'none': ''
    },
    exit: {
      'fade': 'opacity-100',
      'slide-up': 'opacity-100 translate-y-0',
      'slide-down': 'opacity-100 translate-y-0',
      'slide-left': 'opacity-100 translate-x-0',
      'slide-right': 'opacity-100 translate-x-0',
      'zoom': 'opacity-100 scale-100',
      'none': ''
    },
    exitActive: {
      'fade': 'opacity-0',
      'slide-up': 'opacity-0 translate-y-4',
      'slide-down': 'opacity-0 -translate-y-4',
      'slide-left': 'opacity-0 translate-x-4',
      'slide-right': 'opacity-0 -translate-x-4',
      'zoom': 'opacity-0 scale-95',
      'none': ''
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (show) {
      setShouldRender(true);
      onEnter?.();
      
      // 进入动画
      setAnimationClass(transitionClasses.enter[type]);
      
      // 确保 DOM 更新后再添加动画类
      timeoutId = setTimeout(() => {
        setAnimationClass(transitionClasses.enterActive[type]);
        
        // 动画完成后触发回调
        setTimeout(() => {
          onEntered?.();
        }, duration);
      }, 10);
    } else {
      onExit?.();
      
      // 退出动画
      setAnimationClass(transitionClasses.exit[type]);
      
      // 确保 DOM 更新后再添加动画类
      timeoutId = setTimeout(() => {
        setAnimationClass(transitionClasses.exitActive[type]);
        
        // 动画完成后移除元素
        setTimeout(() => {
          setShouldRender(false);
          onExited?.();
        }, duration);
      }, 10);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [show, type, duration, onEnter, onEntered, onExit, onExited]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={`transition-all timing-md-standard ${animationClass} ${className}`}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
};

export default Transition;
