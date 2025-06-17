import React, { useEffect, useState } from 'react';
import useAppStore, { initializeStateFromStorage } from '../store';
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
  const {
    theme,
    fontSize,
    codeFontSize,
    readingMode,
    lineHeight,
    paragraphSpacing,
    showImages,
    setTheme,
    setFontSize,
    setCodeFontSize,
    setReadingMode,
    setLineHeight,
    setParagraphSpacing,
    setShowImages,
  } = useAppStore();

  const [fontFamily, setFontFamily] = useState<keyof typeof FONT_FAMILIES>('default');
  const [backgroundColor, setBackgroundColor] = useState<keyof typeof BACKGROUND_COLORS>('white');
  const [codeTheme, setCodeTheme] = useState<keyof typeof CODE_THEMES>('github');
  const [selectedTab, setSelectedTab] = useState('basic');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeStateFromStorage();

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
            onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            size="small"
          />
          <Button
            variant={readingMode ? 'primary' : 'outline'}
            size="sm"
            onClick={toggleReadingMode}
            iconLeft={readingMode ? '📖' : '📃'}
            rounded="full"
            className="ml-2"
          >
            {readingMode ? '退出阅读模式' : '进入阅读模式'}
          </Button>
        </div>
      </div>

      <div className="px-6 py-4 overflow-y-auto h-[calc(100%-66px)] pb-16 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {/* 标签页导航 */}
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
            <div className="space-y-5">
              <Card variant="paper" className="animate-float">
                <CardHeader
                  title="阅读模式设置"
                  subtitle="自定义阅读体验"
                />
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    请使用页面顶部的“阅读模式”按钮来切换阅读模式。在这里您可以调整阅读模式的各种设置。
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader title="字体大小" />
                <CardContent>
                  <Slider
                    min={12}
                    max={24}
                    step={1}
                    value={fontSize}
                    onChange={setFontSize}
                    valueFormat={(value) => `${value}px`}
                    variant="gradient"
                    size="md"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader title="背景颜色" />
                <CardContent>
                  <div className="grid grid-cols-4 gap-3">
                    {Object.entries(BACKGROUND_COLORS).map(([key, color]) => (
                      <button
                        key={key}
                        className={`
                          w-full aspect-square rounded-lg transition-all duration-200
                          ${getBackgroundColorClasses(key as keyof typeof BACKGROUND_COLORS)}
                          ${backgroundColor === key ? 'ring-2 ring-brand-500 ring-offset-2 scale-105' : 'ring-1 ring-gray-200 hover:scale-105'}
                        `}
                        onClick={() => handleBackgroundColorChange(key as keyof typeof BACKGROUND_COLORS)}
                        aria-label={getBackgroundColorLabel(key as keyof typeof BACKGROUND_COLORS)}
                      />
                    ))}
                  </div>
                  <div className="flex justify-center mt-3">
                    <span className="text-xs text-gray-500">
                      当前: {getBackgroundColorLabel(backgroundColor)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader title="字体选择" />
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(FONT_FAMILIES).map((key) => (
                      <button
                        key={key}
                        className={`
                          py-2 px-3 rounded-lg text-sm transition-all duration-200
                          ${fontFamily === key
                            ? 'bg-brand-600 text-white font-medium'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                          }
                        `}
                        onClick={() => handleFontFamilyChange(key as keyof typeof FONT_FAMILIES)}
                      >
                        {getFontFamilyLabel(key as keyof typeof FONT_FAMILIES)}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader title="内容显示" />
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700 dark:text-gray-300">显示图片</span>
                    <Switch
                      checked={showImages}
                      onChange={setShowImages}
                      size="small"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700 dark:text-gray-300">显示目录</span>
                    <Switch
                      checked={showDirectory}
                      onChange={setShowDirectory}
                      size="small"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabPanel>

          {/* 样式设置面板 */}
          <TabPanel id="style">
            <div className="space-y-5">
              <Card>
                <CardHeader title="字体间距" />
                <CardContent className="space-y-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-2">行高</p>
                    <Slider
                      min={MIN_LINE_HEIGHT}
                      max={MAX_LINE_HEIGHT}
                      step={LINE_HEIGHT_STEP}
                      value={lineHeight}
                      onChange={setLineHeight}
                      variant="default"
                      size="md"
                    />
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-2">行间距</p>
                    <Slider
                      min={MIN_LINE_SPACING}
                      max={MAX_LINE_SPACING}
                      step={LINE_SPACING_STEP}
                      value={lineSpacing}
                      onChange={setLineSpacing}
                      variant="accent"
                      size="md"
                    />
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-2">段落间距</p>
                    <Slider
                      min={MIN_PARAGRAPH_SPACING}
                      max={MAX_PARAGRAPH_SPACING}
                      step={PARAGRAPH_SPACING_STEP}
                      value={paragraphSpacing}
                      onChange={setParagraphSpacing}
                      variant="default"
                      size="md"
                    />
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-2">字间距</p>
                    <Slider
                      min={0}
                      max={10}
                      step={0.5}
                      value={letterSpacing}
                      onChange={setLetterSpacing}
                      variant="gradient"
                      size="md"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader title="页面布局" />
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-2">内容宽度</p>
                    <Slider
                      min={600}
                      max={1800}
                      step={100}
                      value={pageWidth}
                      onChange={setPageWidth}
                      valueFormat={(value) => `${value}px`}
                      variant="accent"
                      size="md"
                    />
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-2">文本对齐</p>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {['left', 'center', 'justify'].map((align) => (
                        <button
                          key={align}
                          className={`
                            py-2 px-3 rounded-lg text-sm transition-all duration-200
                            ${textAlign === align
                              ? 'bg-brand-600 text-white font-medium'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                            }
                          `}
                          onClick={() => setTextAlign(align as 'left' | 'center' | 'justify')}
                        >
                          {align === 'left' ? '左对齐' : align === 'center' ? '居中' : '两端对齐'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3">
                    <span className="text-sm text-gray-700 dark:text-gray-300">首行缩进</span>
                    <Switch
                      checked={firstLineIndent}
                      onChange={setFirstLineIndent}
                      size="small"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabPanel>

          {/* 高级设置面板 */}
          <TabPanel id="advanced">
            <div className="space-y-5">
              <Card>
                <CardHeader title="代码显示" />
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-2">代码字体大小</p>
                    <Slider
                      min={10}
                      max={20}
                      step={1}
                      value={codeFontSize}
                      onChange={setCodeFontSize}
                      valueFormat={(value) => `${value}px`}
                      variant="gradient"
                      size="md"
                    />
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-2">代码主题</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {Object.keys(CODE_THEMES).map((theme) => (
                        <button
                          key={theme}
                          className={`
                            py-2 px-3 rounded-lg text-sm transition-all duration-200
                            ${codeTheme === theme
                              ? 'bg-brand-600 text-white font-medium'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                            }
                          `}
                          onClick={() => handleCodeThemeChange(theme as keyof typeof CODE_THEMES)}
                        >
                          {theme}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card variant="hover">
                <CardHeader
                  title="关于"
                  subtitle="AI 阅读助手 v1.4.3"
                />
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    一个基于 AI 的 Chrome 阅读扩展，旨在提供更好的网页阅读体验。
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open('https://github.com/your-repo', '_blank')}
                  >
                    反馈问题
                  </Button>
                </CardFooter>
              </Card>
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
