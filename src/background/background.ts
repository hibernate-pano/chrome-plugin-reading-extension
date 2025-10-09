import { initializeDefaultSettings } from '../storage/storage';
import { MESSAGE_TYPES } from '../constants';
import { readingProgressModel } from '../storage/models/ReadingProgressModel';
import { ReadingProgress } from '../content/components/ReaderView/types';

// 记录已注入 content script 的标签页
const injectedTabs = new Set<number>();

// 插件安装或更新时初始化设置
chrome.runtime.onInstalled.addListener(async () => {
  await initializeDefaultSettings();
});

// 安装事件监听器
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('扩展已安装');
  } else if (details.reason === 'update') {
    console.log('扩展已更新');
    // 更新后清空已注入标签页记录
    injectedTabs.clear();
  }
});

// 标签页关闭时清理记录
chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId);
});

// 标签页更新时清理记录（URL 变化）
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    injectedTabs.delete(tabId);
  }
});

/**
 * 确保 content script 已注入
 */
async function ensureContentScriptInjected(tabId: number): Promise<boolean> {
  // 如果已注入，直接返回
  if (injectedTabs.has(tabId)) {
    return true;
  }

  try {
    // 尝试发送测试消息，检查是否已注入
    try {
      await chrome.tabs.sendMessage(tabId, { action: 'PING' });
      // 如果成功，说明已注入
      injectedTabs.add(tabId);
      return true;
    } catch {
      // 如果失败，说明未注入，需要注入
    }

    console.log('🔧 向标签页注入 content script:', tabId);
    
    // 注入 content script
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['unifiedContentScript.js']
    });

    // 标记为已注入
    injectedTabs.add(tabId);
    console.log('✅ Content script 注入成功:', tabId);
    return true;
  } catch (error) {
    console.error('❌ Content script 注入失败:', error);
    return false;
  }
}

// 监听来自内容脚本或弹出窗口的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('后台收到消息:', message);
  
  let asyncResponse = false;

  if (message.action === MESSAGE_TYPES.SAVE_READING_PROGRESS) {
    asyncResponse = true;
    
    const progress: ReadingProgress = message.progress;
    
    readingProgressModel.saveProgress(progress)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error: Error) => {
        console.error('保存阅读进度失败:', error);
        sendResponse({ success: false, error: error.message });
      });
  } else if (message.action === 'ENSURE_CONTENT_SCRIPT') {
    // 来自 popup 的请求，确保 content script 已注入
    asyncResponse = true;
    
    chrome.tabs.query({ active: true, currentWindow: true })
      .then(tabs => {
        if (tabs[0]?.id) {
          return ensureContentScriptInjected(tabs[0].id);
        }
        return false;
      })
      .then(injected => {
        sendResponse({ success: true, injected });
      })
      .catch(error => {
        console.error('确保注入失败:', error);
        sendResponse({ success: false, error: error.message });
      });
  }
  
  return asyncResponse;
});

// 监听扩展图标点击事件（如果 popup 未配置）
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  
  try {
    // 确保 content script 已注入
    const injected = await ensureContentScriptInjected(tab.id);
    
    if (!injected) {
      console.error('无法注入 content script');
      return;
    }

    // 等待一小段时间确保脚本初始化完成
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 向内容脚本发送消息，切换阅读模式
    const response = await chrome.tabs.sendMessage(tab.id, { 
      action: MESSAGE_TYPES.TOGGLE_READING_MODE 
    });
    
    console.log('切换阅读模式响应:', response);
    
    // 根据当前状态更新图标
    if (response && response.isReadingMode) {
      chrome.action.setIcon({
        path: {
          16: "/icon16.png",
          48: "/icon48.png",
          128: "/icon128.png"
        },
        tabId: tab.id
      });
    } else {
      chrome.action.setIcon({
        path: {
          16: "/icon16.png",
          48: "/icon48.png",
          128: "/icon128.png"
        },
        tabId: tab.id
      });
    }
  } catch (error) {
    console.error('切换阅读模式失败:', error);
  }
});
