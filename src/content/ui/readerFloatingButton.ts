function createFloatingButton() {
  // 创建退出按钮
  const button = document.createElement('button');
  button.id = 'reading-mode-exit-button';
  button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6L6 18"></path>
      <path d="M6 6l12 12"></path>
    </svg>
    <span>退出阅读模式</span>
  `;
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    padding: 10px 20px;
    background-color: var(--reading-accent-color, #3b82f6);
    color: white;
    border: none;
    border-radius: 30px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    opacity: 0.85;
    display: flex;
    align-items: center;
    gap: 8px;
    backdrop-filter: blur(4px);
    animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both;
  `;

  // 添加动画样式
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translate(-50%, 20px);
      }
      to {
        opacity: 0.85;
        transform: translate(-50%, 0);
      }
    }
  `;
  document.head.appendChild(style);

  // 添加事件监听器
  button.addEventListener('mouseover', () => {
    button.style.opacity = '1';
    button.style.transform = 'translateX(-50%) scale(1.05)';
    button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
  });

  button.addEventListener('mouseout', () => {
    button.style.opacity = '0.85';
    button.style.transform = 'translateX(-50%) scale(1)';
    button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  });

  button.addEventListener('click', () => {
    // 添加退出动画
    document.getElementById('panbo-reader-view')?.classList.add('exit-animation');

    // 延迟退出，以便显示动画
    setTimeout(() => {
      // disableReadingMode(); // 这个调用需要在 content.ts 中处理
      // 触发一个自定义事件或消息，通知 content.ts 退出阅读模式
      window.postMessage({ type: 'EXIT_READING_MODE_REQUEST' }, '*');
    }, 300);
  });

  document.body.appendChild(button);
}

function removeFloatingButton() {
  const button = document.getElementById('reading-mode-exit-button');
  if (button) {
    button.remove();
  }
}

export { createFloatingButton, removeFloatingButton }; 