import { create } from 'zustand';
import { StorageKeys, getStorage, setStorage, CODE_THEMES } from './storage/storage';
import { DEFAULT_LINE_HEIGHT, DEFAULT_PARAGRAPH_SPACING, DEFAULT_LINE_SPACING } from './constants/options';

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
  textAlign: 'left' | 'center' | 'right';
  firstLineIndent: boolean;
  showImages: boolean;
  showDirectory: boolean;
  paragraphSpacing: number;
  aiMode: boolean;
  aiProcessing: boolean;
  setTheme: (theme: 'light' | 'dark') => Promise<void>;
  setFontSize: (fontSize: number) => Promise<void>;
  setCodeFontSize: (codeFontSize: number) => Promise<void>;
  setCodeTheme: (codeTheme: keyof typeof CODE_THEMES) => Promise<void>;
  setReadingMode: (readingMode: boolean) => Promise<void>;
  setLineHeight: (lineHeight: number) => Promise<void>;
  setLineSpacing: (lineSpacing: number) => Promise<void>;
  setLetterSpacing: (letterSpacing: number) => Promise<void>;
  setPageWidth: (pageWidth: number) => Promise<void>;
  setTextAlign: (textAlign: 'left' | 'center' | 'right') => Promise<void>;
  setFirstLineIndent: (firstLineIndent: boolean) => Promise<void>;
  setShowImages: (showImages: boolean) => Promise<void>;
  setShowDirectory: (showDirectory: boolean) => Promise<void>;
  setParagraphSpacing: (paragraphSpacing: number) => Promise<void>;
  setAIMode: (aiMode: boolean) => Promise<void>;
  setAIProcessing: (aiProcessing: boolean) => Promise<void>;
}

const useAppStore = create<AppState>((set) => ({
  theme: 'light',
  fontSize: 16,
  codeFontSize: 14,
  codeTheme: 'github',
  readingMode: false,
  lineHeight: DEFAULT_LINE_HEIGHT,
  lineSpacing: DEFAULT_LINE_SPACING,
  letterSpacing: 0,
  pageWidth: 800,
  textAlign: 'left',
  firstLineIndent: true,
  showImages: true,
  showDirectory: true,
  paragraphSpacing: DEFAULT_PARAGRAPH_SPACING,
  aiMode: false,
  aiProcessing: false,

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

  setAIMode: async (aiMode) => {
    await setStorage(StorageKeys.AI_MODE, aiMode);
    set({ aiMode });
  },

  setAIProcessing: async (aiProcessing) => {
    await setStorage(StorageKeys.AI_PROCESSING, aiProcessing);
    set({ aiProcessing });
  },
}));

// 初始化 store 的状态
export const initializeStore = async () => {
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
  const aiMode = await getStorage<boolean>(StorageKeys.AI_MODE);
  const aiProcessing = await getStorage<boolean>(StorageKeys.AI_PROCESSING);

  useAppStore.setState({
    theme: theme ?? 'light',
    fontSize: fontSize ?? 16,
    codeFontSize: codeFontSize ?? 14,
    codeTheme: codeTheme ?? 'github',
    readingMode: false,
    lineHeight: lineHeight ?? DEFAULT_LINE_HEIGHT,
    letterSpacing: letterSpacing ?? 0,
    pageWidth: pageWidth ?? 800,
    textAlign: textAlign ?? 'left',
    firstLineIndent: firstLineIndent ?? true,
    showImages: showImages ?? true,
    showDirectory: showDirectory ?? true,
    paragraphSpacing: paragraphSpacing ?? DEFAULT_PARAGRAPH_SPACING,
    aiMode: aiMode ?? false,
    aiProcessing: aiProcessing ?? false,
  });
};

export default useAppStore; 