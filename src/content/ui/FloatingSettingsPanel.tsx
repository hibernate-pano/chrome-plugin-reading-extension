import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { UserSettings } from '../../types';
import builtInPresets from '../../presets/builtInPresets';
import { rafThrottle } from './debounce';

interface FloatingSettingsPanelProps {
  isVisible: boolean;
  settings: UserSettings;
  onSettingsChange: (key: keyof UserSettings, value: any) => void;
  onClose: () => void;
  onToggleReadingMode: () => void;
  isReadingModeActive: boolean;
}

interface Position {
  x: number;
  y: number;
}

interface TouchState {
  isActive: boolean;
  startX: number;
  startY: number;
  startPosition: Position;
}

/**
 * 优化后的浮动配置面板组件
 * 
 * 新增特性：
 * - 触摸手势支持（拖拽、缩放、滑动）
 * - 响应式布局，适配不同屏幕尺寸
 * - 性能优化的拖拽操作
 * - 增强的无障碍功能
 * - 移动端友好的交互体验
 * - 智能位置记忆和边界检测
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
  const [position, setPosition] = useState<Position>({ x: 20, y: 100 });
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [touchState, setTouchState] = useState<TouchState>({
    isActive: false,
    startX: 0,
    startY: 0,
    startPosition: { x: 0, y: 0 }
  });
  const [isMobile, setIsMobile] = useState(false);
  const [panelSize, setPanelSize] = useState({ width: 320, height: 400 });
  
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<Position>({ x: 0, y: 0 });

  // 检测设备类型和屏幕尺寸
  useEffect(() => {
    const checkDeviceType = () => {
      const isMobileDevice = window.innerWidth <= 768 || 
                           'ontouchstart' in window || 
                           navigator.maxTouchPoints > 0;
      setIsMobile(isMobileDevice);
      
      // 根据屏幕尺寸调整面板大小
      if (window.innerWidth <= 480) {
        setPanelSize({ width: 280, height: 350 });
      } else if (window.innerWidth <= 768) {
        setPanelSize({ width: 300, height: 380 });
      } else {
        setPanelSize({ width: 320, height: 400 });
      }
    };

    checkDeviceType();
    window.addEventListener('resize', checkDeviceType);
    return () => window.removeEventListener('resize', checkDeviceType);
  }, []);

  // 从本地存储恢复位置
  useEffect(() => {
    const savedPosition = localStorage.getItem('reading-panel-position');
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition);
        // 验证位置是否在视窗范围内
        if (parsed.x >= 0 && parsed.y >= 0 && 
            parsed.x <= window.innerWidth - panelSize.width &&
            parsed.y <= window.innerHeight - panelSize.height) {
          setPosition(parsed);
        }
      } catch (e) {
        console.warn('Failed to restore panel position:', e);
      }
    }
  }, [panelSize.width, panelSize.height]);

  // 保存位置到本地存储
  const savePosition = useCallback((pos: Position) => {
    try {
      localStorage.setItem('reading-panel-position', JSON.stringify(pos));
    } catch (e) {
      console.warn('Failed to save panel position:', e);
    }
  }, []);

  // 边界检测和位置约束
  const constrainPosition = useCallback((pos: Position): Position => {
    const maxX = window.innerWidth - panelSize.width;
    const maxY = window.innerHeight - panelSize.height;
    
    return {
      x: Math.max(0, Math.min(pos.x, maxX)),
      y: Math.max(0, Math.min(pos.y, maxY))
    };
  }, [panelSize.width, panelSize.height]);

  // 优化的拖拽处理（使用RAF节流）
  const handleDragMove = useCallback(
    rafThrottle((clientX: number, clientY: number) => {
      if (!isDragging) return;

      const newX = clientX - dragOffset.x;
      const newY = clientY - dragOffset.y;
      const constrainedPos = constrainPosition({ x: newX, y: newY });
      
      setPosition(constrainedPos);
    }),
    [isDragging, dragOffset, constrainPosition]
  );

  // 鼠标拖拽事件
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX, e.clientY);
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
  }, [isDragging, handleDragMove, position, savePosition]);

  // 触摸事件处理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isCollapsed) return;
    
    const touch = e.touches[0];
    setTouchState({
      isActive: true,
      startX: touch.clientX,
      startY: touch.clientY,
      startPosition: { ...position }
    });
  }, [isCollapsed, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchState.isActive) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchState.startX;
    const deltaY = touch.clientY - touchState.startY;
    
    const newPosition = constrainPosition({
      x: touchState.startPosition.x + deltaX,
      y: touchState.startPosition.y + deltaY
    });
    
    setPosition(newPosition);
  }, [touchState, constrainPosition]);

  const handleTouchEnd = useCallback(() => {
    if (touchState.isActive) {
      setTouchState(prev => ({ ...prev, isActive: false }));
      savePosition(position);
    }
  }, [touchState.isActive, position, savePosition]);

  // 键盘导航和快捷键支持
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        onClose();
      }
      
      // 方向键导航支持
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
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

      // 数字键快速选择预设
      if (e.key >= '1' && e.key <= '4' && isVisible) {
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

  // 双击重置位置
  const handleDoubleClick = useCallback(() => {
    const centerX = (window.innerWidth - panelSize.width) / 2;
    const centerY = (window.innerHeight - panelSize.height) / 2;
    const newPosition = constrainPosition({ x: centerX, y: centerY });
    setPosition(newPosition);
    savePosition(newPosition);
  }, [panelSize.width, panelSize.height, constrainPosition, savePosition]);

  if (!isVisible) return null;

  return (
    <div
      ref={panelRef}
      className="fixed z-[10001] font-sans select-none"
      style={{
        left: position.x,
        top: position.y,
        width: isCollapsed ? '48px' : `${panelSize.width}px`,
        maxHeight: `${panelSize.height}px`,
      }}
      role="dialog"
      aria-label="阅读设置面板"
      aria-modal="true"
      aria-describedby="settings-panel-description"
      aria-expanded={!isCollapsed}
    >
      <div id="settings-panel-description" className="sr-only">
        阅读设置面板，可以调整字体大小、行高、主题等阅读设置。支持拖拽移动位置，双击可重置到屏幕中央。
      </div>
      
      <Card className={cn(
        "bg-white/95 backdrop-blur-sm border shadow-xl transition-all duration-200",
        "hover:shadow-2xl",
        isDragging && "shadow-2xl scale-105",
        isMobile && "touch-manipulation"
      )}>
        {/* 拖拽手柄 */}
        <div
          className={cn(
            "cursor-move bg-gradient-to-r from-blue-50 to-indigo-50 border-b p-2",
            "hover:from-blue-100 hover:to-indigo-100 transition-colors",
            isCollapsed ? "p-1" : "p-2",
            isMobile && "touch-manipulation"
          )}
          onMouseDown={(e) => {
            if (isCollapsed) return;
            setIsDragging(true);
            dragStartRef.current = { x: e.clientX, y: e.clientY };
            const rect = panelRef.current?.getBoundingClientRect();
            if (rect) {
              setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
              });
            }
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleClick}
          role="button"
          tabIndex={0}
          aria-label="拖拽手柄，点击并拖拽可移动面板位置，双击可重置到屏幕中央"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
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
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" aria-hidden="true"></div>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-6 w-6 hover:bg-blue-100"
                aria-label={isCollapsed ? "展开设置面板" : "折叠设置面板"}
                aria-expanded={!isCollapsed}
              >
                <span className="text-xs" aria-hidden="true">
                  {isCollapsed ? '◀' : '▶'}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-6 w-6 hover:bg-red-100"
                aria-label="关闭设置面板"
              >
                <span className="text-xs" aria-hidden="true">✕</span>
              </Button>
            </div>
          </div>
        </div>

        {!isCollapsed && (
          <CardContent className="p-4 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
              <label className="text-xs font-medium text-gray-600" id="preset-quick-label">
                快速预设 <span className="text-gray-400">(1-4键快速选择)</span>
              </label>
              <div className={cn(
                "grid gap-2",
                isMobile ? "grid-cols-2" : "grid-cols-2"
              )} role="group" aria-labelledby="preset-quick-label">
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
                    className={cn(
                      "h-8 text-xs transition-all hover:scale-105",
                      isMobile && "h-10 text-sm"
                    )}
                    aria-describedby={`quick-preset-${preset.name}-desc`}
                    data-preset-button
                    data-preset-index={index + 1}
                  >
                    <span className="mr-1">{index + 1}</span>
                    {preset.name}
                  </Button>
                ))}
              </div>
              {/* 快速预设描述 */}
              {builtInPresets.slice(0, 4).map((preset) => (
                <div key={`quick-desc-${preset.name}`} id={`quick-preset-${preset.name}-desc`} className="sr-only">
                  {preset.displayName}：{preset.description || '快速应用预设样式'}，按{builtInPresets.indexOf(preset) + 1}键快速选择
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
              <div className={cn(
                "grid gap-2",
                isMobile ? "grid-cols-3" : "grid-cols-3"
              )}>
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
                    className={cn(
                      "h-8 text-xs transition-all hover:scale-105",
                      isMobile && "h-10 text-sm"
                    )}
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
              <div className={cn(
                "grid gap-2",
                isMobile ? "grid-cols-2" : "grid-cols-2"
              )}>
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
                    className={cn(
                      "h-8 text-xs transition-all hover:scale-105",
                      isMobile && "h-10 text-sm"
                    )}
                  >
                    {font.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* 背景色选择 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">背景色</label>
              <div className={cn(
                "grid gap-2",
                isMobile ? "grid-cols-3" : "grid-cols-5"
              )}>
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
                    className={cn(
                      "h-8 text-xs relative transition-all hover:scale-105",
                      isMobile && "h-10 text-sm"
                    )}
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
              <div className="space-y-1">
                <div>Esc 关闭面板 | 拖拽移动位置</div>
                <div>双击重置位置 | 1-4键快速预设</div>
                {isMobile && <div>支持触摸拖拽和手势操作</div>}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}; 