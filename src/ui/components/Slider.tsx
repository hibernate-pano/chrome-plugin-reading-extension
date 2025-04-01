import React, { useState } from 'react';

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  className?: string;
  label?: string;
  showValue?: boolean;
  valueFormat?: (value: number) => string;
  variant?: 'default' | 'accent' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
}

export const Slider: React.FC<SliderProps> = ({
  value,
  onChange,
  min,
  max,
  step,
  className = '',
  label,
  showValue = true,
  valueFormat,
  variant = 'default',
  size = 'md',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [hover, setHover] = useState(false);
  
  // 计算当前值的位置百分比
  const percentage = ((value - min) / (max - min)) * 100;
  
  // 格式化显示值
  const displayValue = valueFormat ? valueFormat(value) : value.toString();
  
  // 根据大小确定样式
  const sizeClasses = {
    sm: {
      track: 'h-1',
      thumb: 'w-3 h-3',
      thumbActive: 'w-4 h-4',
      valueLabel: 'text-xs',
    },
    md: {
      track: 'h-1.5',
      thumb: 'w-4 h-4',
      thumbActive: 'w-5 h-5',
      valueLabel: 'text-sm',
    },
    lg: {
      track: 'h-2',
      thumb: 'w-5 h-5',
      thumbActive: 'w-6 h-6',
      valueLabel: 'text-base',
    },
  };
  
  // 根据变体确定颜色
  const variantClasses = {
    default: {
      track: 'bg-gray-200 dark:bg-gray-700',
      filled: 'bg-gradient-to-r from-brand-500 to-brand-600 dark:from-brand-600 dark:to-brand-500',
      thumb: 'bg-white border-brand-500 shadow-sm',
      thumbActive: 'border-brand-600 shadow-md',
      valueLabel: 'bg-gray-100 text-brand-700 dark:bg-gray-800 dark:text-brand-400',
      valueLabelActive: 'bg-brand-600 text-white scale-110',
    },
    accent: {
      track: 'bg-gray-200 dark:bg-gray-700',
      filled: 'bg-gradient-to-r from-accent-400 to-accent-500 dark:from-accent-500 dark:to-accent-400',
      thumb: 'bg-white border-accent-400 shadow-sm',
      thumbActive: 'border-accent-500 shadow-md',
      valueLabel: 'bg-gray-100 text-accent-500 dark:bg-gray-800 dark:text-accent-300',
      valueLabelActive: 'bg-accent-500 text-white scale-110',
    },
    gradient: {
      track: 'bg-gray-200 dark:bg-gray-700',
      filled: 'bg-gradient-to-r from-blue-500 via-brand-500 to-accent-400',
      thumb: 'bg-white border-brand-500 shadow-sm',
      thumbActive: 'border-brand-600 shadow-md',
      valueLabel: 'bg-gray-100 text-brand-700 dark:bg-gray-800 dark:text-brand-400',
      valueLabelActive: 'bg-gradient-to-r from-blue-600 to-brand-600 text-white scale-110',
    },
  };
  
  const { track, thumb, thumbActive, valueLabel } = sizeClasses[size];
  const variantStyle = variantClasses[variant];
  
  return (
    <div className={`space-y-2 ${className}`}
         onMouseEnter={() => setHover(true)}
         onMouseLeave={() => setHover(false)}>
      {/* 标签和当前值显示 */}
      {(label || showValue) && (
        <div className="flex justify-between items-center">
          {label && (
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </label>
          )}
          {showValue && (
            <span className={`${valueLabel} font-medium transition-all duration-200 px-2 py-1 rounded-md
              ${isDragging ? variantStyle.valueLabelActive : variantStyle.valueLabel}`}>
              {displayValue}
            </span>
          )}
        </div>
      )}
      
      {/* 滑块轨道和把手 */}
      <div 
        className="relative py-3 group cursor-pointer" 
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        {/* 滑块轨道底色 */}
        <div className={`absolute w-full ${track} ${variantStyle.track} rounded-full overflow-hidden`}>
          {/* 填充部分 */}
          <div 
            className={`absolute h-full ${variantStyle.filled} rounded-full transition-all duration-150 ease-elastic`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        {/* 刻度标记 */}
        {(max - min) / step <= 20 && (
          <div className="absolute w-full flex justify-between px-[1px]">
            {Array.from({ length: Math.floor((max - min) / step) + 1 }).map((_, index) => (
              <div 
                key={index}
                className={`w-0.5 h-2 rounded-full mt-3 transition-opacity duration-200 
                           ${index * step + min <= value ? 'bg-brand-500/30 dark:bg-brand-400/30' : 'bg-gray-300/50 dark:bg-gray-600/50'}
                           ${hover ? 'opacity-100' : 'opacity-0'}`}
              />
            ))}
          </div>
        )}
        
        {/* 输入范围控件 */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="relative w-full h-6 bg-transparent appearance-none cursor-pointer 
                     z-10 opacity-0"
          style={{ 
            WebkitAppearance: 'none',
            position: 'absolute',
            top: '0',
            left: '0' 
          }}
        />
        
        {/* 气泡标记 - 悬停或拖动时显示 */}
        {(hover || isDragging) && (
          <div 
            className={`absolute bottom-full left-0 mb-2 px-2 py-1 rounded bg-white dark:bg-gray-800 
                        text-xs font-medium shadow-sm border border-gray-200 dark:border-gray-700
                        transform -translate-x-1/2 transition-all duration-100 z-20
                        ${isDragging ? 'opacity-100' : 'opacity-80'}`}
            style={{ left: `${percentage}%` }}
          >
            {displayValue}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-4 border-transparent border-t-white dark:border-t-gray-800"></div>
          </div>
        )}
        
        {/* 自定义滑块把手 */}
        <div 
          className={`absolute top-1/2 -translate-y-1/2 rounded-full border-2
                      transition-all duration-200 ease-spring
                      ${isDragging ? `${thumbActive} ${variantStyle.thumbActive}` : 
                                    (hover ? `${thumb} scale-110 ${variantStyle.thumb}` : 
                                           `${thumb} ${variantStyle.thumb}`)}`}
          style={{ left: `calc(${percentage}% - ${isDragging ? '0.625rem' : '0.5rem'})` }}
        >
          {/* 内部闪光效果 */}
          <div className={`absolute inset-0 rounded-full bg-white/80 scale-50 opacity-0
                            ${isDragging ? 'animate-pulse opacity-80' : ''}`}></div>
        </div>
      </div>
      
      {/* 最小值和最大值标记 */}
      <div className="relative flex justify-between px-[6px] mt-1">
        <span className="text-[9px] text-gray-400 dark:text-gray-500">{min}</span>
        <span className="text-[9px] text-gray-400 dark:text-gray-500">{max}</span>
      </div>
    </div>
  );
}; 