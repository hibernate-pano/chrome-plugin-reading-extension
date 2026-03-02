import type { CustomTheme as ExtraTheme } from '@/shared/themes';
import { EXTRA_THEMES } from '@/shared/themes';

export interface ReaderTheme {
  id: string;
  name: string;
  background: string;
  text: string;
  accent: string;
  border: string;
  codeBg: string;
  /**
   * 是否为基础内置主题（light/dark/sepia）
   */
  isBase?: boolean;
}

const READER_BASE_THEMES: ReaderTheme[] = [
  {
    id: 'light',
    name: '浅色',
    background: '#faf9f7',
    text: '#2c2b28',
    accent: '#1a56db',
    border: '#e8e4dc',
    codeBg: '#f2ede6',
    isBase: true,
  },
  {
    id: 'dark',
    name: '深色',
    background: '#1c1b1a',
    text: '#e6e4df',
    accent: '#8ab4f8',
    border: '#2d2d2b',
    codeBg: '#252423',
    isBase: true,
  },
  {
    id: 'sepia',
    name: '护眼',
    background: '#f5eed6',
    text: '#433422',
    accent: '#7a5c2e',
    border: '#d4c9a8',
    codeBg: '#ede6cc',
    isBase: true,
  },
];

function mapExtraTheme(theme: ExtraTheme): ReaderTheme {
  return {
    id: theme.id,
    name: theme.name,
    background: theme.background,
    text: theme.text,
    accent: theme.accent,
    border: theme.border,
    codeBg: theme.codeBg ?? theme.background,
    isBase: false,
  };
}

export const READER_EXTRA_THEMES: ReaderTheme[] = EXTRA_THEMES.map(mapExtraTheme);

export const READER_THEMES: ReaderTheme[] = [...READER_BASE_THEMES, ...READER_EXTRA_THEMES];

const DEFAULT_THEME_ID = 'light';
const BASE_THEME_IDS = new Set(READER_BASE_THEMES.map((theme) => theme.id));

export function getReaderThemeById(id: string | null | undefined): ReaderTheme {
  if (id) {
    const found = READER_THEMES.find((theme) => theme.id === id);
    if (found) {
      return found;
    }
  }

  const fallback = READER_BASE_THEMES.find((theme) => theme.id === DEFAULT_THEME_ID);
  if (!fallback) {
    // 理论上不会发生，仅作类型安全兜底
    return READER_BASE_THEMES[0];
  }
  return fallback;
}

export function isBaseReaderThemeId(id: string | null | undefined): boolean {
  if (!id) {
    return false;
  }
  return BASE_THEME_IDS.has(id);
}

