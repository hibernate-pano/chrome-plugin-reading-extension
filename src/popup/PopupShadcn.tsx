import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { MESSAGE_TYPES } from '../constants';

/**
 * 基于 Shadcn/UI 的现代化 Popup 组件
 * 
 * 特性：
 * - 使用 Shadcn/UI 组件库实现现代化设计
 * - 基于 Tailwind CSS 4 的设计系统
 * - 优化的用户体验和视觉层次
 * - 响应式设计和无障碍支持
 * - 性能优化：使用 React.memo 和 useMemo
 */
export const PopupShadcn: React.FC = React.memo(() => {
  const [readingMode, setReadingMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 获取当前活动标签页的辅助函数 - 使用 useCallback 优化
  const getCurrentTab = useCallback(async (): Promise<chrome.tabs.Tab | null> => {
    try {
      // 方法1: 查询当前窗口的活动标签页
      let tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs.length > 0) {
        console.log('📋 通过 currentWindow 找到标签页:', tabs[0]);
        return tabs[0];
      }

      // 方法2: 查询所有活动标签页
      tabs = await chrome.tabs.query({ active: true });
      if (tabs && tabs.length > 0) {
        console.log('📋 通过 active 找到标签页:', tabs[0]);
        return tabs[0];
      }

      // 方法3: 获取最后聚焦的窗口的活动标签页
      const windows = await chrome.windows.getAll({ populate: true });
      const focusedWindow = windows.find(w => w.focused) || windows[0];
      if (focusedWindow?.tabs) {
        const activeTab = focusedWindow.tabs.find(t => t.active);
        if (activeTab) {
          console.log('📋 通过 windows API 找到标签页:', activeTab);
          return activeTab;
        }
      }

      console.warn('⚠️ 所有方法都无法找到活动标签页');
      return null;
    } catch (error) {
      console.error('❌ 获取标签页失败:', error);
      return null;
    }
  }, []);

  // 确保 content script 已注入
  const ensureContentScript = useCallback(async (): Promise<boolean> => {
    console.log('🔧 [Popup] 调用 ensureContentScript');
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'ENSURE_CONTENT_SCRIPT'
      });
      console.log('📨 [Popup] ensureContentScript 响应:', response);
      return response?.injected || false;
    } catch (error) {
      console.error('❌ [Popup] 确保 content script 失败:', error);
      return false;
    }
  }, []);

  // 初始化 popup
  const initializePopup = async () => {
    console.log('🚀 [Popup] 开始初始化');
    try {
      const currentTab = await getCurrentTab();

      if (currentTab?.id) {
        // 先确保 content script 已注入（动态注入模式）
        const injected = await ensureContentScript();
        console.log('💉 [Popup] 注入状态:', injected);
        
        // 等待一小段时间确保脚本初始化完成
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
          const response = await chrome.tabs.sendMessage(currentTab.id, {
            action: MESSAGE_TYPES.GET_READING_MODE_STATE
          });
          console.log('📊 [Popup] 获取状态响应:', response);
          setReadingMode(response?.readingMode || response?.isReadingMode || false);
        } catch (messageError) {
          console.warn('⚠️ [Popup] 获取状态失败:', messageError);
          // 内容脚本可能还没加载，设置默认状态
          setReadingMode(false);
        }
      } else {
        console.warn('⚠️ [Popup] 未找到当前标签页');
        setReadingMode(false);
      }
    } catch (error) {
      console.error('❌ [Popup] 初始化失败:', error);
      setReadingMode(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 [Popup] useEffect 触发初始化');
    initializePopup();
  }, []); // 移除依赖，只在组件挂载时执行一次

  // 切换阅读模式 - 使用 useCallback 优化
  const toggleReadingMode = useCallback(async (checked: boolean) => {
    // 立即更新 UI 状态，提供即时反馈
    setReadingMode(checked);
    
    try {
      const currentTab = await getCurrentTab();

      if (currentTab?.id) {
        // 确保 content script 已注入（如果用户直接切换而没有先查询状态）
        if (checked) {
          await ensureContentScript();
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const messageType = checked ? MESSAGE_TYPES.ENABLE_READING_MODE : MESSAGE_TYPES.DISABLE_READING_MODE;

        try {
          const response = await chrome.tabs.sendMessage(currentTab.id, {
            action: messageType
          });

          if (!response?.success) {
            setReadingMode(!checked);
          }
        } catch (messageError) {
          setReadingMode(!checked);
        }
      } else {
        setReadingMode(!checked);
      }
    } catch (error) {
      setReadingMode(!checked);
    }
  }, [getCurrentTab, ensureContentScript]);

  // 加载状态
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-white p-6" role="application" aria-label="阅读模式开关">
      <div className="flex items-center gap-4">
        <label htmlFor="reading-mode-switch" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
          阅读模式
        </label>
        <Switch
          id="reading-mode-switch"
          checked={readingMode}
          onCheckedChange={toggleReadingMode}
          className="data-[state=checked]:bg-blue-500"
        />
      </div>
    </div>
  );
});
