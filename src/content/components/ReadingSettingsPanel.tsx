import React, { useState, useEffect, useRef } from 'react';
import { UserSettings } from '../../types';
import { EXTRA_THEMES } from '../../shared/themes';

interface ReadingSettingsPanelProps {
  settings: UserSettings;
  onSettingsChange: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  onClose?: () => void;
}

const FONT_FAMILIES = {
  default: { name: '系统默认', value: 'system-ui, -apple-system, sans-serif' },
  songti: { name: '宋体', value: '"Songti SC", "SimSun", serif' },
  heiti: { name: '黑体', value: '"Heiti SC", "SimHei", sans-serif' },
  kaiti: { name: '楷体', value: '"Kaiti SC", "KaiTi", serif' },
  fangsong: { name: '仿宋', value: '"Fangsong SC", "FangSong", serif' },
  georgia: { name: 'Georgia', value: 'Georgia, serif' },
  times: { name: 'Times', value: '"Times New Roman", Times, serif' },
};

// Default themes
const DEFAULT_THEMES = [
  { value: 'light', label: '浅色', icon: '☀️' },
  { value: 'dark', label: '深色', icon: '🌙' },
  { value: 'sepia', label: '护眼', icon: '📄' },
];

// Combine with extra themes
const ALL_THEMES = [
  ...DEFAULT_THEMES,
  ...EXTRA_THEMES.map(t => ({ value: t.id, label: t.name, icon: '' }))
];

// Use ALL_THEMES as THEMES for backward compatibility
const THEMES = ALL_THEMES;

export const ReadingSettingsPanel: React.FC<ReadingSettingsPanelProps> = ({
  settings,
  onSettingsChange,
  onClose: _onClose,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const togglePanel = () => {
    setIsOpen(!isOpen);
  };

  const closePanel = () => {
    setIsOpen(false);
  };

  const handleChange = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    onSettingsChange(key, value);
    // 注意：不要关闭面板，让用户可以连续调整多个设置
  };

  // 点击外部关闭面板
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // 如果点击的是面板内部或按钮，不关闭
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }

      // 点击外部，关闭面板
      closePanel();
    };

    // 延迟添加监听器，避免立即触发
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <>
      {/* 悬浮按钮 - 极简设计 */}
      <button
        ref={buttonRef}
        onClick={togglePanel}
        className="reading-settings-trigger"
        aria-label="打开阅读设置"
        style={{
          position: 'fixed',
          left: isOpen ? '260px' : '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'white',
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          cursor: 'pointer',
          zIndex: 2147483646,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
          fontSize: '18px',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          e.currentTarget.style.color = '#374151';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
          e.currentTarget.style.color = '#6b7280';
        }}
      >
        {isOpen ? '✕' : '⚙'}
      </button>

      {/* 设置面板 - 精简版 */}
      {isOpen && (
        <div
          ref={panelRef}
          className="reading-settings-panel"
          style={{
            position: 'fixed',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '220px',
            maxHeight: '500px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            border: '1px solid #e5e7eb',
            zIndex: 2147483645,
            overflow: 'hidden',
            animation: 'slideInLeft 0.2s ease-out',
          }}
        >
          {/* 简洁头部 */}
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid #f3f4f6',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
              阅读设置
            </h3>
          </div>

          {/* 设置内容 */}
          <div
            style={{
              padding: '16px',
              maxHeight: '420px',
              overflowY: 'auto',
            }}
          >
            {/* 主题 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontSize: '13px', fontWeight: '500', color: '#4b5563' }}>
                主题
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {THEMES.map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() => handleChange('theme', theme.value)}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '6px',
                      border: settings.theme === theme.value ? '1.5px solid #3b82f6' : '1.5px solid #e5e7eb',
                      background: settings.theme === theme.value ? '#eff6ff' : 'white',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '500',
                      transition: 'all 0.15s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '3px',
                      color: '#374151',
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>{theme.icon}</span>
                    <span>{theme.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 字号 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px', fontWeight: '500', color: '#4b5563' }}>
                <span>字号</span>
                <span style={{ color: '#3b82f6', fontWeight: '600' }}>{settings.fontSize}px</span>
              </label>
              <input
                type="range"
                min="14"
                max="28"
                value={settings.fontSize}
                onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '4px',
                  borderRadius: '2px',
                  background: '#e5e7eb',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* 行高 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px', fontWeight: '500', color: '#4b5563' }}>
                <span>行高</span>
                <span style={{ color: '#3b82f6', fontWeight: '600' }}>{settings.lineHeight}</span>
              </label>
              <input
                type="range"
                min="1.2"
                max="2.5"
                step="0.1"
                value={settings.lineHeight}
                onChange={(e) => handleChange('lineHeight', parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  height: '4px',
                  borderRadius: '2px',
                  background: '#e5e7eb',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* 字体 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontSize: '13px', fontWeight: '500', color: '#4b5563' }}>
                字体
              </label>
              <select
                value={settings.fontFamily}
                onChange={(e) => handleChange('fontFamily', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1.5px solid #e5e7eb',
                  fontSize: '13px',
                  cursor: 'pointer',
                  background: 'white',
                  color: '#374151',
                }}
              >
                {Object.entries(FONT_FAMILIES).map(([key, font]) => (
                  <option key={key} value={key}>
                    {font.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 页面宽度 */}
            <div>
              <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px', fontWeight: '500', color: '#4b5563' }}>
                <span>宽度</span>
                <span style={{ color: '#3b82f6', fontWeight: '600' }}>{settings.pageWidth}px</span>
              </label>
              <input
                type="range"
                min="600"
                max="1200"
                step="50"
                value={settings.pageWidth}
                onChange={(e) => handleChange('pageWidth', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '4px',
                  borderRadius: '2px',
                  background: '#e5e7eb',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 全局样式 */}
      <style>{`
        @keyframes slideInLeft {
          from {
            transform: translateY(-50%) translateX(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(-50%) translateX(0);
            opacity: 1;
          }
        }

        .reading-settings-panel::-webkit-scrollbar {
          width: 4px;
        }

        .reading-settings-panel::-webkit-scrollbar-track {
          background: transparent;
        }

        .reading-settings-panel::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 2px;
        }

        .reading-settings-panel::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(59, 130, 246, 0.3);
        }

        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 1px 4px rgba(59, 130, 246, 0.3);
        }

        input[type="range"]::-webkit-slider-thumb:hover {
          background: #2563eb;
          box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
        }

        input[type="range"]::-moz-range-thumb:hover {
          background: #2563eb;
          box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
        }
      `}</style>
    </>
  );
};

