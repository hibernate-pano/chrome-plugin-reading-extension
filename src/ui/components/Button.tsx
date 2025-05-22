import React from 'react';
import Ripple from './Ripple'; // Assuming Ripple.tsx is in the same directory
import Spinner from './Spinner'; // Assuming Spinner.tsx is in the same directory

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error';
  size?: 'xs' | 'sm' | 'md' | 'lg'; // Kept for now, but padding will be more standardized
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  showRipple?: boolean;
  // `rounded` prop is removed, using standard Material Design rounding.
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'contained',
  color = 'primary',
  size = 'md', // Default size
  className = '',
  iconLeft,
  iconRight,
  loading = false,
  loadingText,
  disabled,
  showRipple = true,
  ...props
}) => {
  const baseClasses = `
    inline-flex items-center justify-center relative overflow-hidden
    text-md-button font-md-medium tracking-md-button uppercase
    rounded-sm 
    transition-all duration-200 
    focus:outline-none 
    disabled:cursor-not-allowed
  `;

  // Focus ring colors based on button color prop
  const focusRingColorClasses = {
    primary: 'focus:ring-material-primary',
    secondary: 'focus:ring-material-secondary',
    error: 'focus:ring-material-error',
  };

  // Disabled state classes
  const disabledClasses = 'disabled:opacity-50'; // General disabled opacity, specific bg/text/border handled by variants

  // Variant specific classes
  const variantClasses = {
    contained: `
      shadow-md-dp2 hover:shadow-md-dp8 focus:shadow-md-dp8
      disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none
      dark:disabled:bg-gray-700 dark:disabled:text-gray-400
      ${color === 'primary' ? 'bg-material-primary text-material-onPrimary hover:bg-opacity-90' : ''}
      ${color === 'secondary' ? 'bg-material-secondary text-material-onSecondary hover:bg-opacity-90' : ''}
      ${color === 'error' ? 'bg-material-error text-material-onError hover:bg-opacity-90' : ''}
    `,
    outlined: `
      border 
      bg-transparent
      hover:bg-opacity-10 focus:bg-opacity-10
      disabled:border-gray-400 disabled:text-gray-400 disabled:bg-transparent
      dark:disabled:border-gray-600 dark:disabled:text-gray-500
      ${color === 'primary' ? 'border-material-primary text-material-primary hover:bg-material-primary focus:bg-material-primary' : ''}
      ${color === 'secondary' ? 'border-material-secondary text-material-secondary hover:bg-material-secondary focus:bg-material-secondary' : ''}
      ${color === 'error' ? 'border-material-error text-material-error hover:bg-material-error focus:bg-material-error' : ''}
    `,
    text: `
      bg-transparent
      hover:bg-opacity-10 focus:bg-opacity-10
      disabled:text-gray-400 disabled:bg-transparent
      dark:disabled:text-gray-500
      ${color === 'primary' ? 'text-material-primary hover:bg-material-primary focus:bg-material-primary' : ''}
      ${color === 'secondary' ? 'text-material-secondary hover:bg-material-secondary focus:bg-material-secondary' : ''}
      ${color === 'error' ? 'text-material-error hover:bg-material-error focus:bg-material-error' : ''}
    `,
  };

  // Padding and text size classes (Material Design recommends consistent height, padding adjusts slightly)
  // Using px-4 for horizontal padding. Vertical padding for text/outlined is py-2, for contained it's also py-2.
  // Material spec: Text/Outlined: 8dp L/R padding. Contained: 16dp L/R padding. Height 36dp.
  // For our text-md-button (14sp = 0.875rem), py-2 (8px) gives 16px vertical + text.
  // px-4 (16px) for contained. px-2 (8px) for text/outlined is closer to spec.
  // For md size (36dp height target): text-sm (14px font) + py-2.5 (10px*2=20px padding) = 34px height. This is a good approximation.
  const sizeSpecificClasses = {
    // General principle: py values aim for MD height conventions, px for MD padding conventions.
    // xs: ~32dp height. text-xs (12px). (32-12)/2 = 10px. py-2.5.
    xs: `text-xs py-2.5 ${variant === 'contained' ? 'px-3' : 'px-1.5'}`,
    // sm: ~34dp height. text-sm (14px). (34-14)/2 = 10px. py-2.5.
    sm: `text-sm py-2.5 ${variant === 'contained' ? 'px-3.5' : 'px-2'}`,
    // md: ~36dp height. text-sm (14px). (36-14)/2 = 11px. py-2.5 is 10px, py-3 is 12px. Let's stick to py-2.5 for consistency or adjust if too small.
    // Let's try to make vertical padding consistent and adjust horizontal.
    // py-2 (8px*2=16px) + 14px text = 30px.
    // py-1.5 (6px*2=12px) + 14px text = 26px.
    // Material Design spec for a 36dp high button with 14sp text implies (36dp - 14sp)/2 padding.
    // If 1dp = 1px and 1sp = 1px for simplicity here: (36-14)/2 = 11px. py-2.5 is 10px, py-3 is 12px.
    // Let's use Tailwind's py-2 (8px) and py-1 (4px) which are standard, and aim for ~30-32dp height for md.
    // text-sm (14px) + py-2 (8px*2=16px) = 30px.
    // text-sm (14px) + py-1.5 (6px*2=12px) = 26px.
    // Let's use py-2 for md, py-1 for sm, py-0.5 for xs, py-3 for lg.
    // Horizontal padding: Contained: 16dp, Text/Outlined: 8dp.
    // So, px-4 for Contained, px-2 for Text/Outlined.
    xs: `text-xs py-1 ${variant === 'contained' ? 'px-2.5' : 'px-1.5'}`, // Smaller padding for xs
    sm: `text-sm py-1.5 ${variant === 'contained' ? 'px-3' : 'px-2'}`,
    md: `text-sm py-2 ${variant === 'contained' ? 'px-4' : 'px-2'}`, // MD standard padding
    lg: `text-base py-2.5 ${variant === 'contained' ? 'px-6' : 'px-3'}`, // Larger padding for lg
  };
  
  // Ripple color logic
  let rippleColor = 'rgba(0, 0, 0, 0.1)'; // Default for light backgrounds / dark text
  if (variant === 'contained') {
    // Ripple should be onPrimary/onSecondary/onError with opacity
    if (color === 'secondary') { // material.onSecondary is #000000
      rippleColor = 'rgba(0, 0, 0, 0.1)';
    } else { // material.onPrimary (#FFFFFF) and material.onError (#FFFFFF)
      rippleColor = 'rgba(255, 255, 255, 0.3)';
    }
  } else {
    // For outlined and text buttons, ripple should use the text color (primary, secondary, or error) with opacity
    // This is a simplification; ideally, we'd get the exact color from theme.
    if (color === 'primary') rippleColor = 'rgba(62, 103, 138, 0.1)'; // Approx of material.primary #3e678a
    else if (color === 'secondary') rippleColor = 'rgba(224, 159, 62, 0.1)'; // Approx of material.secondary #E09F3E
    else if (color === 'error') rippleColor = 'rgba(176, 0, 32, 0.1)'; // Approx of material.error #B00020
  }


  const generatedClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeSpecificClasses[size]}
    ${focusRingColorClasses[color]}
    ${disabledClasses}
    ${loading ? 'relative !text-transparent hover:bg-opacity-100 focus:bg-opacity-100' : ''} 
    ${className}
  `;

  return (
    <button
      className={generatedClasses.replace(/\s+/g, ' ').trim()}
      disabled={loading || disabled}
      {...props}
    >
      {iconLeft && !loading && (
        <span className={`mr-2 ${size === 'xs' || size === 'sm' ? 'text-sm' : 'text-base'}`}>
          {iconLeft}
        </span>
      )}
      {children}
      {iconRight && !loading && (
        <span className={`ml-2 ${size === 'xs' || size === 'sm' ? 'text-sm' : 'text-base'}`}>
          {iconRight}
        </span>
      )}
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner
            size={size === 'lg' ? 'md' : size === 'md' ? 'sm' : 'xs'}
            // Determine spinner color based on button variant and color for contrast
            color={(variant === 'contained' && (color === 'primary' || color === 'secondary' || color === 'error')) ? 'light' : 'dark'}
            className="mr-2"
          />
          {loadingText && <span className="text-current">{loadingText}</span>}
        </span>
      )}
      {showRipple && !disabled && !loading && (
        <Ripple color={rippleColor} duration={600} />
      )}
      {/* Removed the extra span for hover/focus, relying on Tailwind variants */}
    </button>
  );
};

export default Button;