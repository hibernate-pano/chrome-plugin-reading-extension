import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface ReadingModeUIProps {
  isActive: boolean;
  settings: {
    fontSize: number;
    lineHeight: number;
    fontFamily: string;
    backgroundColor: string;
    theme: 'light' | 'dark';
  };
  onToggle: () => void;
  onSettingsChange: (key: string, value: any) => void;
}

/**
 * 基于 Shadcn/UI 的阅读模式界面组件
 * 
 * 特性：
 * - 现代化的浮动控制面板
 * - 实时设置调整
 * - 响应式设计
 * - 无障碍支持
 */
export const ReadingModeUI: React.FC<ReadingModeUIProps> = ({
  isActive,
  settings,
  onToggle,
  onSettingsChange,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // 快捷键支持
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        onToggle();
      }
      if (e.key === 'Escape' && isActive) {
        onToggle();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isActive, onToggle]);

  if (!isActive) return null;

  return (
    <div className="fixed top-4 right-4 z-[10000] font-sans">
      <Card className={cn(
        "bg-card/95 backdrop-blur-sm border shadow-lg transition-all duration-200",
        isMinimized ? "w-12 h-12" : "w-80"
      )}>
        {isMinimized ? (
          <CardContent className="p-3 flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(false)}
              className="h-6 w-6"
            >
              <span className="text-sm">📖</span>
            </Button>
          </CardContent>
        ) : (
          <CardContent className="p-4 space-y-4">
            {/* 头部控制 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">阅读模式</span>
                <Switch
                  checked={isActive}
                  onCheckedChange={onToggle}
                  size="sm"
                />
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettings(!showSettings)}
                  className="h-6 w-6"
                >
                  <span className="text-xs">⚙️</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMinimized(true)}
                  className="h-6 w-6"
                >
                  <span className="text-xs">−</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  className="h-6 w-6"
                >
                  <span className="text-xs">✕</span>
                </Button>
              </div>
            </div>

            {/* 快速操作 */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSettingsChange('fontSize', settings.fontSize + 1)}
                className="flex-1"
              >
                字体+
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSettingsChange('fontSize', settings.fontSize - 1)}
                className="flex-1"
              >
                字体−
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSettingsChange('theme', settings.theme === 'light' ? 'dark' : 'light')}
                className="flex-1"
              >
                {settings.theme === 'light' ? '🌙' : '☀️'}
              </Button>
            </div>

            {/* 详细设置 */}
            {showSettings && (
              <div className="space-y-3 pt-2 border-t">
                {/* 字体大小 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">字体大小</label>
                    <span className="text-xs text-muted-foreground">{settings.fontSize}px</span>
                  </div>
                  <Slider
                    value={[settings.fontSize]}
                    onValueChange={(value) => onSettingsChange('fontSize', value[0])}
                    min={12}
                    max={24}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* 行高 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">行高</label>
                    <span className="text-xs text-muted-foreground">{settings.lineHeight}</span>
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

                {/* 背景色选择 */}
                <div className="space-y-2">
                  <label className="text-xs font-medium">背景色</label>
                  <div className="grid grid-cols-5 gap-1">
                    {['cream', 'mint', 'warm', 'cool', 'sepia'].map((color) => (
                      <Button
                        key={color}
                        variant={settings.backgroundColor === color ? "default" : "outline"}
                        size="sm"
                        onClick={() => onSettingsChange('backgroundColor', color)}
                        className="h-6 text-xs"
                      >
                        {color}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 快捷键提示 */}
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Ctrl+R 切换 | Esc 退出
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};
