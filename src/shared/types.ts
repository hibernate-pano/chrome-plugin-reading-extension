/**
 * Shared type definitions for AI Reading Extension
 * Simplified types for the refactored architecture
 */

/**
 * Theme options for reading mode
 * Includes default themes and custom themes from EXTRA_THEMES
 */
export type Theme = 'light' | 'dark' | 'sepia' | 'ocean' | 'forest' | 'sunset' | 'galaxy' | 'mint' | 'lavender' | 'old-newsprint' | 'rice-paper' | 'parchment' | 'sticky-note' | 'book-page' | 'coffee-stain' | 'starry-night' | 'aurora' | 'dawn' | 'desert' | 'midnight' | 'marble' | 'concrete' | 'silk' | 'terminal' | 'crt' | 'gameboy' | 'ukiyoe' | 'ink-wash' | 'neon' | 'high-contrast' | 'focus';

/**
 * User settings for reading mode
 * Simplified from the original UserSettings interface
 */
export interface Settings {
  /** Visual theme (light/dark/sepia) */
  theme: Theme;
  /** Font size in pixels (12-32) */
  fontSize: number;
  /** Code block font size in pixels (10-24) */
  codeFontSize: number;
  /** Line height multiplier (1.2-2.0) */
  lineHeight: number;
  /** Page width in pixels (600-1200) */
  pageWidth: number;
  /** CSS font-family value */
  fontFamily: string;
  /** Whether to show images in the article */
  showImages: boolean;
}

/**
 * Extracted content from a webpage
 */
export interface ExtractedContent {
  /** Article title */
  title: string;
  /** Sanitized HTML content */
  content: string;
  /** Plain text content for accessibility */
  textContent: string;
  /** First ~200 characters excerpt */
  excerpt: string;
  /** Author name if available */
  byline: string | null;
  /** Website name if available */
  siteName: string | null;
  /** Total word count */
  wordCount: number;
  /** Estimated reading time in minutes */
  estimatedReadTime: number;
}

/**
 * Result of content extraction operation
 */
export type ExtractionResult =
  | { success: true; data: ExtractedContent }
  | { success: false; error: string };

/**
 * Message types for communication between extension components
 */
export type MessageType =
  | 'ENABLE_READING_MODE'
  | 'DISABLE_READING_MODE'
  | 'GET_STATE'
  | 'UPDATE_SETTINGS'
  | 'PING'
  | 'ENSURE_CONTENT_SCRIPT';

/**
 * Message structure for extension communication
 */
export interface Message<T = unknown> {
  type: MessageType;
  payload?: T;
}

/**
 * Content script state
 */
export interface ContentScriptState {
  /** Whether reading mode is currently active */
  isActive: boolean;
  /** Current user settings */
  settings: Settings;
  /** Original page content (for restoration) */
  originalContent: string | null;
}

/**
 * Response from content script state query
 */
export interface StateResponse {
  isActive: boolean;
  canExtract: boolean;
}
