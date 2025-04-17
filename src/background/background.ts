import { initializeDefaultSettings } from '../storage/storage';

// 插件安装或更新时初始化设置
chrome.runtime.onInstalled.addListener(async () => {
  await initializeDefaultSettings();
});

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'INJECT_CONTENT_SCRIPT') {
    if (sender.tab?.id) {
      chrome.scripting.executeScript({
        target: { tabId: sender.tab.id },
        files: ['src/content/content.js']
      }).then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        console.error('注入内容脚本失败:', error);
        sendResponse({ success: false, error: error.message });
      });
      return true; // 保持消息通道开启
    }
  }
  return false;
});

// 监听扩展图标点击事件
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  try {
    // 首先设置弹出窗口，确保用户可以访问设置
    chrome.action.setPopup({ tabId: tab.id, popup: 'index.html' });

    // 尝试注入内容脚本，确保内容脚本已加载
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/content/content.js']
      });
      console.log('内容脚本注入成功');
    } catch (scriptError) {
      console.error('注入内容脚本失败:', scriptError);
      // 即使脚本注入失败，也继续尝试切换阅读模式
    }

    // 直接尝试切换到阅读模式，而不检查当前状态
    chrome.tabs.sendMessage(
      tab.id,
      { action: 'TOGGLE_READING_MODE' },
      (toggleResponse) => {
        if (chrome.runtime.lastError) {
          console.error('切换阅读模式失败:', chrome.runtime.lastError);
          // 如果切换失败，可能是内容脚本没有正确加载
          // 尝试再次注入内容脚本并重试
          setTimeout(() => {
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['src/content/content.js']
            }).then(() => {
              // 注入成功后再次尝试切换
              setTimeout(() => {
                chrome.tabs.sendMessage(
                  tab.id,
                  { action: 'TOGGLE_READING_MODE' },
                  (retryResponse) => {
                    if (chrome.runtime.lastError || !retryResponse?.success) {
                      console.error('重试切换阅读模式失败:', chrome.runtime.lastError || retryResponse?.error);
                    }
                  }
                );
              }, 500); // 等待脚本初始化
            }).catch(error => {
              console.error('重新注入内容脚本失败:', error);
            });
          }, 300);
        } else if (!toggleResponse?.success) {
          console.error('切换阅读模式失败:', toggleResponse?.error);
        }
      }
    );
  } catch (error) {
    console.error('处理扩展图标点击时发生错误:', error);
  }
});
