/**
 * Reading History Module
 * Records articles users have read
 */

import { STORAGE_KEYS } from './constants';

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

/**
 * Generate unique ID for a reading record
 */
function generateId(url: string, title: string): string {
  const str = `${url}_${title}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Calculate reading time in minutes
 */
function calculateReadingTime(wordCount: number): number {
  const WORDS_PER_MINUTE = 200;
  return Math.ceil(wordCount / WORDS_PER_MINUTE);
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
 * Add or update a reading record
 */
export async function addToHistory(
  url: string,
  title: string,
  content: {
    excerpt?: string;
    byline?: string;
    siteName?: string;
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
      siteName: content.siteName || new URL(url).hostname,
      length: content.length || 0,
      readingTime: calculateReadingTime((content.length || 0) / 6), // Approximate
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
