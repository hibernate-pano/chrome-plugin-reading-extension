/**
 * Favorites / Read Later Module
 * Save articles for offline reading
 */

import { STORAGE_KEYS } from './constants';

export interface FavoriteRecord {
  id: string;
  url: string;
  title: string;
  excerpt: string;
  byline: string;
  siteName: string;
  content: string;
  length: number;
  readingTime: number;
  savedAt: number;
  tags: string[];
}

/**
 * Generate unique ID
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
 * Calculate reading time
 */
function calculateReadingTime(wordCount: number): number {
  return Math.ceil(wordCount / 200);
}

/**
 * Get all favorites
 */
export async function getFavorites(): Promise<FavoriteRecord[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.FAVORITES);
    const favorites = result[STORAGE_KEYS.FAVORITES];
    return Array.isArray(favorites) ? favorites : [];
  } catch (error) {
    console.error('[Reader] Failed to get favorites:', error);
    return [];
  }
}

/**
 * Add article to favorites
 */
export async function addToFavorites(
  url: string,
  title: string,
  content: {
    excerpt?: string;
    byline?: string;
    siteName?: string;
    content?: string;
    length?: number;
  },
  tags: string[] = []
): Promise<FavoriteRecord | null> {
  try {
    const favorites = await getFavorites();
    const id = generateId(url, title);
    
    // Check if already exists
    if (favorites.some(f => f.id === id)) {
      return null;
    }

    const record: FavoriteRecord = {
      id,
      url,
      title: title || 'Untitled',
      excerpt: content.excerpt || '',
      byline: content.byline || '',
      siteName: content.siteName || new URL(url).hostname,
      content: content.content || '',
      length: content.length || 0,
      readingTime: calculateReadingTime((content.length || 0) / 6),
      savedAt: Date.now(),
      tags,
    };

    favorites.unshift(record);
    
    await chrome.storage.local.set({
      [STORAGE_KEYS.FAVORITES]: favorites,
    });

    return record;
  } catch (error) {
    console.error('[Reader] Failed to add to favorites:', error);
    return null;
  }
}

/**
 * Remove article from favorites
 */
export async function removeFromFavorites(recordId: string): Promise<boolean> {
  try {
    const favorites = await getFavorites();
    const filtered = favorites.filter(f => f.id !== recordId);
    
    await chrome.storage.local.set({
      [STORAGE_KEYS.FAVORITES]: filtered,
    });
    
    return true;
  } catch (error) {
    console.error('[Reader] Failed to remove from favorites:', error);
    return false;
  }
}

/**
 * Check if URL is favorited
 */
export async function isFavorited(url: string, title: string): Promise<boolean> {
  const favorites = await getFavorites();
  const id = generateId(url, title);
  return favorites.some(f => f.id === id);
}

/**
 * Update favorite tags
 */
export async function updateFavoriteTags(recordId: string, tags: string[]): Promise<boolean> {
  try {
    const favorites = await getFavorites();
    const index = favorites.findIndex(f => f.id === recordId);
    
    if (index >= 0) {
      favorites[index].tags = tags;
      await chrome.storage.local.set({
        [STORAGE_KEYS.FAVORITES]: favorites,
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Reader] Failed to update favorite tags:', error);
    return false;
  }
}
