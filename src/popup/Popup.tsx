import React, { useEffect, useState } from 'react';
import useAppStore, { initializeStore } from '../store';
import Button from '../ui/components/Button';
import Slider from '../ui/components/Slider';
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

interface SettingsProps {
  onSettingChange: (key: StorageKeysType, value: any) => void;
  settings: {
    theme: 'light' | 'dark';
    fontSize: number;
    codeFontSize: number;
    lineHeight: number;
    letterSpacing: number;
    pageWidth: number;
    textAlign: 'left' | 'center' | 'right';
    firstLineIndent: boolean;
    showImages: boolean;
    fontFamily: keyof typeof FONT_FAMILIES;
    backgroundColor: keyof typeof BACKGROUND_COLORS;
  };
}

function Settings({ settings, onSettingChange }: SettingsProps) {
  return (
    <div className="settings-container">
      <div className="settings-group">
        <div className="settings-row">
          <label>主题</label>
          <select
            value={settings.theme}
            onChange={(e) => onSettingChange(StorageKeys.THEME, e.target.value)}
          >
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </div>

        <div className="settings-row">
          <label>字体</label>
          <select
            value={settings.fontFamily}
            onChange={(e) => onSettingChange(StorageKeys.FONT_FAMILY, e.target.value)}
          >
            {Object.entries(FONT_FAMILIES).map(([key]) => (
              <option key={key} value={key}>
                {getFontFamilyLabel(key as keyof typeof FONT_FAMILIES)}
              </option>
            ))}
          </select>
        </div>

        <div className="settings-row">
          <label>背景颜色</label>
          <select
            value={settings.backgroundColor}
            onChange={(e) => onSettingChange(StorageKeys.BACKGROUND_COLOR, e.target.value)}
          >
            {Object.entries(BACKGROUND_COLORS).map(([key]) => (
              <option key={key} value={key}>
                {getBackgroundColorLabel(key as keyof typeof BACKGROUND_COLORS)}
              </option>
            ))}
          </select>
        </div>

        <div className="settings-row">
          <label>字体大小</label>
          <div className="slider-container">
            <input
              type="range"
              min="12"
              max="24"
              value={settings.fontSize}
              onChange={(e) => onSettingChange(StorageKeys.FONT_SIZE, parseInt(e.target.value))}
            />
            <span className="slider-value">{settings.fontSize}px</span>
          </div>
        </div>

        <div className="settings-row">
          <label>代码字体大小</label>
          <div className="slider-container">
            <input
              type="range"
              min="12"
              max="24"
              value={settings.codeFontSize}
              onChange={(e) => onSettingChange(StorageKeys.CODE_FONT_SIZE, parseInt(e.target.value))}
            />
            <span className="slider-value">{settings.codeFontSize}px</span>
          </div>
        </div>

        <div className="settings-row">
          <label>行高</label>
          <div className="slider-container">
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={settings.lineHeight}
              onChange={(e) => onSettingChange(StorageKeys.LINE_HEIGHT, parseFloat(e.target.value))}
            />
            <span className="slider-value">{settings.lineHeight}</span>
          </div>
        </div>

        <div className="settings-row">
          <label>字间距</label>
          <div className="slider-container">
            <input
              type="range"
              min="0"
              max="3"
              value={settings.letterSpacing}
              onChange={(e) => onSettingChange(StorageKeys.LETTER_SPACING, parseInt(e.target.value))}
            />
            <span className="slider-value">{settings.letterSpacing}px</span>
          </div>
        </div>

        <div className="settings-row">
          <label>页面宽度</label>
          <div className="slider-container">
            <input
              type="range"
              min="600"
              max="1200"
              step="50"
              value={settings.pageWidth}
              onChange={(e) => onSettingChange(StorageKeys.PAGE_WIDTH, parseInt(e.target.value))}
            />
            <span className="slider-value">{settings.pageWidth}px</span>
          </div>
        </div>

        <div className="settings-row">
          <label>对齐方式</label>
          <select
            value={settings.textAlign}
            onChange={(e) => onSettingChange(StorageKeys.TEXT_ALIGN, e.target.value)}
          >
            <option value="left">左对齐</option>
            <option value="center">居中</option>
            <option value="right">右对齐</option>
          </select>
        </div>

        <div className="settings-row">
          <label>首行缩进</label>
          <div className="toggle-switch">
            <input
              type="checkbox"
              id="firstLineIndent"
              checked={settings.firstLineIndent}
              onChange={(e) => onSettingChange(StorageKeys.FIRST_LINE_INDENT, e.target.checked)}
            />
            <label htmlFor="firstLineIndent"></label>
          </div>
        </div>

        <div className="settings-row">
          <label>显示图片</label>
          <div className="toggle-switch">
            <input
              type="checkbox"
              id="showImages"
              checked={settings.showImages}
              onChange={(e) => onSettingChange(StorageKeys.SHOW_IMAGES, e.target.checked)}
            />
            <label htmlFor="showImages"></label>
          </div>
        </div>
      </div>
    </div>
  );
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
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
    className={`flex items-center justify-center w-full rounded-lg py-2 text-sm font-medium leading-5 
      ${isSelected 
        ? 'bg-white shadow text-blue-600' 
        : 'text-gray-600 hover:bg-white/[0.12] hover:text-blue-600'
      }`}
  >
    <span className="mr-1">{icon}</span>
    {label}
  </button>
);

interface TabPanelProps {
  children: React.ReactNode;
  isSelected: boolean;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, isSelected }) => (
  <div className={isSelected ? 'block' : 'hidden'}>
    {children}
  </div>
);

const Popup: React.FC = () => {
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
    <div className="w-96 p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-semibold">阅读模式设置</h1>
        <Button
          variant={readingMode ? 'primary' : 'outline'}
          size="small"
          onClick={toggleReadingMode}
        >
          阅读模式
        </Button>
      </div>

      <div className="flex space-x-1 rounded-xl bg-gray-100 p-1 mb-4">
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">主题</span>
            <Switch
              label={theme === 'light' ? '浅色' : '深色'}
              checked={theme === 'dark'}
              onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">背景颜色</span>
            <div className="flex gap-2">
              {Object.entries(BACKGROUND_COLORS).map(([key, color]) => (
                <button
                  key={key}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    backgroundColor === key ? 'border-blue-600' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleBackgroundColorChange(key as keyof typeof BACKGROUND_COLORS)}
                  title={getBackgroundColorLabel(key as keyof typeof BACKGROUND_COLORS)}
                />
              ))}
            </div>
          </div>
        </div>
      </TabPanel>

      {/* 字体设置面板 */}
      <TabPanel isSelected={selectedTab === 1}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">字体选择</span>
            <select
              value={fontFamily}
              onChange={(e) => handleFontFamilyChange(e.target.value as keyof typeof FONT_FAMILIES)}
              className="w-32 rounded-md border border-gray-300 py-1 px-2 text-sm bg-white"
            >
              {Object.entries(FONT_FAMILIES).map(([key]) => (
                <option key={key} value={key}>
                  {getFontFamilyLabel(key as keyof typeof FONT_FAMILIES)}
                </option>
              ))}
            </select>
          </div>

          <Slider
            label="字体大小"
            min={12}
            max={24}
            step={1}
            value={fontSize}
            onChange={setFontSize}
          />

          <Slider
            label="行高"
            min={1}
            max={3}
            step={0.1}
            value={lineHeight}
            onChange={setLineHeight}
          />

          <Slider
            label="字间距"
            min={0}
            max={3}
            step={0.1}
            value={letterSpacing}
            onChange={setLetterSpacing}
          />
        </div>
      </TabPanel>

      {/* 代码设置面板 */}
      <TabPanel isSelected={selectedTab === 2}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">代码主题</span>
            <select
              value={codeTheme}
              onChange={(e) => handleCodeThemeChange(e.target.value as keyof typeof CODE_THEMES)}
              className="w-32 rounded-md border border-gray-300 py-1 px-2 text-sm bg-white"
            >
              {Object.entries(CODE_THEMES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <Slider
            label="代码字体大小"
            min={12}
            max={24}
            step={1}
            value={codeFontSize}
            onChange={setCodeFontSize}
          />
        </div>
      </TabPanel>

      {/* 布局设置面板 */}
      <TabPanel isSelected={selectedTab === 3}>
        <div className="space-y-4">
          <Slider
            label="页面宽度"
            min={400}
            max={1200}
            step={50}
            value={pageWidth}
            onChange={setPageWidth}
          />

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">对齐方式</span>
            <select
              value={textAlign}
              onChange={(e) => setTextAlign(e.target.value as 'left' | 'center' | 'right')}
              className="w-24 rounded-md border border-gray-300 py-1 px-2 text-sm bg-white"
            >
              <option value="left">左对齐</option>
              <option value="center">居中</option>
              <option value="right">右对齐</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">首行缩进</span>
            <Switch
              checked={firstLineIndent}
              onChange={setFirstLineIndent}
            />
          </div>
        </div>
      </TabPanel>

      {/* 其他设置面板 */}
      <TabPanel isSelected={selectedTab === 4}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">显示图片</span>
            <Switch
              checked={showImages}
              onChange={setShowImages}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">显示目录</span>
            <Switch
              checked={showDirectory}
              onChange={setShowDirectory}
            />
          </div>
        </div>
      </TabPanel>
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