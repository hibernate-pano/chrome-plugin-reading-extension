import React, { useEffect, useState } from 'react';
import useAppStore, { initializeStore } from '../store';
import Button from '../ui/components/Button';
import { Slider } from '../ui/components/Slider';
import Switch from '../ui/components/Switch';
import { StorageKeys, setStorage, getStorage, FONT_FAMILIES, BACKGROUND_COLORS, CODE_THEMES, StorageKeysType } from '../storage/storage';

// 字体标签映射
function getFontFamilyLabel(key: keyof typeof FONT_FAMILIES): string {
  const labels: Record<keyof typeof FONT_FAMILIES, string> = {
    default: '系统默认',
    songti: '宋体',
    heiti: '黑体',
    kaiti: '楷体',
    pingfang: '苹方',
    microsoft: '微软雅黑',
  };
  return labels[key];
}

// 背景颜色标签映射
function getBackgroundColorLabel(key: keyof typeof BACKGROUND_COLORS): string {
  const labels: Record<keyof typeof BACKGROUND_COLORS, string> = {
    white: '纯白',
    warm: '暖色',
    cool: '冷色',
    sepia: '复古',
    cream: '奶油',
    mint: '薄荷',
    gray: '灰色',
  };
  return labels[key];
}

interface TabProps {
  label: string;
  icon: string;
  isSelected: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabProps> = ({ label, icon, isSelected, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all
      ${isSelected 
        ? 'bg-white shadow-sm text-blue-600 ring-1 ring-black/5' 
        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
      }`}
  >
    <span className="mr-2 text-base">{icon}</span>
    {label}
  </button>
);

interface TabPanelProps {
  children: React.ReactNode;
  isSelected: boolean;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, isSelected }) => (
  <div className={`${isSelected ? 'block' : 'hidden'} animate-fadeIn`}>
    {children}
  </div>
);

export const Popup = () => {
  const {
    theme,
    fontSize,
    codeFontSize,
    readingMode,
    lineHeight,
    letterSpacing,
    pageWidth,
    textAlign,
    firstLineIndent,
    showImages,
    showDirectory,
    setTheme,
    setFontSize,
    setCodeFontSize,
    setReadingMode,
    setLineHeight,
    setLetterSpacing,
    setPageWidth,
    setTextAlign,
    setFirstLineIndent,
    setShowImages,
    setShowDirectory,
  } = useAppStore();

  const [fontFamily, setFontFamily] = useState<keyof typeof FONT_FAMILIES>('default');
  const [backgroundColor, setBackgroundColor] = useState<keyof typeof BACKGROUND_COLORS>('white');
  const [codeTheme, setCodeTheme] = useState<keyof typeof CODE_THEMES>('github');
  const [selectedTab, setSelectedTab] = useState(0);

  useEffect(() => {
    initializeStore();
    
    const initializeSettings = async () => {
      const savedFontFamily = await getStorage<keyof typeof FONT_FAMILIES>(StorageKeys.FONT_FAMILY);
      if (savedFontFamily) setFontFamily(savedFontFamily);
      
      const savedBackgroundColor = await getStorage<keyof typeof BACKGROUND_COLORS>(StorageKeys.BACKGROUND_COLOR);
      if (savedBackgroundColor) setBackgroundColor(savedBackgroundColor);
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

  const toggleReadingMode = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        chrome.tabs.sendMessage(
          tab.id,
          { action: 'TOGGLE_READING_MODE' },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('发送消息时发生错误:', chrome.runtime.lastError);
              return;
            }
            if (response?.success) {
              setReadingMode(response.isReadingMode);
            } else {
              console.error('切换阅读模式失败:', response?.error);
            }
          }
        );
      }
    } catch (error) {
      console.error('切换阅读模式时发生错误:', error);
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

  const tabs = [
    { name: '基础', icon: '📝' },
    { name: '字体', icon: '🔤' },
    { name: '代码', icon: '💻' },
    { name: '布局', icon: '📐' },
    { name: '其他', icon: '⚙️' },
  ];

  return (
    <div className="w-[480px] min-h-[600px] p-6 bg-gray-50">
      {/* 标题栏 */}
      <div className="relative mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">阅读模式设置</h1>
        <Button
          variant={readingMode ? 'primary' : 'outline'}
          size="small"
          onClick={toggleReadingMode}
          className="shadow-sm"
        >
          阅读模式
        </Button>
      </div>

      {/* 标签页导航 */}
      <div className="flex space-x-1 rounded-xl bg-white shadow-sm p-1 mb-6">
        {tabs.map((tab, index) => (
          <TabButton
            key={tab.name}
            label={tab.name}
            icon={tab.icon}
            isSelected={selectedTab === index}
            onClick={() => setSelectedTab(index)}
          />
        ))}
      </div>

      {/* 基础设置面板 */}
      <TabPanel isSelected={selectedTab === 0}>
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-medium text-gray-900">主题设置</h3>
                <p className="text-sm text-gray-500 mt-1">
                  选择适合你的主题和背景颜色，让阅读更舒适
                </p>
              </div>
              <Switch
                label={theme === 'light' ? '浅色' : '深色'}
                checked={theme === 'dark'}
                onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>

            <div className="mt-6">
              <label className="text-sm font-medium text-gray-700">背景颜色</label>
              <div className="flex gap-3 mt-3">
                {Object.entries(BACKGROUND_COLORS).map(([key, color]) => (
                  <button
                    key={key}
                    className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                      backgroundColor === key ? 'border-blue-600 ring-2 ring-blue-200' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleBackgroundColorChange(key as keyof typeof BACKGROUND_COLORS)}
                    title={getBackgroundColorLabel(key as keyof typeof BACKGROUND_COLORS)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </TabPanel>

      {/* 字体设置面板 */}
      <TabPanel isSelected={selectedTab === 1}>
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="mb-6">
              <h3 className="text-base font-medium text-gray-900">字体选择</h3>
              <p className="text-sm text-gray-500 mt-1">
                选择合适的字体，提升阅读体验
              </p>
              <select
                value={fontFamily}
                onChange={(e) => handleFontFamilyChange(e.target.value as keyof typeof FONT_FAMILIES)}
                className="mt-3 w-full rounded-lg border border-gray-300 py-2 px-3 text-sm bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {Object.entries(FONT_FAMILIES).map(([key]) => (
                  <option key={key} value={key}>
                    {getFontFamilyLabel(key as keyof typeof FONT_FAMILIES)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-base font-medium text-gray-900 mb-4">字体调整</h3>
                <div className="space-y-6">
                  <Slider
                    label="字体大小"
                    value={fontSize}
                    onChange={setFontSize}
                    min={12}
                    max={24}
                    step={1}
                    className="w-full"
                  />
                  <Slider
                    label="行间距"
                    value={lineHeight}
                    onChange={setLineHeight}
                    min={1}
                    max={3}
                    step={0.1}
                    className="w-full"
                  />
                  <Slider
                    label="字间距"
                    value={letterSpacing}
                    onChange={setLetterSpacing}
                    min={-2}
                    max={10}
                    step={0.5}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </TabPanel>

      {/* 代码设置面板 */}
      <TabPanel isSelected={selectedTab === 2}>
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="mb-6">
              <h3 className="text-base font-medium text-gray-900">代码主题</h3>
              <p className="text-sm text-gray-500 mt-1">
                选择适合的代码主题，让代码更易阅读
              </p>
              <select
                value={codeTheme}
                onChange={(e) => handleCodeThemeChange(e.target.value as keyof typeof CODE_THEMES)}
                className="mt-3 w-full rounded-lg border border-gray-300 py-2 px-3 text-sm bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {Object.entries(CODE_THEMES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <h3 className="text-base font-medium text-gray-900 mb-4">代码显示</h3>
              <div className="space-y-6">
                <Slider
                  label="代码字体大小"
                  value={codeFontSize}
                  onChange={setCodeFontSize}
                  min={12}
                  max={20}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </TabPanel>

      {/* 布局设置面板 */}
      <TabPanel isSelected={selectedTab === 3}>
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="mb-6">
              <h3 className="text-base font-medium text-gray-900">页面布局</h3>
              <p className="text-sm text-gray-500 mt-1">
                调整页面宽度和文本对齐方式
              </p>
              <div className="mt-4 space-y-6">
                <Slider
                  label="页面宽度"
                  value={pageWidth}
                  onChange={setPageWidth}
                  min={500}
                  max={1200}
                  step={50}
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">对齐方式</h3>
                  <p className="text-xs text-gray-500 mt-1">选择文本的对齐方式</p>
                </div>
                <select
                  value={textAlign}
                  onChange={(e) => setTextAlign(e.target.value as 'left' | 'center' | 'right')}
                  className="w-24 rounded-lg border border-gray-300 py-2 px-3 text-sm bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="left">左对齐</option>
                  <option value="center">居中</option>
                  <option value="right">右对齐</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">首行缩进</h3>
                  <p className="text-xs text-gray-500 mt-1">段落首行是否缩进两个字符</p>
                </div>
                <Switch
                  checked={firstLineIndent}
                  onChange={setFirstLineIndent}
                />
              </div>
            </div>
          </div>
        </div>
      </TabPanel>

      {/* 其他设置面板 */}
      <TabPanel isSelected={selectedTab === 4}>
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">显示图片</h3>
                  <p className="text-xs text-gray-500 mt-1">是否显示文章中的图片内容</p>
                </div>
                <Switch
                  checked={showImages}
                  onChange={setShowImages}
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">显示目录</h3>
                  <p className="text-xs text-gray-500 mt-1">在文章旁显示导航目录</p>
                </div>
                <Switch
                  checked={showDirectory}
                  onChange={setShowDirectory}
                />
              </div>
            </div>
          </div>
        </div>
      </TabPanel>

      {/* 版本信息 */}
      <div className="mt-6 text-center">
        <span className="text-xs text-gray-400">版本 1.1.2</span>
      </div>
    </div>
  );
};

function getBackgroundColorName(key: keyof typeof BACKGROUND_COLORS): string {
  const nameMap: Record<keyof typeof BACKGROUND_COLORS, string> = {
    white: '纯白',
    warm: '暖色',
    cool: '冷色',
    sepia: '复古',
    cream: '奶油',
    mint: '薄荷',
    gray: '灰色',
  };
  return nameMap[key];
}

export default Popup; 