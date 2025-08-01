import React, { useEffect, useState, useCallback } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { StorageKeys, getStorage, setStorage, FONT_FAMILIES, BACKGROUND_COLORS } from '../storage/storage';
import { MESSAGE_TYPES } from '../constants';
import builtInPresets from '../presets/builtInPresets';
// import { Settings, BookOpen, Palette, Type, Spacing, Eye } from 'lucide-react';

/**
 * 基于 Shadcn/UI 的现代化 Popup 组件
 * 
 * 特性：
 * - 使用 Shadcn/UI 组件库实现现代化设计
 * - 基于 Tailwind CSS 4 的设计系统
 * - 优化的用户体验和视觉层次
 * - 响应式设计和无障碍支持
 */
export const PopupShadcn: React.FC = () => {
  const { settings, updateSetting, initSettings } = useSettingsStore();
  const { theme, fontSize, lineHeight, paragraphSpacing, fontFamily, backgroundColor } = settings;
  const [readingMode, setReadingMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<string>('paper');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // 获取当前活动标签页的辅助函数
  const getCurrentTab = async (): Promise<chrome.tabs.Tab | null> => {
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
  };

  useEffect(() => {
    console.log('🚀 PopupShadcn 组件初始化开始');
    initSettings();
    initializePopup();
  }, []);

  const initializePopup = async () => {
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
  };

  const toggleReadingMode = async () => {
    console.log('🔄 切换阅读模式按钮被点击，当前状态:', readingMode);
    try {
      const currentTab = await getCurrentTab();

      if (currentTab?.id) {
        const newMode = !readingMode;
        const messageType = newMode ? MESSAGE_TYPES.ENABLE_READING_MODE : MESSAGE_TYPES.DISABLE_READING_MODE;
        console.log('📤 发送消息:', messageType, '设置:', settings);

        try {
          const response = await chrome.tabs.sendMessage(currentTab.id, {
            action: messageType,
            settings
          });

          console.log('📥 收到响应:', response);

          if (response?.success) {
            setReadingMode(newMode);
            console.log('✅ 阅读模式切换成功，新状态:', newMode);
          } else {
            console.error('❌ 切换阅读模式失败:', response?.error);
          }
        } catch (messageError) {
          console.error('❌ 发送消息失败:', messageError);
          // 尝试直接切换状态（用于调试）
          setReadingMode(newMode);
          console.log('⚠️ 强制切换状态为:', newMode);
        }
      } else {
        console.warn('⚠️ 没有找到活动标签页');
      }
    } catch (error) {
      console.error('❌ 切换阅读模式异常:', error);
    }
  };

  const applyPreset = async (presetName: string) => {
    console.log('🎨 应用预设按钮被点击:', presetName);
    const preset = builtInPresets.find(p => p.name === presetName);
    console.log('🔍 找到预设:', preset);

    if (preset) {
      // 更新本地设置
      console.log('📝 更新本地设置:', preset.settings);
      Object.entries(preset.settings).forEach(([key, value]) => {
        updateSetting(key as keyof typeof settings, value);
      });
      setSelectedPreset(presetName);

      // 如果阅读模式已开启，立即应用新设置
      if (readingMode) {
        console.log('📤 阅读模式已开启，发送预设应用消息');
        try {
          const currentTab = await getCurrentTab();
          if (currentTab?.id) {
            const response = await chrome.tabs.sendMessage(currentTab.id, {
              action: MESSAGE_TYPES.APPLY_PRESET,
              preset: preset
            });
            console.log('📥 预设应用响应:', response);
          } else {
            console.warn('⚠️ 应用预设时没有找到活动标签页');
          }
        } catch (error) {
          console.error('❌ 应用预设失败:', error);
        }
      } else {
        console.log('ℹ️ 阅读模式未开启，仅更新本地设置');
      }
    } else {
      console.warn('⚠️ 未找到预设:', presetName);
    }
  };

  if (isLoading) {
    return (
      <div className="extension-popup flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="extension-popup w-80 bg-white text-gray-900 min-h-[480px]" style={{ colorScheme: 'light' }}>
      {/* 头部 */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-lg">📖</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">阅读助手</h1>
              <p className="text-xs text-gray-600">智能阅读体验</p>
            </div>
          </div>
          <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
            v1.8.0
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* 阅读模式开关 */}
        <Card className="border-2 border-gray-200 bg-white transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2 text-gray-900">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm">👁️</span>
              </div>
              <span>阅读模式</span>
            </CardTitle>
            <CardDescription className="text-gray-600">
              开启后将优化页面显示，提供更好的阅读体验
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${readingMode ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-sm font-medium text-gray-900">
                  {readingMode ? '已开启' : '已关闭'}
                </span>
              </div>
              <Switch
                checked={readingMode}
                onCheckedChange={toggleReadingMode}
                className="data-[state=checked]:bg-green-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* 快速预设 */}
        <Card className="border-2 border-gray-200 bg-white transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2 text-gray-900">
              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-sm">🎨</span>
              </div>
              <span>快速预设</span>
            </CardTitle>
            <CardDescription className="text-gray-600">
              选择预设的阅读样式，快速配置最佳阅读体验
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {builtInPresets.map((preset) => (
                <Button
                  key={preset.name}
                  variant={selectedPreset === preset.name ? "default" : "outline"}
                  size="sm"
                  onClick={() => applyPreset(preset.name)}
                  className={`justify-start transition-all duration-200 hover:scale-105 text-gray-900 ${selectedPreset === preset.name
                    ? 'bg-blue-600 text-white shadow-md border-blue-600'
                    : 'hover:bg-gray-50 border-gray-200'
                    }`}
                >
                  <span className="mr-2">{preset.icon}</span>
                  {preset.displayName}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 高级设置 */}
        <Card className="border-2 border-gray-200 bg-white transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2 text-gray-900">
              <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-sm">⚙️</span>
              </div>
              <span>高级设置</span>
            </CardTitle>
            <CardDescription className="text-gray-600">
              精细调整阅读参数，个性化定制阅读体验
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="w-full justify-between hover:bg-gray-50 transition-colors duration-200 text-gray-900"
            >
              <span>{showAdvancedSettings ? '收起设置' : '展开设置'}</span>
              <span className={`transition-transform duration-200 ${showAdvancedSettings ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </Button>

            {showAdvancedSettings && (
              <div className="mt-4 space-y-4">
                {/* 字体大小 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center space-x-1 text-gray-900">
                      <span>🔤</span>
                      <span>字体大小</span>
                    </label>
                    <span className="text-xs text-gray-600">{fontSize}px</span>
                  </div>
                  <Slider
                    value={[fontSize]}
                    onValueChange={(value) => updateSetting('fontSize', value[0])}
                    min={12}
                    max={24}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* 行高 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center space-x-1 text-gray-900">
                      <span>📏</span>
                      <span>行高</span>
                    </label>
                    <span className="text-xs text-gray-600">{lineHeight}</span>
                  </div>
                  <Slider
                    value={[lineHeight]}
                    onValueChange={(value) => updateSetting('lineHeight', value[0])}
                    min={1.2}
                    max={2.0}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* 段落间距 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center space-x-1 text-gray-900">
                      <span>📐</span>
                      <span>段落间距</span>
                    </label>
                    <span className="text-xs text-gray-600">{paragraphSpacing}px</span>
                  </div>
                  <Slider
                    value={[paragraphSpacing]}
                    onValueChange={(value) => updateSetting('paragraphSpacing', value[0])}
                    min={8}
                    max={32}
                    step={2}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
