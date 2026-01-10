import React, { useEffect, useState, useCallback } from 'react';
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
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white">
      <div className="h-full flex flex-col p-8">
        {/* 头部 */}
        <div className="mb-12">
          <h1 className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-1">
            阅读助手
          </h1>
          <p className="text-sm text-gray-500">
            专注内容，享受阅读
          </p>
        </div>

        {/* 阅读模式开关 */}
        <div className="mb-8">
          <div className={`flex items-center justify-between p-6 rounded-2xl border transition-all ${
            readingMode 
              ? 'border-blue-200 bg-blue-50/50 hover:border-blue-300' 
              : 'border-gray-200 bg-gray-50/50 hover:border-gray-300'
          }`}>
            <div className="flex-1">
              <label htmlFor="reading-mode-switch" className="text-base font-medium text-gray-900 cursor-pointer select-none block mb-1">
                阅读模式
              </label>
              <p className={`text-sm transition-colors ${
                readingMode ? 'text-blue-600 font-medium' : 'text-gray-500'
              }`}>
                {readingMode ? '已开启' : '已关闭'}
              </p>
            </div>
            <Switch
              id="reading-mode-switch"
              checked={readingMode}
              onCheckedChange={toggleReadingMode}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>
        </div>

        {/* 功能说明 */}
        <div className="flex-1">
          <h2 className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-4">
            功能特性
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3 group">
              <div className="w-5 h-5 flex items-center justify-center mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:scale-150 transition-transform"></div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700 leading-relaxed group-hover:text-gray-900 transition-colors">
                  智能提取页面主要内容
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 group">
              <div className="w-5 h-5 flex items-center justify-center mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 group-hover:scale-150 transition-transform"></div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700 leading-relaxed group-hover:text-gray-900 transition-colors">
                  自定义阅读样式设置
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 group">
              <div className="w-5 h-5 flex items-center justify-center mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 group-hover:scale-150 transition-transform"></div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700 leading-relaxed group-hover:text-gray-900 transition-colors">
                  快速切换，即时生效
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            Version 1.9.0
          </p>
        </div>

        {/* 快捷键提示 */}
        <div className="pt-4 px-6 pb-2 border-t border-gray-100">
          <details className="group">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 transition-colors flex items-center justify-between">
              <span>⌨️ 键盘快捷键</span>
              <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-3 space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>切换阅读模式</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-700">Ctrl+Shift+R</kbd>
              </div>
              <div className="flex justify-between">
                <span>打开设置</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-700">Ctrl+Shift+S</kbd>
              </div>
              <div className="flex justify-between">
                <span>增大字号</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-700">Ctrl+Shift++</kbd>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
});
