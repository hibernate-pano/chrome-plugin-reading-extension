import React from 'react';

interface SwitchProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

const Switch: React.FC<SwitchProps> = ({
  label,
  checked,
  onChange,
  className = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <label className={`inline-flex items-center cursor-pointer ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={handleChange}
        />
        <div
          className={`block w-10 h-6 rounded-full 
            bg-gray-200 dark:bg-gray-700
            peer-checked:bg-blue-600
            after:content-[''] after:absolute 
            after:top-[2px] after:left-[2px]
            after:bg-white after:rounded-full 
            after:h-5 after:w-5
            after:transition-all after:duration-300
            peer-checked:after:translate-x-full`}
        />
      </div>
      {label && (
        <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
          {label}
        </span>
      )}
    </label>
  );
};

export default Switch; 