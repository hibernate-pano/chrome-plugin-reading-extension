/**
 * Constants and default values for AI Reading Extension
 */

import type { Settings, MessageType, Theme } from './types';

/**
 * Default settings for reading mode
 */
export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  fontSize: 18,
  lineHeight: 1.6,
  pageWidth: 800,
  fontFamily: 'system-ui',
};

/**
 * Settings constraints
 */
export const SETTINGS_CONSTRAINTS = {
  fontSize: { min: 12, max: 32 },
  lineHeight: { min: 1.2, max: 2.0 },
  pageWidth: { min: 600, max: 1200 },
} as const;

/**
 * Valid theme values
 */
export const VALID_THEMES: readonly Theme[] = ['light', 'dark', 'sepia'] as const;

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
 * Theme color mappings for CSS variables
 */
export const THEME_COLORS: Record<Theme, {
  background: string;
  text: string;
  accent: string;
  border: string;
}> = {
  light: {
    background: '#ffffff',
    text: '#1a1a1a',
    accent: '#0066cc',
    border: '#e5e5e5',
  },
  dark: {
    background: '#1a1a1a',
    text: '#e5e5e5',
    accent: '#66b3ff',
    border: '#333333',
  },
  sepia: {
    background: '#f4ecd8',
    text: '#5c4b37',
    accent: '#8b6914',
    border: '#d4c4a8',
  },
} as const;

/**
 * Storage keys for Chrome local storage
 */
export const STORAGE_KEYS = {
  SETTINGS: 'reader_settings',
} as const;

/**
 * Reading time calculation constants
 */
export const READING_SPEED = {
  /** Average words per minute for reading */
  WORDS_PER_MINUTE: 200,
} as const;
