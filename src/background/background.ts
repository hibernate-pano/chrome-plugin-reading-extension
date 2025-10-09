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
  console.log(`🔍 [Background] 检查 tab ${tabId} 是否已注入...`);
  
  // 如果已注入，直接返回
  if (injectedTabs.has(tabId)) {
    console.log(`✅ [Background] Tab ${tabId} 在缓存中，跳过注入`);
    return true;
  }

  try {
    // 尝试发送测试消息，检查是否已注入
    console.log(`📡 [Background] 发送 PING 到 tab ${tabId}...`);
    try {
      const pingResponse = await chrome.tabs.sendMessage(tabId, { action: 'PING' });
      console.log(`📨 [Background] PING 响应:`, pingResponse);
      
      // 如果成功且收到正确响应，说明已注入
      if (pingResponse?.pong) {
        injectedTabs.add(tabId);
        console.log(`✅ [Background] Content script 已经存在，无需重新注入: ${tabId}`);
        return true;
      } else {
        console.log(`⚠️ [Background] PING 响应格式不正确:`, pingResponse);
      }
    } catch (pingError) {
      // 如果失败，说明未注入，需要注入
      console.log(`📝 [Background] PING 失败，Content script 未注入: ${tabId}`);
      console.log(`   错误详情:`, pingError);
    }

    console.log(`🔧 [Background] 向标签页注入 content script: ${tabId}`);
    
    // 注入 content script
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['unifiedContentScript.js']
    });

    // 等待脚本初始化
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 再次验证注入是否成功
    try {
      const verifyResponse = await chrome.tabs.sendMessage(tabId, { action: 'PING' });
      console.log(`🔍 [Background] 注入后验证响应:`, verifyResponse);
      
      if (verifyResponse?.pong) {
        // 标记为已注入
        injectedTabs.add(tabId);
        console.log(`✅ [Background] Content script 注入成功: ${tabId}`);
        return true;
      } else {
        console.error(`❌ [Background] 注入后验证失败: ${tabId}`);
        return false;
      }
    } catch (verifyError) {
      console.error(`❌ [Background] 注入后验证出错:`, verifyError);
      return false;
    }
  } catch (error) {
    console.error(`❌ [Background] Content script 注入失败 (tab ${tabId}):`, error);
    // 清理缓存
    injectedTabs.delete(tabId);
    return false;
  }
}

// 监听来自内容脚本或弹出窗口的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 只记录重要消息，避免日志泛滥
  if (message.action !== 'PING' && message.action !== MESSAGE_TYPES.GET_READING_MODE_STATE) {
    console.log('后台收到消息:', message.action || message.type || 'unknown');
  }
  
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
    console.log('📥 [Background] 处理 ENSURE_CONTENT_SCRIPT 请求');
    
    chrome.tabs.query({ active: true, currentWindow: true })
      .then(tabs => {
        if (tabs[0]?.id) {
          console.log(`📋 [Background] 找到活动标签页: ${tabs[0].id}`);
          return ensureContentScriptInjected(tabs[0].id);
        }
        console.error('❌ [Background] 未找到活动标签页');
        return false;
      })
      .then(injected => {
        console.log(`📤 [Background] 返回注入状态: ${injected}`);
        sendResponse({ success: true, injected });
      })
      .catch(error => {
        console.error('❌ [Background] 确保注入失败:', error);
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
