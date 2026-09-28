/**
 * Print Settings — persistence and validation
 *
 * Print appearance is deliberately separate from reading settings: the two
 * have different units (pt vs px), different valid ranges, and print is
 * missing a theme option that reading has.
 */

import type { PrintSettings, PrintTheme } from './types';
import { PRINT_FONT_SIZES, STORAGE_KEYS } from './constants';

const VALID_THEMES: readonly PrintTheme[] = ['light', 'sepia'];

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  theme: 'light',
  fontSize: 11,
};

/**
 * Fill a partial object with valid values, dropping anything unrecognized.
 */
export function validatePrintSettings(settings: Partial<PrintSettings>): PrintSettings {
  const theme = VALID_THEMES.includes(settings.theme as PrintTheme)
    ? (settings.theme as PrintTheme)
    : DEFAULT_PRINT_SETTINGS.theme;

  // Snap to the nearest offered step so a hand-edited value still lands on a
  // size the toolbar can display.
  const requested = typeof settings.fontSize === 'number' ? settings.fontSize : NaN;
  const fontSize = Number.isNaN(requested)
    ? DEFAULT_PRINT_SETTINGS.fontSize
    : PRINT_FONT_SIZES.reduce((closest, step) =>
        Math.abs(step - requested) < Math.abs(closest - requested) ? step : closest
      );

  return { theme, fontSize };
}

export async function getPrintSettings(): Promise<PrintSettings> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.PRINT_SETTINGS);
    const stored = result[STORAGE_KEYS.PRINT_SETTINGS];
    if (!stored || typeof stored !== 'object') {
      return { ...DEFAULT_PRINT_SETTINGS };
    }
    return validatePrintSettings(stored as Partial<PrintSettings>);
  } catch (error) {
    console.error('[Print] Failed to get print settings:', error);
    return { ...DEFAULT_PRINT_SETTINGS };
  }
}

export async function savePrintSettings(settings: Partial<PrintSettings>): Promise<void> {
  try {
    const current = await getPrintSettings();
    const validated = validatePrintSettings({ ...current, ...settings });
    await chrome.storage.local.set({ [STORAGE_KEYS.PRINT_SETTINGS]: validated });
  } catch (error) {
    console.error('[Print] Failed to save print settings:', error);
  }
}
