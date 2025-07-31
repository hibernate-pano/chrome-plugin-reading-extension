import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { Button, Card, CardHeader, CardContent, CardActions } from '../design-system';
import { StorageKeys, getStorage, setStorage, ReadingPreset } from '../storage/storage';
import { MESSAGE_TYPES } from '../constants';
import builtInPresets from '../presets/builtInPresets';

/**
 * Material Design 3 Popup 组件
 * 基于Chrome Material Design规范重新设计
 */
export const PopupMD3: React.FC = () => {
  const { settings, updateSetting, initSettings } = useSettingsStore();
  const { theme, presets, activePreset } = settings;
  const [readingMode, setReadingMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<string>('paper');

  useEffect(() => {
    initSettings();
    initializePopup();
  }, []);

  const initializePopup = async () => {
    setIsLoading(true);
    try {
      // 获取当前阅读模式状态
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        chrome.tabs.sendMessage(
          tab.id,
          { action: MESSAGE_TYPES.GET_READING_MODE_STATE },
          (response) => {
            if (response?.readingMode !== undefined) {
              setReadingMode(response.readingMode);
            }
          }
        );
      }

      // 获取保存的预设
      const savedPreset = await getStorage<string>(StorageKeys.ACTIVE_PRESET);
      if (savedPreset) {
        setSelectedPreset(savedPreset);
      }
    } catch (error) {
      console.error('初始化弹窗时发生错误:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleReadingMode = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        const newReadingMode = !readingMode;

        chrome.tabs.sendMessage(
          tab.id,
          {
            action: newReadingMode ? MESSAGE_TYPES.ENABLE_READING_MODE : MESSAGE_TYPES.DISABLE_READING_MODE,
            preset: selectedPreset
          },
          (response) => {
            if (response?.success) {
              setReadingMode(newReadingMode);
            }
          }
        );
      }
    } catch (error) {
      console.error('切换阅读模式时发生错误:', error);
    }
  };

  const handlePresetChange = async (presetId: string) => {
    setSelectedPreset(presetId);
    await setStorage(StorageKeys.ACTIVE_PRESET, presetId);

    // 如果当前处于阅读模式，立即应用新预设
    if (readingMode) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            action: MESSAGE_TYPES.APPLY_PRESET,
            preset: presetId
          });
        }
      } catch (error) {
        console.error('应用预设时发生错误:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="w-80 h-96 flex items-center justify-center bg-surface text-on-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary-40 border-t-transparent rounded-full animate-spin" />
          <p className="text-body-medium text-on-surface-variant">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-surface text-on-surface">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-primary-40 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-on-primary" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-title-large font-medium text-on-surface">阅读模式</h1>
            <p className="text-body-small text-on-surface-variant">优化网页阅读体验</p>
          </div>
        </div>

        {/* Reading Mode Toggle */}
        <Card variant="filled" className="mb-4">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-title-medium font-medium text-on-surface">
                  {readingMode ? '阅读模式已开启' : '开启阅读模式'}
                </h3>
                <p className="text-body-small text-on-surface-variant mt-1">
                  {readingMode ? '正在优化页面显示' : '提取主要内容，优化排版'}
                </p>
              </div>
              <Button
                variant={readingMode ? 'tonal' : 'filled'}
                size="medium"
                onClick={toggleReadingMode}
              >
                {readingMode ? '关闭' : '开启'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Presets Section */}
      <div className="px-6 pb-6">
        <h2 className="text-title-medium font-medium text-on-surface mb-4">阅读预设</h2>

        <div className="grid grid-cols-2 gap-3">
          {builtInPresets.map((preset) => (
            <Card
              key={preset.id}
              variant={selectedPreset === preset.id ? 'elevated' : 'outlined'}
              interactive
              className={`transition-all duration-200 ${selectedPreset === preset.id
                ? 'ring-2 ring-primary-40/20 bg-primary-container text-on-primary-container'
                : ''
                }`}
              onClick={() => handlePresetChange(preset.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full border-2"
                    style={{
                      backgroundColor: preset.settings.backgroundColor,
                      borderColor: preset.settings.textColor
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-label-large font-medium truncate">
                      {preset.name}
                    </h3>
                    <p className="text-body-small opacity-70 truncate">
                      {preset.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-outline-variant">
        <div className="flex items-center justify-between">
          <p className="text-body-small text-on-surface-variant">
            Chrome 阅读插件 v1.8.0
          </p>
          <Button
            variant="text"
            size="small"
            onClick={() => {
              chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
            }}
          >
            设置
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PopupMD3;
