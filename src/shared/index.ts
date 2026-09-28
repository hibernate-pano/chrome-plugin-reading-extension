/**
 * Shared modules for AI Reading Extension
 */

// Types
export type {
  Theme,
  Settings,
  ExtractedContent,
  ExtractionResult,
  MessageType,
  Message,
  ContentScriptState,
  StateResponse,
} from './types';

// Constants
export {
  DEFAULT_SETTINGS,
  SETTINGS_CONSTRAINTS,
  MESSAGE_TYPES,
  STORAGE_KEYS,
  READING_SPEED,
} from './constants';

// Storage
export {
  validateSettings,
  getSettings,
  saveSettings,
  getSetting,
  saveSetting,
  resetSettings,
} from './storage';

// Themes
export { READER_THEMES, getReaderThemeById, type ReaderTheme, type ThemeId } from './readerThemes';