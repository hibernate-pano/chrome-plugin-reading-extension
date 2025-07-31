import React, { useState } from 'react';

/**
 * CustomSwitch 组件属性接口
 *
 * 自定义开关组件，遵循Material Design 3规范
 */
interface CustomSwitchProps {
  /** 标签文本 */
  label?: string;
  /** 描述文本 */
  description?: string;
  /** 是否选中 */
  checked: boolean;
  /** 状态变化回调函数 */
  onChange: (checked: boolean) => void;
  /** 自定义CSS类名 */
  className?: string;
  /** 尺寸大小 */
  size?: 'small' | 'medium' | 'large';
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * CustomSwitch - 自定义开关组件
 *
 * 基于Material Design 3规范设计的开关组件，提供：
 * - 平滑的切换动画
 * - 多种尺寸选择
 * - 键盘导航支持
 * - 无障碍访问优化
 * - 可选的标签和描述文本
 *
 * @param props CustomSwitchProps
 * @returns React.FC
 */
export const CustomSwitch: React.FC<CustomSwitchProps> = ({
  label,
  description,
  checked,
  onChange,
  className = '',
  size = 'medium',
  disabled = false
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      onChange(e.target.checked);
    }
  };

  const handleMouseDown = () => {
    if (!disabled) {
      setIsPressed(true);
    }
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  const handleMouseLeave = () => {
    setIsPressed(false);
  };

  return (
    <label
      className={`custom-switch ${disabled ? 'disabled' : ''} ${className}`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <input
        type="checkbox"
        className="custom-switch-input"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
      />

      <div className={`custom-switch-track ${size} ${checked ? 'checked' : ''}`}>
        <div className={`custom-switch-thumb ${size} ${checked ? 'checked' : ''}`} />
      </div>

      {(label || description) && (
        <div className="custom-switch-label">
          {label && (
            <span className="custom-switch-label-text">
              {label}
            </span>
          )}
          {description && (
            <span className="custom-switch-label-description">
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
};

export default CustomSwitch;
