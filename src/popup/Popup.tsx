import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import Button from '../ui/components/Button';
import { Slider } from '../ui/components/Slider';
import Switch from '../ui/components/Switch';
import { Tabs, TabItem, TabPanels, TabPanel } from '../ui/components/Tabs';
import { Card, CardHeader, CardContent, CardFooter } from '../ui/components/Card';
import { StorageKeys, setStorage, getStorage, FONT_FAMILIES, BACKGROUND_COLORS, CODE_THEMES, StorageKeysType } from '../storage/storage';
import PresetSelector from './components/PresetSelector';
import {
  MIN_LINE_HEIGHT,
  MAX_LINE_HEIGHT,
  LINE_HEIGHT_STEP,
  MIN_PARAGRAPH_SPACING,
  MAX_PARAGRAPH_SPACING,
  PARAGRAPH_SPACING_STEP
} from '../constants/options';

export const Popup = () => {
  const { settings, updateSetting, initSettings } = useSettingsStore();
  const { theme, fontSize, lineHeight, paragraphSpacing, presets, activePreset } = settings;
  
  const [readingMode, setReadingMode] = useState(false);
  const [codeFontSize, setCodeFontSize] = useState(14);
  const [showImages, setShowImages] = useState(true);
  const [fontFamily, setFontFamily] = useState<keyof typeof FONT_FAMILIES>('default');
  const [backgroundColor, setBackgroundColor] = useState<keyof typeof BACKGROUND_COLORS>('white');
  const [codeTheme, setCodeTheme] = useState<keyof typeof CODE_THEMES>('github');
  const [selectedTab, setSelectedTab] = useState('basic');
  const [isLoading, setIsLoading] = useState(true);

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

        const savedCodeTheme = await getStorage<keyof typeof CODE_THEMES>(StorageKeys.CODE_THEME);
        if (savedCodeTheme) setCodeTheme(savedCodeTheme);
      } catch (error) {
        console.error('初始化设置时发生错误:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSettings();

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

    handleVisibilityChange();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  const toggleReadingMode = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        setReadingMode(!readingMode);

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

                // 尝试再次注入脚本并重试
                chrome.scripting.executeScript({
                  target: { tabId: tab.id! },
                  files: ['src/content/content.js']
                }).then(() => {
                  // 注入成功后再次尝试切换
                  setTimeout(() => {
                    chrome.tabs.sendMessage(
                      tab.id!,
                      { action: 'TOGGLE_READING_MODE' },
                      (retryResponse) => {
                        if (chrome.runtime.lastError || !retryResponse?.success) {
                          console.error('重试切换阅读模式失败:', chrome.runtime.lastError || retryResponse?.error);
                          setReadingMode(readingMode);
                        } else {
                          setReadingMode(retryResponse.isReadingMode);
                        }
                      }
                    );
                  }, 500);
                }).catch(error => {
                  console.error('重新注入内容脚本失败:', error);
                  setReadingMode(readingMode);
                });
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
      // 如果出错，恢复状态
      setReadingMode(readingMode);
    }
  };

  const handleFontFamilyChange = async (value: keyof typeof FONT_FAMILIES) => {
    setFontFamily(value);
    await setStorage(StorageKeys.FONT_FAMILY, value);
  };

  const handleBackgroundColorChange = async (value: keyof typeof BACKGROUND_COLORS) => {
    setBackgroundColor(value);
    await setStorage(StorageKeys.BACKGROUND_COLOR, value);
  };

  const handleCodeThemeChange = async (value: keyof typeof CODE_THEMES) => {
    setCodeTheme(value);
    await setStorage(StorageKeys.CODE_THEME, value);
  };

  const tabs: TabItem[] = [
    { id: 'presets', label: '预设', icon: '📖' },
    { id: 'basic', label: '基础', icon: '📝' },
    { id: 'style', label: '样式', icon: '🎨' },
    { id: 'advanced', label: '高级', icon: '⚙️' },
  ];

  if (isLoading) {
    return (
      <div className="w-[440px] h-[580px] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl overflow-hidden">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[440px] h-[580px] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl overflow-hidden">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/30 px-6 py-4 flex justify-between items-center">
        <h1 className="text-lg font-semibold text-brand-700 dark:text-brand-400">
          AI 阅读助手
        </h1>

        <div className="flex gap-2">
          <Switch
            checked={theme === 'dark'}
            onChange={(checked) => updateSetting('theme', checked ? 'dark' : 'light')}
            size="small"
          />
          <Button
            variant={readingMode ? 'primary' : 'outline'}
            size="sm"
            onClick={toggleReadingMode}
          >
            {readingMode ? '退出阅读' : '阅读模式'}
          </Button>
        </div>
      </div>

      {/* 主体内容 */}
      <div className="p-6 overflow-y-auto h-[calc(100%-70px)]">
        <Tabs
          tabs={tabs}
          activeTab={selectedTab}
          onChange={setSelectedTab}
          fullWidth
          className="mb-5"
        />

        <TabPanels activeTab={selectedTab} transition="fade">
          {/* 预设面板 */}
          <TabPanel id="presets">
            <PresetSelector />
          </TabPanel>

          {/* 基础设置面板 */}
          <TabPanel id="basic">
            <div className="space-y-6">
              {/* 字体大小 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  字体大小
                </label>
                <Slider
                  value={fontSize}
                  onChange={(value) => updateSetting('fontSize', value)}
                  min={12}
                  max={24}
                  step={1}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  当前值: {fontSize}px
                </div>
              </div>

              {/* 行高 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  行高
                </label>
                <Slider
                  value={lineHeight}
                  onChange={(value) => updateSetting('lineHeight', value)}
                  min={MIN_LINE_HEIGHT}
                  max={MAX_LINE_HEIGHT}
                  step={LINE_HEIGHT_STEP}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  当前值: {lineHeight.toFixed(1)}
                </div>
              </div>

              {/* 段落间距 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  段落间距
                </label>
                <Slider
                  value={paragraphSpacing}
                  onChange={(value) => updateSetting('paragraphSpacing', value)}
                  min={MIN_PARAGRAPH_SPACING}
                  max={MAX_PARAGRAPH_SPACING}
                  step={PARAGRAPH_SPACING_STEP}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  当前值: {paragraphSpacing.toFixed(1)}
                </div>
              </div>

              {/* 显示图片 */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  显示图片
                </label>
                <Switch
                  checked={showImages}
                  onChange={(checked) => setShowImages(checked)}
                  size="small"
                />
              </div>
            </div>
          </TabPanel>

          {/* 样式设置面板 */}
          <TabPanel id="style">
            <div className="space-y-6">
              {/* 字体选择 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  字体
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(FONT_FAMILIES).map(([key, value]) => {
                    const isActive = fontFamily === key;
                    return (
                      <Button
                        key={key}
                        variant={isActive ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => handleFontFamilyChange(key as keyof typeof FONT_FAMILIES)}
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
                  背景颜色
                </label>
                <div className="flex flex-wrap gap-3">
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
                        onClick={() => handleBackgroundColorChange(key as keyof typeof BACKGROUND_COLORS)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </TabPanel>

          {/* 高级设置面板 */}
          <TabPanel id="advanced">
            <div className="space-y-6">
              {/* 代码字体大小 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  代码字体大小
                </label>
                <Slider
                  value={codeFontSize}
                  onChange={(value) => setCodeFontSize(value)}
                  min={10}
                  max={20}
                  step={1}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  当前值: {codeFontSize}px
                </div>
              </div>

              {/* 代码主题 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  代码主题
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(CODE_THEMES).map(([key, label]) => {
                    const isActive = codeTheme === key;
                    return (
                      <Button
                        key={key}
                        variant={isActive ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => handleCodeThemeChange(key as keyof typeof CODE_THEMES)}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* 重置按钮 */}
              <div className="pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm('确定要重置所有设置吗？')) {
                      initSettings();
                    }
                  }}
                  className="w-full"
                >
                  重置所有设置
                </Button>
              </div>
            </div>
          </TabPanel>
        </TabPanels>
      </div>
    </div>
  );
};

// 添加一些样式
const styles = `
  /* 自定义滚动条 */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  /* 平滑过渡效果 */
  * {
    transition: background-color 0.3s, border-color 0.3s, color 0.3s;
  }
`;

// 添加样式到文档
const styleElement = document.createElement('style');
styleElement.textContent = styles;
document.head.appendChild(styleElement);

export default Popup;
