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
 * Valid theme values (includes all default and custom themes)
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
  ocean: {
    background: '#e8f4f8',
    text: '#1a3a4a',
    accent: '#0077b6',
    border: '#90e0ef',
  },
  forest: {
    background: '#f0f7f4',
    text: '#1d3a2a',
    accent: '#2d6a4f',
    border: '#95d5b2',
  },
  sunset: {
    background: '#fff5f0',
    text: '#4a2c2a',
    accent: '#e85d04',
    border: '#ffccbc',
  },
  galaxy: {
    background: '#1a1a2e',
    text: '#e8e8e8',
    accent: '#7b2cbf',
    border: '#3c096c',
  },
  mint: {
    background: '#f0fff4',
    text: '#1a3a2a',
    accent: '#10b981',
    border: '#a7f3d0',
  },
  lavender: {
    background: '#f5f3ff',
    text: '#2e1065',
    accent: '#8b5cf6',
    border: '#ddd6fe',
  },
  'old-newsprint': {
    background: '#f4e4bc',
    text: '#3d3322',
    accent: '#8b7355',
    border: '#c9b896',
  },
  'rice-paper': {
    background: '#faf8f5',
    text: '#4a4a4a',
    accent: '#b8860b',
    border: '#e8e4dc',
  },
  parchment: {
    background: '#f5e6c8',
    text: '#4a3c2a',
    accent: '#8b4513',
    border: '#d4c4a8',
  },
  'sticky-note': {
    background: '#fff9c4',
    text: '#5d4037',
    accent: '#ff8f00',
    border: '#ffe082',
  },
  'book-page': {
    background: '#fdf8f0',
    text: '#2c2c2c',
    accent: '#8b0000',
    border: '#e0d5c5',
  },
  'coffee-stain': {
    background: '#f0e6d8',
    text: '#4a3c34',
    accent: '#6f4e37',
    border: '#c9b8a8',
  },
  'starry-night': {
    background: '#0a0a1a',
    text: '#c9d1e8',
    accent: '#ffd700',
    border: '#1a1a3a',
  },
  aurora: {
    background: '#0d1b2a',
    text: '#b8d4e3',
    accent: '#00ff87',
    border: '#1b3a4b',
  },
  dawn: {
    background: '#fef3e2',
    text: '#4a3728',
    accent: '#ff7b54',
    border: '#f5dcc4',
  },
  desert: {
    background: '#f5e6d3',
    text: '#5c4033',
    accent: '#c4956a',
    border: '#dcc8b0',
  },
  midnight: {
    background: '#1a1a2e',
    text: '#a8b2d1',
    accent: '#64ffda',
    border: '#2d2d4a',
  },
  marble: {
    background: '#f8f8f8',
    text: '#2d2d2d',
    accent: '#8e8e8e',
    border: '#e0e0e0',
  },
  concrete: {
    background: '#e5e5e5',
    text: '#333333',
    accent: '#6b6b6b',
    border: '#cccccc',
  },
  silk: {
    background: '#faf5f0',
    text: '#4a4045',
    accent: '#c9a8b0',
    border: '#e8e0dc',
  },
  terminal: {
    background: '#0d1117',
    text: '#58a6ff',
    accent: '#3fb950',
    border: '#21262d',
  },
  crt: {
    background: '#1a1a1a',
    text: '#33ff33',
    accent: '#ffaa00',
    border: '#2d2d2d',
  },
  gameboy: {
    background: '#9bbc0f',
    text: '#0f380f',
    accent: '#306230',
    border: '#8bac0f',
  },
  ukiyoe: {
    background: '#f5efe5',
    text: '#2d2d2d',
    accent: '#e63946',
    border: '#d4c4b0',
  },
  'ink-wash': {
    background: '#f4f1eb',
    text: '#1a1a1a',
    accent: '#8b0000',
    border: '#d4cfc5',
  },
  neon: {
    background: '#0a0a0f',
    text: '#ffffff',
    accent: '#ff00ff',
    border: '#ff00ff',
  },
  'high-contrast': {
    background: '#000000',
    text: '#ffff00',
    accent: '#00ffff',
    border: '#ffffff',
  },
  focus: {
    background: '#fafafa',
    text: '#374151',
    accent: '#9ca3af',
    border: '#e5e7eb',
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
