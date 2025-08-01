import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { UserSettings } from '../../types';
import builtInPresets from '../../presets/builtInPresets';

interface FloatingSettingsPanelProps {
  isVisible: boolean;
  settings: UserSettings;
  onSettingsChange: (key: keyof UserSettings, value: any) => void;
  onClose: () => void;
  onToggleReadingMode: () => void;
  isReadingModeActive: boolean;
}

/**
 * 浮动配置面板组件
 * 
 * 特性：
 * - 浮动在文章右侧，不遮挡内容
 * - 可拖拽移动位置
 * - 可折叠/展开
 * - 实时设置调整
 * - 预设快速应用
 */
export const FloatingSettingsPanel: React.FC<FloatingSettingsPanelProps> = ({
  isVisible,
  settings,
  onSettingsChange,
  onClose,
  onToggleReadingMode,
  isReadingModeActive,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // 拖拽功能
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // 限制在视窗范围内
      const maxX = window.innerWidth - (panelRef.current?.offsetWidth || 320);
      const maxY = window.innerHeight - (panelRef.current?.offsetHeight || 400);
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // 快捷键支持
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        onClose();
      }
      
      // 方向键导航支持
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        // 在预设按钮之间导航
        const presetButtons = document.querySelectorAll('[data-preset-button]');
        const currentIndex = Array.from(presetButtons).findIndex(btn => 
          btn === document.activeElement
        );
        
        if (currentIndex !== -1) {
          const nextIndex = e.key === 'ArrowRight' 
            ? (currentIndex + 1) % presetButtons.length
            : (currentIndex - 1 + presetButtons.length) % presetButtons.length;
          
          (presetButtons[nextIndex] as HTMLElement)?.focus();
        }
      }
      
      // Ctrl/Cmd + , 打开/关闭面板
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        if (isVisible) {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div
      ref={panelRef}
      className="fixed z-[10001] font-sans select-none"
      style={{
        left: position.x,
        top: position.y,
        width: isCollapsed ? '48px' : '320px',
      }}
      role="dialog"
      aria-label="阅读设置面板"
      aria-modal="true"
      aria-describedby="settings-panel-description"
    >
      <div id="settings-panel-description" className="sr-only">
        阅读设置面板，可以调整字体大小、行高、主题等阅读设置
      </div>
      
      <Card className={cn(
        "bg-white/95 backdrop-blur-sm border shadow-xl transition-all duration-200",
        isDragging && "shadow-2xl"
      )}>
        {/* 拖拽手柄 */}
        <div
          className={cn(
            "cursor-move bg-gradient-to-r from-blue-50 to-indigo-50 border-b p-2",
            isCollapsed ? "p-1" : "p-2"
          )}
          onMouseDown={(e) => {
            if (isCollapsed) return;
            setIsDragging(true);
            const rect = panelRef.current?.getBoundingClientRect();
            if (rect) {
              setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
              });
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="拖拽手柄，点击并拖拽可移动面板位置"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              // 键盘拖拽支持
              const rect = panelRef.current?.getBoundingClientRect();
              if (rect) {
                setDragOffset({
                  x: rect.width / 2,
                  y: rect.height / 2,
                });
                setIsDragging(true);
              }
            }
          }}
        >
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">阅读设置</span>
                <div className="w-2 h-2 bg-blue-400 rounded-full" aria-hidden="true"></div>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-6 w-6"
                aria-label={isCollapsed ? "展开设置面板" : "折叠设置面板"}
                aria-expanded={!isCollapsed}
              >
                <span className="text-xs" aria-hidden="true">{isCollapsed ? '◀' : '▶'}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-6 w-6"
                aria-label="关闭设置面板"
              >
                <span className="text-xs" aria-hidden="true">✕</span>
              </Button>
            </div>
          </div>
        </div>

        {!isCollapsed && (
          <CardContent className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* 阅读模式开关 */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" id="reading-mode-toggle-label">阅读模式</span>
              <Switch
                checked={isReadingModeActive}
                onCheckedChange={onToggleReadingMode}
                aria-labelledby="reading-mode-toggle-label"
                aria-describedby="reading-mode-toggle-description"
              />
            </div>
            <div id="reading-mode-toggle-description" className="sr-only">
              切换阅读模式，开启后页面将优化为更适合阅读的布局
            </div>

            {/* 预设快速选择 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600" id="preset-quick-label">快速预设</label>
              <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="preset-quick-label">
                {builtInPresets.slice(0, 4).map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      Object.entries(preset.settings).forEach(([key, value]) => {
                        onSettingsChange(key as keyof UserSettings, value);
                      });
                    }}
                    className="h-8 text-xs"
                    aria-describedby={`quick-preset-${preset.name}-desc`}
                    data-preset-button
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
              {/* 快速预设描述 */}
              {builtInPresets.slice(0, 4).map((preset) => (
                <div key={`quick-desc-${preset.name}`} id={`quick-preset-${preset.name}-desc`} className="sr-only">
                  {preset.displayName}：{preset.description || '快速应用预设样式'}
                </div>
              ))}
            </div>

            {/* 字体设置 */}
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-600" id="font-size-label">字体大小</label>
                  <span className="text-xs text-gray-500" aria-live="polite">{settings.fontSize}px</span>
                </div>
                <Slider
                  value={[settings.fontSize]}
                  onValueChange={(value) => onSettingsChange('fontSize', value[0])}
                  min={14}
                  max={24}
                  step={1}
                  className="w-full"
                  aria-labelledby="font-size-label"
                  aria-describedby="font-size-description"
                />
                <div id="font-size-description" className="sr-only">
                  调整字体大小，范围从14像素到24像素
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-600">行高</label>
                  <span className="text-xs text-gray-500">{settings.lineHeight}</span>
                </div>
                <Slider
                  value={[settings.lineHeight]}
                  onValueChange={(value) => onSettingsChange('lineHeight', value[0])}
                  min={1.2}
                  max={2.0}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-600">段落间距</label>
                  <span className="text-xs text-gray-500">{settings.paragraphSpacing}</span>
                </div>
                <Slider
                  value={[settings.paragraphSpacing]}
                  onValueChange={(value) => onSettingsChange('paragraphSpacing', value[0])}
                  min={1.0}
                  max={2.0}
                  step={0.1}
                  className="w-full"
                />
              </div>
            </div>

            {/* 主题选择 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">主题</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'light', label: '浅色', icon: '☀️' },
                  { key: 'dark', label: '深色', icon: '🌙' },
                  { key: 'sepia', label: '护眼', icon: '📖' },
                ].map((theme) => (
                  <Button
                    key={theme.key}
                    variant={settings.theme === theme.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => onSettingsChange('theme', theme.key)}
                    className="h-8 text-xs"
                  >
                    <span className="mr-1">{theme.icon}</span>
                    {theme.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* 字体选择 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">字体</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'default', label: '系统' },
                  { key: 'serif', label: '衬线' },
                  { key: 'sans-serif', label: '无衬线' },
                  { key: 'monospace', label: '等宽' },
                ].map((font) => (
                  <Button
                    key={font.key}
                    variant={settings.fontFamily === font.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => onSettingsChange('fontFamily', font.key)}
                    className="h-8 text-xs"
                  >
                    {font.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* 背景色选择 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">背景色</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { key: 'white', label: '白色', color: '#ffffff' },
                  { key: 'cream', label: '米色', color: '#f8f6f0' },
                  { key: 'mint', label: '薄荷', color: '#f0f8f4' },
                  { key: 'warm', label: '暖色', color: '#fef7f0' },
                  { key: 'cool', label: '冷色', color: '#f0f4f8' },
                ].map((bg) => (
                  <Button
                    key={bg.key}
                    variant={settings.backgroundColor === bg.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => onSettingsChange('backgroundColor', bg.key)}
                    className="h-8 text-xs relative"
                    style={{
                      backgroundColor: bg.color,
                      borderColor: settings.backgroundColor === bg.key ? '#3b82f6' : '#d1d5db',
                    }}
                  >
                    <span className="text-gray-700">{bg.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* 快捷键提示 */}
            <div className="text-xs text-gray-500 text-center pt-2 border-t">
              Esc 关闭面板 | 拖拽移动位置
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}; 