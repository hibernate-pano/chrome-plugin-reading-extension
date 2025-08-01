import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FloatingSettingsButtonProps {
  isVisible: boolean;
  onToggleSettings: () => void;
  isReadingModeActive: boolean;
}

/**
 * 浮动设置按钮组件
 * 
 * 特性：
 * - 浮动在文章右侧
 * - 可切换显示/隐藏
 * - 显示当前阅读模式状态
 * - 点击触发配置面板
 */
export const FloatingSettingsButton: React.FC<FloatingSettingsButtonProps> = ({
  isVisible,
  onToggleSettings,
  isReadingModeActive,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  if (!isVisible) return null;

  return (
    <div className="fixed right-6 bottom-6 z-[10004]" style={{ pointerEvents: 'auto' }}>
      <Button
        variant="default"
        size="icon"
        onClick={onToggleSettings}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "h-12 w-12 rounded-full shadow-lg transition-all duration-200",
          "bg-white/90 backdrop-blur-sm border border-gray-200",
          "hover:bg-white hover:shadow-xl hover:scale-110",
          isReadingModeActive && "bg-blue-50 border-blue-200",
          isHovered && "shadow-xl scale-110"
        )}
      >
        <div className="flex flex-col items-center justify-center space-y-1">
          <span className="text-lg">⚙️</span>
          {isHovered && (
            <span className="text-xs text-gray-600 font-medium">设置</span>
          )}
        </div>
      </Button>
    </div>
  );
}; 