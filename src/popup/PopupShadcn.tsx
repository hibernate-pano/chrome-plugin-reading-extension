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

  // 初始化 popup - 使用 useCallback 优化
  const initializePopup = useCallback(async () => {
    try {
      const currentTab = await getCurrentTab();

      if (currentTab?.id) {
        try {
          const response = await chrome.tabs.sendMessage(currentTab.id, {
            action: MESSAGE_TYPES.GET_READING_MODE_STATE
          });
          setReadingMode(response?.readingMode || response?.isReadingMode || false);
        } catch (messageError) {
          // 内容脚本可能还没加载，设置默认状态
          setReadingMode(false);
        }
      } else {
        setReadingMode(false);
      }
    } catch (error) {
      setReadingMode(false);
    } finally {
      setIsLoading(false);
    }
  }, [getCurrentTab]);

  useEffect(() => {
    initializePopup();
  }, [initializePopup]);

  // 切换阅读模式 - 使用 useCallback 优化
  const toggleReadingMode = useCallback(async (checked: boolean) => {
    // 立即更新 UI 状态，提供即时反馈
    setReadingMode(checked);
    
    try {
      const currentTab = await getCurrentTab();

      if (currentTab?.id) {
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
  }, [getCurrentTab]);

  // 加载状态
  if (isLoading) {
    return (
      <div className="w-full h-full bg-black/5 flex items-center justify-center backdrop-blur-sm">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-3">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin"></div>
          </div>
          <p className="text-sm text-gray-600 font-medium">正在加载...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-sm relative overflow-hidden" role="application" aria-label="阅读助手">
      {/* 背景装饰 */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-400/8 to-purple-400/8 rounded-full blur-lg transform translate-x-6 -translate-y-6"></div>
      <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-purple-400/8 to-pink-400/8 rounded-full blur-md transform -translate-x-4 translate-y-4"></div>

      <div className="relative p-5 h-full flex flex-col">
        {/* 极简头部 */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 relative">
              <span className="text-white text-xl">📚</span>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 tracking-tight">
                阅读助手
              </h1>
              <p className="text-xs text-gray-500/80 font-medium">专注 · 舒适 · 优雅</p>
            </div>
          </div>
        </div>

        {/* 主控制区域 */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-xl shadow-black/5 p-5 mb-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full transition-all duration-300 ${readingMode ? 'bg-emerald-400 shadow-lg shadow-emerald-400/30' : 'bg-gray-300'}`}></div>
                  <div>
                    <div className="text-base font-semibold text-gray-900">
                      阅读模式
                    </div>
                    <div className="text-xs text-gray-500 font-medium">
                      {readingMode ? '沉浸式体验' : '随时可用'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <Switch
                  checked={readingMode}
                  onCheckedChange={toggleReadingMode}
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-emerald-400 data-[state=checked]:to-teal-500 shadow-lg data-[state=checked]:shadow-emerald-400/25"
                />
              </div>
            </div>

            {/* 视觉反馈 */}
            <div className={`mt-4 h-1 rounded-full transition-all duration-500 ${readingMode ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gray-200'}`}></div>
          </div>

          {/* 状态提示 */}
          <div className={`p-3 rounded-xl border transition-all duration-300 ${readingMode ? 'bg-emerald-50/50 border-emerald-200/50' : 'bg-blue-50/50 border-blue-200/50'}`}>
            <div className="flex gap-2">
              <div className="flex-shrink-0 mt-0.5">
                <span className="text-base">{readingMode ? '✨' : '💭'}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  {readingMode ? '享受阅读时光' : '开启阅读之旅'}
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {readingMode
                    ? '沉浸在纯净的阅读环境中，感受文字的魅力'
                    : '轻触开关，开启专注阅读模式，过滤干扰'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 底部信息 */}
        <div className="mt-auto pt-4 border-t border-gray-200/40">
          <div className="flex items-center justify-center">
            <span className="text-xs text-gray-400 font-medium">v1.8.1 • 让阅读更美好</span>
          </div>
        </div>
      </div>
    </div>
  );
});
