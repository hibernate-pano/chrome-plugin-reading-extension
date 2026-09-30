/**
 * Reader Theme Definitions
 * Three base themes — light, dark, sepia.
 *
 * Every colour is drawn from Google's own palette rather than a generic
 * "material" ramp: the blue is Google Blue 600 (the one the Chrome UI is
 * painted with, #1a73e8) and the neutrals are the Google Grey scale that
 * Search, Docs and Drive are built from. A reader that looks like a Google
 * product does not get there by being "close to blue" — it gets there by
 * using the *same* blue and the *same* greys, so the chrome around it and
 * the page inside it belong to one system.
 *
 * The dark theme is deliberately neutral (#202124) rather than warm-black,
 * because Chrome's dark surfaces are neutral and a warm black next to a
 * neutral browser frame reads as a different application.
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
    // Google Grey 0 / 900 / 700, Blue 600, Grey 300, Grey 50
    background: '#ffffff',
    text: '#202124',
    textMuted: '#5f6368',
    accent: '#1a73e8',
    border: '#dadce0',
    codeBg: '#f8f9fa',
  },
  {
    id: 'dark',
    name: '深色',
    // Chrome's dark surfaces: neutral, one step above pure black
    background: '#202124',
    text: '#e8eaed',
    textMuted: '#9aa0a6',
    accent: '#8ab4f8',
    border: '#3c4043',
    codeBg: '#292a2d',
  },
  {
    id: 'sepia',
    name: '护眼',
    // Warm paper, but the accent is still a Google blue — darkened two steps
    // so it clears 4.5:1 against cream, where #1a73e8 only reaches 4.06:1.
    background: '#f8f2e7',
    text: '#3d3529',
    textMuted: '#776c59',
    accent: '#175fcc',
    border: '#e5dac5',
    codeBg: '#f2ebdc',
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
