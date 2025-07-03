/**
 * 阅读模式浮动按钮组件
 * 提供一个轻量级的浮动按钮，用于激活阅读模式
 */

import { MESSAGE_TYPES } from '../../constants';

// 按钮状态
let isButtonVisible = false;

/**
 * 创建浮动按钮
 */
export function createFloatingButton(): void {
  // 如果按钮已存在，不重复创建
  if (isButtonVisible || document.getElementById('reading-mode-floating-button')) {
    return;
  }

  // 创建按钮元素
  const button = document.createElement('button');
  button.id = 'reading-mode-floating-button';
  button.textContent = '阅读模式';
  
  // 设置样式
  Object.assign(button.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: '9999',
    padding: '8px 12px',
    backgroundColor: '#4285f4',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
    fontSize: '14px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    transition: 'opacity 0.3s, transform 0.3s',
    opacity: '0.8'
  });

  // 鼠标悬停效果
  button.addEventListener('mouseover', () => {
    button.style.opacity = '1';
    button.style.transform = 'scale(1.05)';
  });

  button.addEventListener('mouseout', () => {
    button.style.opacity = '0.8';
    button.style.transform = 'scale(1)';
  });

  // 点击事件：发送消息给content script
  button.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: MESSAGE_TYPES.TOGGLE_READER_MODE
    });
  });

  // 添加到页面
  document.body.appendChild(button);
  isButtonVisible = true;
}

/**
 * 移除浮动按钮
 */
export function removeFloatingButton(): void {
  const button = document.getElementById('reading-mode-floating-button');
  if (button) {
    button.remove();
    isButtonVisible = false;
  }
}

/**
 * 更新按钮状态
 * @param isReaderMode 是否处于阅读模式
 */
export function updateButtonState(isReaderMode: boolean): void {
  const button = document.getElementById('reading-mode-floating-button');
  if (button) {
    button.textContent = isReaderMode ? '退出阅读模式' : '进入阅读模式';
    button.style.backgroundColor = isReaderMode ? '#f44336' : '#4285f4';
  }
} 