/**
 * Print Settings — persistence and validation
 *
 * Print appearance is deliberately separate from reading settings: the two
 * have different units (pt vs px), different valid ranges, and print is
 * missing a theme option that reading has.
 */

import type { PrintSettings, PrintTheme, PrintImageSize } from './types';
import {
  PRINT_FONT_SIZES,
  PRINT_LINE_HEIGHTS,
  PRINT_PARAGRAPH_SPACINGS,
  STORAGE_KEYS,
} from './constants';

const VALID_THEMES: readonly PrintTheme[] = ['light', 'sepia'];
const VALID_IMAGE_SIZES: readonly PrintImageSize[] = ['large', 'medium', 'small', 'none'];

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  theme: 'light',
  fontSize: 11,
  imageSize: 'large',
  lineHeight: 1.6,
  paragraphSpacing: 0.5,
};

/**
 * Snap a requested value onto the nearest offered step.
 *
 * A missing or corrupt value falls back rather than snapping, and a tie keeps
 * the earlier step — the rule the font size has always used, so the toolbar
 * never has to display a step it does not offer.
 */
function snapToStep(requested: unknown, steps: readonly number[], fallback: number): number {
  const value = typeof requested === 'number' ? requested : NaN;
  if (Number.isNaN(value)) {
    return fallback;
  }
  return steps.reduce((closest, step) =>
    Math.abs(step - value) < Math.abs(closest - value) ? step : closest
  );
}

/**
 * Fill a partial object with valid values, dropping anything unrecognized.
 */
export function validatePrintSettings(settings: Partial<PrintSettings>): PrintSettings {
  const theme = VALID_THEMES.includes(settings.theme as PrintTheme)
    ? (settings.theme as PrintTheme)
    : DEFAULT_PRINT_SETTINGS.theme;

  // Font size, line height and paragraph spacing all snap to an offered step,
  // so a hand-edited value still lands on one the toolbar can display.
  const fontSize = snapToStep(settings.fontSize, PRINT_FONT_SIZES, DEFAULT_PRINT_SETTINGS.fontSize);

  const imageSize = VALID_IMAGE_SIZES.includes(settings.imageSize as PrintImageSize)
    ? (settings.imageSize as PrintImageSize)
    : DEFAULT_PRINT_SETTINGS.imageSize;

  const lineHeight = snapToStep(
    settings.lineHeight,
    PRINT_LINE_HEIGHTS,
    DEFAULT_PRINT_SETTINGS.lineHeight
  );

  const paragraphSpacing = snapToStep(
    settings.paragraphSpacing,
    PRINT_PARAGRAPH_SPACINGS,
    DEFAULT_PRINT_SETTINGS.paragraphSpacing
  );

  return { theme, fontSize, imageSize, lineHeight, paragraphSpacing };
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
