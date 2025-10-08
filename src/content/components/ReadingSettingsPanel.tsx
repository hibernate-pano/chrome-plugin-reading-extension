import React, { useState } from 'react';
import { UserSettings } from '../../types';

interface ReadingSettingsPanelProps {
  settings: UserSettings;
  onSettingsChange: (key: keyof UserSettings, value: any) => void;
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

const THEMES = [
  { value: 'light', label: '浅色', icon: '☀️' },
  { value: 'dark', label: '深色', icon: '🌙' },
  { value: 'sepia', label: '护眼', icon: '📄' },
];

export const ReadingSettingsPanel: React.FC<ReadingSettingsPanelProps> = ({
  settings,
  onSettingsChange,
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const togglePanel = () => {
    setIsOpen(!isOpen);
  };

  const closePanel = () => {
    setIsOpen(false);
  };

  const handleChange = (key: keyof UserSettings, value: any) => {
    console.log(`⚙️ [Panel] 设置变更: ${key} = ${value}`);
    onSettingsChange(key, value);
    // 注意：不要关闭面板，让用户可以连续调整多个设置
  };

  return (
    <>
      {/* 悬浮按钮 */}
      <button
        onClick={togglePanel}
        className="reading-settings-trigger"
        aria-label="打开阅读设置"
        style={{
          position: 'fixed',
          left: isOpen ? '320px' : '20px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '48px',
          height: '48px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
          cursor: 'pointer',
          zIndex: 2147483646,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 30px rgba(102, 126, 234, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(-50%)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.4)';
        }}
      >
        {isOpen ? '✕' : '⚙️'}
      </button>

      {/* 设置面板 */}
      {isOpen && (
        <div
          className="reading-settings-panel"
          style={{
            position: 'fixed',
            left: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '280px',
            maxHeight: '80vh',
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            zIndex: 2147483645,
            overflow: 'hidden',
            animation: 'slideInLeft 0.3s ease-out',
          }}
        >
          {/* 头部 */}
          <div
            style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              position: 'relative',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
              阅读设置
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.9 }}>
              自定义您的阅读体验
            </p>
            {/* 关闭按钮 */}
            <button
              onClick={closePanel}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
              aria-label="关闭设置面板"
            >
              ✕
            </button>
          </div>

          {/* 设置内容 */}
          <div
            style={{
              padding: '20px',
              maxHeight: 'calc(80vh - 80px)',
              overflowY: 'auto',
            }}
          >
            {/* 主题 */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                主题
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {THEMES.map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() => handleChange('theme', theme.value)}
                    style={{
                      padding: '12px 8px',
                      borderRadius: '8px',
                      border: settings.theme === theme.value ? '2px solid #667eea' : '2px solid #e5e7eb',
                      background: settings.theme === theme.value ? '#f3f4f6' : 'white',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{theme.icon}</span>
                    <span>{theme.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 字号 */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                字号：{settings.fontSize}px
              </label>
              <input
                type="range"
                min="14"
                max="28"
                value={settings.fontSize}
                onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: '#e5e7eb',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '12px', color: '#9ca3af' }}>
                <span>小</span>
                <span>大</span>
              </div>
            </div>

            {/* 行高 */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                行高：{settings.lineHeight}
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
                  height: '6px',
                  borderRadius: '3px',
                  background: '#e5e7eb',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '12px', color: '#9ca3af' }}>
                <span>紧凑</span>
                <span>宽松</span>
              </div>
            </div>

            {/* 段落间距 */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                段落间距：{settings.paragraphSpacing}em
              </label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={settings.paragraphSpacing}
                onChange={(e) => handleChange('paragraphSpacing', parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: '#e5e7eb',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '12px', color: '#9ca3af' }}>
                <span>紧凑</span>
                <span>宽松</span>
              </div>
            </div>

            {/* 字体 */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                字体
              </label>
              <select
                value={settings.fontFamily}
                onChange={(e) => handleChange('fontFamily', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                  fontSize: '14px',
                  cursor: 'pointer',
                  background: 'white',
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
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                页面宽度：{settings.pageWidth}px
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
                  height: '6px',
                  borderRadius: '3px',
                  background: '#e5e7eb',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '12px', color: '#9ca3af' }}>
                <span>窄</span>
                <span>宽</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 全局样式 */}
      <style>{`
        @keyframes slideInLeft {
          from {
            transform: translateY(-50%) translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(-50%) translateX(0);
            opacity: 1;
          }
        }

        .reading-settings-panel::-webkit-scrollbar {
          width: 6px;
        }

        .reading-settings-panel::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }

        .reading-settings-panel::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .reading-settings-panel::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
        }

        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
        }
      `}</style>
    </>
  );
};

