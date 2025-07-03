/**
 * 性能优化工具函数
 * 包含防抖和节流等高性能工具
 */

/**
 * 防抖函数 - 确保函数在一段时间内只执行一次
 * 常用于处理快速重复事件，如点击、输入等
 *
 * @param fn 要执行的函数
 * @param delay 延迟时间(毫秒)
 * @returns 防抖处理后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T, 
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timer: number | undefined;
  
  return function(...args: Parameters<T>): void {
    if (timer) {
      clearTimeout(timer);
    }
    
    timer = window.setTimeout(() => {
      fn(...args);
      timer = undefined;
    }, delay);
  };
}

/**
 * 节流函数 - 限制函数在一段时间内的执行频率
 * 常用于处理连续事件，如滚动、拖动等
 * 
 * @param fn 要执行的函数
 * @param limit 时间限制(毫秒)
 * @returns 节流处理后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T, 
  limit: number = 300
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  let lastArgs: Parameters<T> | undefined;
  
  return function(...args: Parameters<T>): void {
    lastArgs = args;
    
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs && lastArgs !== args) {
          fn(...lastArgs);
          lastArgs = undefined;
        }
      }, limit);
    }
  };
}

/**
 * RAF节流 - 使用requestAnimationFrame实现更平滑的节流
 * 适用于视觉相关的操作，与浏览器渲染周期同步
 * 
 * @param fn 要执行的函数
 * @returns 节流处理后的函数
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  fn: T
): (...args: Parameters<T>) => void {
  let scheduled = false;
  let lastArgs: Parameters<T>;
  
  return function(...args: Parameters<T>): void {
    lastArgs = args;
    
    if (!scheduled) {
      scheduled = true;
      
      requestAnimationFrame(() => {
        fn(...lastArgs);
        scheduled = false;
      });
    }
  };
} 