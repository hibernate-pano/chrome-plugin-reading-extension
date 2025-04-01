import React from 'react';
import { Switch as HeadlessSwitch } from '@headlessui/react';
import { cn } from '../utils/cn';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  size = 'medium',
  disabled = false,
  className,
}) => {
  const sizes = {
    small: {
      switch: 'w-12 h-6',
      dot: 'h-5 w-5',
      translate: 'translate-x-6',
    },
    medium: {
      switch: 'w-16 h-8',
      dot: 'h-7 w-7',
      translate: 'translate-x-8',
    },
    large: {
      switch: 'w-20 h-10',
      dot: 'h-9 w-9',
      translate: 'translate-x-10',
    },
  };

  return (
    <HeadlessSwitch
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer rounded-full transition-all duration-300 ease-elastic-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2',
        checked
          ? 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600'
          : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600',
        disabled && 'opacity-50 cursor-not-allowed',
        sizes[size].switch,
        className
      )}
    >
      <span className="sr-only">Toggle switch</span>
      <span
        className={cn(
          'pointer-events-none absolute top-0.5 left-0.5 inline-block transform rounded-full bg-white shadow-lg ring-0',
          'transition-all duration-300 ease-elastic-out',
          checked && 'shadow-brand-500/25',
          checked ? sizes[size].translate : 'translate-x-0',
          sizes[size].dot,
          'scale-animation'
        )}
        style={{
          boxShadow: checked 
            ? '0 0 12px rgba(37, 99, 235, 0.2), 0 4px 6px rgba(0, 0, 0, 0.1)' 
            : '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
      />
      <span
        className={cn(
          'absolute inset-0 flex items-center justify-center transition-opacity duration-200',
          'text-white text-xs',
          checked ? 'opacity-100 delay-200' : 'opacity-0'
        )}
      >
        <svg
          className={cn(
            'h-3 w-3 transform transition-transform duration-300',
            checked ? 'scale-100 rotate-0' : 'scale-0 rotate-90'
          )}
          fill="currentColor"
          viewBox="0 0 12 12"
        >
          <path d="M3.707 5.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L5 6.586 3.707 5.293z" />
        </svg>
      </span>
    </HeadlessSwitch>
  );
};

// 添加自定义过渡动画
const style = document.createElement('style');
style.textContent = `
  @keyframes elastic-bounce {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }

  .scale-animation {
    animation: elastic-bounce 0.3s ease-out;
  }
  
  .ease-elastic-out {
    transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes slide-fade {
    0% { opacity: 0; transform: translateX(-10px); }
    100% { opacity: 1; transform: translateX(0); }
  }

  .slide-fade-enter {
    animation: slide-fade 0.3s ease-out;
  }
`;
document.head.appendChild(style); 