/**
 * 全局动画样式
 * 提供流畅、现代的过渡效果
 */

export const animations = `
  /* 淡入动画 */
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* 从左滑入 */
  @keyframes slideInLeft {
    from {
      transform: translateX(-20px) translateY(-50%);
      opacity: 0;
    }
    to {
      transform: translateX(0) translateY(-50%);
      opacity: 1;
    }
  }

  /* 从右滑入 */
  @keyframes slideInRight {
    from {
      transform: translateX(20px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  /* 从上滑入 */
  @keyframes slideInTop {
    from {
      transform: translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  /* 缩放淡入 */
  @keyframes scaleIn {
    from {
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  /* 脉冲效果 */
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  /* 旋转 */
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* 弹跳 */
  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  /* 摇晃 */
  @keyframes shake {
    0%, 100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-5px);
    }
    75% {
      transform: translateX(5px);
    }
  }

  /* 工具类 */
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out;
  }

  .animate-slide-in-left {
    animation: slideInLeft 0.3s ease-out;
  }

  .animate-slide-in-right {
    animation: slideInRight 0.3s ease-out;
  }

  .animate-slide-in-top {
    animation: slideInTop 0.3s ease-out;
  }

  .animate-scale-in {
    animation: scaleIn 0.2s ease-out;
  }

  .animate-pulse {
    animation: pulse 2s ease-in-out infinite;
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  .animate-bounce {
    animation: bounce 1s ease-in-out infinite;
  }

  .animate-shake {
    animation: shake 0.5s ease-in-out;
  }

  /* 过渡效果 */
  .transition-smooth {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .transition-fast {
    transition: all 0.15s ease-out;
  }

  .transition-slow {
    transition: all 0.5s ease-in-out;
  }
`;

/**
 * 注入动画样式到页面
 */
export function injectAnimations() {
  const styleId = 'reading-extension-animations';

  // 避免重复注入
  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = animations;
  document.head.appendChild(style);
}
