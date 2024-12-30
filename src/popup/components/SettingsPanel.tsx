import React from 'react';
import { Slider } from '../../ui/components/Slider';
import { DEFAULT_LINE_HEIGHT, MIN_LINE_HEIGHT, MAX_LINE_HEIGHT, LINE_HEIGHT_STEP } from '../../constants/options';
import useAppStore from '../../store';

export const SettingsPanel: React.FC = () => {
  const { lineHeight, setLineHeight } = useAppStore();

  const handleLineHeightChange = async (value: number) => {
    await setLineHeight(value);
  };

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          行间距
        </label>
        <Slider
          value={lineHeight}
          onChange={handleLineHeightChange}
          min={MIN_LINE_HEIGHT}
          max={MAX_LINE_HEIGHT}
          step={LINE_HEIGHT_STEP}
          className="w-full"
        />
        <div className="text-xs text-gray-500 dark:text-gray-400">
          当前值: {lineHeight.toFixed(1)}
        </div>
      </div>
      {/* ... existing settings ... */}
    </div>
  );
}; 