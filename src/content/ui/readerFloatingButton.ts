/**
 * 阅读模式浮动按钮组件
 * 超轻量级、高性能的浮动按钮实现
 */

import { debounce, throttle } from './debounce';
import { fadeInButton, fadeOutButton, createRippleEffect, toggleLoadingState } from './buttonAnimations';

// 避免导入完整常量文件，直接使用所需常量
const TOGGLE_READER_MODE = 'TOGGLE_READER_MODE';

// 内部状态
interface ButtonState {
  element: HTMLElement | null;
  observer: IntersectionObserver | null;
  isVisible: boolean;
  isReaderMode: boolean;
}

const state: ButtonState = {
  element: null,
  observer: null,
  isVisible: false,
  isReaderMode: false
};

/**
 * 创建浮动按钮（高性能版）
 * 
 * 优化点:
 * 1. 移除不必要的导入
 * 2. 减少样式属性
 * 3. 使用更高效的DOM操作
 * 4. 实现防抖点击处理
 * 5. 使用IntersectionObserver监控可见性
 * 6. 使用requestAnimationFrame确保平滑渲染
 */
export function createFloatingButton(): void {
  // 检查按钮是否已存在
  if (state.element || document.getElementById('r-btn')) return;

  // 使用requestAnimationFrame确保按钮创建不阻塞主线程
  requestAnimationFrame(() => {
    // 创建按钮元素
    const btn = document.createElement('button');
    btn.id = 'r-btn';
    btn.textContent = '阅读';
    state.element = btn;
    
    // 只应用必要的样式
    const s = btn.style;
    s.position = 'fixed';
    s.bottom = '20px';
    s.right = '20px';
    s.zIndex = '9999';
    s.padding = '6px 10px';
    s.backgroundColor = '#4285f4';
    s.color = '#fff';
    s.border = 'none';
    s.borderRadius = '4px';
    s.opacity = '0.85';
    s.cursor = 'pointer';
    s.transform = 'translateZ(0)'; // 启用GPU加速
    s.willChange = 'opacity'; // 提示浏览器优化渲染
    
    // 使用防抖处理点击事件
    const handleClick = debounce((event) => {
      // 防止重复点击
      if (btn.dataset.processing === 'true') return;
      
      // 设置处理中状态
      btn.dataset.processing = 'true';
      
      // 创建点击波纹效果
      if (event instanceof MouseEvent) {
        createRippleEffect(btn, event.clientX, event.clientY);
      } else {
        createRippleEffect(btn);
      }
      
      // 显示加载状态
      toggleLoadingState(btn, true);
      
      // 发送消息
      chrome.runtime.sendMessage({ action: TOGGLE_READER_MODE }, (response) => {
        // 停止加载动画
        toggleLoadingState(btn, false);
        
        // 恢复按钮状态
        btn.dataset.processing = 'false';
        
        // 更新状态
        if (response && response.success) {
          state.isReaderMode = response.isReaderMode;
          updateButtonState(state.isReaderMode);
        }
      });
    }, 300);
    
    // 使用节流处理悬停事件
    const handleMouseover = throttle(() => { s.opacity = '1'; }, 100);
    const handleMouseout = throttle(() => { s.opacity = '0.85'; }, 100);
    
    // 添加事件监听
    btn.addEventListener('click', handleClick);
    btn.addEventListener('mouseover', handleMouseover);
    btn.addEventListener('mouseout', handleMouseout);
    
    // 添加到页面并设置透明度为0以便执行进入动画
    btn.style.opacity = '0';
    document.body.appendChild(btn);
    
    // 使用IntersectionObserver监控按钮可见性
    setupVisibilityObserver(btn);
    
    // 按钮进入动画效果
    fadeInButton(btn).catch(() => {
      // 失败时也确保按钮可见
      btn.style.opacity = '0.85';
    });
  });
}

/**
 * 设置按钮可见性监控
 */
function setupVisibilityObserver(button: HTMLElement): void {
  // 如果浏览器支持IntersectionObserver
  if ('IntersectionObserver' in window) {
    // 创建观察器
    state.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        state.isVisible = entry.isIntersecting;
      });
    }, { threshold: 0.5 });
    
    // 开始观察
    state.observer.observe(button);
  }
}

/**
 * 移除浮动按钮
 */
export function removeFloatingButton(): Promise<void> {
  return new Promise<void>(resolve => {
    // 停止监控
    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }
    
    // 获取按钮元素
    const btn = state.element || document.getElementById('r-btn');
    
    if (btn) {
      // 执行退出动画
      fadeOutButton(btn)
        .then(() => {
          // 移除元素
          btn.remove();
          if (state.element === btn) {
            state.element = null;
          }
          resolve();
        })
        .catch(() => {
          // 如果动画失败，直接移除
          btn.remove();
          if (state.element === btn) {
            state.element = null;
          }
          resolve();
        });
    } else {
      resolve();
    }
    
    // 重置状态
    state.isVisible = false;
    state.isReaderMode = false;
  });
}

/**
 * 更新按钮状态
 * @param isReaderMode 是否处于阅读模式
 */
export function updateButtonState(isReaderMode: boolean): void {
  // 更新内部状态
  state.isReaderMode = isReaderMode;
  
  // 更新按钮UI
  const updateUI = () => {
    const btn = state.element || document.getElementById('r-btn');
    if (btn) {
      // 使用requestAnimationFrame确保UI更新不阻塞主线程
      requestAnimationFrame(() => {
        btn.textContent = isReaderMode ? '退出' : '阅读';
        btn.style.backgroundColor = isReaderMode ? '#f44336' : '#4285f4';
        btn.dataset.processing = 'false';
      });
    }
  };
  
  // 如果按钮可见，立即更新UI
  if (state.isVisible) {
    updateUI();
  } else {
    // 否则等待下一帧更新
    requestAnimationFrame(updateUI);
  }
} 