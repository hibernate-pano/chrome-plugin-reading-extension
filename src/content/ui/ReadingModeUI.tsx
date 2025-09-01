import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ReadingModeSettings } from '../types';

interface ReadingModeUIProps {
  isActive: boolean;
  settings: ReadingModeSettings;
  onToggle: () => void;
  onSettingsChange: (key: string, value: any) => void;
  onResetSettings?: () => void;
  onExportSettings?: () => void;
  onImportSettings?: (settings: ReadingModeSettings) => void;
}

/**
 * 重构后的阅读模式界面组件
 * 
 * 特性：
 * - 现代化的浮动控制面板
 * - 实时设置调整和预览
 * - 响应式设计
 * - 无障碍支持
 * - 主题系统和排版引擎优化
 * - 设置导入/导出
 * - 快捷键支持
 */
export const ReadingModeUI: React.FC<ReadingModeUIProps> = ({
  isActive,
  settings,
  onToggle,
  onSettingsChange,
  onResetSettings,
  onExportSettings,
  onImportSettings,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'themes'>('basic');
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });

  // 预设主题配置
  const themePresets = useMemo(() => ({
    'classic': {
      name: '经典',
      description: '传统阅读体验',
      theme: 'light',
      backgroundColor: 'cream',
      fontFamily: 'serif',
      fontSize: 16,
      lineHeight: 1.6,
    },
    'modern': {
      name: '现代',
      description: '简洁清晰的设计',
      theme: 'light',
      backgroundColor: 'white',
      fontFamily: 'sans',
      fontSize: 16,
      lineHeight: 1.5,
    },
    'dark': {
      name: '深色',
      description: '护眼夜间模式',
      theme: 'dark',
      backgroundColor: 'dark',
      fontFamily: 'sans',
      fontSize: 16,
      lineHeight: 1.6,
    },
    'sepia': {
      name: '护眼',
      description: '温和的米色背景',
      theme: 'light',
      backgroundColor: 'sepia',
      fontFamily: 'serif',
      fontSize: 16,
      lineHeight: 1.7,
    },
    'high-contrast': {
      name: '高对比',
      description: '增强可读性',
      theme: 'light',
      backgroundColor: 'white',
      fontFamily: 'sans',
      fontSize: 18,
      lineHeight: 1.4,
    },
  }), []);

  // 字体选项
  const fontOptions = useMemo(() => [
    { value: 'serif', label: '衬线字体', preview: 'Times New Roman' },
    { value: 'sans', label: '无衬线字体', preview: 'Arial' },
    { value: 'mono', label: '等宽字体', preview: 'Courier New' },
    { value: 'system', label: '系统字体', preview: '系统默认' },
  ], []);

  // 背景色选项
  const backgroundColorOptions = useMemo(() => [
    { value: 'white', label: '纯白', color: '#ffffff' },
    { value: 'cream', label: '米白', color: '#fefefe' },
    { value: 'sepia', label: '护眼', color: '#f4ecd8' },
    { value: 'mint', label: '薄荷绿', color: '#f0f9f4' },
    { value: 'warm', label: '暖色', color: '#fef7f0' },
    { value: 'cool', label: '冷色', color: '#f0f4f9' },
    { value: 'dark', label: '深色', color: '#1a1a1a' },
  ], []);

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
      if (e.ctrlKey && e.key === '=') {
        e.preventDefault();
        onSettingsChange('fontSize', Math.min(settings.fontSize + 1, 24));
      }
      if (e.ctrlKey && e.key === '-') {
        e.preventDefault();
        onSettingsChange('fontSize', Math.max(settings.fontSize - 1, 12));
      }
      if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        onSettingsChange('fontSize', 16);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isActive, onToggle, settings.fontSize, onSettingsChange]);

  // 拖拽功能
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsDragging(true);
      const startX = e.clientX - position.x;
      const startY = e.clientY - position.y;

      const handleMouseMove = (e: MouseEvent) => {
        setPosition({
          x: e.clientX - startX,
          y: e.clientY - startY,
        });
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  }, [position]);

  // 应用主题预设
  const applyThemePreset = useCallback((presetKey: string) => {
    const preset = themePresets[presetKey as keyof typeof themePresets];
    if (preset) {
      Object.entries(preset).forEach(([key, value]) => {
        if (key !== 'name' && key !== 'description') {
          onSettingsChange(key, value);
        }
      });
    }
  }, [themePresets, onSettingsChange]);

  // 重置设置
  const handleResetSettings = useCallback(() => {
    if (onResetSettings) {
      onResetSettings();
    }
  }, [onResetSettings]);

  // 导出设置
  const handleExportSettings = useCallback(() => {
    if (onExportSettings) {
      onExportSettings();
    } else {
      const dataStr = JSON.stringify(settings, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'reading-mode-settings.json';
      link.click();
      URL.revokeObjectURL(url);
    }
  }, [onExportSettings, settings]);

  // 导入设置
  const handleImportSettings = useCallback(() => {
    if (onImportSettings) {
      // 使用文件输入
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const importedSettings = JSON.parse(e.target?.result as string);
              onImportSettings(importedSettings);
            } catch (error) {
              console.error('Failed to parse settings file:', error);
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    }
  }, [onImportSettings]);

  if (!isActive) return null;

  return (
    <TooltipProvider>
      <div 
        className="fixed z-[10000] font-sans select-none"
        style={{ left: position.x, top: position.y }}
        onMouseDown={handleMouseDown}
      >
        <Card className={cn(
          "bg-card/95 backdrop-blur-sm border shadow-2xl transition-all duration-300",
          "min-w-[320px] max-w-[400px]",
          isMinimized ? "w-12 h-12" : "w-full",
          isDragging && "cursor-grabbing"
        )}>
          {isMinimized ? (
            <CardContent className="p-3 flex items-center justify-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMinimized(false)}
                    className="h-6 w-6"
                  >
                    <span className="text-sm">📖</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>展开阅读模式设置</p>
                </TooltipContent>
              </Tooltip>
            </CardContent>
          ) : (
            <>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold">阅读模式</span>
                    <Badge variant="secondary" className="text-xs">
                      {settings.theme === 'light' ? '☀️' : '🌙'}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowSettings(!showSettings)}
                          className="h-6 w-6"
                        >
                          <span className="text-xs">⚙️</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{showSettings ? '隐藏设置' : '显示设置'}</p>
                      </TooltipTrigger>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsMinimized(true)}
                          className="h-6 w-6"
                        >
                          <span className="text-xs">−</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>最小化</p>
                      </TooltipTrigger>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={onToggle}
                          className="h-6 w-6"
                        >
                          <span className="text-xs">✕</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>关闭阅读模式</p>
                      </TooltipTrigger>
                    </Tooltip>
                  </div>
                </div>

                {/* 主开关 */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">启用阅读模式</span>
                  <Switch
                    checked={isActive}
                    onCheckedChange={onToggle}
                    size="sm"
                  />
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* 快速操作 */}
                <div className="flex items-center space-x-2 mb-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSettingsChange('fontSize', Math.max(settings.fontSize - 1, 12))}
                        className="flex-1"
                      >
                        A−
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>减小字体 (Ctrl+-)</p>
                    </TooltipTrigger>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSettingsChange('fontSize', 16)}
                        className="flex-1"
                      >
                        重置
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>重置字体大小 (Ctrl+0)</p>
                    </TooltipTrigger>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSettingsChange('fontSize', Math.min(settings.fontSize + 1, 24))}
                        className="flex-1"
                      >
                        A+
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>增大字体 (Ctrl+=)</p>
                    </TooltipTrigger>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSettingsChange('theme', settings.theme === 'light' ? 'dark' : 'light')}
                        className="flex-1"
                      >
                        {settings.theme === 'light' ? '🌙' : '☀️'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>切换主题</p>
                    </TooltipTrigger>
                  </Tooltip>
                </div>

                {/* 详细设置 */}
                {showSettings && (
                  <div className="space-y-4 pt-3 border-t">
                    {/* 标签页导航 */}
                    <div className="flex space-x-1">
                      {[
                        { key: 'basic', label: '基础' },
                        { key: 'advanced', label: '高级' },
                        { key: 'themes', label: '主题' },
                      ].map((tab) => (
                        <Button
                          key={tab.key}
                          variant={activeTab === tab.key ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setActiveTab(tab.key as any)}
                          className="flex-1 text-xs h-7"
                        >
                          {tab.label}
                        </Button>
                      ))}
                    </div>

                    {/* 基础设置 */}
                    {activeTab === 'basic' && (
                      <div className="space-y-4">
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

                        {/* 字体族 */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium">字体</label>
                          <Select
                            value={settings.fontFamily}
                            onValueChange={(value) => onSettingsChange('fontFamily', value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {fontOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  <div className="flex flex-col">
                                    <span>{option.label}</span>
                                    <span className="text-xs text-muted-foreground font-mono">
                                      {option.preview}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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

                        {/* 背景色 */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium">背景色</label>
                          <div className="grid grid-cols-4 gap-2">
                            {backgroundColorOptions.map((option) => (
                              <Tooltip key={option.value}>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant={settings.backgroundColor === option.value ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => onSettingsChange('backgroundColor', option.value)}
                                    className="h-8 text-xs"
                                    style={{ backgroundColor: option.color }}
                                  >
                                    {option.label}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{option.label}</p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 高级设置 */}
                    {activeTab === 'advanced' && (
                      <div className="space-y-4">
                        {/* 段落间距 */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-medium">段落间距</label>
                            <span className="text-xs text-muted-foreground">{settings.paragraphSpacing}px</span>
                          </div>
                          <Slider
                            value={[settings.paragraphSpacing]}
                            onValueChange={(value) => onSettingsChange('paragraphSpacing', value[0])}
                            min={8}
                            max={32}
                            step={2}
                            className="w-full"
                          />
                        </div>

                        {/* 文本对齐 */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium">文本对齐</label>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { value: 'left', label: '左对齐', icon: '⬅️' },
                              { value: 'center', label: '居中', icon: '↔️' },
                              { value: 'right', label: '右对齐', icon: '➡️' },
                              { value: 'justify', label: '两端对齐', icon: '↔️' },
                            ].map((option) => (
                              <Tooltip key={option.value}>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant={settings.textAlign === option.value ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => onSettingsChange('textAlign', option.value)}
                                    className="h-8 text-xs"
                                  >
                                    {option.icon}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{option.label}</p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        </div>

                        {/* 显示图片 */}
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium">显示图片</label>
                          <Switch
                            checked={settings.showImages}
                            onValueChange={(checked) => onSettingsChange('showImages', checked)}
                            size="sm"
                          />
                        </div>

                        {/* 代码设置 */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium">代码字体大小</label>
                          <Slider
                            value={[settings.codeFontSize]}
                            onValueChange={(value) => onSettingsChange('codeFontSize', value[0])}
                            min={12}
                            max={20}
                            step={1}
                            className="w-full"
                          />
                        </div>
                      </div>
                    )}

                    {/* 主题预设 */}
                    {activeTab === 'themes' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-2">
                          {Object.entries(themePresets).map(([key, preset]) => (
                            <Button
                              key={key}
                              variant="outline"
                              size="sm"
                              onClick={() => applyThemePreset(key)}
                              className="h-auto p-3 justify-start"
                            >
                              <div className="flex flex-col items-start text-left">
                                <span className="font-medium">{preset.name}</span>
                                <span className="text-xs text-muted-foreground">{preset.description}</span>
                              </div>
                            </Button>
                          ))}
                        </div>

                        <Separator />

                        {/* 设置管理 */}
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetSettings}
                            className="flex-1 text-xs"
                          >
                            重置设置
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportSettings}
                            className="flex-1 text-xs"
                          >
                            导出设置
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleImportSettings}
                            className="flex-1 text-xs"
                          >
                            导入设置
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 快捷键提示 */}
                <div className="text-xs text-muted-foreground text-center pt-3 border-t">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <span>Ctrl+R 切换</span>
                    <span>Ctrl+/- 字体</span>
                    <span>Ctrl+0 重置</span>
                    <span>Esc 退出</span>
                  </div>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </TooltipProvider>
  );
};
