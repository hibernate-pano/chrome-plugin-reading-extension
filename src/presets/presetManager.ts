import { ReadingPreset, StorageKeys, setStorage, getStorage } from '../storage/storage';
import simplifiedPresets from './simplifiedPresets';
import { DEFAULT_SETTINGS } from '../constants/defaultSettings';

/**
 * 简化版预设管理器
 * 遵循 "less is more" 和 "约定大于配置" 的设计理念
 */
export class SimplifiedPresetManager {
  private static instance: SimplifiedPresetManager;
  private activePresetId: string | null = null;

  private constructor() {}

  /**
   * 获取预设管理器实例
   */
  public static getInstance(): SimplifiedPresetManager {
    if (!SimplifiedPresetManager.instance) {
      SimplifiedPresetManager.instance = new SimplifiedPresetManager();
    }
    return SimplifiedPresetManager.instance;
  }

  /**
   * 初始化预设管理器
   */
  public async initialize(): Promise<void> {
    // 加载当前激活的预设
    const activePresetId = await getStorage<string>(StorageKeys.ACTIVE_PRESET);
    if (activePresetId) {
      this.activePresetId = activePresetId;
    }
  }

  /**
   * 获取所有预设
   */
  public getAllPresets(): ReadingPreset[] {
    return [...simplifiedPresets];
  }

  /**
   * 获取当前激活的预设
   */
  public getActivePreset(): ReadingPreset | null {
    if (!this.activePresetId) return null;
    
    return this.getPresetById(this.activePresetId);
  }

  /**
   * 根据ID获取预设
   */
  public getPresetById(id: string): ReadingPreset | null {
    return simplifiedPresets.find(preset => preset.id === id) || null;
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
   * 应用预设设置
   */
  private async applyPreset(preset: ReadingPreset): Promise<void> {
    const { settings } = preset;
    
    // 应用每个设置项
    if (settings.theme) await setStorage(StorageKeys.THEME, settings.theme);
    if (settings.fontSize) await setStorage(StorageKeys.FONT_SIZE, settings.fontSize);
    if (settings.codeFontSize) await setStorage(StorageKeys.CODE_FONT_SIZE, settings.codeFontSize);
    if (settings.codeTheme) await setStorage(StorageKeys.CODE_THEME, settings.codeTheme);
    if (settings.lineHeight) await setStorage(StorageKeys.LINE_HEIGHT, settings.lineHeight);
    if (settings.lineSpacing) await setStorage(StorageKeys.LINE_SPACING, settings.lineSpacing);
    if (settings.letterSpacing) await setStorage(StorageKeys.LETTER_SPACING, settings.letterSpacing);
    if (settings.pageWidth) await setStorage(StorageKeys.PAGE_WIDTH, settings.pageWidth);
    if (settings.textAlign) await setStorage(StorageKeys.TEXT_ALIGN, settings.textAlign);
    if (settings.firstLineIndent !== undefined) await setStorage(StorageKeys.FIRST_LINE_INDENT, settings.firstLineIndent);
    if (settings.showImages !== undefined) await setStorage(StorageKeys.SHOW_IMAGES, settings.showImages);
    if (settings.showDirectory !== undefined) await setStorage(StorageKeys.SHOW_DIRECTORY, settings.showDirectory);
    if (settings.fontFamily) await setStorage(StorageKeys.FONT_FAMILY, settings.fontFamily);
    if (settings.backgroundColor) await setStorage(StorageKeys.BACKGROUND_COLOR, settings.backgroundColor);
    if (settings.paragraphSpacing) await setStorage(StorageKeys.PARAGRAPH_SPACING, settings.paragraphSpacing);
  }

  /**
   * 重置到默认设置
   */
  public async resetToDefault(): Promise<void> {
    // 重置为默认预设
    const defaultPreset = simplifiedPresets.find(preset => preset.id === 'default');
    if (defaultPreset) {
      await this.applyPreset(defaultPreset);
    } else {
      // 如果找不到默认预设，使用 DEFAULT_SETTINGS
      await setStorage(StorageKeys.THEME, DEFAULT_SETTINGS.theme);
      await setStorage(StorageKeys.FONT_SIZE, DEFAULT_SETTINGS.fontSize);
      await setStorage(StorageKeys.CODE_FONT_SIZE, DEFAULT_SETTINGS.codeFontSize);
      await setStorage(StorageKeys.CODE_THEME, DEFAULT_SETTINGS.codeTheme);
      await setStorage(StorageKeys.LINE_HEIGHT, DEFAULT_SETTINGS.lineHeight);
      await setStorage(StorageKeys.LINE_SPACING, DEFAULT_SETTINGS.lineSpacing);
      await setStorage(StorageKeys.LETTER_SPACING, DEFAULT_SETTINGS.letterSpacing);
      await setStorage(StorageKeys.PAGE_WIDTH, DEFAULT_SETTINGS.pageWidth);
      await setStorage(StorageKeys.TEXT_ALIGN, DEFAULT_SETTINGS.textAlign);
      await setStorage(StorageKeys.FIRST_LINE_INDENT, DEFAULT_SETTINGS.firstLineIndent);
      await setStorage(StorageKeys.SHOW_IMAGES, DEFAULT_SETTINGS.showImages);
      await setStorage(StorageKeys.SHOW_DIRECTORY, DEFAULT_SETTINGS.showDirectory);
      await setStorage(StorageKeys.FONT_FAMILY, DEFAULT_SETTINGS.fontFamily);
      await setStorage(StorageKeys.BACKGROUND_COLOR, DEFAULT_SETTINGS.backgroundColor);
      await setStorage(StorageKeys.PARAGRAPH_SPACING, DEFAULT_SETTINGS.paragraphSpacing);
    }

    // 清除激活的预设
    this.activePresetId = null;
    await setStorage(StorageKeys.ACTIVE_PRESET, null);
  }
}

export default SimplifiedPresetManager;
