import React from 'react';
import useAppStore from '../../store';
import { Card, CardContent } from '../../ui/components/Card';

/**
 * 预设选择器组件
 */
const PresetSelector: React.FC = () => {
  const {
    presets,
    activePreset,
    applyPreset,
  } = useAppStore();

  // 处理预设选择
  const handlePresetSelect = (presetId: string) => {
    applyPreset(presetId);
  };

  // 渲染预设项
  const renderPresetItem = (preset: ReadingPreset) => {
    const isActive = activePreset === preset.id;

    return (
      <div key={preset.id} className="mb-3">
        <Card
          variant={isActive ? 'active' : 'hover'}
          className={`transition-all duration-200 ${isActive ? 'border-brand-500' : ''}`}
          onClick={() => handlePresetSelect(preset.id)}
        >
          <CardContent className="p-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium flex items-center">
                  {preset.name}
                  {isActive && (
                    <span className="ml-2 text-xs bg-brand-500 text-white px-2 py-0.5 rounded-full">
                      当前
                    </span>
                  )}
                </div>
                {preset.description && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{preset.description}</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* 内置预设 */}
      <Card>
        <CardContent className="space-y-3">
          {presets.filter(p => p.isBuiltIn).map(renderPresetItem)}
        </CardContent>
      </Card>
    </div>
  );
};

export default PresetSelector;
