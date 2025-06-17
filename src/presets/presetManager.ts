import { ReadingPreset, StorageKeys, setStorage, getStorage } from '../storage/storage';
import { builtInPresets } from './builtInPresets';

/**
 * 预设管理器
 * 用于管理阅读预设，包括内置预设和自定义预设
 */
export class PresetManager {
  private static instance: PresetManager;
  private activePresetId: string | null = null;

  private constructor() {}

  /**
   * 获取预设管理器实例
   */
  public static getInstance(): PresetManager {
    if (!PresetManager.instance) {
      PresetManager.instance = new PresetManager();
    }
    return PresetManager.instance;
  }

  /**
   * 初始化预设管理器 (只加载激活的预设)
   */
  public async initialize(): Promise<void> {
    // 加载当前激活的预设
    const activePresetId = await getStorage<string>(StorageKeys.ACTIVE_PRESET);
    if (activePresetId) {
      this.activePresetId = activePresetId;
    }
  }

  /**
   * 获取所有预设 (只返回内置预设)
   */
  public getAllPresets(): ReadingPreset[] {
    return [...builtInPresets];
  }

  /**
   * 获取内置预设
   */
  public getBuiltInPresets(): ReadingPreset[] {
    return [...builtInPresets];
  }

  /**
   * 获取当前激活的预设
   */
  public getActivePreset(): ReadingPreset | null {
    if (!this.activePresetId) return null;
    
    return this.getPresetById(this.activePresetId);
  }

  /**
   * 根据ID获取预设 (只从内置预设中查找)
   */
  public getPresetById(id: string): ReadingPreset | null {
    const allPresets = this.getAllPresets();
    return allPresets.find(preset => preset.id === id) || null;
  }

  /**
   * 设置当前激活的预设
   */
  public async setActivePreset(presetId: string): Promise<void> {
    const preset = this.getPresetById(presetId);
    if (!preset) {
      throw new Error(`预设不存在: ${presetId}`);
    }

    this.activePresetId = presetId;
    await setStorage(StorageKeys.ACTIVE_PRESET, presetId);

    // 应用预设设置
    await this.applyPreset(preset);
  }

  /**
   * 应用预设设置 (简化)
   */
  private async applyPreset(preset: ReadingPreset): Promise<void> {
    const { settings } = preset;
    
    // 应用每个设置项
    if (settings.theme) await setStorage(StorageKeys.THEME, settings.theme);
    if (settings.fontSize) await setStorage(StorageKeys.FONT_SIZE, settings.fontSize);
    if (settings.codeFontSize) await setStorage(StorageKeys.CODE_FONT_SIZE, settings.codeFontSize);
    if (settings.codeTheme) await setStorage(StorageKeys.CODE_THEME, settings.codeTheme);
    if (settings.lineHeight) await setStorage(StorageKeys.LINE_HEIGHT, settings.lineHeight);
    if (settings.showImages !== undefined) await setStorage(StorageKeys.SHOW_IMAGES, settings.showImages);
    if (settings.fontFamily) await setStorage(StorageKeys.FONT_FAMILY, settings.fontFamily);
    if (settings.backgroundColor) await setStorage(StorageKeys.BACKGROUND_COLOR, settings.backgroundColor);
    if (settings.paragraphSpacing) await setStorage(StorageKeys.PARAGRAPH_SPACING, settings.paragraphSpacing);
  }

  /**
   * 重置为默认预设 (简化)
   */
  public async resetToDefault(): Promise<void> {
    this.activePresetId = null;
    await setStorage(StorageKeys.ACTIVE_PRESET, null);
    
    // 应用默认预设
    const defaultPreset = builtInPresets.find(preset => preset.id === 'default');
    if (defaultPreset) {
      await this.applyPreset(defaultPreset);
    }
  }
}
