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
    console.log('🔄 开始初始化 popup');
    try {
      const currentTab = await getCurrentTab();

      if (currentTab?.id) {
        console.log('📤 发送消息获取阅读模式状态:', MESSAGE_TYPES.GET_READING_MODE_STATE);
        try {
          const response = await chrome.tabs.sendMessage(currentTab.id, {
            action: MESSAGE_TYPES.GET_READING_MODE_STATE
          });
          console.log('📥 收到响应:', response);
          setReadingMode(response?.readingMode || response?.isReadingMode || false);
        } catch (messageError) {
          console.warn('⚠️ 发送消息失败，可能内容脚本未加载:', messageError);
          // 内容脚本可能还没加载，设置默认状态
          setReadingMode(false);
        }
      } else {
        console.warn('⚠️ 没有找到有效的标签页');
        setReadingMode(false);
      }
    } catch (error) {
      console.error('❌ 初始化失败:', error);
      setReadingMode(false);
    } finally {
      setIsLoading(false);
      console.log('✅ popup 初始化完成');
    }
  }, [getCurrentTab]);

  useEffect(() => {
    console.log('🚀 PopupShadcn 组件初始化开始');
    initializePopup();
  }, [initializePopup]);

  // 切换阅读模式 - 使用 useCallback 优化
  const toggleReadingMode = useCallback(async (checked: boolean) => {
    console.log('🔄 切换阅读模式，新状态:', checked);
    
    // 立即更新 UI 状态，提供即时反馈
    setReadingMode(checked);
    
    try {
      const currentTab = await getCurrentTab();

      if (currentTab?.id) {
        const messageType = checked ? MESSAGE_TYPES.ENABLE_READING_MODE : MESSAGE_TYPES.DISABLE_READING_MODE;
        console.log('📤 发送消息:', messageType);

        try {
          const response = await chrome.tabs.sendMessage(currentTab.id, {
            action: messageType
          });

          console.log('📥 收到响应:', response);

          if (!response?.success) {
            console.error('❌ 切换阅读模式失败:', response?.error);
            setReadingMode(!checked);
          }
        } catch (messageError) {
          console.error('❌ 发送消息失败:', messageError);
        }
      } else {
        console.warn('⚠️ 没有找到活动标签页');
        setReadingMode(!checked);
      }
    } catch (error) {
      console.error('❌ 切换阅读模式异常:', error);
      setReadingMode(!checked);
    }
  }, [getCurrentTab]);

  // 加载状态
  const loadingContent = (
    <div className="w-80 bg-white text-gray-900 min-h-[480px] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">加载中...</p>
      </div>
    </div>
  );

  if (isLoading) {
    return loadingContent;
  }

  return (
    <div className="w-80 bg-white" role="application" aria-label="Chrome 阅读插件">
      <div className="p-5">
        {/* 极简头部 */}
        <div className="mb-6">
          <h1 className="text-sm font-medium text-gray-400 uppercase tracking-wider">阅读助手</h1>
        </div>

        {/* 主控制区域 */}
        <div className="space-y-4">
          {/* 开关控制 */}
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-base font-medium text-gray-900">
                阅读模式
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {readingMode ? '已启用' : '未启用'}
              </div>
            </div>
            
            <Switch
              checked={readingMode}
              onCheckedChange={toggleReadingMode}
              className="data-[state=checked]:bg-gray-900"
            />
          </div>

          {/* 分隔线 */}
          <div className="border-t border-gray-100"></div>

          {/* 说明文字 */}
          <div className="pt-2 pb-1">
            <p className="text-xs text-gray-500 leading-relaxed">
              {readingMode 
                ? '点击页面左侧设置按钮可自定义阅读样式'
                : '自动提取页面内容，提供专注的阅读体验'
              }
            </p>
          </div>
        </div>

        {/* 底部版本 */}
        <div className="mt-6 pt-4 border-t border-gray-50">
          <p className="text-xs text-center text-gray-400">v1.8.1</p>
        </div>
      </div>
    </div>
  );
});
