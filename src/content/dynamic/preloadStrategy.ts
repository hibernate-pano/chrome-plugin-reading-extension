/**
 * 模块预加载策略
 * 在特定时机智能预加载模块，提升用户体验
 */

import { ModuleType, preloadModules } from './dynamicLoader';

// 预加载配置
interface PreloadConfig {
  enabled: boolean;        // 是否启用预加载
  useHeuristics: boolean;  // 是否使用启发式算法
  idleTimeout: number;     // 空闲时间超时(毫秒)
  visibilityCheck: boolean;// 是否检查页面可见性
}

// 默认配置
const defaultConfig: PreloadConfig = {
  enabled: true,
  useHeuristics: true,
  idleTimeout: 3000,
  visibilityCheck: true
};

// 当前配置
let config: PreloadConfig = { ...defaultConfig };

/**
 * 初始化预加载策略
 * @param customConfig 自定义配置
 */
export function initPreloadStrategy(customConfig?: Partial<PreloadConfig>): void {
  // 合并配置
  config = { ...defaultConfig, ...customConfig };
  
  if (!config.enabled) return;
  
  // 设置各种预加载触发器
  setupUserInteractionTriggers();
  setupIdleTriggers();
  setupVisibilityTriggers();
  setupScrollTriggers();
}

/**
 * 设置用户交互触发器
 */
function setupUserInteractionTriggers(): void {
  // 鼠标移动到浮动按钮附近
  document.addEventListener('mousemove', (event) => {
    if (!isButtonNearby(event)) return;
    
    // 用户可能要点击按钮，预加载核心模块
    preloadOnIdle(() => {
      preloadModules([ModuleType.READER_MODE], true);
    }, 300);
  }, { passive: true });
}

/**
 * 判断鼠标是否靠近浮动按钮
 */
function isButtonNearby(event: MouseEvent): boolean {
  const button = document.getElementById('r-btn');
  if (!button) return false;
  
  const rect = button.getBoundingClientRect();
  const padding = 100; // 检测区域比按钮大100px
  
  return (
    event.clientX >= rect.left - padding &&
    event.clientX <= rect.right + padding &&
    event.clientY >= rect.top - padding &&
    event.clientY <= rect.bottom + padding
  );
}

/**
 * 设置空闲时间触发器
 */
function setupIdleTriggers(): void {
  // 页面加载后的空闲时间
  const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, config.idleTimeout));
  
  idleCallback(() => {
    // 页面空闲时预加载工具模块
    if (document.visibilityState === 'visible' || !config.visibilityCheck) {
      preloadModules([ModuleType.UTILS], false);
    }
  });
}

/**
 * 设置可见性触发器
 */
function setupVisibilityTriggers(): void {
  if (!config.visibilityCheck) return;
  
  // 页面从隐藏变为可见时
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // 用户回到页面，可能会使用功能
      preloadOnIdle(() => {
        preloadModules([ModuleType.UI_COMPONENTS], false);
      }, 1000);
    }
  }, { passive: true });
}

/**
 * 设置滚动触发器
 */
function setupScrollTriggers(): void {
  // 使用防抖函数限制触发频率
  let scrollTimeout: number | undefined;
  
  window.addEventListener('scroll', () => {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    
    scrollTimeout = window.setTimeout(() => {
      // 用户滚动后停止，可能准备阅读
      if (isDeepScroll()) {
        preloadOnIdle(() => {
          preloadModules([ModuleType.READER_MODE, ModuleType.CONTENT_EXTRACTION], false);
        }, 2000);
      }
      
      scrollTimeout = undefined;
    }, 500);
  }, { passive: true });
}

/**
 * 判断是否深度滚动（用户可能在认真阅读）
 */
function isDeepScroll(): boolean {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const windowHeight = window.innerHeight;
  const documentHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight
  );
  
  // 滚动深度超过25%
  return scrollTop > windowHeight * 0.25 && scrollTop < documentHeight - windowHeight * 2;
}

/**
 * 在浏览器空闲时执行预加载
 */
function preloadOnIdle(callback: () => void, timeout: number = config.idleTimeout): void {
  const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, timeout));
  idleCallback(callback);
} 