import { create } from 'zustand';
import { StorageKeys, getStorage, setStorage, CODE_THEMES, ReadingPreset } from './storage/storage';
import { DEFAULT_LINE_HEIGHT, DEFAULT_PARAGRAPH_SPACING, DEFAULT_LINE_SPACING } from './constants/options';
import { PresetManager } from './presets/presetManager';

interface AppState {
  theme: 'light' | 'dark';
  fontSize: number;
  codeFontSize: number;
  codeTheme: keyof typeof CODE_THEMES;
  readingMode: boolean;
  lineHeight: number;
  lineSpacing: number;
  letterSpacing: number;
  pageWidth: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  firstLineIndent: boolean;
  showImages: boolean;
  showDirectory: boolean;
  paragraphSpacing: number;
  activePreset: string | null;
  presets: ReadingPreset[];
  customPresets: ReadingPreset[];
  setTheme: (theme: 'light' | 'dark') => Promise<void>;
  setFontSize: (fontSize: number) => Promise<void>;
  setCodeFontSize: (codeFontSize: number) => Promise<void>;
  setCodeTheme: (codeTheme: keyof typeof CODE_THEMES) => Promise<void>;
  setReadingMode: (readingMode: boolean) => Promise<void>;
  setLineHeight: (lineHeight: number) => Promise<void>;
  setLineSpacing: (lineSpacing: number) => Promise<void>;
  setLetterSpacing: (letterSpacing: number) => Promise<void>;
  setPageWidth: (pageWidth: number) => Promise<void>;
  setTextAlign: (textAlign: 'left' | 'center' | 'right' | 'justify') => Promise<void>;
  setFirstLineIndent: (firstLineIndent: boolean) => Promise<void>;
  setShowImages: (showImages: boolean) => Promise<void>;
  setShowDirectory: (showDirectory: boolean) => Promise<void>;
  setParagraphSpacing: (paragraphSpacing: number) => Promise<void>;
  applyPreset: (presetId: string) => Promise<void>;
  createPreset: (name: string, description?: string) => Promise<ReadingPreset>;
  updatePreset: (id: string, updates: Partial<Omit<ReadingPreset, 'id' | 'isBuiltIn'>>) => Promise<ReadingPreset | null>;
  deletePreset: (id: string) => Promise<boolean>;
  resetToDefaultSettings: () => Promise<void>;
}

// 初始化预设管理器
const presetManager = PresetManager.getInstance();

const useAppStore = create<AppState>((set) => ({
  theme: 'light',
  fontSize: 16,
  codeFontSize: 14,
  codeTheme: 'github',
  readingMode: false,
  lineHeight: DEFAULT_LINE_HEIGHT,
  lineSpacing: DEFAULT_LINE_SPACING,
  letterSpacing: 0,
  pageWidth: 1200,
  textAlign: 'left',
  firstLineIndent: true,
  showImages: true,
  showDirectory: false, // 默认不显示目录
  paragraphSpacing: DEFAULT_PARAGRAPH_SPACING,
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

  setLineSpacing: async (lineSpacing) => {
    await setStorage(StorageKeys.LINE_SPACING, lineSpacing);
    set({ lineSpacing });
  },

  setLetterSpacing: async (letterSpacing) => {
    await setStorage(StorageKeys.LETTER_SPACING, letterSpacing);
    set({ letterSpacing });
  },

  setPageWidth: async (pageWidth) => {
    await setStorage(StorageKeys.PAGE_WIDTH, pageWidth);
    set({ pageWidth });
  },

  setTextAlign: async (textAlign) => {
    await setStorage(StorageKeys.TEXT_ALIGN, textAlign);
    set({ textAlign });
  },

  setFirstLineIndent: async (firstLineIndent) => {
    await setStorage(StorageKeys.FIRST_LINE_INDENT, firstLineIndent);
    set({ firstLineIndent });
  },

  setShowImages: async (showImages) => {
    await setStorage(StorageKeys.SHOW_IMAGES, showImages);
    set({ showImages });
  },

  setShowDirectory: async (showDirectory) => {
    await setStorage(StorageKeys.SHOW_DIRECTORY, showDirectory);
    set({ showDirectory });
  },

  setParagraphSpacing: async (paragraphSpacing) => {
    await setStorage(StorageKeys.PARAGRAPH_SPACING, paragraphSpacing);
    set({ paragraphSpacing });
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
        ...(settings.lineSpacing && { lineSpacing: settings.lineSpacing }),
        ...(settings.letterSpacing && { letterSpacing: settings.letterSpacing }),
        ...(settings.pageWidth && { pageWidth: settings.pageWidth }),
        ...(settings.textAlign && { textAlign: settings.textAlign }),
        ...(settings.firstLineIndent !== undefined && { firstLineIndent: settings.firstLineIndent }),
        ...(settings.showImages !== undefined && { showImages: settings.showImages }),
        ...(settings.showDirectory !== undefined && { showDirectory: settings.showDirectory }),
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
export const initializeStore = async () => {
  // 初始化预设管理器
  await presetManager.initialize();

  // 获取所有预设
  const allPresets = presetManager.getAllPresets();
  const customPresets = presetManager.getCustomPresets();
  const activePreset = presetManager.getActivePreset()?.id || null;
  const theme = await getStorage<'light' | 'dark'>(StorageKeys.THEME);
  const fontSize = await getStorage<number>(StorageKeys.FONT_SIZE);
  const codeFontSize = await getStorage<number>(StorageKeys.CODE_FONT_SIZE);
  const codeTheme = await getStorage<keyof typeof CODE_THEMES>(StorageKeys.CODE_THEME);
  const lineHeight = await getStorage<number>(StorageKeys.LINE_HEIGHT);
  const letterSpacing = await getStorage<number>(StorageKeys.LETTER_SPACING);
  const pageWidth = await getStorage<number>(StorageKeys.PAGE_WIDTH);
  const textAlign = await getStorage<'left' | 'center' | 'right'>(StorageKeys.TEXT_ALIGN);
  const firstLineIndent = await getStorage<boolean>(StorageKeys.FIRST_LINE_INDENT);
  const showImages = await getStorage<boolean>(StorageKeys.SHOW_IMAGES);
  const showDirectory = await getStorage<boolean>(StorageKeys.SHOW_DIRECTORY);
  const paragraphSpacing = await getStorage<number>(StorageKeys.PARAGRAPH_SPACING);

  useAppStore.setState({
    presets: allPresets,
    customPresets,
    activePreset,
    theme: theme ?? 'light',
    fontSize: fontSize ?? 16,
    codeFontSize: codeFontSize ?? 14,
    codeTheme: codeTheme ?? 'github',
    readingMode: false,
    lineHeight: lineHeight ?? DEFAULT_LINE_HEIGHT,
    letterSpacing: letterSpacing ?? 0,
    pageWidth: pageWidth ?? 1200,
    textAlign: textAlign ?? 'left',
    firstLineIndent: firstLineIndent ?? true,
    showImages: showImages ?? true,
    showDirectory: showDirectory ?? false, // 默认不显示目录
    paragraphSpacing: paragraphSpacing ?? DEFAULT_PARAGRAPH_SPACING,
  });
};

export default useAppStore;