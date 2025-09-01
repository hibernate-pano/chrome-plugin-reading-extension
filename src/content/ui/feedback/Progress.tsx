import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ProgressType, ProgressOptions, ProgressInstance } from './types';

interface ProgressProps extends ProgressOptions {
  onComplete?: () => void;
}

interface ProgressContainerProps {
  children: React.ReactNode;
  className?: string;
}

const Progress: React.FC<ProgressProps> = ({
  id,
  type = ProgressType.LINEAR,
  value = 0,
  max = 100,
  min = 0,
  showValue = true,
  showLabel = true,
  label,
  size = 'md',
  variant = 'default',
  animated = true,
  striped = false,
  onComplete
}) => {
  const [currentValue, setCurrentValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  // 更新进度值
  useEffect(() => {
    const normalizedValue = Math.max(min, Math.min(max, value));
    setCurrentValue(normalizedValue);

    // 检查是否完成
    if (normalizedValue >= max && onComplete) {
      onComplete();
    }
  }, [value, max, min, onComplete]);

  // 动画效果
  useEffect(() => {
    if (!animated) return;

    const progressBar = progressRef.current;
    if (!progressBar) return;

    setIsAnimating(true);
    
    const animate = () => {
      if (progressBar) {
        progressBar.style.width = `${(currentValue / max) * 100}%`;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setIsAnimating(false);
    };
  }, [currentValue, max, animated]);

  // 获取尺寸样式
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'h-2 text-xs';
      case 'lg':
        return 'h-4 text-base';
      default:
        return 'h-3 text-sm';
    }
  };

  // 获取变体样式
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  // 获取条纹动画样式
  const getStripedStyles = () => {
    if (!striped) return '';
    return 'bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:20px_100%] animate-pulse';
  };

  // 渲染线性进度条
  const renderLinearProgress = () => (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        {showLabel && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label || '进度'}
          </span>
        )}
        {showValue && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {Math.round((currentValue / max) * 100)}%
          </span>
        )}
      </div>
      <div className={cn(
        "w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden",
        getSizeStyles()
      )}>
        <div
          ref={progressRef}
          className={cn(
            "h-full transition-all duration-300 ease-out rounded-full",
            getVariantStyles(),
            getStripedStyles()
          )}
          style={{ width: `${(currentValue / max) * 100}%` }}
        />
      </div>
    </div>
  );

  // 渲染圆形进度条
  const renderCircularProgress = () => {
    const radius = size === 'sm' ? 20 : size === 'lg' ? 40 : 30;
    const strokeWidth = size === 'sm' ? 3 : size === 'lg' ? 6 : 4;
    const circumference = 2 * Math.PI * radius;
    const progress = (currentValue / max) * circumference;
    const offset = circumference - progress;

    return (
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg
            className="transform -rotate-90"
            width={radius * 2 + strokeWidth}
            height={radius * 2 + strokeWidth}
          >
            {/* 背景圆环 */}
            <circle
              cx={radius + strokeWidth / 2}
              cy={radius + strokeWidth / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="transparent"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* 进度圆环 */}
            <circle
              cx={radius + strokeWidth / 2}
              cy={radius + strokeWidth / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className={cn(
                "transition-all duration-300 ease-out",
                getVariantStyles()
              )}
            />
          </svg>
          {/* 中心文本 */}
          {showValue && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn(
                "font-medium",
                size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-sm'
              )}>
                {Math.round((currentValue / max) * 100)}%
              </span>
            </div>
          )}
        </div>
        {showLabel && label && (
          <span className="text-sm text-gray-700 dark:text-gray-300 mt-2">
            {label}
          </span>
        )}
      </div>
    );
  };

  // 渲染步骤进度条
  const renderStepsProgress = () => {
    const steps = Math.ceil(max);
    const currentStep = Math.ceil(currentValue);

    return (
      <div className="w-full">
        {showLabel && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label || '步骤'}
            </span>
            {showValue && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {currentStep} / {steps}
              </span>
            )}
          </div>
        )}
        <div className="flex gap-1">
          {Array.from({ length: steps }, (_, index) => (
            <div
              key={index}
              className={cn(
                "flex-1 h-2 rounded-full transition-all duration-300",
                index < currentStep
                  ? getVariantStyles()
                  : "bg-gray-200 dark:bg-gray-700"
              )}
            />
          ))}
        </div>
      </div>
    );
  };

  // 渲染不确定进度条
  const renderIndeterminateProgress = () => (
    <div className="w-full">
      {showLabel && (
        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label || '加载中...'}
        </span>
      )}
      <div className={cn(
        "w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden",
        getSizeStyles()
      )}>
        <div
          className={cn(
            "h-full rounded-full",
            getVariantStyles(),
            "animate-pulse bg-gradient-to-r from-transparent via-current to-transparent bg-[length:200%_100%]"
          )}
        />
      </div>
    </div>
  );

  // 根据类型渲染不同的进度条
  const renderProgress = () => {
    switch (type) {
      case ProgressType.CIRCULAR:
        return renderCircularProgress();
      case ProgressType.STEPS:
        return renderStepsProgress();
      case ProgressType.INDETERMINATE:
        return renderIndeterminateProgress();
      default:
        return renderLinearProgress();
    }
  };

  return (
    <div className="w-full">
      {renderProgress()}
    </div>
  );
};

const ProgressContainer: React.FC<ProgressContainerProps> = ({
  children,
  className
}) => (
  <div className={cn("flex flex-col gap-4 p-4", className)}>
    {children}
  </div>
);

export { Progress, ProgressContainer };
export type { ProgressProps, ProgressContainerProps };
