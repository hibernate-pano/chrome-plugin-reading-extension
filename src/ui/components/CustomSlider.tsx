import React, { useState, useRef, useCallback, useEffect } from 'react';

/**
 * CustomSlider 组件属性接口
 *
 * 自定义滑块组件，遵循Material Design 3规范
 */
interface CustomSliderProps {
  /** 当前值 */
  value: number;
  /** 最小值 */
  min: number;
  /** 最大值 */
  max: number;
  /** 步长 */
  step: number;
  /** 值变化回调函数 */
  onChange: (value: number) => void;
  /** 自定义CSS类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * CustomSlider - 自定义滑块组件
 *
 * 基于Material Design 3规范设计的滑块组件，提供：
 * - 流畅的拖拽交互体验
 * - 键盘导航支持
 * - 无障碍访问优化
 * - 视觉反馈和动画效果
 * - 响应式设计
 *
 * @param props CustomSliderProps
 * @returns React.FC
 */
export const CustomSlider: React.FC<CustomSliderProps> = ({
  value,
  min,
  max,
  step,
  onChange,
  className = '',
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // 计算百分比位置
  const percentage = ((value - min) / (max - min)) * 100;

  // 处理鼠标/触摸事件
  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    if (disabled) return;

    event.preventDefault();
    setIsDragging(true);

    const slider = sliderRef.current;
    if (!slider) return;

    const rect = slider.getBoundingClientRect();
    const newPercentage = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const newValue = min + (newPercentage / 100) * (max - min);
    const steppedValue = Math.round(newValue / step) * step;

    onChange(Math.max(min, Math.min(max, steppedValue)));
  }, [disabled, min, max, step, onChange]);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!isDragging || disabled) return;

    const slider = sliderRef.current;
    if (!slider) return;

    const rect = slider.getBoundingClientRect();
    const newPercentage = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const newValue = min + (newPercentage / 100) * (max - min);
    const steppedValue = Math.round(newValue / step) * step;

    onChange(Math.max(min, Math.min(max, steppedValue)));
  }, [isDragging, disabled, min, max, step, onChange]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 键盘支持
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return;

    let newValue = value;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        newValue = Math.max(min, value - step);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        newValue = Math.min(max, value + step);
        break;
      case 'Home':
        newValue = min;
        break;
      case 'End':
        newValue = max;
        break;
      default:
        return;
    }

    event.preventDefault();
    onChange(newValue);
  }, [disabled, value, min, max, step, onChange]);

  // 全局事件监听
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);

      return () => {
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [isDragging, handlePointerMove, handlePointerUp]);

  return (
    <div
      ref={sliderRef}
      className={`custom-slider ${className} ${disabled ? 'disabled' : ''}`}
      onPointerDown={handlePointerDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
    >
      {/* 滑轨 */}
      <div className="custom-slider-track">
        {/* 已填充部分 */}
        <div
          className="custom-slider-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* 滑块 */}
      <div
        className={`custom-slider-thumb ${isDragging ? 'dragging' : ''} ${isHovered ? 'hovered' : ''}`}
        style={{ left: `${percentage}%` }}
      />

      {/* 焦点指示器 */}
      <div className="custom-slider-focus-ring" />
    </div>
  );
};

export default CustomSlider;
