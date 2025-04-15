import { ReadingPreset, StorageKeys, setStorage, getStorage } from '../storage/storage';
import { builtInPresets } from './builtInPresets';

/**
 * 预设管理器
 * 用于管理阅读预设，包括内置预设和自定义预设
 */
export class PresetManager {
  private static instance: PresetManager;
  private customPresets: ReadingPreset[] = [];
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
   * 初始化预设管理器
   */
  public async initialize(): Promise<void> {
    // 加载自定义预设
    const customPresets = await getStorage<ReadingPreset[]>(StorageKeys.CUSTOM_PRESETS);
    if (customPresets) {
      this.customPresets = customPresets;
    }

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
    return [...builtInPresets, ...this.customPresets];
  }

  /**
   * 获取内置预设
   */
  public getBuiltInPresets(): ReadingPreset[] {
    return [...builtInPresets];
  }

  /**
   * 获取自定义预设
   */
  public getCustomPresets(): ReadingPreset[] {
    return [...this.customPresets];
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
   * 添加自定义预设
   */
  public async addCustomPreset(preset: Omit<ReadingPreset, 'id' | 'isBuiltIn'>): Promise<ReadingPreset> {
    // 生成唯一ID
    const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newPreset: ReadingPreset = {
      ...preset,
      id,
      isBuiltIn: false
    };
    
    this.customPresets.push(newPreset);
    await this.saveCustomPresets();
    
    return newPreset;
  }

  /**
   * 更新自定义预设
   */
  public async updateCustomPreset(id: string, updates: Partial<Omit<ReadingPreset, 'id' | 'isBuiltIn'>>): Promise<ReadingPreset | null> {
    const index = this.customPresets.findIndex(preset => preset.id === id);
    if (index === -1) return null;
    
    const updatedPreset: ReadingPreset = {
      ...this.customPresets[index],
      ...updates,
      id,
      isBuiltIn: false
    };
    
    this.customPresets[index] = updatedPreset;
    await this.saveCustomPresets();
    
    return updatedPreset;
  }

  /**
   * 删除自定义预设
   */
  public async deleteCustomPreset(id: string): Promise<boolean> {
    const initialLength = this.customPresets.length;
    this.customPresets = this.customPresets.filter(preset => preset.id !== id);
    
    if (this.customPresets.length !== initialLength) {
      // 如果删除的是当前激活的预设，清除激活状态
      if (this.activePresetId === id) {
        this.activePresetId = null;
        await setStorage(StorageKeys.ACTIVE_PRESET, null);
      }
      
      await this.saveCustomPresets();
      return true;
    }
    
    return false;
  }

  /**
   * 保存自定义预设到存储
   */
  private async saveCustomPresets(): Promise<void> {
    await setStorage(StorageKeys.CUSTOM_PRESETS, this.customPresets);
  }

  /**
   * 从当前设置创建预设
   */
  public async createPresetFromCurrentSettings(name: string, description?: string): Promise<ReadingPreset> {
    // 获取当前所有设置
    const theme = await getStorage<'light' | 'dark'>(StorageKeys.THEME);
    const fontSize = await getStorage<number>(StorageKeys.FONT_SIZE);
    const codeFontSize = await getStorage<number>(StorageKeys.CODE_FONT_SIZE);
    const codeTheme = await getStorage<any>(StorageKeys.CODE_THEME);
    const lineHeight = await getStorage<number>(StorageKeys.LINE_HEIGHT);
    const lineSpacing = await getStorage<number>(StorageKeys.LINE_SPACING);
    const letterSpacing = await getStorage<number>(StorageKeys.LETTER_SPACING);
    const pageWidth = await getStorage<number>(StorageKeys.PAGE_WIDTH);
    const textAlign = await getStorage<any>(StorageKeys.TEXT_ALIGN);
    const firstLineIndent = await getStorage<boolean>(StorageKeys.FIRST_LINE_INDENT);
    const showImages = await getStorage<boolean>(StorageKeys.SHOW_IMAGES);
    const showDirectory = await getStorage<boolean>(StorageKeys.SHOW_DIRECTORY);
    const fontFamily = await getStorage<any>(StorageKeys.FONT_FAMILY);
    const backgroundColor = await getStorage<any>(StorageKeys.BACKGROUND_COLOR);
    const paragraphSpacing = await getStorage<number>(StorageKeys.PARAGRAPH_SPACING);
    
    // 创建预设
    return this.addCustomPreset({
      name,
      description,
      settings: {
        theme: theme || undefined,
        fontSize: fontSize || undefined,
        codeFontSize: codeFontSize || undefined,
        codeTheme: codeTheme || undefined,
        lineHeight: lineHeight || undefined,
        lineSpacing: lineSpacing || undefined,
        letterSpacing: letterSpacing || undefined,
        pageWidth: pageWidth || undefined,
        textAlign: textAlign || undefined,
        firstLineIndent: firstLineIndent,
        showImages: showImages,
        showDirectory: showDirectory,
        fontFamily: fontFamily || undefined,
        backgroundColor: backgroundColor || undefined,
        paragraphSpacing: paragraphSpacing || undefined,
      }
    });
  }

  /**
   * 重置为默认预设
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
