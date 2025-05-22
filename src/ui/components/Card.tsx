import React from 'react';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'elevated' | 'outlined'; // Material Design variants
  padding?: 'none' | 'sm' | 'md' | 'lg'; // sm: 8dp, md: 16dp, lg: 24dp
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'elevated', // Default to elevated
  padding = 'md',
  onClick,
}) => {
  // Base classes: Material surface colors, rounded corners, transition
  const baseClasses = `
    bg-material-surface dark:bg-material-darkSurface 
    rounded-md 
    transition-all duration-200
  `;

  // Variant-specific styles
  const variantClasses = {
    elevated: `
      shadow-md-dp1 
      ${onClick ? 'hover:shadow-md-dp8' : ''}
    `, // Apply hover shadow only if clickable
    outlined: `
      shadow-none 
      border border-gray-300 dark:border-gray-700 
    `, // Using existing grays for border, consider material-outline if defined
  };

  // Padding classes based on Material Design spacing
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-2', // 8dp
    md: 'p-4', // 16dp
    lg: 'p-6', // 24dp
  };

  // Clickable effect (scale preserved)
  const clickableClass = onClick 
    ? 'cursor-pointer active:scale-[0.99] hover:scale-[1.01]' 
    : '';

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div 
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${clickableClass}
        ${className}
      `.replace(/\s+/g, ' ').trim()} // Clean up whitespace
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
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
          <h3 className="text-md-h6 font-md-medium text-material-onSurface dark:text-material-darkOnSurface">{title}</h3> 
        ) : (
          title
        )}
        {subtitle && (
          typeof subtitle === 'string' ? (
            <p className="mt-1 text-md-body2 text-material-onSurface/75 dark:text-material-darkOnSurface/75">{subtitle}</p>
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
    <div className={className}> {/* Padding is handled by the parent Card component */}
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
    // Adjusted divider color for better consistency
    <div className={`mt-4 ${divider ? 'pt-4 border-t border-gray-200 dark:border-gray-700' : ''} ${className}`}>
      {children}
    </div>
  );
};