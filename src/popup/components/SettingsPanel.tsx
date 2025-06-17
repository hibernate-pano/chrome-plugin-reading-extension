import React from 'react';
import { Slider } from '../../ui/components/Slider';
import {
  DEFAULT_LINE_HEIGHT,
  MIN_LINE_HEIGHT,
  MAX_LINE_HEIGHT,
  LINE_HEIGHT_STEP,
  DEFAULT_PARAGRAPH_SPACING,
  MIN_PARAGRAPH_SPACING,
  MAX_PARAGRAPH_SPACING,
  PARAGRAPH_SPACING_STEP,
} from '../../constants/options';
import useAppStore from '../../store';

export const SettingsPanel: React.FC = () => {
  const {
    lineHeight,
    setLineHeight,
    paragraphSpacing,
    setParagraphSpacing,
  } = useAppStore();

  const handleLineHeightChange = async (value: number) => {
    await setLineHeight(value);
  };

  const handleParagraphSpacingChange = async (value: number) => {
    await setParagraphSpacing(value);
  };

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          行高
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

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          段间距
        </label>
        <Slider
          value={paragraphSpacing}
          onChange={handleParagraphSpacingChange}
          min={MIN_PARAGRAPH_SPACING}
          max={MAX_PARAGRAPH_SPACING}
          step={PARAGRAPH_SPACING_STEP}
          className="w-full"
        />
        <div className="text-xs text-gray-500 dark:text-gray-400">
          当前值: {paragraphSpacing.toFixed(1)}
        </div>
      </div>
    </div>
  );
}; 