import { initializeDefaultSettings } from '../storage/storage';
import { MESSAGE_TYPES } from '../constants';
import { readingProgressModel } from '../storage/models/ReadingProgressModel';
import { ReadingProgress } from '../content/components/ReaderView/types';

// 插件安装或更新时初始化设置
chrome.runtime.onInstalled.addListener(async () => {
  await initializeDefaultSettings();
});

// 安装事件监听器
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('扩展已安装');
    // 可以在这里执行首次安装的初始化操作
  } else if (details.reason === 'update') {
    console.log('扩展已更新');
    // 可以在这里执行更新后的操作
  }
});

// 监听来自内容脚本或弹出窗口的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('后台收到消息:', message);
  
  // 标记是否会异步发送响应
  let asyncResponse = false;

  if (message.action === MESSAGE_TYPES.SAVE_READING_PROGRESS) {
    asyncResponse = true;
    
    // 保存阅读进度
    const progress: ReadingProgress = message.progress;
    
    readingProgressModel.saveProgress(progress)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error: Error) => {
        console.error('保存阅读进度失败:', error);
        sendResponse({ success: false, error: error.message });
      });
  }
  
  // 返回true表示将异步发送响应
  return asyncResponse;
});

// 监听扩展图标点击事件
chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  
  // 向内容脚本发送消息，切换阅读模式
  chrome.tabs.sendMessage(tab.id, { action: MESSAGE_TYPES.TOGGLE_READER_MODE })
    .then(response => {
      console.log('切换阅读模式响应:', response);
      
      // 根据当前状态更新图标
      if (response && response.isReadingMode) {
        chrome.action.setIcon({
          path: {
            16: "/icons/active-16.png",
            32: "/icons/active-32.png",
            48: "/icons/active-48.png",
            128: "/icons/active-128.png"
          },
          tabId: tab.id
        });
      } else {
        chrome.action.setIcon({
          path: {
            16: "/icons/inactive-16.png",
            32: "/icons/inactive-32.png",
            48: "/icons/inactive-48.png",
            128: "/icons/inactive-128.png"
          },
          tabId: tab.id
        });
      }
    })
    .catch(error => {
      console.error('发送切换阅读模式消息失败:', error);
    });
});
