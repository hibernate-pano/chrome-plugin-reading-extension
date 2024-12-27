import { initializeDefaultSettings } from '../storage/storage';

// 插件安装或更新时初始化设置
chrome.runtime.onInstalled.addListener(async () => {
  await initializeDefaultSettings();
});

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.action === 'INJECT_CONTENT_SCRIPT') {
    if (sender.tab?.id) {
      chrome.scripting.executeScript({
        target: { tabId: sender.tab.id },
        files: ['src/content/content.js']
      });
    }
  }
}); 