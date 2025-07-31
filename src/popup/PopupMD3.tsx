import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { UserSettings } from '../types';
import './PopupMD3.css';
import { Button } from '../design-system';
import { CustomSlider } from '../ui/components/CustomSlider';
import { CustomSwitch } from '../ui/components/CustomSwitch';
import { StorageKeys, getStorage, setStorage, FONT_FAMILIES, BACKGROUND_COLORS } from '../storage/storage';
import { MESSAGE_TYPES } from '../constants';
import builtInPresets from '../presets/builtInPresets';

/**
 * Material Design 3 Popup 组件
 *
 * 这是Chrome扩展的主要弹出界面，采用现代化的卡片式设计。
 * 主要功能包括：
 * - 阅读模式开关控制
 * - 阅读预设选择和管理
 * - 文本设置调整（字体、大小、行高等）
 * - 主题切换（明暗模式）
 * - 实时设置同步和错误处理
 *
 * 设计特点：
 * - 遵循Material Design 3规范
 * - 响应式布局，适配380x520px弹窗
 * - 可折叠的设置区域，节省空间
 * - 流畅的动画和交互效果
 * - 完善的无障碍访问支持
 *
 * 性能优化：
 * - 使用useCallback和useMemo减少重渲染
 * - 防抖处理频繁的设置更新
 * - 错误边界和加载状态管理
 *
 * @author Chrome Extension Team
 * @version 1.8.0
 */
export const PopupMD3: React.FC = () => {
  const { settings, updateSetting, initSettings } = useSettingsStore();
  const { theme, fontSize, lineHeight, paragraphSpacing, fontFamily, backgroundColor } = settings;
  const [readingMode, setReadingMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<string>('paper');
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // 设置项展开状态
  const [expandedSection, setExpandedSection] = useState<string>('font'); // 默认展开字体设置

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

  // 切换设置区域展开状态
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  /**
   * 防抖函数 - 优化频繁的设置更新
   *
   * 对于字体大小、行高、段落间距等可能频繁变化的设置，
   * 使用防抖来减少不必要的存储操作和内容脚本通信。
   *
   * @param func 要防抖的函数
   * @param delay 防抖延迟时间（毫秒）
   * @returns 防抖后的函数
   */
  const debounce = useCallback((func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }, []);

  /**
   * 处理主题切换动画
   *
   * 在明暗主题之间切换时，添加平滑的过渡动画效果。
   * 使用CSS过渡类来实现颜色变化的动画。
   *
   * @returns Promise<void>
   */
  const handleThemeChange = useCallback(async () => {
    setIsThemeTransitioning(true);
    await updateSetting('theme', theme === 'light' ? 'dark' : 'light');

    // 动画完成后移除过渡类
    setTimeout(() => {
      setIsThemeTransitioning(false);
    }, 300);
  }, [theme, updateSetting]);

  // 应用设置到内容脚本
  const applySettingsToContent = useCallback(async (key: keyof UserSettings, value: any) => {
    if (readingMode) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            action: MESSAGE_TYPES.APPLY_SETTINGS,
            settings: { [key]: value }
          });
        }
      } catch (error) {
        console.error('应用设置时发生错误:', error);
      }
    }
  }, [readingMode]);

  // 防抖的设置更新函数
  const debouncedUpdateSetting = useMemo(
    () => debounce(async (key: keyof UserSettings, value: any) => {
      await updateSetting(key, value);
      await applySettingsToContent(key, value);
    }, 300),
    [debounce, updateSetting, applySettingsToContent]
  );

  /**
   * 处理设置变更
   *
   * 统一处理所有设置项的更新，包括错误处理和加载状态管理。
   * 对于频繁变化的设置（如字体大小、行高）使用防抖优化。
   *
   * @param key 设置项的键名
   * @param value 新的设置值
   * @returns Promise<void>
   */
  const handleSettingChange = useCallback(async (key: keyof UserSettings, value: any) => {
    try {
      setError(null);
      setIsUpdating(true);

      // 对于频繁变化的设置使用防抖
      if (key === 'fontSize' || key === 'lineHeight' || key === 'paragraphSpacing') {
        debouncedUpdateSetting(key, value);
      } else {
        await updateSetting(key, value);
        await applySettingsToContent(key, value);
      }
    } catch (err) {
      console.error('设置更新失败:', err);
      setError('设置更新失败，请重试');
    } finally {
      setIsUpdating(false);
    }
  }, [updateSetting, applySettingsToContent, debouncedUpdateSetting]);

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

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className="popup-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">正在加载设置...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`popup-container ${isThemeTransitioning ? 'theme-transition' : ''}`}>
      {/* Header */}
      <div className="popup-header">
        <div className="popup-header-content flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-40 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-on-primary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-title-large font-medium text-on-surface">阅读助手</h1>
              <p className="text-body-small text-on-surface-variant">优化网页阅读体验</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="text"
              size="small"
              onClick={handleThemeChange}
              className="w-8 h-8 p-0"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('options.html') })}
              className="w-8 h-8 p-0"
            >
              ⚙️
            </Button>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          <button
            className="error-close"
            onClick={() => setError(null)}
            aria-label="关闭错误提示"
          >
            ×
          </button>
        </div>
      )}

      {/* 更新状态指示器 */}
      {isUpdating && (
        <div className="updating-indicator">
          <div className="updating-spinner"></div>
          <span>正在更新设置...</span>
        </div>
      )}

      {/* Reading Mode Control */}
      <div className="reading-mode-card">
        <div className="reading-mode-content">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">📖</div>
              <div>
                <h3 className="text-title-medium font-medium text-on-surface">
                  阅读模式
                </h3>
                <p className="text-body-small text-on-surface-variant">
                  {readingMode ? '正在优化页面显示' : '提取主要内容，优化排版'}
                </p>
              </div>
            </div>
            <CustomSwitch
              checked={readingMode}
              onChange={toggleReadingMode}
              size="large"
            />
          </div>
        </div>
      </div>

      {/* Main Settings Area - Scrollable */}
      <div className="settings-area">
        {/* Font Settings Card */}
        <div className="settings-card">
          <button
            className="settings-card-header"
            onClick={() => toggleSection('font')}
          >
            <div className="settings-card-title">
              <div className="settings-card-icon">🔤</div>
              <h3 className="text-title-medium font-medium text-on-surface">字体设置</h3>
            </div>
            <div className={`settings-card-expand-icon ${expandedSection === 'font' ? 'expanded' : ''}`}>
              ▼
            </div>
          </button>

          {expandedSection === 'font' && (
            <div className="settings-card-content">
              {/* Font Size */}
              <div className="setting-item">
                <div className="setting-label">
                  <span className="setting-label-text">字体大小</span>
                  <span className="setting-value">{fontSize}px</span>
                </div>
                <CustomSlider
                  value={fontSize}
                  min={12}
                  max={24}
                  step={1}
                  onChange={(value: number) => handleSettingChange('fontSize', value)}
                  className="custom-slider"
                />
              </div>

              {/* Font Family */}
              <div className="setting-item">
                <label className="setting-label-text mb-2 block">字体类型</label>
                <select
                  value={fontFamily}
                  onChange={(e) => handleSettingChange('fontFamily', e.target.value)}
                  className="custom-select"
                >
                  {Object.entries(FONT_FAMILIES).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Typography Settings Card */}
        <div className="settings-card">
          <button
            className="settings-card-header"
            onClick={() => toggleSection('typography')}
          >
            <div className="settings-card-title">
              <div className="settings-card-icon">📐</div>
              <h3 className="text-title-medium font-medium text-on-surface">排版设置</h3>
            </div>
            <div className={`settings-card-expand-icon ${expandedSection === 'typography' ? 'expanded' : ''}`}>
              ▼
            </div>
          </button>

          {expandedSection === 'typography' && (
            <div className="settings-card-content">
              {/* Line Height */}
              <div className="setting-item">
                <div className="setting-label">
                  <span className="setting-label-text">行间距</span>
                  <span className="setting-value">{lineHeight}</span>
                </div>
                <CustomSlider
                  value={lineHeight}
                  min={1.0}
                  max={3.0}
                  step={0.1}
                  onChange={(value: number) => handleSettingChange('lineHeight', value)}
                  className="custom-slider"
                />
              </div>

              {/* Paragraph Spacing */}
              <div className="setting-item">
                <div className="setting-label">
                  <span className="setting-label-text">段落间距</span>
                  <span className="setting-value">{paragraphSpacing}</span>
                </div>
                <CustomSlider
                  value={paragraphSpacing}
                  min={0.5}
                  max={3.0}
                  step={0.1}
                  onChange={(value: number) => handleSettingChange('paragraphSpacing', value)}
                  className="custom-slider"
                />
              </div>
            </div>
          )}
        </div>

        {/* Theme Settings Card */}
        <div className="settings-card">
          <button
            className="settings-card-header"
            onClick={() => toggleSection('theme')}
          >
            <div className="settings-card-title">
              <div className="settings-card-icon">🎨</div>
              <h3 className="text-title-medium font-medium text-on-surface">主题设置</h3>
            </div>
            <div className={`settings-card-expand-icon ${expandedSection === 'theme' ? 'expanded' : ''}`}>
              ▼
            </div>
          </button>

          {expandedSection === 'theme' && (
            <div className="settings-card-content">
              {/* Background Colors */}
              <div className="setting-item">
                <label className="setting-label-text mb-3 block">背景颜色</label>
                <div className="color-picker-grid">
                  {Object.entries(BACKGROUND_COLORS).map(([key, value]) => (
                    <button
                      key={key}
                      className={`color-picker-button ${backgroundColor === key ? 'selected' : ''}`}
                      style={{ backgroundColor: value }}
                      onClick={() => handleSettingChange('backgroundColor', key)}
                      title={key}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Presets Section */}
      <div className="presets-section">
        <h3 className="text-title-medium font-medium text-on-surface mb-3 flex items-center gap-2">
          <span className="text-xl">📚</span>
          阅读预设
        </h3>
        <div className="presets-grid">
          {builtInPresets.slice(0, 3).map((preset) => (
            <button
              key={preset.id}
              className={`preset-button ${selectedPreset === preset.id ? 'selected' : ''}`}
              onClick={() => handlePresetChange(preset.id)}
            >
              <div className="preset-icon">
                {preset.id === 'paper' ? '📄' : preset.id === 'dark' ? '🌃' : '🌙'}
              </div>
              <div className="preset-name">
                {preset.name}
              </div>
              <div className="preset-indicator" />
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="popup-footer">
        <span className="footer-version">
          Chrome 阅读插件 v1.8.0
        </span>
        <button
          className="footer-settings-button"
          onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('options.html') })}
        >
          更多设置
        </button>
      </div>
    </div>
  );
};

export default PopupMD3;
