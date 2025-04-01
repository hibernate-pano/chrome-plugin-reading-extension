import React from 'react';

interface SwitchProps {
  label?: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

const Switch: React.FC<SwitchProps> = ({
  label,
  description,
  checked,
  onChange,
  className = '',
  size = 'medium',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  // 根据尺寸确定样式
  const sizeClasses = {
    small: {
      track: 'w-8 h-4',
      thumb: 'w-3 h-3 left-0.5 top-0.5',
      thumbActive: 'translate-x-4'
    },
    medium: {
      track: 'w-11 h-6',
      thumb: 'w-5 h-5 left-0.5 top-0.5',
      thumbActive: 'translate-x-5'
    },
    large: {
      track: 'w-14 h-7',
      thumb: 'w-6 h-6 left-0.5 top-0.5',
      thumbActive: 'translate-x-7'
    }
  };

  const { track, thumb, thumbActive } = sizeClasses[size];

  return (
    <label className={`inline-flex items-center cursor-pointer group ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={handleChange}
        />
        <div
          className={`relative ${track} rounded-full transition-all duration-300 ease-in-out
            ${checked 
              ? 'bg-gradient-to-r from-brand-600 to-brand-500'
              : 'bg-gray-200 dark:bg-gray-700'
            }
            after:content-[''] after:absolute 
            after:${thumb}
            after:bg-white after:rounded-full 
            after:shadow-md
            after:transition-all after:duration-300 after:ease-spring
            ${checked ? `after:${thumbActive}` : ''}
            after:scale-95
            group-hover:after:scale-100
            group-active:after:scale-90
          `}
        />
        <span
          className={`absolute inline-flex items-center justify-center top-0 bottom-0 ${
            checked ? 'right-1.5' : 'left-1.5'
          } text-[8px] text-white transition-all duration-300 opacity-80`}
        >
          {checked ? '开' : '关'}
        </span>
      </div>
      {(label || description) && (
        <div className="ml-3">
          {label && (
            <span className={`text-sm font-medium text-gray-800 dark:text-gray-200 ${description ? 'block' : ''}`}>
              {label}
            </span>
          )}
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {description}
            </p>
          )}
        </div>
      )}
    </label>
  );
};

export default Switch; 