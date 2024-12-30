import { create } from 'zustand';
import { StorageKeys, getStorage, setStorage } from './storage/storage';

interface AppState {
  theme: 'light' | 'dark';
  fontSize: number;
  codeFontSize: number;
  readingMode: boolean;
  lineHeight: number;
  letterSpacing: number;
  pageWidth: number;
  textAlign: 'left' | 'center' | 'right';
  firstLineIndent: boolean;
  showImages: boolean;
  showDirectory: boolean;
  setTheme: (theme: 'light' | 'dark') => Promise<void>;
  setFontSize: (fontSize: number) => Promise<void>;
  setCodeFontSize: (codeFontSize: number) => Promise<void>;
  setReadingMode: (readingMode: boolean) => Promise<void>;
  setLineHeight: (lineHeight: number) => Promise<void>;
  setLetterSpacing: (letterSpacing: number) => Promise<void>;
  setPageWidth: (pageWidth: number) => Promise<void>;
  setTextAlign: (textAlign: 'left' | 'center' | 'right') => Promise<void>;
  setFirstLineIndent: (firstLineIndent: boolean) => Promise<void>;
  setShowImages: (showImages: boolean) => Promise<void>;
  setShowDirectory: (showDirectory: boolean) => Promise<void>;
}

const useAppStore = create<AppState>((set) => ({
  theme: 'light',
  fontSize: 16,
  codeFontSize: 14,
  readingMode: false,
  lineHeight: 1.5,
  letterSpacing: 0,
  pageWidth: 800,
  textAlign: 'left',
  firstLineIndent: true,
  showImages: true,
  showDirectory: true,

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

  setReadingMode: async (readingMode) => {
    set({ readingMode });
  },

  setLineHeight: async (lineHeight) => {
    await setStorage(StorageKeys.LINE_HEIGHT, lineHeight);
    set({ lineHeight });
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
}));

// 初始化 store 的状态
export const initializeStore = async () => {
  const theme = await getStorage<'light' | 'dark'>(StorageKeys.THEME);
  const fontSize = await getStorage<number>(StorageKeys.FONT_SIZE);
  const codeFontSize = await getStorage<number>(StorageKeys.CODE_FONT_SIZE);
  const lineHeight = await getStorage<number>(StorageKeys.LINE_HEIGHT);
  const letterSpacing = await getStorage<number>(StorageKeys.LETTER_SPACING);
  const pageWidth = await getStorage<number>(StorageKeys.PAGE_WIDTH);
  const textAlign = await getStorage<'left' | 'center' | 'right'>(StorageKeys.TEXT_ALIGN);
  const firstLineIndent = await getStorage<boolean>(StorageKeys.FIRST_LINE_INDENT);
  const showImages = await getStorage<boolean>(StorageKeys.SHOW_IMAGES);
  const showDirectory = await getStorage<boolean>(StorageKeys.SHOW_DIRECTORY);

  useAppStore.setState({
    theme: theme ?? 'light',
    fontSize: fontSize ?? 16,
    codeFontSize: codeFontSize ?? 14,
    readingMode: false,
    lineHeight: lineHeight ?? 1.5,
    letterSpacing: letterSpacing ?? 0,
    pageWidth: pageWidth ?? 800,
    textAlign: textAlign ?? 'left',
    firstLineIndent: firstLineIndent ?? true,
    showImages: showImages ?? true,
    showDirectory: showDirectory ?? true,
  });
};

export default useAppStore; 