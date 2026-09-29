/**
 * Reading History Module
 * Records articles users have read
 */

import { STORAGE_KEYS, READING_SPEED } from './constants';

export interface ReadingRecord {
  id: string;
  url: string;
  title: string;
  excerpt: string;
  byline: string;
  siteName: string;
  length: number;
  readingTime: number;
  theme: string;
  fontSize: number;
  createdAt: number;
  lastReadAt: number;
  readCount: number;
}

const MAX_HISTORY_ITEMS = 200;

/** Marks an id as a reading-record id when reading raw storage dumps. */
const ID_PREFIX = 'r-';

/**
 * Generate a stable id for a reading record.
 *
 * Pure and deterministic: the same (url, title) always yields the same id, so
 * re-reading an article updates its record instead of duplicating it.
 *
 * `>>> 0` normalizes the 32-bit signed hash to its unsigned value. Two
 * consequences worth keeping:
 * - The id is always a non-negative base36 string.
 * - Mirror-image hashes stop colliding. `Math.abs(hash)` maps both +5 and -5 to
 *   the id "5", which would silently merge two unrelated articles into one
 *   history entry and inflate its readCount. Collisions remain possible (this
 *   is a 32-bit hash used as a local cache key), but only for genuinely
 *   different hash values, not for the same value with an opposite sign.
 */
export function generateId(url: string, title: string): string {
  const str = `${url}_${title}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `${ID_PREFIX}${(hash >>> 0).toString(36)}`;
}

/**
 * Resolve a URL's hostname without ever throwing.
 *
 * `new URL` throws on anything unparsable — a relative path, or an exotic
 * `location.href`. Losing the hostname is a cosmetic problem; losing the whole
 * reading record because of it is not, so a failure degrades to an empty
 * site name and the record is still written.
 */
function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Calculate reading time in minutes from a word count.
 *
 * `wordCount` is a real word count (`ExtractedContent.wordCount`, which
 * `addToHistory` receives as `content.length`), so it is divided by the shared
 * reading speed exactly once. Dividing again on the way in is what used to
 * make a 2000-word article report 2 minutes instead of 10.
 *
 * The formula and the 1-minute floor are deliberately identical to
 * `calculateReadTime` in `src/content/extractor.ts` — the reader UI shows the
 * extractor's estimate and the history record stores this one, and they must
 * never disagree. Both read `READING_SPEED.WORDS_PER_MINUTE` from
 * `src/shared/constants.ts` so the two paths cannot drift.
 */
function calculateReadingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / READING_SPEED.WORDS_PER_MINUTE));
}

/**
 * Get reading history from storage
 */
export async function getReadingHistory(): Promise<ReadingRecord[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.READING_HISTORY);
    const history = result[STORAGE_KEYS.READING_HISTORY];
    return Array.isArray(history) ? history : [];
  } catch (error) {
    console.error('[Reader] Failed to get reading history:', error);
    return [];
  }
}

/**
 * Add or update a reading record.
 *
 * `content.length` is a **word count** (`ExtractedContent.wordCount`), not a
 * character count — `readingTime` is derived from it. The record is always
 * written: only a storage failure produces `null`.
 *
 * Returns the stored record, or `null` if the write failed. The caller in
 * `src/content/index.ts` ignores the return value, so failures are logged here
 * and never thrown at the reading flow.
 */
export async function addToHistory(
  url: string,
  title: string,
  content: {
    excerpt?: string;
    byline?: string;
    siteName?: string;
    /** Word count of the article, as reported by the extractor. */
    length?: number;
  },
  settings?: {
    theme?: string;
    fontSize?: number;
  }
): Promise<ReadingRecord | null> {
  try {
    const history = await getReadingHistory();
    const id = generateId(url, title);
    const now = Date.now();
    
    // Check if already exists
    const existingIndex = history.findIndex(r => r.id === id);
    
    const record: ReadingRecord = {
      id,
      url,
      title: title || 'Untitled',
      excerpt: content.excerpt || '',
      byline: content.byline || '',
      siteName: content.siteName || getHostname(url),
      length: content.length || 0,
      readingTime: calculateReadingTime(content.length || 0),
      theme: settings?.theme || 'light',
      fontSize: settings?.fontSize || 18,
      createdAt: existingIndex >= 0 ? history[existingIndex].createdAt : now,
      lastReadAt: now,
      readCount: existingIndex >= 0 ? history[existingIndex].readCount + 1 : 1,
    };

    if (existingIndex >= 0) {
      history[existingIndex] = record;
    } else {
      history.unshift(record);
    }

    // Limit history size
    const trimmed = history.slice(0, MAX_HISTORY_ITEMS);
    
    await chrome.storage.local.set({
      [STORAGE_KEYS.READING_HISTORY]: trimmed,
    });

    return record;
  } catch (error) {
    console.error('[Reader] Failed to add to history:', error);
    return null;
  }
}

/**
 * Delete a reading record
 */
export async function deleteFromHistory(recordId: string): Promise<boolean> {
  try {
    const history = await getReadingHistory();
    const filtered = history.filter(r => r.id !== recordId);
    
    await chrome.storage.local.set({
      [STORAGE_KEYS.READING_HISTORY]: filtered,
    });
    
    return true;
  } catch (error) {
    console.error('[Reader] Failed to delete from history:', error);
    return false;
  }
}

/**
 * Clear all reading history
 */
export async function clearHistory(): Promise<boolean> {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.READING_HISTORY]: [],
    });
    return true;
  } catch (error) {
    console.error('[Reader] Failed to clear history:', error);
    return false;
  }
}

/**
 * Get reading statistics
 */
export async function getReadingStats(): Promise<{
  totalArticles: number;
  totalReadingTime: number;
  avgReadingTime: number;
  thisWeek: number;
  sites: Record<string, number>;
}> {
  const history = await getReadingHistory();
  
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  
  const sites: Record<string, number> = {};
  let totalReadingTime = 0;
  let thisWeek = 0;

  history.forEach(r => {
    sites[r.siteName] = (sites[r.siteName] || 0) + 1;
    totalReadingTime += r.readingTime;
    if (r.lastReadAt > weekAgo) {
      thisWeek++;
    }
  });

  return {
    totalArticles: history.length,
    totalReadingTime,
    avgReadingTime: history.length > 0 ? Math.round(totalReadingTime / history.length) : 0,
    thisWeek,
    sites,
  };
}
