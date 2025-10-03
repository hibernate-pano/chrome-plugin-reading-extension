import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { UserSettings } from '../../types';
import builtInPresets from '../../presets/builtInPresets';

interface ImprovedSettingsPanelProps {
  isVisible: boolean;
  settings: UserSettings;
  onSettingsChange: (key: keyof UserSettings, value: any) => void;
  onClose: () => void;
  onToggleReadingMode: () => void;
  isReadingModeActive: boolean;
  currentButtonPosition: string;
  onButtonPositionChange: (position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center-right' | 'center-left') => void;
}

interface Position {
  x: number;
  y: number;
}

/**
 * 优化的设置面板
 *
 * 改进点：
 * - 集成位置选择功能
 * - 使用Tab组织设置项
 * - 简化交互逻辑
 * - 保留拖拽功能
 */
export const ImprovedSettingsPanel: React.FC<ImprovedSettingsPanelProps> = ({
  isVisible,
  settings,
  onSettingsChange,
  onClose,
  onToggleReadingMode,
  isReadingModeActive,
  currentButtonPosition,
  onButtonPositionChange
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 20, y: 80 });
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [panelSize, setPanelSize] = useState({ width: 360, height: 500 });
  const [activeTab, setActiveTab] = useState('settings');

  const panelRef = useRef<HTMLDivElement>(null);

  // 根据屏幕尺寸调整面板大小
  useEffect(() => {
    const updateSize = () => {
      if (window.innerWidth <= 480) {
        setPanelSize({ width: window.innerWidth - 32, height: window.innerHeight - 120 });
        setPosition({ x: 16, y: 60 });
      } else if (window.innerWidth <= 768) {
        setPanelSize({ width: 340, height: 480 });
      } else {
        setPanelSize({ width: 360, height: 500 });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 从本地存储恢复位置
  useEffect(() => {
    const saved = localStorage.getItem('reading-panel-position');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.x >= 0 && parsed.y >= 0) {
          setPosition(parsed);
        }
      } catch (e) {
        console.warn('Failed to restore panel position');
      }
    }
  }, []);

  // 保存位置
  const savePosition = useCallback((pos: Position) => {
    try {
      localStorage.setItem('reading-panel-position', JSON.stringify(pos));
    } catch (e) {
      console.warn('Failed to save panel position');
    }
  }, []);

  // 边界约束
  const constrainPosition = useCallback((pos: Position): Position => {
    const maxX = window.innerWidth - panelSize.width;
    const maxY = window.innerHeight - panelSize.height;

    return {
      x: Math.max(0, Math.min(pos.x, maxX)),
      y: Math.max(0, Math.min(pos.y, maxY))
    };
  }, [panelSize]);

  // 拖拽处理
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      const constrainedPos = constrainPosition({ x: newX, y: newY });
      setPosition(constrainedPos);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      savePosition(position);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, constrainPosition, position, savePosition]);

  // 键盘支持
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }

      // 数字键快速选择预设
      if (e.key >= '1' && e.key <= '4') {
        const presetIndex = parseInt(e.key) - 1;
        if (presetIndex < builtInPresets.length) {
          const preset = builtInPresets[presetIndex];
          Object.entries(preset.settings).forEach(([key, value]) => {
            onSettingsChange(key as keyof UserSettings, value);
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isVisible, onClose, onSettingsChange]);

  if (!isVisible) return null;

  // 位置选项
  const positionOptions: Array<{
    key: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center-right' | 'center-left';
    label: string;
    icon: string;
    desc: string;
  }> = [
    { key: 'bottom-right', label: '右下', icon: '↘️', desc: '右下角' },
    { key: 'bottom-left', label: '左下', icon: '↙️', desc: '左下角' },
    { key: 'top-right', label: '右上', icon: '↗️', desc: '右上角' },
    { key: 'top-left', label: '左上', icon: '↖️', desc: '左上角' },
    { key: 'center-right', label: '右中', icon: '➡️', desc: '右侧中央' },
    { key: 'center-left', label: '左中', icon: '⬅️', desc: '左侧中央' }
  ];

  return (
    <div
      ref={panelRef}
      className="fixed z-[10005] font-sans select-none"
      style={{
        left: position.x,
        top: position.y,
        width: isMinimized ? '48px' : `${panelSize.width}px`,
        maxHeight: `${panelSize.height}px`,
      }}
      role="dialog"
      aria-label="阅读设置面板"
      aria-modal="true"
    >
      <Card className={cn(
        "bg-white/95 backdrop-blur-sm border-2 shadow-2xl transition-all duration-200",
        "hover:shadow-3xl",
        isDragging && "shadow-3xl scale-105"
      )}>
        {/* 拖拽手柄 */}
        <div
          className={cn(
            "cursor-move bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 p-3",
            "hover:from-blue-100 hover:to-indigo-100 transition-colors",
            isMinimized && "p-2"
          )}
          onMouseDown={(e) => {
            if (isMinimized) return;
            setIsDragging(true);
            const rect = panelRef.current?.getBoundingClientRect();
            if (rect) {
              setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
              });
            }
          }}
        >
          <div className="flex items-center justify-between">
            {!isMinimized && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-gray-700">📖 阅读设置</span>
                {isReadingModeActive && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-7 w-7 hover:bg-blue-100 rounded-full"
                aria-label={isMinimized ? "展开" : "最小化"}
              >
                <span className="text-sm">
                  {isMinimized ? '◀' : '▶'}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-7 w-7 hover:bg-red-100 rounded-full"
                aria-label="关闭"
              >
                <span className="text-sm">✕</span>
              </Button>
            </div>
          </div>
        </div>

        {!isMinimized && (
          <div className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="settings">阅读设置</TabsTrigger>
                <TabsTrigger value="layout">布局位置</TabsTrigger>
              </TabsList>

              {/* 阅读设置Tab */}
              <TabsContent value="settings" className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {/* 阅读模式开关 */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-sm font-medium">阅读模式</span>
                    <p className="text-xs text-gray-500 mt-0.5">优化页面布局</p>
                  </div>
                  <Switch
                    checked={isReadingModeActive}
                    onCheckedChange={onToggleReadingMode}
                  />
                </div>

                {/* 快速预设 */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600">
                    快速预设 <span className="text-gray-400">(1-4键)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {builtInPresets.slice(0, 4).map((preset, index) => (
                      <Button
                        key={preset.name}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          Object.entries(preset.settings).forEach(([key, value]) => {
                            onSettingsChange(key as keyof UserSettings, value);
                          });
                        }}
                        className="h-10 text-xs transition-all hover:scale-105 hover:bg-blue-50"
                      >
                        <span className="mr-1.5 font-bold">{index + 1}</span>
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* 字体设置 */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-600">字体大小</label>
                      <span className="text-xs text-gray-500 font-mono">{settings.fontSize}px</span>
                    </div>
                    <Slider
                      value={[settings.fontSize]}
                      onValueChange={(value) => onSettingsChange('fontSize', value[0])}
                      min={14}
                      max={28}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-600">行高</label>
                      <span className="text-xs text-gray-500 font-mono">{settings.lineHeight.toFixed(1)}</span>
                    </div>
                    <Slider
                      value={[settings.lineHeight]}
                      onValueChange={(value) => onSettingsChange('lineHeight', value[0])}
                      min={1.2}
                      max={2.5}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-600">段落间距</label>
                      <span className="text-xs text-gray-500 font-mono">{settings.paragraphSpacing.toFixed(1)}</span>
                    </div>
                    <Slider
                      value={[settings.paragraphSpacing]}
                      onValueChange={(value) => onSettingsChange('paragraphSpacing', value[0])}
                      min={1.0}
                      max={3.0}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-600">页面宽度</label>
                      <span className="text-xs text-gray-500 font-mono">{settings.pageWidth}px</span>
                    </div>
                    <Slider
                      value={[settings.pageWidth]}
                      onValueChange={(value) => onSettingsChange('pageWidth', value[0])}
                      min={600}
                      max={1200}
                      step={50}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>窄</span>
                      <span>标准</span>
                      <span>宽</span>
                    </div>
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
                        className="h-10 text-xs hover:scale-105 transition-all"
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
                      { key: 'default', label: '系统默认' },
                      { key: 'serif', label: '衬线体' },
                      { key: 'sans-serif', label: '无衬线' },
                      { key: 'monospace', label: '等宽字体' },
                    ].map((font) => (
                      <Button
                        key={font.key}
                        variant={settings.fontFamily === font.key ? "default" : "outline"}
                        size="sm"
                        onClick={() => onSettingsChange('fontFamily', font.key)}
                        className="h-9 text-xs hover:scale-105 transition-all"
                      >
                        {font.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* 布局位置Tab */}
              <TabsContent value="layout" className="space-y-4">
                <div className="space-y-3">
                  <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800 font-medium">选择设置按钮的位置</p>
                    <p className="text-xs text-blue-600 mt-1">点击下方图标调整按钮位置</p>
                  </div>

                  {/* 可视化位置选择 */}
                  <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border-2 border-gray-300 p-4">
                    {/* 屏幕图示 */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs text-gray-400">屏幕</span>
                    </div>

                    {/* 位置按钮 */}
                    {positionOptions.map((option) => {
                      const isActive = currentButtonPosition === option.key;
                      const posStyles: Record<string, React.CSSProperties> = {
                        'bottom-right': { bottom: 8, right: 8 },
                        'bottom-left': { bottom: 8, left: 8 },
                        'top-right': { top: 8, right: 8 },
                        'top-left': { top: 8, left: 8 },
                        'center-right': { top: '50%', right: 8, transform: 'translateY(-50%)' },
                        'center-left': { top: '50%', left: 8, transform: 'translateY(-50%)' }
                      };

                      return (
                        <button
                          key={option.key}
                          onClick={() => onButtonPositionChange(option.key)}
                          className={cn(
                            "absolute w-12 h-12 rounded-full border-2 transition-all duration-200",
                            "flex items-center justify-center text-xl",
                            "hover:scale-125 hover:shadow-lg",
                            isActive
                              ? "bg-blue-500 border-blue-600 shadow-lg scale-110 animate-pulse"
                              : "bg-white border-gray-400 hover:bg-gray-50"
                          )}
                          style={posStyles[option.key]}
                          title={option.desc}
                        >
                          {option.icon}
                        </button>
                      );
                    })}
                  </div>

                  {/* 位置列表 */}
                  <div className="grid grid-cols-2 gap-2">
                    {positionOptions.map((option) => {
                      const isActive = currentButtonPosition === option.key;
                      return (
                        <Button
                          key={option.key}
                          variant={isActive ? "default" : "outline"}
                          size="sm"
                          onClick={() => onButtonPositionChange(option.key)}
                          className={cn(
                            "h-11 text-xs transition-all hover:scale-105",
                            isActive && "shadow-md"
                          )}
                        >
                          <span className="mr-1.5 text-base">{option.icon}</span>
                          {option.desc}
                        </Button>
                      );
                    })}
                  </div>

                  {/* 当前位置提示 */}
                  <div className="text-center p-2 bg-green-50 rounded border border-green-200">
                    <p className="text-xs text-green-700">
                      当前位置：<span className="font-semibold">
                        {positionOptions.find(p => p.key === currentButtonPosition)?.desc}
                      </span>
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* 快捷键提示 */}
            <div className="mt-4 pt-3 border-t text-xs text-gray-500 text-center space-y-1">
              <div>Esc 关闭 | 拖拽标题栏移动面板</div>
              <div>1-4 快速预设 | Tab 切换标签页</div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
