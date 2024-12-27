import { create } from 'zustand';
import { StorageKeys, getStorage, setStorage } from './storage/storage';

interface AppState {
  theme: 'light' | 'dark';
  fontSize: number;
  readingMode: boolean;
  lineHeight: number;
  letterSpacing: number;
  pageWidth: number;
  textAlign: 'left' | 'center' | 'right';
  firstLineIndent: boolean;
  showImages: boolean;
  setTheme: (theme: 'light' | 'dark') => Promise<void>;
  setFontSize: (fontSize: number) => Promise<void>;
  setReadingMode: (readingMode: boolean) => Promise<void>;
  setLineHeight: (lineHeight: number) => Promise<void>;
  setLetterSpacing: (letterSpacing: number) => Promise<void>;
  setPageWidth: (pageWidth: number) => Promise<void>;
  setTextAlign: (textAlign: 'left' | 'center' | 'right') => Promise<void>;
  setFirstLineIndent: (firstLineIndent: boolean) => Promise<void>;
  setShowImages: (showImages: boolean) => Promise<void>;
}

const useAppStore = create<AppState>((set) => ({
  theme: 'light',
  fontSize: 16,
  readingMode: false,
  lineHeight: 1.5,
  letterSpacing: 0,
  pageWidth: 800,
  textAlign: 'left',
  firstLineIndent: true,
  showImages: true,

  setTheme: async (theme) => {
    await setStorage(StorageKeys.THEME, theme);
    set({ theme });
  },

  setFontSize: async (fontSize) => {
    await setStorage(StorageKeys.FONT_SIZE, fontSize);
    set({ fontSize });
  },

  setReadingMode: async (readingMode) => {
    await setStorage(StorageKeys.READING_MODE, readingMode);
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
}));

// 初始化 store 的状态
export const initializeStore = async () => {
  const theme = await getStorage<'light' | 'dark'>(StorageKeys.THEME) ?? 'light';
  const fontSize = await getStorage<number>(StorageKeys.FONT_SIZE) ?? 16;
  const readingMode = await getStorage<boolean>(StorageKeys.READING_MODE) ?? false;
  const lineHeight = await getStorage<number>(StorageKeys.LINE_HEIGHT) ?? 1.5;
  const letterSpacing = await getStorage<number>(StorageKeys.LETTER_SPACING) ?? 0;
  const pageWidth = await getStorage<number>(StorageKeys.PAGE_WIDTH) ?? 800;
  const textAlign = await getStorage<'left' | 'center' | 'right'>(StorageKeys.TEXT_ALIGN) ?? 'left';
  const firstLineIndent = await getStorage<boolean>(StorageKeys.FIRST_LINE_INDENT) ?? true;
  const showImages = await getStorage<boolean>(StorageKeys.SHOW_IMAGES) ?? true;

  useAppStore.setState({
    theme,
    fontSize,
    readingMode,
    lineHeight,
    letterSpacing,
    pageWidth,
    textAlign,
    firstLineIndent,
    showImages,
  });
};

export default useAppStore; 