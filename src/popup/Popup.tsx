import React, { useEffect } from 'react';
import useAppStore, { initializeStore } from '../store';
import Button from '../ui/components/Button';
import Slider from '../ui/components/Slider';
import Switch from '../ui/components/Switch';

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

  useEffect(() => {
    initializeStore();
    // 获取当前页面的阅读模式状态
    chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
      if (tab.id) {
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { 
            action: 'GET_READING_MODE_STATE' 
          });
          if (response) {
            setReadingMode(response.isReadingMode);
          }
        } catch (error) {
          console.error('获取阅读模式状态时发生错误:', error);
        }
      }
    });
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
            className="rounded-md border border-gray-300 py-1 px-2 text-sm"
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
      </div>
    </div>
  );
};

export default Popup; 