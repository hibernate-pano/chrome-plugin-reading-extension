import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import Button from '../ui/components/Button';
import Switch from '../ui/components/Switch';
import { Card, CardHeader, CardContent } from '../ui/components/Card';
import { StorageKeys, getStorage, setStorage, FONT_FAMILIES, BACKGROUND_COLORS, CODE_THEMES, ReadingPreset } from '../storage/storage';
import builtInPresets from '../presets/builtInPresets';

/**
 * Popup 组件
 * 遵循 "less is more" 和 "约定大于配置" 的设计理念
 */
export const Popup = () => {
  const { settings, updateSetting, initSettings } = useSettingsStore();
  const { theme, presets, activePreset, pageWidth } = settings;
  const [readingMode, setReadingMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fontFamily, setFontFamily] = useState<keyof typeof FONT_FAMILIES>('default');
  const [backgroundColor, setBackgroundColor] = useState<keyof typeof BACKGROUND_COLORS>('white');

  useEffect(() => {
    // 初始化设置
    initSettings();

    const initializeSettings = async () => {
      setIsLoading(true);
      try {
        const savedFontFamily = await getStorage<keyof typeof FONT_FAMILIES>(StorageKeys.FONT_FAMILY);
        if (savedFontFamily) setFontFamily(savedFontFamily);

        const savedBackgroundColor = await getStorage<keyof typeof BACKGROUND_COLORS>(StorageKeys.BACKGROUND_COLOR);
        if (savedBackgroundColor) setBackgroundColor(savedBackgroundColor);
      } catch (error) {
        console.error('初始化设置时发生错误:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSettings();

    // 向 content script 请求当前阅读模式状态
    const getReadingModeState = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.id) {
          chrome.tabs.sendMessage(
            tab.id,
            { action: 'GET_READING_MODE_STATE' },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error('发送消息时发生错误:', chrome.runtime.lastError);
                return;
              }
              if (response) {
                console.log('当前阅读模式状态:', response.isReadingMode);
                setReadingMode(response.isReadingMode);
              } else {
                console.error('获取阅读模式状态失败');
              }
            }
          );
        }
      } catch (error) {
        console.error('获取阅读模式状态时发生错误:', error);
      }
    };
    getReadingModeState();
  }, []);

  // 每次打开popup时都重新获取阅读模式状态
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab.id) {
            chrome.tabs.sendMessage(
              tab.id,
              { action: 'GET_READING_MODE_STATE' },
              (response) => {
                if (chrome.runtime.lastError) {
                  return;
                }
                if (response) {
                  setReadingMode(response.isReadingMode);
                }
              }
            );
          }
        } catch (error) {
          console.error('获取阅读模式状态时发生错误:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // 初始加载时也执行一次
    handleVisibilityChange();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  const toggleReadingMode = async () => {
    try {
      // 禁用按钮，防止重复点击
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        // 先切换本地状态，提供即时反馈
        setReadingMode(!readingMode);

        // 先确保内容脚本已加载
        try {
          await chrome.runtime.sendMessage({ action: 'INJECT_CONTENT_SCRIPT' });
        } catch (injectError) {
          console.warn('注入脚本时发生警告:', injectError);
          // 继续尝试切换阅读模式
        }

        // 等待一小段时间确保脚本已加载
        setTimeout(() => {
          chrome.tabs.sendMessage(
            tab.id!,
            { action: 'TOGGLE_READER_MODE' },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error('发送消息时发生错误:', chrome.runtime.lastError);
                // 如果出错，恢复状态
                setReadingMode(readingMode);
                return;
              }

              if (response?.success) {
                // 确保状态与响应一致
                setReadingMode(response.isReadingMode);
              } else {
                console.error('切换阅读模式失败:', response?.error);
                // 如果失败，恢复状态
                setReadingMode(readingMode);
              }
            }
          );
        }, 300);
      }
    } catch (error) {
      console.error('切换阅读模式时发生错误:', error);
      // 恢复状态
      setReadingMode(readingMode);
    }
  };

  // 应用预设
  const applyPreset = (presetId: string) => {
    updateSetting('activePreset', presetId);

    // 获取预设
    const preset = presets?.find(p => p.id === presetId);
    if (preset && preset.settings) {
      // 应用预设设置
      const { settings } = preset;
      if (settings.theme) updateSetting('theme', settings.theme);
      if (settings.fontSize) updateSetting('fontSize', settings.fontSize);
      if (settings.lineHeight) updateSetting('lineHeight', settings.lineHeight);
      if (settings.paragraphSpacing) updateSetting('paragraphSpacing', settings.paragraphSpacing);
    }
  };

  // 渲染预设卡片
  const renderPresetCard = (preset: ReadingPreset) => {
    const isActive = activePreset === preset.id;

    // 为每个预设定义特定的图标和颜色
    const presetIcons: Record<string, string> = {
      'paper': '📚',
      'night-reading': '🌙',
      'tech-doc': '💻',
      'focus': '🎯'
    };

    const presetColors: Record<string, string> = {
      'paper': 'from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20',
      'night-reading': 'from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-800/20',
      'tech-doc': 'from-emerald-50 to-teal-100 dark:from-emerald-900/30 dark:to-teal-800/20',
      'focus': 'from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/30'
    };

    const icon = presetIcons[preset.id] || '📖';
    const gradientColor = presetColors[preset.id] || 'from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700';

    return (
      <div
        key={preset.id}
        className={`
          relative cursor-pointer rounded-lg overflow-hidden transition-all duration-300
          ${isActive
            ? 'ring-2 ring-brand-500 dark:ring-brand-400 scale-105 shadow-lg'
            : 'hover:shadow-md hover:scale-102 border border-gray-200 dark:border-gray-700'
          }
        `}
        onClick={() => applyPreset(preset.id)}
      >
        <div className={`
          p-3 h-full flex flex-col bg-gradient-to-br ${gradientColor}
        `}>
          <div className="font-medium mb-1 flex items-center">
            <span className="mr-2 text-lg">{icon}</span>
            <span>{preset.name}</span>
            {isActive && (
              <span className="ml-auto text-xs bg-brand-500 text-white px-2 py-0.5 rounded-full">
                当前
              </span>
            )}
          </div>
          {preset.description && (
            <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              {preset.description}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="w-[360px] h-[480px] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl overflow-hidden">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[360px] h-[480px] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl overflow-hidden">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/30 px-4 py-3 flex justify-between items-center">
        <h1 className="text-lg font-semibold text-brand-700 dark:text-brand-400">
          阅读助手
        </h1>

        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">🌙</span>
            <Switch
              checked={theme === 'dark'}
              onChange={(checked) => updateSetting('theme', checked ? 'dark' : 'light')}
              size="small"
            />
            <span className="text-xs text-gray-500">☀️</span>
          </div>

          <Button
            variant={readingMode ? 'primary' : 'outline'}
            size="sm"
            onClick={toggleReadingMode}
          >
            {readingMode ? '退出阅读' : '阅读模式'}
          </Button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="p-4 overflow-y-auto h-[calc(100%-60px)]">
        {/* 预设选择 */}
        <section className="mb-6">
          <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
            阅读预设
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {presets?.filter(p => p.isBuiltIn).map(renderPresetCard)}
          </div>
        </section>

        {/* 基本设置 */}
        <section className="mb-6">
          <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
            基本设置
          </h2>
          <div className="space-y-4">
            {/* 页面宽度 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                页面宽度
              </label>
              <div className="flex gap-2">
                {['窄', '中', '宽', '全屏'].map((width, index) => {
                  const value = (index + 1) * 25;
                  const isActive = pageWidth === value;
                  return (
                    <Button
                      key={width}
                      variant={isActive ? 'primary' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => updateSetting('pageWidth', value)}
                    >
                      {width}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 高级设置 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              高级设置
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? '收起' : '展开'}
            </Button>
          </div>

          {showAdvanced && (
            <div className="space-y-4">
              {/* 字体选择 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  字体
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(FONT_FAMILIES).map(([key, value]) => {
                    const isActive = fontFamily === key;
                    return (
                      <Button
                        key={key}
                        variant={isActive ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setFontFamily(key as keyof typeof FONT_FAMILIES);
                          setStorage(StorageKeys.FONT_FAMILY, key);
                        }}
                      >
                        {key === 'default' ? '默认' : key}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* 背景颜色 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  背景色
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(BACKGROUND_COLORS).map(([key, value]) => {
                    const isActive = backgroundColor === key;
                    return (
                      <div
                        key={key}
                        className={`
                          w-8 h-8 rounded-full cursor-pointer
                          ${isActive ? 'ring-2 ring-brand-500 ring-offset-2' : ''}
                        `}
                        style={{ backgroundColor: value }}
                        onClick={() => {
                          setBackgroundColor(key as keyof typeof BACKGROUND_COLORS);
                          setStorage(StorageKeys.BACKGROUND_COLOR, key);
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Popup;
