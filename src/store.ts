import { create } from 'zustand';
import { StorageKeys, getStorage, setStorage, CODE_THEMES, ReadingPreset } from './storage/storage';
import { DEFAULT_LINE_HEIGHT, DEFAULT_PARAGRAPH_SPACING } from './constants/options';
import { PresetManager } from './presets/presetManager';

interface AppState {
  theme: 'light' | 'dark';
  fontSize: number;
  codeFontSize: number;
  codeTheme: keyof typeof CODE_THEMES;
  readingMode: boolean;
  lineHeight: number;
  paragraphSpacing: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  showImages: boolean;
  activePreset: string | null;
  presets: ReadingPreset[];
  customPresets: ReadingPreset[];
  setTheme: (theme: 'light' | 'dark') => Promise<void>;
  setFontSize: (fontSize: number) => Promise<void>;
  setCodeFontSize: (codeFontSize: number) => Promise<void>;
  setCodeTheme: (codeTheme: keyof typeof CODE_THEMES) => Promise<void>;
  setReadingMode: (readingMode: boolean) => Promise<void>;
  setLineHeight: (lineHeight: number) => Promise<void>;
  setParagraphSpacing: (paragraphSpacing: number) => Promise<void>;
  setTextAlign: (textAlign: 'left' | 'center' | 'right' | 'justify') => Promise<void>;
  setShowImages: (showImages: boolean) => Promise<void>;
  applyPreset: (presetId: string) => Promise<void>;
  createPreset: (name: string, description?: string) => Promise<ReadingPreset>;
  updatePreset: (id: string, updates: Partial<Omit<ReadingPreset, 'id' | 'isBuiltIn'>>) => Promise<ReadingPreset | null>;
  deletePreset: (id: string) => Promise<boolean>;
  resetToDefaultSettings: () => Promise<void>;
}

// 初始化预设管理器
const presetManager = PresetManager.getInstance();

// 导入统一的默认设置
import { DEFAULT_SETTINGS } from './constants/defaultSettings';

const useAppStore = create<AppState>((set) => ({
  // 使用统一的默认设置
  theme: DEFAULT_SETTINGS.theme,
  fontSize: DEFAULT_SETTINGS.fontSize,
  codeFontSize: DEFAULT_SETTINGS.codeFontSize,
  codeTheme: DEFAULT_SETTINGS.codeTheme,
  readingMode: false, // 这个不是持久化设置，始终默认为 false
  lineHeight: DEFAULT_SETTINGS.lineHeight,
  paragraphSpacing: DEFAULT_SETTINGS.paragraphSpacing,
  textAlign: DEFAULT_SETTINGS.textAlign,
  showImages: DEFAULT_SETTINGS.showImages,
  activePreset: null,
  presets: [],
  customPresets: [],

  setTheme: async (theme) => {
    await setStorage(StorageKeys.THEME, theme);
    set({ theme });
  },

  setFontSize: async (fontSize) => {
    await setStorage(StorageKeys.FONT_SIZE, fontSize);
    set({ fontSize });
  },

  setCodeFontSize: async (codeFontSize) => {
    await setStorage(StorageKeys.CODE_FONT_SIZE, codeFontSize);
    set({ codeFontSize });
  },

  setCodeTheme: async (codeTheme) => {
    await setStorage(StorageKeys.CODE_THEME, codeTheme);
    set({ codeTheme });
  },

  setReadingMode: async (readingMode) => {
    set({ readingMode });
  },

  setLineHeight: async (lineHeight) => {
    await setStorage(StorageKeys.LINE_HEIGHT, lineHeight);
    set({ lineHeight });
  },

  setParagraphSpacing: async (paragraphSpacing) => {
    await setStorage(StorageKeys.PARAGRAPH_SPACING, paragraphSpacing);
    set({ paragraphSpacing });
  },

  setTextAlign: async (textAlign) => {
    await setStorage(StorageKeys.TEXT_ALIGN, textAlign);
    set({ textAlign });
  },

  setShowImages: async (showImages) => {
    await setStorage(StorageKeys.SHOW_IMAGES, showImages);
    set({ showImages });
  },

  applyPreset: async (presetId) => {
    await presetManager.setActivePreset(presetId);
    const preset = presetManager.getPresetById(presetId);
    set({ activePreset: presetId });

    // 更新状态以反映预设设置
    if (preset) {
      const { settings } = preset;
      set({
        ...(settings.theme && { theme: settings.theme }),
        ...(settings.fontSize && { fontSize: settings.fontSize }),
        ...(settings.codeFontSize && { codeFontSize: settings.codeFontSize }),
        ...(settings.codeTheme && { codeTheme: settings.codeTheme }),
        ...(settings.lineHeight && { lineHeight: settings.lineHeight }),
        ...(settings.textAlign && { textAlign: settings.textAlign }),
        ...(settings.showImages !== undefined && { showImages: settings.showImages }),
        ...(settings.fontFamily && { fontFamily: settings.fontFamily }),
        ...(settings.backgroundColor && { backgroundColor: settings.backgroundColor }),
        ...(settings.paragraphSpacing && { paragraphSpacing: settings.paragraphSpacing }),
      });
    }
  },

  createPreset: async (name, description) => {
    const preset = await presetManager.createPresetFromCurrentSettings(name, description);
    const customPresets = presetManager.getCustomPresets();
    set({ customPresets });
    return preset;
  },

  updatePreset: async (id, updates) => {
    const updatedPreset = await presetManager.updateCustomPreset(id, updates);
    if (updatedPreset) {
      const customPresets = presetManager.getCustomPresets();
      set({ customPresets });
    }
    return updatedPreset;
  },

  deletePreset: async (id) => {
    const result = await presetManager.deleteCustomPreset(id);
    if (result) {
      const customPresets = presetManager.getCustomPresets();
      const activePreset = presetManager.getActivePreset()?.id || null;
      set({ customPresets, activePreset });
    }
    return result;
  },

  resetToDefaultSettings: async () => {
    await presetManager.resetToDefault();
    set({ activePreset: null });
  },
}));

// 初始化 store 的状态
export const initializeStateFromStorage = async () => {
  const theme = await getStorage<'light' | 'dark'>(StorageKeys.THEME);
  const fontSize = await getStorage<number>(StorageKeys.FONT_SIZE);
  const codeFontSize = await getStorage<number>(StorageKeys.CODE_FONT_SIZE);
  const codeTheme = await getStorage<keyof typeof CODE_THEMES>(StorageKeys.CODE_THEME);
  const lineHeight = await getStorage<number>(StorageKeys.LINE_HEIGHT);
  const paragraphSpacing = await getStorage<number>(StorageKeys.PARAGRAPH_SPACING);
  const textAlign = await getStorage<'left' | 'center' | 'right' | 'justify'>(StorageKeys.TEXT_ALIGN);
  const showImages = await getStorage<boolean>(StorageKeys.SHOW_IMAGES);

  // 加载预设，这应该在所有单项设置之后，因为预设会覆盖它们
  await presetManager.loadPresets();
  const activePresetId = await getStorage<string>(StorageKeys.ACTIVE_PRESET);
  const customPresets = presetManager.getCustomPresets();
  const activePreset = activePresetId ? presetManager.getPresetById(activePresetId) : null;

  useAppStore.setState({
    theme: theme ?? DEFAULT_SETTINGS.theme,
    fontSize: fontSize ?? DEFAULT_SETTINGS.fontSize,
    codeFontSize: codeFontSize ?? DEFAULT_SETTINGS.codeFontSize,
    codeTheme: codeTheme ?? DEFAULT_SETTINGS.codeTheme,
    readingMode: false,
    lineHeight: lineHeight ?? DEFAULT_SETTINGS.lineHeight,
    paragraphSpacing: paragraphSpacing ?? DEFAULT_SETTINGS.paragraphSpacing,
    textAlign: textAlign ?? DEFAULT_SETTINGS.textAlign,
    showImages: showImages ?? DEFAULT_SETTINGS.showImages,
    activePreset: activePresetId,
    presets: presetManager.getAllPresets(), // 确保加载所有预设，包括内置和自定义
    customPresets: customPresets,
  });
};

export default useAppStore;