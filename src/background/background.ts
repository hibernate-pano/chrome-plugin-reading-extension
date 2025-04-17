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

// 监听扩展图标点击事件
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  try {
    // 检查当前标签页的阅读模式状态
    chrome.tabs.sendMessage(
      tab.id,
      { action: 'GET_READING_MODE_STATE' },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('获取阅读模式状态时发生错误:', chrome.runtime.lastError);
          // 如果出错，默认打开弹出窗口
          chrome.action.setPopup({ tabId: tab.id, popup: 'index.html' });
          return;
        }

        if (response && response.isReadingMode) {
          // 如果已经在阅读模式，设置点击时打开弹出窗口
          chrome.action.setPopup({ tabId: tab.id, popup: 'index.html' });
        } else {
          // 如果不在阅读模式，设置点击时不打开弹出窗口
          chrome.action.setPopup({ tabId: tab.id, popup: '' });

          // 直接切换到阅读模式
          chrome.tabs.sendMessage(
            tab.id,
            { action: 'TOGGLE_READING_MODE' },
            (toggleResponse) => {
              if (chrome.runtime.lastError || !toggleResponse?.success) {
                console.error('切换阅读模式失败:', chrome.runtime.lastError || toggleResponse?.error);
              } else {
                // 切换成功后，设置弹出窗口，以便用户可以再次点击图标打开设置
                chrome.action.setPopup({ tabId: tab.id, popup: 'index.html' });
              }
            }
          );
        }
      }
    );
  } catch (error) {
    console.error('处理扩展图标点击时发生错误:', error);
  }
});
