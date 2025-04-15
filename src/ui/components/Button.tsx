import React, { useState } from 'react';
import Ripple from './Ripple';
import Spinner from './Spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  showRipple?: boolean;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  iconLeft,
  iconRight,
  loading = false,
  loadingText,
  rounded = 'md',
  disabled,
  showRipple = true,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden';

  const variantClasses = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 focus:ring-brand-500 shadow-sm',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800 focus:ring-gray-500 shadow-sm',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100 focus:ring-brand-500 bg-white dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700',
    ghost: 'text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus:ring-gray-500 dark:text-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700',
    accent: 'bg-accent-400 text-white hover:bg-accent-500 active:bg-accent-600 focus:ring-accent-400 shadow-sm',
  };

  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${roundedClasses[rounded]}
    ${loading ? 'relative !text-transparent' : ''}
    ${className}
  `;

  // 处理鼠标事件
  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);
  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  return (
    <button
      className={classes}
      disabled={loading || disabled}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    >
      {/* 左侧图标 */}
      {iconLeft && !loading && (
        <span className={`mr-2 ${size === 'xs' || size === 'sm' ? 'text-sm' : 'text-base'}`}>
          {iconLeft}
        </span>
      )}

      {/* 按钮文本 */}
      {children}

      {/* 右侧图标 */}
      {iconRight && !loading && (
        <span className={`ml-2 ${size === 'xs' || size === 'sm' ? 'text-sm' : 'text-base'}`}>
          {iconRight}
        </span>
      )}

      {/* 加载指示器 */}
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner
            size={size === 'lg' ? 'md' : size === 'md' ? 'sm' : 'xs'}
            color="light"
            className="mr-2"
          />
          {loadingText && <span className="text-current">{loadingText}</span>}
        </span>
      )}

      {/* 水波纹效果 */}
      {showRipple && !disabled && !loading && (
        <Ripple
          color={variant === 'primary' || variant === 'secondary' || variant === 'accent' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)'}
          duration={600}
        />
      )}

      {/* 悬停和焦点指示器 */}
      <span
        className={`absolute inset-0 transition-opacity duration-200 ${(isHovered || isFocused) && !disabled ? 'opacity-10' : 'opacity-0'} ${variant === 'primary' || variant === 'secondary' || variant === 'accent' ? 'bg-white' : 'bg-black'}`}
      />
    </button>
  );
};

export default Button;