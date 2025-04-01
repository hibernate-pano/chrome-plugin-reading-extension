import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
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
  rounded = 'md',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';
  
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

  return (
    <button 
      className={classes} 
      disabled={loading || disabled} 
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
          <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
      )}
    </button>
  );
};

export default Button; 