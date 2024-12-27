import React, { useEffect, useState } from 'react';
import useAppStore, { initializeStore } from '../store';
import Button from '../ui/components/Button';
import Slider from '../ui/components/Slider';
import Switch from '../ui/components/Switch';
import { StorageKeys, setStorage, getStorage, FONT_FAMILIES, BACKGROUND_COLORS, StorageKeysType } from '../storage/storage';

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

const Popup: React.FC = () => {
  const {
    theme,
    fontSize,
    readingMode,
    lineHeight,
    letterSpacing,
    pageWidth,
    textAlign,
    firstLineIndent,
    showImages,
    setTheme,
    setFontSize,
    setReadingMode,
    setLineHeight,
    setLetterSpacing,
    setPageWidth,
    setTextAlign,
    setFirstLineIndent,
    setShowImages,
  } = useAppStore();

  const [fontFamily, setFontFamily] = useState<keyof typeof FONT_FAMILIES>('default');
  const [backgroundColor, setBackgroundColor] = useState<keyof typeof BACKGROUND_COLORS>('white');

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

  return (
    <div className="w-80 p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">阅读模式设置</h1>
        <Button
          variant={readingMode ? 'primary' : 'outline'}
          size="small"
          onClick={toggleReadingMode}
        >
          阅读模式
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">主题</span>
          <Switch
            label={theme === 'light' ? '浅色' : '深色'}
            checked={theme === 'dark'}
            onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
          />
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

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">显示图片</span>
          <Switch
            checked={showImages}
            onChange={setShowImages}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">字体选择</span>
          <select
            value={fontFamily}
            onChange={(e) => handleFontFamilyChange(e.target.value as keyof typeof FONT_FAMILIES)}
            className="w-24 rounded-md border border-gray-300 py-1 px-2 text-sm bg-white"
          >
            <option value="default">系统默认</option>
            <option value="songti">宋体</option>
            <option value="heiti">黑体</option>
            <option value="kaiti">楷体</option>
            <option value="pingfang">苹方</option>
            <option value="microsoft">微软雅黑</option>
          </select>
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
                title={getBackgroundColorName(key as keyof typeof BACKGROUND_COLORS)}
              />
            ))}
          </div>
        </div>
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