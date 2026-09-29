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
  EXPORT_PDF: 'EXPORT_PDF',
} as const;

/**
 * Storage keys for Chrome local storage
 */
export const STORAGE_KEYS = {
  SETTINGS: 'reader_settings',
  READING_HISTORY: 'reading_history',
  PRINT_SETTINGS: 'print_settings',
  /** Prefix for one-shot payloads handed to the print page */
  PRINT_PAYLOAD: 'print_payload_',
  LAST_SYNC: 'last_sync_time',
} as const;

/**
 * A4 geometry. The print stylesheet derives its measurements from these so
 * the preview column and the printed page cannot drift apart.
 */
export const A4 = {
  /** Page width in mm */
  width: 210,
  /** Page height in mm */
  height: 297,
  /** Top/bottom margin in mm */
  marginVertical: 20,
  /** Left/right margin in mm */
  marginHorizontal: 18,
  /** Printable width: 210 - 18*2 = 174mm */
  get contentWidth(): number {
    return A4.width - A4.marginHorizontal * 2;
  },
  /** Printable height: 297 - 20*2 = 257mm */
  get contentHeight(): number {
    return A4.height - A4.marginVertical * 2;
  },
} as const;

/**
 * Font sizes offered in the print toolbar, in points.
 */
export const PRINT_FONT_SIZES = [9, 10.5, 11, 12, 13] as const;

/**
 * Code blocks at or above this line count may break across pages.
 * Shorter ones are kept intact. Without this split, a long block forced to
 * avoid page breaks overflows and the browser silently drops its tail.
 */
export const CODE_BLOCK_BREAK_THRESHOLD_LINES = 30;

/**
 * How tall a single image may print, in mm.
 *
 * A figure never splits across pages, so one that does not fit the space
 * left on the current page is pushed entirely to the next page — and the
 * leftover space stays blank. Capping image height bounds that blank gap;
 * at nearly a full page (257mm) the gap could be nearly a full page.
 */
export const MAX_IMAGE_HEIGHT_MM = 150;

/**
 * Blocks taller than half the printable page are allowed to break across
 * pages instead of being kept whole. Forcing a half-page-plus block to stay
 * intact can strand most of a page as blank space. Applied by measuring the
 * rendered height on the print page (see src/print/markBreaks.ts).
 */
export const ALLOW_BREAK_THRESHOLD_MM = A4.contentHeight / 2;

/**
 * Reading time calculation constants
 */
export const READING_SPEED = {
  /** Average words per minute for reading */
  WORDS_PER_MINUTE: 200,
} as const;