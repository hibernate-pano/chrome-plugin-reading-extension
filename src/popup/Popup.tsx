import React, { useEffect, useState } from 'react';
import useAppStore, { initializeStore } from '../store';
import Button from '../ui/components/Button';
import Slider from '../ui/components/Slider';
import Switch from '../ui/components/Switch';
import { StorageKeys, setStorage, getStorage, FONT_FAMILIES, BACKGROUND_COLORS } from '../storage/storage';

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
          {readingMode ? '退出阅读模式' : '进入阅读模式'}
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
          max={2}
          step={0.1}
          value={lineHeight}
          onChange={setLineHeight}
        />

        <Slider
          label="字间距"
          min={0}
          max={2}
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