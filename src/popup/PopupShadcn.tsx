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

  useEffect(() => {
    initSettings();
    initializePopup();
  }, []);

  const initializePopup = async () => {
    try {
      const [tabs] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        const response = await chrome.tabs.sendMessage(tabs[0].id, {
          action: MESSAGE_TYPES.GET_READING_MODE_STATE
        });
        setReadingMode(response?.readingMode || response?.isReadingMode || false);
      }
    } catch (error) {
      console.error('初始化失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleReadingMode = async () => {
    try {
      const [tabs] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        const newMode = !readingMode;
        const response = await chrome.tabs.sendMessage(tabs[0].id, {
          action: newMode ? MESSAGE_TYPES.ENABLE_READING_MODE : MESSAGE_TYPES.DISABLE_READING_MODE,
          settings
        });

        if (response?.success) {
          setReadingMode(newMode);
        } else {
          console.error('切换阅读模式失败:', response?.error);
        }
      }
    } catch (error) {
      console.error('切换阅读模式失败:', error);
    }
  };

  const applyPreset = async (presetName: string) => {
    const preset = builtInPresets.find(p => p.name === presetName);
    if (preset) {
      // 更新本地设置
      Object.entries(preset.settings).forEach(([key, value]) => {
        updateSetting(key as keyof typeof settings, value);
      });
      setSelectedPreset(presetName);

      // 如果阅读模式已开启，立即应用新设置
      if (readingMode) {
        try {
          const [tabs] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs[0]?.id) {
            await chrome.tabs.sendMessage(tabs[0].id, {
              action: MESSAGE_TYPES.APPLY_PRESET,
              preset: preset
            });
          }
        } catch (error) {
          console.error('应用预设失败:', error);
        }
      }
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
    <div className="extension-popup w-80 bg-background text-foreground">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <span className="text-lg">📖</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">阅读助手</h1>
              <p className="text-xs text-muted-foreground">智能阅读体验</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
            v1.8.0
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* 阅读模式开关 */}
        <Card className="border-2 transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm">👁️</span>
              </div>
              <span>阅读模式</span>
            </CardTitle>
            <CardDescription>
              开启后将优化页面显示，提供更好的阅读体验
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${readingMode ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-sm font-medium">
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
        <Card className="border-2 transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2">
              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-sm">🎨</span>
              </div>
              <span>快速预设</span>
            </CardTitle>
            <CardDescription>
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
                  className={`justify-start transition-all duration-200 hover:scale-105 ${selectedPreset === preset.name
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'hover:bg-muted'
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
        <Card className="border-2 transition-all duration-200 hover:shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2">
              <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-sm">⚙️</span>
              </div>
              <span>高级设置</span>
            </CardTitle>
            <CardDescription>
              精细调整阅读参数，个性化定制阅读体验
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="w-full justify-between hover:bg-muted transition-colors duration-200"
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
                    <label className="text-sm font-medium flex items-center space-x-1">
                      <span>🔤</span>
                      <span>字体大小</span>
                    </label>
                    <span className="text-xs text-muted-foreground">{fontSize}px</span>
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
                    <label className="text-sm font-medium flex items-center space-x-1">
                      <span>📏</span>
                      <span>行高</span>
                    </label>
                    <span className="text-xs text-muted-foreground">{lineHeight}</span>
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
                    <label className="text-sm font-medium">段落间距</label>
                    <span className="text-xs text-muted-foreground">{paragraphSpacing}px</span>
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
