import React, { useState } from 'react';
import useAppStore from '../../store';
import { ReadingPreset } from '../../storage/storage';
import { Card, CardHeader, CardContent } from '../../ui/components/Card';
import Button from '../../ui/components/Button';

/**
 * 预设选择器组件
 */
const PresetSelector: React.FC = () => {
  const {
    presets,
    customPresets,
    activePreset,
    applyPreset,
    createPreset,
    updatePreset,
    deletePreset,
    resetToDefaultSettings
  } = useAppStore();

  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');

  // 处理预设选择
  const handlePresetSelect = (presetId: string) => {
    applyPreset(presetId);
  };

  // 处理创建预设
  const handleCreatePreset = async () => {
    if (!newPresetName.trim()) return;

    await createPreset(newPresetName, newPresetDescription);
    setNewPresetName('');
    setNewPresetDescription('');
    setIsCreating(false);
  };

  // 处理更新预设
  const handleUpdatePreset = async (id: string) => {
    if (!newPresetName.trim()) return;

    await updatePreset(id, {
      name: newPresetName,
      description: newPresetDescription
    });

    setNewPresetName('');
    setNewPresetDescription('');
    setIsEditing(null);
  };

  // 处理删除预设
  const handleDeletePreset = async (id: string) => {
    if (confirm('确定要删除这个预设吗？')) {
      await deletePreset(id);
    }
  };

  // 开始编辑预设
  const startEditing = (preset: ReadingPreset) => {
    setNewPresetName(preset.name);
    setNewPresetDescription(preset.description || '');
    setIsEditing(preset.id);
  };

  // 渲染预设项
  const renderPresetItem = (preset: ReadingPreset) => {
    const isActive = activePreset === preset.id;
    const isCurrentlyEditing = isEditing === preset.id;

    if (isCurrentlyEditing) {
      return (
        <div key={preset.id} className="mb-3">
          <Card variant="paper">
            <CardContent className="p-3">
              <input
                type="text"
                className="w-full p-2 mb-2 border rounded bg-white dark:bg-gray-800 dark:text-gray-200"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="预设名称"
              />
              <textarea
                className="w-full p-2 mb-2 border rounded bg-white dark:bg-gray-800 dark:text-gray-200"
                value={newPresetDescription}
                onChange={(e) => setNewPresetDescription(e.target.value)}
                placeholder="预设描述（可选）"
                rows={2}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(null)}
                >
                  取消
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleUpdatePreset(preset.id)}
                >
                  保存
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

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

              {!preset.isBuiltIn && (
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(preset);
                    }}
                    iconLeft="✏️"
                  />
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePreset(preset.id);
                    }}
                    iconLeft="🗑️"
                  />
                </div>
              )}
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
        <CardHeader title="内置预设" />
        <CardContent className="space-y-3">
          {presets.filter(p => p.isBuiltIn).map(renderPresetItem)}
        </CardContent>
      </Card>

      {/* 自定义预设 */}
      <Card>
        <CardHeader
          title="自定义预设"
          action={
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setIsCreating(true)}
              iconLeft="➕"
            >
              新建
            </Button>
          }
        />
        <CardContent className="space-y-3">
          {customPresets.length > 0 ? (
            customPresets.map(renderPresetItem)
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400 italic">
              暂无自定义预设
            </div>
          )}

          {/* 创建新预设 */}
          {isCreating && (
            <Card variant="paper">
              <CardContent className="p-3">
                <input
                  type="text"
                  className="w-full p-2 mb-2 border rounded bg-white dark:bg-gray-800 dark:text-gray-200"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="预设名称"
                />
                <textarea
                  className="w-full p-2 mb-2 border rounded bg-white dark:bg-gray-800 dark:text-gray-200"
                  value={newPresetDescription}
                  onChange={(e) => setNewPresetDescription(e.target.value)}
                  placeholder="预设描述（可选）"
                  rows={2}
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCreating(false)}
                  >
                    取消
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCreatePreset}
                  >
                    创建
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* 重置按钮 */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={resetToDefaultSettings}
        >
          重置为默认设置
        </Button>
      </div>
    </div>
  );
};

export default PresetSelector;
