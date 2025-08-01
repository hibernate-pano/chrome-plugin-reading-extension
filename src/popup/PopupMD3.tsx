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
 * Material Design 3 Popup 组件 - 重新整合版本
 *
 * 解决了配置层级堆叠问题，将预设选择和详细设置整合到统一的界面中。
 * 新的布局结构：
 * 1. 阅读模式开关 - 核心功能控制
 * 2. 快速预设选择 - 推荐的主要配置方式
 * 3. 高级设置 - 详细的精细调整选项
 *
 * 主要改进：
 * - 预设与详细设置的智能交互
 * - 清晰的视觉层次和功能分组
 * - 统一的配置界面，避免页面跳转
 * - 优化的空间利用和用户体验
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

  // 高级设置展开状态 - 默认收起，鼓励用户优先使用预设
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [expandedAdvancedSection, setExpandedAdvancedSection] = useState<string>('');

  // 预设状态检测
  const [isCustomPreset, setIsCustomPreset] = useState(false);

  useEffect(() => {
    initSettings();
    initializePopup();
  }, []);

  // 检测当前设置是否匹配预设
  const checkPresetMatch = useCallback(() => {
    const currentPreset = builtInPresets.find(preset => preset.id === selectedPreset);
    if (currentPreset && currentPreset.settings) {
      const settingsMatch = 
        (currentPreset.settings.fontSize === undefined || settings.fontSize === currentPreset.settings.fontSize) &&
        (currentPreset.settings.lineHeight === undefined || settings.lineHeight === currentPreset.settings.lineHeight) &&
        (currentPreset.settings.paragraphSpacing === undefined || settings.paragraphSpacing === currentPreset.settings.paragraphSpacing) &&
        (currentPreset.settings.fontFamily === undefined || settings.fontFamily === currentPreset.settings.fontFamily) &&
        (currentPreset.settings.backgroundColor === undefined || settings.backgroundColor === currentPreset.settings.backgroundColor);
      
      setIsCustomPreset(!settingsMatch);
    }
  }, [settings, selectedPreset]);

  useEffect(() => {
    checkPresetMatch();
  }, [settings, selectedPreset, checkPresetMatch]);

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

    // 应用预设的所有设置
    const preset = builtInPresets.find(p => p.id === presetId);
    if (preset && preset.settings) {
      // 批量更新设置，只更新存在的字段
      if (preset.settings.fontSize !== undefined) {
        await updateSetting('fontSize', preset.settings.fontSize);
      }
      if (preset.settings.lineHeight !== undefined) {
        await updateSetting('lineHeight', preset.settings.lineHeight);
      }
      if (preset.settings.paragraphSpacing !== undefined) {
        await updateSetting('paragraphSpacing', preset.settings.paragraphSpacing);
      }
      if (preset.settings.fontFamily !== undefined) {
        await updateSetting('fontFamily', preset.settings.fontFamily);
      }
      if (preset.settings.backgroundColor !== undefined) {
        await updateSetting('backgroundColor', preset.settings.backgroundColor);
      }
      
      setIsCustomPreset(false);
    }

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

  // 重置为当前预设
  const resetToPreset = async () => {
    if (selectedPreset && !isCustomPreset) return;
    
    const preset = builtInPresets.find(p => p.id === selectedPreset);
    if (preset) {
      await handlePresetChange(selectedPreset);
    }
  };

  // 切换高级设置区域展开状态
  const toggleAdvancedSection = (section: string) => {
    setExpandedAdvancedSection(expandedAdvancedSection === section ? '' : section);
  };

  /**
   * 防抖函数 - 优化频繁的设置更新
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
   * 处理设置变更 - 修改后标记为自定义
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

      // 标记为自定义设置
      setIsCustomPreset(true);
    } catch (err) {
      console.error('设置更新失败:', err);
      setError('设置更新失败，请重试');
    } finally {
      setIsUpdating(false);
    }
  }, [updateSetting, applySettingsToContent, debouncedUpdateSetting]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">正在加载设置...</p>
      </div>
    );
  }

  return (
    <div className={`popup-container ${isThemeTransitioning ? 'theme-transition' : ''}`}>
      {/* Header */}
      <div className="popup-header">
        <div className="popup-header-content">
          <div className="flex">
            <div className="w-8">
              <svg className="w-5 h-5 text-on-primary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1>阅读助手</h1>
              <p>优化网页阅读体验</p>
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
          <div className="flex">
            <div className="flex items-center gap-3">
              <div className="text-2xl">📖</div>
              <div>
                <h3>
                  阅读模式
                </h3>
                <p>
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

      {/* Main Content Area - Scrollable */}
      <div className="settings-area">
        {/* Quick Presets Section - 主要配置方式 */}
        <div className="presets-section-primary">
          <div className="presets-header">
            <h3>
              <span>⚡</span>
              快速预设
            </h3>
            <p className="presets-description">推荐使用预设快速配置，或在下方进行详细调整</p>
          </div>
          
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

          {/* 预设状态指示 */}
          <div className="preset-status">
            {isCustomPreset ? (
              <div className="custom-status">
                <span className="status-icon">✏️</span>
                <span className="status-text">已自定义</span>
                <button 
                  className="reset-preset-btn"
                  onClick={resetToPreset}
                  title="重置为预设配置"
                >
                  重置
                </button>
              </div>
            ) : (
              <div className="preset-status-normal">
                <span className="status-icon">✅</span>
                <span className="status-text">使用 "{builtInPresets.find(p => p.id === selectedPreset)?.name}" 预设</span>
              </div>
            )}
          </div>
        </div>

        {/* Advanced Settings Toggle */}
        <div className="advanced-settings-toggle">
          <button
            className="advanced-toggle-btn"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          >
            <div className="advanced-toggle-content">
              <div className="flex items-center gap-3">
                <span className="advanced-icon">⚙️</span>
                <div>
                  <h4>高级设置</h4>
                  <p>精细调整字体、排版和主题</p>
                </div>
              </div>
              <div className={`advanced-expand-icon ${showAdvancedSettings ? 'expanded' : ''}`}>
                ▼
              </div>
            </div>
          </button>
        </div>

        {/* Advanced Settings Area */}
        {showAdvancedSettings && (
          <div className="advanced-settings-area">
            {/* Font Settings Card */}
            <div className="settings-card">
              <button
                className="settings-card-header"
                onClick={() => toggleAdvancedSection('font')}
              >
                <div className="settings-card-title">
                  <div className="settings-card-icon">🔤</div>
                  <h3>字体设置</h3>
                </div>
                <div className={`settings-card-expand-icon ${expandedAdvancedSection === 'font' ? 'expanded' : ''}`}>
                  ▼
                </div>
              </button>

              {expandedAdvancedSection === 'font' && (
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
                onClick={() => toggleAdvancedSection('typography')}
              >
                <div className="settings-card-title">
                  <div className="settings-card-icon">📐</div>
                  <h3>排版设置</h3>
                </div>
                <div className={`settings-card-expand-icon ${expandedAdvancedSection === 'typography' ? 'expanded' : ''}`}>
                  ▼
                </div>
              </button>

              {expandedAdvancedSection === 'typography' && (
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
                onClick={() => toggleAdvancedSection('theme')}
              >
                <div className="settings-card-title">
                  <div className="settings-card-icon">🎨</div>
                  <h3>主题设置</h3>
                </div>
                <div className={`settings-card-expand-icon ${expandedAdvancedSection === 'theme' ? 'expanded' : ''}`}>
                  ▼
                </div>
              </button>

              {expandedAdvancedSection === 'theme' && (
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
        )}
      </div>

      {/* Footer */}
      <div className="popup-footer">
        <span className="footer-version">
          Chrome 阅读插件 v1.8.0
        </span>
        <span className="footer-integration-note">
          统一配置界面
        </span>
      </div>
    </div>
  );
};

export default PopupMD3;
