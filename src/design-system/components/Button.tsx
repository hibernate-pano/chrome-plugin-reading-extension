import React, { forwardRef } from 'react';
import { cn } from '../../popup/utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Button variant following Material Design 3 specifications
   */
  variant?: 'filled' | 'outlined' | 'text' | 'elevated' | 'tonal';

  /**
   * Button size
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Icon to display before text
   */
  startIcon?: React.ReactNode;

  /**
   * Icon to display after text
   */
  endIcon?: React.ReactNode;

  /**
   * Full width button
   */
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'filled',
  size = 'medium',
  loading = false,
  startIcon,
  endIcon,
  fullWidth = false,
  className,
  disabled,
  ...props
}, ref) => {
  // Base classes following Material Design 3
  const baseClasses = [
    'inline-flex items-center justify-center',
    'font-medium',
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-60 disabled:cursor-not-allowed',
    'relative overflow-hidden',
    'select-none',
  ];

  // Size variants
  const sizeClasses = {
    small: [
      'h-8 px-3',
      'text-sm',
      'rounded-lg',
      'gap-1',
    ],
    medium: [
      'h-10 px-6',
      'text-sm',
      'rounded-xl',
      'gap-2',
    ],
    large: [
      'h-12 px-8',
      'text-base',
      'rounded-2xl',
      'gap-2',
    ],
  };

  // Variant classes following Material Design 3 color system
  const variantClasses = {
    filled: [
      'bg-primary-40 text-primary-99',
      'hover:bg-primary-30 hover:shadow-md',
      'active:bg-primary-50',
      'focus:ring-primary-40/20',
      'dark:bg-primary-80 dark:text-primary-20',
      'dark:hover:bg-primary-70',
      'dark:active:bg-primary-90',
    ],
    outlined: [
      'border border-outline text-primary-40',
      'hover:bg-primary-40/8 hover:border-primary-40',
      'active:bg-primary-40/12',
      'focus:ring-primary-40/20',
      'dark:text-primary-80 dark:border-outline-variant',
      'dark:hover:bg-primary-80/8 dark:hover:border-primary-80',
      'dark:active:bg-primary-80/12',
    ],
    text: [
      'text-primary-40',
      'hover:bg-primary-40/8',
      'active:bg-primary-40/12',
      'focus:ring-primary-40/20',
      'dark:text-primary-80',
      'dark:hover:bg-primary-80/8',
      'dark:active:bg-primary-80/12',
    ],
    elevated: [
      'bg-surface-container-low text-primary-40 shadow-md',
      'hover:bg-surface-container hover:shadow-lg',
      'active:bg-surface-container-high',
      'focus:ring-primary-40/20',
      'dark:bg-surface-container-low dark:text-primary-80',
      'dark:hover:bg-surface-container',
      'dark:active:bg-surface-container-high',
    ],
    tonal: [
      'bg-secondary-container text-on-secondary-container',
      'hover:bg-secondary-container/80 hover:shadow-sm',
      'active:bg-secondary-container/60',
      'focus:ring-secondary-40/20',
      'dark:bg-secondary-container dark:text-on-secondary-container',
    ],
  };

  // Combine all classes
  const buttonClasses = cn(
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    fullWidth && 'w-full',
    className
  );

  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      className={cn(
        buttonClasses,
        !isDisabled && 'hover:scale-[1.02] active:scale-[0.98] transform transition-transform duration-150'
      )}
      disabled={isDisabled}
      {...props}
    >
      {/* Ripple effect container */}
      <span className="absolute inset-0 overflow-hidden rounded-inherit">
        {/* Ripple animation would go here */}
      </span>

      {/* Content */}
      <span className="relative flex items-center justify-center gap-inherit">
        {loading ? (
          <LoadingSpinner size={size} />
        ) : (
          <>
            {startIcon && (
              <span className="flex-shrink-0">
                {startIcon}
              </span>
            )}

            {children && (
              <span className="truncate">
                {children}
              </span>
            )}

            {endIcon && (
              <span className="flex-shrink-0">
                {endIcon}
              </span>
            )}
          </>
        )}
      </span>
    </button>
  );
});

Button.displayName = 'Button';

// Loading spinner component
const LoadingSpinner: React.FC<{ size: ButtonProps['size'] }> = ({ size }) => {
  const spinnerSizes = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-6 h-6',
  };

  return (
    <div
      className={cn(
        'border-2 border-current border-t-transparent rounded-full animate-spin',
        spinnerSizes[size || 'medium']
      )}
    />
  );
};

export default Button;
