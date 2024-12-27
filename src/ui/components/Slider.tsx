import React from 'react';

interface SliderProps {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

const Slider: React.FC<SliderProps> = ({
  label,
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  className = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  return (
    <div className="flex flex-col space-y-2">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}: {value}
        </label>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer 
          dark:bg-gray-700 accent-blue-600 ${className}`}
      />
    </div>
  );
};

export default Slider; 