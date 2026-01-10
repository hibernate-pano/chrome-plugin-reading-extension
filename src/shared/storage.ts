/**
 * Storage module for AI Reading Extension
 * Simplified wrapper around Chrome Storage API with type safety
 */

import type { Settings } from './types';
import {
  DEFAULT_SETTINGS,
  SETTINGS_CONSTRAINTS,
  VALID_THEMES,
  STORAGE_KEYS,
} from './constants';

/**
 * Clamp a number between min and max values
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Validate and normalize settings object
 * Returns a complete Settings object with all invalid values replaced by defaults
 */
export function validateSettings(settings: Partial<Settings>): Settings {
  const theme = VALID_THEMES.includes(settings.theme as typeof VALID_THEMES[number])
    ? settings.theme!
    : DEFAULT_SETTINGS.theme;

  const fontSize = typeof settings.fontSize === 'number'
    ? clamp(settings.fontSize, SETTINGS_CONSTRAINTS.fontSize.min, SETTINGS_CONSTRAINTS.fontSize.max)
    : DEFAULT_SETTINGS.fontSize;

  const lineHeight = typeof settings.lineHeight === 'number'
    ? clamp(settings.lineHeight, SETTINGS_CONSTRAINTS.lineHeight.min, SETTINGS_CONSTRAINTS.lineHeight.max)
    : DEFAULT_SETTINGS.lineHeight;

  const pageWidth = typeof settings.pageWidth === 'number'
    ? clamp(settings.pageWidth, SETTINGS_CONSTRAINTS.pageWidth.min, SETTINGS_CONSTRAINTS.pageWidth.max)
    : DEFAULT_SETTINGS.pageWidth;

  const fontFamily = typeof settings.fontFamily === 'string' && settings.fontFamily.trim()
    ? settings.fontFamily
    : DEFAULT_SETTINGS.fontFamily;

  return {
    theme,
    fontSize,
    lineHeight,
    pageWidth,
    fontFamily,
  };
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
