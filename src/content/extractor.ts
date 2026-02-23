/**
 * Content Extractor for AI Reading Extension
 * Simplified extractor using Mozilla Readability with memory caching
 */

import { Readability } from '@mozilla/readability';
import type { ExtractedContent, ExtractionResult } from '../shared/types';
import { READING_SPEED } from '../shared/constants';

/**
 * Simple in-memory cache for extracted content
 * Key: URL, Value: ExtractedContent
 */
const contentCache = new Map<string, ExtractedContent>();

/**
 * Calculate word count from text content
 */
function countWords(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  
  // Handle both CJK and Latin text
  const latinWords = text.match(/[a-zA-Z]+/g)?.length ?? 0;
  const cjkChars = text.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g)?.length ?? 0;
  
  return latinWords + Math.ceil(cjkChars / 2);
}

/**
 * Strip inline style attributes from HTML so our reader CSS takes full control
 */
function stripInlineStyles(html: string): string {
  return html
    .replace(/\s+style="[^"]*"/gi, '')
    .replace(/\s+style='[^']*'/gi, '');
}

/**
 * Calculate estimated reading time in minutes
 */
function calculateReadTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / READING_SPEED.WORDS_PER_MINUTE));
}

/**
 * Generate excerpt from text content
 */
function generateExcerpt(text: string, maxLength: number = 200): string {
  if (!text) return '';
  
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  
  // Try to cut at a sentence boundary
  const truncated = cleaned.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastQuestion = truncated.lastIndexOf('?');
  const lastExclaim = truncated.lastIndexOf('!');
  
  const cutPoint = Math.max(lastPeriod, lastQuestion, lastExclaim);
  
  if (cutPoint > maxLength * 0.5) {
    return truncated.substring(0, cutPoint + 1);
  }
  
  return truncated + '...';
}

/**
 * Clone document for safe extraction (avoids modifying original)
 */
function cloneDocument(doc: Document): Document {
  return doc.cloneNode(true) as Document;
}

/**
 * Extract content from a document using Mozilla Readability
 * 
 * @param doc - The document to extract content from
 * @param url - Optional URL for caching (defaults to current location)
 * @returns ExtractionResult with success/failure status
 */
export function extractContent(
  doc: Document,
  url?: string
): ExtractionResult {
  const cacheKey = url ?? doc.location?.href ?? '';
  
  // Check cache first
  if (cacheKey && contentCache.has(cacheKey)) {
    return {
      success: true,
      data: contentCache.get(cacheKey)!,
    };
  }
  
  try {
    // Validate document
    if (!doc || !doc.body) {
      return {
        success: false,
        error: 'Invalid document: missing body element',
      };
    }
    
    // Clone document to avoid modifying original
    const docClone = cloneDocument(doc);
    
    // Use Readability to extract content
    const reader = new Readability(docClone, {
      charThreshold: 500,
      classesToPreserve: ['code', 'pre', 'highlight', 'language-'],
      keepClasses: false,
    });

    const article = reader.parse();

    if (!article) {
      return {
        success: false,
        error: 'Failed to extract content: Readability returned null',
      };
    }

    if (!article.content || article.content.trim().length < 50) {
      return {
        success: false,
        error: 'Extracted content is too short or empty',
      };
    }

    // Strip inline styles — let our reader CSS handle all styling
    const cleanContent = stripInlineStyles(article.content);
    
    // Build extracted content object
    const textContent = article.textContent ?? '';
    const wordCount = countWords(textContent);
    
    const extractedContent: ExtractedContent = {
      title: article.title || doc.title || 'Untitled',
      content: cleanContent,
      textContent: textContent,
      excerpt: generateExcerpt(article.excerpt || textContent),
      byline: article.byline || null,
      siteName: article.siteName || null,
      wordCount,
      estimatedReadTime: calculateReadTime(wordCount),
    };
    
    // Cache the result
    if (cacheKey) {
      contentCache.set(cacheKey, extractedContent);
    }
    
    return {
      success: true,
      data: extractedContent,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Reader] Content extraction failed:', errorMessage);
    
    return {
      success: false,
      error: `Content extraction failed: ${errorMessage}`,
    };
  }
}

/**
 * Clear the content cache
 */
export function clearCache(): void {
  contentCache.clear();
}

/**
 * Remove a specific URL from the cache
 */
export function invalidateCache(url: string): boolean {
  return contentCache.delete(url);
}

/**
 * Get the current cache size
 */
export function getCacheSize(): number {
  return contentCache.size;
}

/**
 * Check if a URL is cached
 */
export function isCached(url: string): boolean {
  return contentCache.has(url);
}
