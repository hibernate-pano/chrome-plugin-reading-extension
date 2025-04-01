import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'hover' | 'elevated' | 'flat' | 'paper';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  border = true,
  onClick,
}) => {
  // 基础类
  const baseClasses = 'rounded-xl transition-all duration-200';

  // 变体样式
  const variantClasses = {
    default: 'bg-white/90 backdrop-blur-sm shadow-sm dark:bg-gray-800/90',
    hover: 'bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md hover:scale-[1.01] dark:bg-gray-800/90',
    elevated: 'bg-white/90 backdrop-blur-sm shadow-card dark:bg-gray-800/90',
    flat: 'bg-gray-50/90 backdrop-blur-sm dark:bg-gray-900/50',
    paper: 'bg-paper-cream shadow-paper bg-paper-texture dark:bg-gray-800/90',
  };

  // 内边距
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-7',
  };

  // 边框
  const borderClass = border 
    ? 'border border-gray-100 dark:border-gray-700/50' 
    : '';

  // 点击状态
  const clickableClass = onClick 
    ? 'cursor-pointer active:scale-[0.99] hover:scale-[1.01]' 
    : '';

  return (
    <div 
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${borderClass}
        ${clickableClass}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  className = '',
}) => {
  return (
    <div className={`flex items-start justify-between mb-4 ${className}`}>
      <div>
        {typeof title === 'string' ? (
          <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">{title}</h3>
        ) : (
          title
        )}
        {subtitle && (
          typeof subtitle === 'string' ? (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          ) : (
            subtitle
          )
        )}
      </div>
      {action && (
        <div className="ml-4">{action}</div>
      )}
    </div>
  );
};

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
  divider?: boolean;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = '',
  divider = true,
}) => {
  return (
    <div className={`mt-4 ${divider ? 'pt-4 border-t border-gray-100 dark:border-gray-700/50' : ''} ${className}`}>
      {children}
    </div>
  );
}; 