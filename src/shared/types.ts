/**
 * Shared type definitions for AI Reading Extension
 * Simplified types for the refactored architecture
 */

import type { ThemeId } from './readerThemes';

/**
 * Theme options for reading mode
 * Three base themes: light, dark, sepia
 */
export type Theme = ThemeId;

/**
 * User settings for reading mode
 * Only the four most essential controls: theme, font size, line height, page width.
 */
export interface Settings {
  /** Visual theme */
  theme: Theme;
  /** Font size in pixels (12-32) */
  fontSize: number;
  /** Line height multiplier (1.2-2.0) */
  lineHeight: number;
  /** Page width in pixels (600-1200) */
  pageWidth: number;
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
  | 'ENSURE_CONTENT_SCRIPT'
  | 'EXPORT_PDF';

/**
 * Message structure for extension communication
 */
export interface Message<T = unknown> {
  type: MessageType;
  payload?: T;
}

/**
 * Data handed from the content script to the print page.
 * Passed through storage.session keyed by a one-shot token.
 */
export interface PrintPayload {
  title: string;
  byline: string | null;
  siteName: string | null;
  /** Sanitized article HTML from Readability */
  content: string;
  /** Original page URL, shown in the print footer */
  sourceUrl: string;
  /** Unix ms of export time */
  exportedAt: number;
}

/**
 * Paper themes for print output.
 * Dark is deliberately excluded — printing a dark theme wastes ink and
 * has poor contrast on paper.
 */
export type PrintTheme = 'light' | 'sepia';

/**
 * User-adjustable print appearance, persisted separately from reading settings.
 */
export interface PrintSettings {
  theme: PrintTheme;
  /** Body font size in points */
  fontSize: number;
}

/**
 * Content script state
 */
export interface ContentScriptState {
  /** Whether reading mode is currently active */
  isActive: boolean;
  /** Current user settings */
  settings: Settings;
}

/**
 * Response from content script state query
 */
export interface StateResponse {
  isActive: boolean;
  canExtract: boolean;
}