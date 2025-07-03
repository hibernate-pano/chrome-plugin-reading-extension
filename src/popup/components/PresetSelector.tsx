import React from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { Card, CardContent } from '../../ui/components/Card';
import { ReadingPreset } from '../../storage/storage';

/**
 * 预设选择器组件
 */
const PresetSelector: React.FC = () => {
  const { settings, updateSetting } = useSettingsStore();
  const { presets, activePreset } = settings;

  // 处理预设选择
  const handlePresetSelect = (presetId: string) => {
    // 更新activePreset设置
    updateSetting('activePreset', presetId);
  };

  // 渲染预设项
  const renderPresetItem = (preset: ReadingPreset) => {
    const isActive = activePreset === preset.id;

    return (
      <div key={preset.id} className="mb-3">
        <Card
          variant={isActive ? 'default' : 'hover'}
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
          {presets?.filter((p: ReadingPreset) => p.isBuiltIn).map(renderPresetItem)}
        </CardContent>
      </Card>
    </div>
  );
};

export default PresetSelector;
