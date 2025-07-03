/**
 * 浮动按钮动画辅助函数
 * 使用高性能动画实现平滑的视觉过渡
 */

import { rafThrottle } from './debounce';

/**
 * 按钮进入动画
 * @param element 按钮元素
 * @param duration 动画时长(毫秒)
 */
export function fadeInButton(element: HTMLElement, duration: number = 300): Promise<void> {
  return new Promise(resolve => {
    // 初始状态
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    
    // 获取开始时间
    const startTime = performance.now();
    
    // 动画函数
    const animate = (currentTime: number) => {
      // 计算动画进度 (0-1)
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 应用动画
      element.style.opacity = `${progress * 0.85}`;
      element.style.transform = `translateY(${(1 - progress) * 20}px)`;
      
      // 如果动画未完成，继续下一帧
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    };
    
    // 开始动画
    requestAnimationFrame(animate);
  });
}

/**
 * 按钮退出动画
 * @param element 按钮元素
 * @param duration 动画时长(毫秒)
 */
export function fadeOutButton(element: HTMLElement, duration: number = 300): Promise<void> {
  return new Promise(resolve => {
    // 获取初始状态
    const startOpacity = parseFloat(element.style.opacity) || 0.85;
    
    // 获取开始时间
    const startTime = performance.now();
    
    // 动画函数
    const animate = (currentTime: number) => {
      // 计算动画进度 (0-1)
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 应用动画
      element.style.opacity = `${startOpacity * (1 - progress)}`;
      element.style.transform = `translateY(${progress * 20}px)`;
      
      // 如果动画未完成，继续下一帧
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // 完成后隐藏元素
        element.style.display = 'none';
        resolve();
      }
    };
    
    // 开始动画
    requestAnimationFrame(animate);
  });
}

/**
 * 按钮点击波纹效果
 * @param element 按钮元素
 * @param x 点击位置X坐标
 * @param y 点击位置Y坐标
 */
export function createRippleEffect(element: HTMLElement, x?: number, y?: number): void {
  // 如果未提供坐标，使用元素中心点
  const rect = element.getBoundingClientRect();
  const left = x ? x - rect.left : rect.width / 2;
  const top = y ? y - rect.top : rect.height / 2;
  
  // 创建波纹元素
  const ripple = document.createElement('span');
  ripple.classList.add('button-ripple');
  
  // 设置波纹样式
  Object.assign(ripple.style, {
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: '50%',
    transform: 'scale(0)',
    animation: 'ripple 0.6s linear',
    pointerEvents: 'none'
  });
  
  // 添加波纹动画
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes ripple {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(styleSheet);
  
  // 添加波纹到按钮
  element.appendChild(ripple);
  
  // 动画结束后移除波纹
  setTimeout(() => {
    ripple.remove();
    styleSheet.remove();
  }, 600);
}

/**
 * 按钮旋转加载动画
 * @param element 按钮元素
 * @param isLoading 是否加载中
 */
export function toggleLoadingState(element: HTMLElement, isLoading: boolean): void {
  if (isLoading) {
    // 保存原始文字
    element.dataset.originalText = element.textContent || '';
    
    // 创建旋转点
    element.textContent = '';
    const dots = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let index = 0;
    
    // 设置加载状态
    element.dataset.loading = 'true';
    
    // 创建加载动画
    const animate = () => {
      if (element.dataset.loading === 'true') {
        element.textContent = `${dots[index]} 加载中`;
        index = (index + 1) % dots.length;
        setTimeout(animate, 80);
      }
    };
    
    // 启动动画
    animate();
  } else {
    // 恢复原始文字
    element.textContent = element.dataset.originalText || '阅读';
    element.dataset.loading = 'false';
  }
} 