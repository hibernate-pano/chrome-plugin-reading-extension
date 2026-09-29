/**
 * Storage module for AI Reading Extension
 * Simplified wrapper around Chrome Storage API with type safety
 */

import type { Settings, Theme } from './types';
import { DEFAULT_SETTINGS, SETTINGS_CONSTRAINTS, STORAGE_KEYS } from './constants';
import { READER_THEMES } from './readerThemes';

const VALID_THEME_IDS: readonly Theme[] = READER_THEMES.map((t) => t.id);

/**
 * Clamp a number between min and max values
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Whether a value is a number clamp() can actually work with.
 *
 * `typeof NaN === 'number'` and every comparison against NaN is false, so
 * `clamp(NaN, ...)` returns NaN and a corrupt stored value would render the
 * reader with `font-size: NaNpx`. Infinities are still accepted on purpose:
 * they clamp to the nearest bound.
 */
function isClampable(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

/**
 * Validate and normalize settings object
 * Returns a complete Settings object with all invalid values replaced by defaults.
 * Unknown / deprecated fields from older versions are silently dropped.
 */
export function validateSettings(settings: Partial<Settings>): Settings {
  const theme = VALID_THEME_IDS.includes(settings.theme as Theme)
    ? (settings.theme as Theme)
    : DEFAULT_SETTINGS.theme;

  const fontSize = isClampable(settings.fontSize)
    ? clamp(settings.fontSize, SETTINGS_CONSTRAINTS.fontSize.min, SETTINGS_CONSTRAINTS.fontSize.max)
    : DEFAULT_SETTINGS.fontSize;

  const lineHeight = isClampable(settings.lineHeight)
    ? clamp(settings.lineHeight, SETTINGS_CONSTRAINTS.lineHeight.min, SETTINGS_CONSTRAINTS.lineHeight.max)
    : DEFAULT_SETTINGS.lineHeight;

  const pageWidth = isClampable(settings.pageWidth)
    ? clamp(settings.pageWidth, SETTINGS_CONSTRAINTS.pageWidth.min, SETTINGS_CONSTRAINTS.pageWidth.max)
    : DEFAULT_SETTINGS.pageWidth;

  return { theme, fontSize, lineHeight, pageWidth };
}

/**
 * Get all settings from Chrome local storage
 * Returns validated settings with defaults for missing values
 */
export async function getSettings(): Promise<Settings> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const stored = result[STORAGE_KEYS.SETTINGS];

    if (!stored || typeof stored !== 'object') {
      return { ...DEFAULT_SETTINGS };
    }

    return validateSettings(stored as Partial<Settings>);
  } catch (error) {
    console.error('[Reader] Failed to get settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save settings to Chrome local storage
 * Validates and merges with existing settings
 */
export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  try {
    const current = await getSettings();
    const merged = { ...current, ...settings };
    const validated = validateSettings(merged);

    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: validated,
    });
  } catch (error) {
    console.error('[Reader] Failed to save settings:', error);
    throw error;
  }
}

/**
 * Get a single setting value
 */
export async function getSetting<K extends keyof Settings>(key: K): Promise<Settings[K]> {
  const settings = await getSettings();
  return settings[key];
}

/**
 * Save a single setting value
 */
export async function saveSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K]
): Promise<void> {
  await saveSettings({ [key]: value });
}

/**
 * Reset all settings to defaults
 */
export async function resetSettings(): Promise<void> {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: { ...DEFAULT_SETTINGS },
    });
  } catch (error) {
    console.error('[Reader] Failed to reset settings:', error);
    throw error;
  }
}