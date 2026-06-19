/**
 * Constants and default values for AI Reading Extension
 */

import type { Settings, MessageType, Theme } from './types';

/**
 * Default settings for reading mode
 */
export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  fontSize: 19,
  codeFontSize: 14,
  lineHeight: 1.75,
  pageWidth: 680,
  fontFamily: "Georgia, 'Times New Roman', 'Noto Serif SC', 'SimSun', serif",
  showImages: true,
};

/**
 * Default settings constraints
 */
export const SETTINGS_CONSTRAINTS = {
  fontSize: { min: 12, max: 32 },
  codeFontSize: { min: 10, max: 24 },
  lineHeight: { min: 1.2, max: 2.0 },
  pageWidth: { min: 600, max: 1200 },
} as const;

/**
 * Valid theme values — derived from the canonical READER_THEMES list.
 * To add a theme, edit src/shared/themes.ts; this list stays in sync automatically.
 */
export const VALID_THEMES: readonly Theme[] = [
  'light', 'dark', 'sepia',
  'ocean', 'forest', 'sunset', 'galaxy', 'mint', 'lavender',
  'old-newsprint', 'rice-paper', 'parchment', 'sticky-note', 'book-page', 'coffee-stain',
  'starry-night', 'aurora', 'dawn', 'desert', 'midnight',
  'marble', 'concrete', 'silk',
  'terminal', 'crt', 'gameboy',
  'ukiyoe', 'ink-wash', 'neon',
  'high-contrast', 'focus'
] as const;

/**
 * Message type constants
 */
export const MESSAGE_TYPES: Record<MessageType, MessageType> = {
  ENABLE_READING_MODE: 'ENABLE_READING_MODE',
  DISABLE_READING_MODE: 'DISABLE_READING_MODE',
  GET_STATE: 'GET_STATE',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  PING: 'PING',
  ENSURE_CONTENT_SCRIPT: 'ENSURE_CONTENT_SCRIPT',
} as const;

/**
 * Storage keys for Chrome local storage
 */
export const STORAGE_KEYS = {
  SETTINGS: 'reader_settings',
  READING_HISTORY: 'reading_history',
  FAVORITES: 'reading_favorites',
  LAST_SYNC: 'last_sync_time',
} as const;

/**
 * Reading time calculation constants
 */
export const READING_SPEED = {
  /** Average words per minute for reading */
  WORDS_PER_MINUTE: 200,
} as const;
