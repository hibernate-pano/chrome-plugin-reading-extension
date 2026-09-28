/**
 * Constants and default values for AI Reading Extension
 * Minimal: 4 settings, 6 message types, 1 storage namespace.
 */

import type { Settings, MessageType } from './types';

/**
 * Default settings — tuned for clean, comfortable reading.
 */
export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  fontSize: 19,
  lineHeight: 1.75,
  pageWidth: 680,
};

/**
 * Settings constraints — used by the slider UI and the validator.
 */
export const SETTINGS_CONSTRAINTS = {
  fontSize: { min: 12, max: 32 },
  lineHeight: { min: 1.2, max: 2.0 },
  pageWidth: { min: 600, max: 1200 },
} as const;

/**
 * Message type constants — used by both ends of every chrome.runtime message.
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
  LAST_SYNC: 'last_sync_time',
} as const;

/**
 * Reading time calculation constants
 */
export const READING_SPEED = {
  /** Average words per minute for reading */
  WORDS_PER_MINUTE: 200,
} as const;