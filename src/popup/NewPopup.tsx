import React, { useEffect, useState } from 'react';
import useAppStore, { initializeStore } from '../simplifiedStore';
import Button from '../ui/components/Button';
import Switch from '../ui/components/Switch';
import { Card, CardHeader, CardContent } from '../ui/components/Card';
import { StorageKeys, getStorage, FONT_FAMILIES, BACKGROUND_COLORS, CODE_THEMES } from '../storage/storage';
import simplifiedPresets from '../presets/simplifiedPresets';

/**
 * 重构后的 Popup 组件
 * 遵循 "less is more" 和 "约定大于配置" 的设计理念
 */
export const NewPopup = () => {
  const {
    theme,
    readingMode,
    activePreset,
    presets,
    applyPreset,
    setTheme,
    setReadingMode,
    resetToDefaultSettings,
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fontFamily, setFontFamily] = useState<keyof typeof FONT_FAMILIES>('default');
  const [backgroundColor, setBackgroundColor] = useState<keyof typeof BACKGROUND_COLORS>('white');

  useEffect(() => {
    initializeStore();

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
            { action: 'TOGGLE_READING_MODE' },
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

  // 渲染预设卡片
  const renderPresetCard = (preset) => {
    const isActive = activePreset === preset.id;

    // 为每个预设定义特定的图标和颜色
    const presetIcons = {
      'paper': '📚',
      'night-reading': '🌙',
      'tech-doc': '💻',
      'focus': '🎯'
    };

    const presetColors = {
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
              onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              size="small"
            />
            <span className="text-xs text-gray-500">☀️</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 overflow-y-auto h-[calc(100%-60px)] pb-16 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {/* 阅读模式开关 - 大按钮 */}
        <div className="mb-5">
          <Button
            variant={readingMode ? 'primary' : 'outline'}
            size="lg"
            onClick={toggleReadingMode}
            iconLeft={readingMode ? '📖' : '📃'}
            className="w-full py-3 flex items-center justify-center"
          >
            {readingMode ? '退出阅读模式' : '进入阅读模式'}
          </Button>
        </div>

        {/* 预设选择 */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-medium text-gray-800 dark:text-gray-200">
              选择阅读场景
            </h2>
            <div className="text-xs text-gray-500 dark:text-gray-400 italic">
              一键优化阅读体验
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {simplifiedPresets.map(renderPresetCard)}
          </div>
        </div>

        {/* 高级设置折叠面板 */}
        <div className="mb-5">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 py-2 border-t border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center">
              <span className="mr-2">⚙️</span>
              <span>个性化设置</span>
            </div>
            <span className="transform transition-transform duration-200" style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▼
            </span>
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-3 animate-fadeIn">
              {/* 字体选择 */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                    <span className="mr-2">🔤</span>
                    字体样式
                  </label>
                </div>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value as keyof typeof FONT_FAMILIES)}
                  className="w-full p-2 border rounded bg-white dark:bg-gray-800 dark:text-gray-200 text-sm"
                >
                  {Object.entries(FONT_FAMILIES).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              {/* 背景颜色 */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                    <span className="mr-2">🎨</span>
                    背景颜色
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(BACKGROUND_COLORS).map(([key, color]) => (
                    <button
                      key={key}
                      onClick={() => setBackgroundColor(key as keyof typeof BACKGROUND_COLORS)}
                      className={`w-8 h-8 rounded-full transition-all ${backgroundColor === key
                        ? 'ring-2 ring-brand-500 dark:ring-brand-400 scale-110 shadow-md'
                        : 'hover:scale-105 hover:shadow-sm'
                        }`}
                      style={{ backgroundColor: color }}
                      aria-label={`背景颜色: ${key}`}
                    />
                  ))}
                </div>
              </div>

              {/* 重置按钮 */}
              <div className="pt-2 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm('确定要重置所有设置吗？这将恢复到默认状态。'))
                      resetToDefaultSettings();
                  }}
                  className="text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                >
                  <span className="mr-1">🔄</span>
                  重置所有设置
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 关于信息 */}
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-center gap-2">
            <div className="text-xs text-center text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
              阅读助手 v1.5.0
            </div>
            <a
              href="#"
              className="text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 hover:underline transition-colors"
            >
              反馈问题
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewPopup;
