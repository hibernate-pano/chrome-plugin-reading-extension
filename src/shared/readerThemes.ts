/**
 * Reader Theme Definitions
 * Three base themes — light, dark, sepia.
 * Designed to match Google/Apple aesthetic: minimal, restrained, readable.
 */

export type ThemeId = 'light' | 'dark' | 'sepia';

export interface ReaderTheme {
  id: ThemeId;
  name: string;
  background: string;
  text: string;
  textMuted: string;
  accent: string;
  border: string;
  codeBg: string;
}

export const READER_THEMES: readonly ReaderTheme[] = [
  {
    id: 'light',
    name: '浅色',
    background: '#faf9f7',
    text: '#2c2b28',
    textMuted: '#8a8680',
    accent: '#1a56db',
    border: '#e8e4dc',
    codeBg: '#f2ede6',
  },
  {
    id: 'dark',
    name: '深色',
    background: '#1c1b1a',
    text: '#e6e4df',
    textMuted: '#7a7872',
    accent: '#8ab4f8',
    border: '#2d2d2b',
    codeBg: '#252423',
  },
  {
    id: 'sepia',
    name: '护眼',
    background: '#f5eed6',
    text: '#433422',
    textMuted: '#8a7560',
    accent: '#7a5c2e',
    border: '#d4c9a8',
    codeBg: '#ede6cc',
  },
] as const;

const FALLBACK_THEME = READER_THEMES[0];

/**
 * Resolve theme by id; falls back to light when unknown.
 */
export function getReaderThemeById(id: string | null | undefined): ReaderTheme {
  if (id) {
    const found = READER_THEMES.find((theme) => theme.id === id);
    if (found) return found;
  }
  return FALLBACK_THEME;
}