import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { SimpleSwitch } from '@/components/ui/simple-switch';
import { StorageKeys, getStorage, setStorage, FONT_FAMILIES, BACKGROUND_COLORS } from '../storage/storage';
import { MESSAGE_TYPES } from '../constants';
import builtInPresets from '../presets/builtInPresets';

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
  const { settings, updateSetting, initSettings } = useSettingsStore();
  const [readingMode, setReadingMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<string>('paper');
  const [useSimpleSwitch, setUseSimpleSwitch] = useState(false);

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
    initSettings();
    initializePopup();
  }, [initSettings, initializePopup]);

  // 切换阅读模式 - 使用 useCallback 优化
  const toggleReadingMode = useCallback(async (checked: boolean) => {
    console.log('========================================');
    console.log('🔄 toggleReadingMode 被调用');
    console.log('参数 checked:', checked);
    console.log('当前 readingMode 状态:', readingMode);
    console.log('========================================');
    
    // 立即更新 UI 状态，提供即时反馈
    setReadingMode(checked);
    console.log('✅ UI 状态已更新为:', checked);
    
    try {
      const currentTab = await getCurrentTab();

      if (currentTab?.id) {
        const messageType = checked ? MESSAGE_TYPES.ENABLE_READING_MODE : MESSAGE_TYPES.DISABLE_READING_MODE;
        console.log('📤 发送消息:', messageType, '设置:', settings);

        try {
          const response = await chrome.tabs.sendMessage(currentTab.id, {
            action: messageType,
            settings
          });

          console.log('📥 收到响应:', response);

          if (response?.success) {
            console.log('✅ 阅读模式切换成功，新状态:', checked);
          } else {
            console.error('❌ 切换阅读模式失败:', response?.error);
            // 如果失败，恢复原状态
            setReadingMode(!checked);
          }
        } catch (messageError) {
          console.error('❌ 发送消息失败:', messageError);
          // 消息发送失败，但保持新状态（content script 可能还没加载）
          console.log('⚠️ 保持新状态，等待 content script 加载');
        }
      } else {
        console.warn('⚠️ 没有找到活动标签页');
        // 恢复原状态
        setReadingMode(!checked);
      }
    } catch (error) {
      console.error('❌ 切换阅读模式异常:', error);
      // 发生异常，恢复原状态
      setReadingMode(!checked);
    }
  }, [settings, getCurrentTab]);

  // 应用预设 - 使用 useCallback 优化
  const applyPreset = useCallback(async (presetName: string) => {
    console.log('🎨 应用预设:', presetName);
    try {
      const preset = builtInPresets.find(p => p.name === presetName);
      if (!preset) {
        console.warn('⚠️ 未找到预设:', presetName);
        return;
      }

      // 批量更新设置 - 过滤掉布尔值，只更新非布尔设置
      const updatePromises = Object.entries(preset.settings)
        .filter(([_, value]) => typeof value !== 'boolean') // 过滤掉布尔值
        .map(([key, value]) =>
          updateSetting(key as keyof typeof settings, value as any)
        );
      
      await Promise.all(updatePromises);
      setSelectedPreset(presetName);
      
      console.log('✅ 预设应用成功:', presetName);
    } catch (error) {
      console.error('❌ 应用预设失败:', error);
    }
  }, [updateSetting]);

  // 使用 useMemo 优化预设按钮渲染
  const presetButtons = useMemo(() => 
    builtInPresets.map((preset) => (
      <Button
        key={preset.name}
        variant={selectedPreset === preset.name ? "default" : "outline"}
        size="sm"
        onClick={() => applyPreset(preset.name)}
        className={`justify-start transition-all duration-200 hover:scale-105 ${
          selectedPreset === preset.name
            ? 'bg-blue-600 text-white shadow-md border-blue-600'
            : 'hover:bg-gray-50 border-gray-200 text-gray-900'
        }`}
        aria-pressed={selectedPreset === preset.name}
        aria-describedby={`preset-${preset.name}-description`}
      >
        <span className="mr-2" aria-hidden="true">{preset.icon}</span>
        {preset.displayName}
      </Button>
    )), [selectedPreset, applyPreset]);

  // 使用 useMemo 优化预设描述渲染
  const presetDescriptions = useMemo(() => 
    builtInPresets.map((preset) => (
      <div key={`desc-${preset.name}`} id={`preset-${preset.name}-description`} className="sr-only">
        {preset.displayName}：{preset.description || '预设阅读样式'}
      </div>
    )), []);

  // 使用 useMemo 优化加载状态
  const loadingContent = useMemo(() => (
    <div className="w-80 bg-white text-gray-900 min-h-[480px] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">加载中...</p>
      </div>
    </div>
  ), []);

  if (isLoading) {
    return loadingContent;
  }

  return (
    <div className="w-80 bg-white text-gray-900 min-h-[480px]" role="application" aria-label="Chrome 阅读插件">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center" aria-hidden="true">
              <span className="text-lg">📖</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">阅读助手</h1>
              <p className="text-xs text-gray-600">智能阅读体验</p>
            </div>
          </div>
          <div className="text-xs text-gray-600 bg-white px-2 py-1 rounded-md shadow-sm" aria-label="版本号">
            v1.8.0
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 阅读模式开关 */}
        <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2 text-gray-900">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center" aria-hidden="true">
                <span className="text-sm">👁️</span>
              </div>
              <span>阅读模式</span>
            </CardTitle>
            <CardDescription className="text-gray-600">
              开启后将优化页面显示，提供更好的阅读体验
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div 
                  className={`w-2 h-2 rounded-full ${readingMode ? 'bg-green-500' : 'bg-gray-400'}`}
                  aria-hidden="true"
                ></div>
                <span className="text-sm font-medium text-gray-900" id="reading-mode-status">
                  {readingMode ? '已开启' : '已关闭'}
                </span>
              </div>
              <div 
                onClick={(e) => {
                  console.log('🖱️ Switch 外层 div 被点击');
                  console.log('事件目标:', e.target);
                  console.log('当前元素:', e.currentTarget);
                }}
                style={{ display: 'inline-block' }}
              >
                {useSimpleSwitch ? (
                  <SimpleSwitch
                    checked={readingMode}
                    onCheckedChange={(checked) => {
                      console.log('🎯 SimpleSwitch onCheckedChange 触发，checked =', checked);
                      toggleReadingMode(checked);
                    }}
                    className="data-[state=checked]:bg-green-500"
                    disabled={false}
                  />
                ) : (
                  <Switch
                    checked={readingMode}
                    onCheckedChange={(checked) => {
                      console.log('🎯 Switch onCheckedChange 触发，checked =', checked);
                      toggleReadingMode(checked);
                    }}
                    onClick={(e) => {
                      console.log('🖱️ Switch onClick 触发');
                      console.log('事件:', e);
                    }}
                    className="data-[state=checked]:bg-green-500"
                    aria-labelledby="reading-mode-status"
                    aria-describedby="reading-mode-description"
                    disabled={false}
                  />
                )}
              </div>
            </div>
            {/* 调试：添加控制按钮 */}
            <div className="mt-2 space-y-2">
              <Button
                onClick={() => {
                  console.log('🔘 测试按钮被点击');
                  toggleReadingMode(!readingMode);
                }}
                variant="outline"
                size="sm"
                className="w-full"
              >
                测试切换（当前：{readingMode ? '开' : '关'}）
              </Button>
              <Button
                onClick={() => {
                  console.log('🔧 切换 Switch 组件类型');
                  setUseSimpleSwitch(!useSimpleSwitch);
                }}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {useSimpleSwitch ? '使用 Radix Switch' : '使用简单 Switch'}
              </Button>
            </div>
            <div id="reading-mode-description" className="sr-only">
              点击切换阅读模式，开启后页面将优化为更适合阅读的布局
            </div>
          </CardContent>
        </Card>

        {/* 快速预设 */}
        <Card className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2 text-gray-900">
              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center" aria-hidden="true">
                <span className="text-sm">🎨</span>
              </div>
              <span>快速预设</span>
            </CardTitle>
            <CardDescription className="text-gray-600">
              选择预设的阅读样式，快速配置最佳阅读体验
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="preset-group-label">
              <div id="preset-group-label" className="sr-only">阅读预设选择</div>
              {presetButtons}
            </div>
            {/* 预设描述 */}
            {presetDescriptions}
          </CardContent>
        </Card>

        {/* 提示信息 */}
        <Card className="border border-blue-200 bg-blue-50 shadow-sm" role="note" aria-label="使用提示">
          <CardContent className="pt-4">
            <div className="flex items-start space-x-2">
              <span className="text-blue-600 text-sm" aria-hidden="true">💡</span>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">提示</p>
                <p className="text-xs">开启阅读模式后，可以在页面侧边栏进行更详细的设置调整。</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});
