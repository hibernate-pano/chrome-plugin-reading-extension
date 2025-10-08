import React from 'react';

interface SimpleSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * 简化版 Switch 组件，用于调试
 * 使用原生 HTML checkbox 实现
 */
export const SimpleSwitch: React.FC<SimpleSwitchProps> = ({
  checked,
  onCheckedChange,
  className = '',
  disabled = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('SimpleSwitch change event:', e.target.checked);
    onCheckedChange(e.target.checked);
  };

  const handleClick = () => {
    console.log('SimpleSwitch clicked, current state:', checked);
  };

  return (
    <label 
      className={`inline-flex items-center cursor-pointer ${className}`}
      onClick={handleClick}
    >
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
      </div>
    </label>
  );
};

