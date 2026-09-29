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
 * Serializes every mutation of `reading_history` within this context.
 *
 * Each mutation is a read-modify-write of the whole array, so two of them
 * interleaving — a fast re-read landing while a delete is still reading — both
 * read the same starting array and the second write silently discards the
 * first one's record. Chaining them onto one promise closes that window: every
 * mutation reads what the previous one wrote.
 *
 * It cannot help across tabs. Each tab runs its own copy of this module, so two
 * tabs reading two articles at the same time still race. Closing that needs a
 * different storage layout — one key per record plus a separately maintained
 * index — so that two writers never overwrite the same array. Until then this
 * is strictly better than no serialization, and never worse.
 */
let historyQueue: Promise<unknown> = Promise.resolve();

/**
 * Read the stored history, hand it to `fn`, and write back what it returns.
 *
 * The read goes straight to storage rather than through `getReadingHistory`,
 * which collapses "the key is absent" and "the read failed" into the same empty
 * array. Here that collapse is destructive: a transient read failure would hand
 * `fn` an empty list, and writing that back would replace 200 records with one
 * — while the caller saw a success. Letting the read throw instead leaves the
 * stored data untouched and surfaces as the `null`/`false` every caller already
 * handles.
 *
 * The chain itself must never reject, or one failed write would reject every
 * mutation queued behind it; each caller still receives its own outcome through
 * the promise this returns.
 */
function mutateHistory(fn: (history: ReadingRecord[]) => ReadingRecord[]): Promise<ReadingRecord[]> {
  const run = historyQueue.then(async () => {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.READING_HISTORY);
    const current = stored[STORAGE_KEYS.READING_HISTORY];
    const next = fn(Array.isArray(current) ? current : []);
    const trimmed = next.slice(0, MAX_HISTORY_ITEMS);
    await chrome.storage.local.set({
      [STORAGE_KEYS.READING_HISTORY]: trimmed,
    });
    // Hand back what was actually stored, not the untrimmed list, so a caller
    // can never be told about a record that trimming dropped.
    return trimmed;
  });

  historyQueue = run.catch(() => {});
  return run;
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
    const id = generateId(url, title);
    const now = Date.now();

    const history = await mutateHistory((stored) => {
      // Read the existing record inside the serialized section: an index taken
      // before the queue could already be stale by the time we write.
      const existingIndex = stored.findIndex(r => r.id === id);

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
        createdAt: existingIndex >= 0 ? stored[existingIndex].createdAt : now,
        lastReadAt: now,
        readCount: existingIndex >= 0 ? stored[existingIndex].readCount + 1 : 1,
      };

      if (existingIndex >= 0) {
        stored[existingIndex] = record;
      } else {
        stored.unshift(record);
      }

      return stored;
    });

    // Hand back the record out of the array that was written, rather than the
    // object built inside the closure: one object, two truths, is how a caller
    // ends up reporting a record that storage never received.
    return history.find(r => r.id === id) ?? null;
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
    await mutateHistory(history => history.filter(r => r.id !== recordId));

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
    await mutateHistory(() => []);

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
