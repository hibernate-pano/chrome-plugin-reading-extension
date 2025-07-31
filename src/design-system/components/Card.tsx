import React, { forwardRef } from 'react';
import { cn } from '../../popup/utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Card variant following Material Design 3 specifications
   */
  variant?: 'elevated' | 'filled' | 'outlined';
  
  /**
   * Card size
   */
  size?: 'small' | 'medium' | 'large';
  
  /**
   * Whether the card is interactive (clickable)
   */
  interactive?: boolean;
  
  /**
   * Whether the card is disabled
   */
  disabled?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(({
  children,
  variant = 'filled',
  size = 'medium',
  interactive = false,
  disabled = false,
  className,
  onClick,
  ...props
}, ref) => {
  // Base classes following Material Design 3
  const baseClasses = [
    'relative',
    'transition-all duration-200',
    'overflow-hidden',
  ];

  // Size variants
  const sizeClasses = {
    small: [
      'p-4',
      'rounded-xl',
      'gap-3',
    ],
    medium: [
      'p-6',
      'rounded-2xl',
      'gap-4',
    ],
    large: [
      'p-8',
      'rounded-3xl',
      'gap-6',
    ],
  };

  // Variant classes following Material Design 3
  const variantClasses = {
    elevated: [
      'bg-surface-container-low',
      'text-on-surface',
      'shadow-md',
      interactive && !disabled && 'hover:shadow-lg hover:bg-surface-container',
      interactive && !disabled && 'active:shadow-sm active:bg-surface-container-high',
    ],
    filled: [
      'bg-surface-container-highest',
      'text-on-surface',
      interactive && !disabled && 'hover:bg-surface-container-high',
      interactive && !disabled && 'active:bg-surface-container',
    ],
    outlined: [
      'bg-surface',
      'text-on-surface',
      'border border-outline-variant',
      interactive && !disabled && 'hover:bg-surface-container-lowest',
      interactive && !disabled && 'active:bg-surface-container-low',
    ],
  };

  // Interactive states
  const interactiveClasses = interactive && !disabled ? [
    'cursor-pointer',
    'select-none',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-primary-40/20',
    'focus:ring-offset-2',
    'hover:scale-[1.01]',
    'active:scale-[0.99]',
  ] : [];

  // Disabled state
  const disabledClasses = disabled ? [
    'opacity-60',
    'cursor-not-allowed',
    'pointer-events-none',
  ] : [];

  // Combine all classes
  const cardClasses = cn(
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    interactiveClasses,
    disabledClasses,
    className
  );

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    onClick?.(e);
  };

  return (
    <div
      ref={ref}
      className={cardClasses}
      onClick={interactive ? handleClick : onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive && !disabled ? 0 : undefined}
      onKeyDown={interactive && !disabled ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as any);
        }
      } : undefined}
      {...props}
    >
      {/* State layer for interactive effects */}
      {interactive && !disabled && (
        <div className="absolute inset-0 bg-on-surface opacity-0 transition-opacity duration-200 hover:opacity-[0.08] active:opacity-[0.12]" />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
});

Card.displayName = 'Card';

// Card Header component
export interface CardHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  avatar?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  avatar,
  className,
}) => {
  return (
    <div className={cn('flex items-start gap-4', className)}>
      {avatar && (
        <div className="flex-shrink-0">
          {avatar}
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="text-title-large font-medium text-on-surface">
          {title}
        </div>
        {subtitle && (
          <div className="text-body-medium text-on-surface-variant mt-1">
            {subtitle}
          </div>
        )}
      </div>
      
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
};

// Card Content component
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div 
      className={cn('text-body-medium text-on-surface', className)}
      {...props}
    >
      {children}
    </div>
  );
};

// Card Actions component
export interface CardActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center' | 'between';
}

export const CardActions: React.FC<CardActionsProps> = ({
  children,
  align = 'right',
  className,
  ...props
}) => {
  const alignClasses = {
    left: 'justify-start',
    right: 'justify-end',
    center: 'justify-center',
    between: 'justify-between',
  };

  return (
    <div 
      className={cn(
        'flex items-center gap-2 pt-4',
        alignClasses[align],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
