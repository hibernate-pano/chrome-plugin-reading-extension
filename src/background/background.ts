import { initializeDefaultSettings } from '../storage/storage';
import { StorageKeys, getStorage } from '../storage/storage';
import { DEFAULT_SETTINGS } from '../constants/defaultSettings';

// 插件安装或更新时初始化设置
chrome.runtime.onInstalled.addListener(async () => {
  console.log('插件安装或更新，开始初始化默认设置...');
  try {
    await initializeDefaultSettings();

    // 验证设置是否正确初始化
    const theme = await getStorage<'light' | 'dark'>(StorageKeys.THEME);
    const fontSize = await getStorage<number>(StorageKeys.FONT_SIZE);

    console.log('初始化后验证设置:');
    console.log('theme:', theme, '默认值:', DEFAULT_SETTINGS.theme);
    console.log('fontSize:', fontSize, '默认值:', DEFAULT_SETTINGS.fontSize);

    if (theme === null || fontSize === null) {
      console.warn('初始化后某些设置仍为空，尝试再次初始化...');
      await initializeDefaultSettings();
    }

    console.log('默认设置初始化完成');
  } catch (error) {
    console.error('初始化默认设置时发生错误:', error);
  }
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
    console.log('扩展图标被点击，开始处理...');

    // 在处理点击前，先检查设置是否完整
    try {
      const { ensureCompleteSettings } = await import('../storage/storage');
      await ensureCompleteSettings();

      // 检查是否有激活的预设
      const activePresetId = await getStorage<string>(StorageKeys.ACTIVE_PRESET);
      console.log('当前激活的预设ID:', activePresetId);

      // 如果没有激活的预设，尝试应用默认预设
      if (!activePresetId) {
        console.log('没有激活的预设，尝试应用默认预设...');
        try {
          // 导入预设管理器
          const { PresetManager } = await import('../presets/presetManager');
          const presetManager = PresetManager.getInstance();
          await presetManager.initialize();

          // 应用默认预设
          const defaultPresetId = 'default';
          console.log('应用默认预设:', defaultPresetId);
          await presetManager.setActivePreset(defaultPresetId);
          console.log('默认预设应用成功');
        } catch (presetError) {
          console.error('应用默认预设时发生错误:', presetError);
        }
      }
    } catch (error) {
      console.error('点击前检查设置时发生错误:', error);
      // 出错时尝试初始化设置
      await initializeDefaultSettings();
    }

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

// 在浏览器启动时检查设置是否存在，如果不存在则初始化
chrome.runtime.onStartup.addListener(async () => {
  console.log('浏览器启动，检查设置是否需要初始化...');

  try {
    // 使用新的 ensureCompleteSettings 函数检查设置是否完整
    const { ensureCompleteSettings } = await import('../storage/storage');
    await ensureCompleteSettings();

    // 检查是否有激活的预设
    const activePresetId = await getStorage<string>(StorageKeys.ACTIVE_PRESET);
    console.log('当前激活的预设ID:', activePresetId);

    // 如果没有激活的预设，尝试应用默认预设
    if (!activePresetId) {
      console.log('没有激活的预设，尝试应用默认预设...');
      try {
        // 导入预设管理器
        const { PresetManager } = await import('../presets/presetManager');
        const presetManager = PresetManager.getInstance();
        await presetManager.initialize();

        // 应用默认预设
        const defaultPresetId = 'default';
        console.log('应用默认预设:', defaultPresetId);
        await presetManager.setActivePreset(defaultPresetId);
        console.log('默认预设应用成功');
      } catch (presetError) {
        console.error('应用默认预设时发生错误:', presetError);
      }
    }
  } catch (error) {
    console.error('检查设置时发生错误:', error);
    // 出错时尝试初始化设置
    try {
      await initializeDefaultSettings();
      console.log('出错后重新初始化设置完成');
    } catch (initError) {
      console.error('重新初始化设置失败:', initError);
    }
  }
});
