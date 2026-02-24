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
 * Custom themes (Pro feature)
 */
export const CUSTOM_THEMES = {
  ocean: {
    name: '海洋',
    name_en: 'Ocean',
    colors: {
      background: '#e8f4f8',
      text: '#1a3a4a',
      accent: '#0077b6',
      border: '#90e0ef',
    }
  },
  forest: {
    name: '森林',
    name_en: 'Forest',
    colors: {
      background: '#f0f7f4',
      text: '#1d3a2a',
      accent: '#2d6a4f',
      border: '#95d5b2',
    }
  },
  sunset: {
    name: '日落',
    name_en: 'Sunset',
    colors: {
      background: '#fff5f0',
      text: '#4a2c2a',
      accent: '#e85d04',
      border: '#ffccbc',
    }
  },
  galaxy: {
    name: '星河',
    name_en: 'Galaxy',
    colors: {
      background: '#1a1a2e',
      text: '#e8e8e8',
      accent: '#7b2cbf',
      border: '#3c096c',
    }
  },
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
