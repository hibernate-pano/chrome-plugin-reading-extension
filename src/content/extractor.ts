/**
 * Content Extractor for AI Reading Extension
 * Simplified extractor using Mozilla Readability with memory caching
 */

import { Readability } from '@mozilla/readability';
import type { ExtractedContent, ExtractionResult } from '../shared/types';
import { READING_SPEED } from '../shared/constants';
import { sanitizeArticleHtml } from '../shared/sanitize';
import { addCjkSpacing, addCjkSpacingToHtml } from '../shared/cjkSpacing';

/**
 * Simple in-memory cache for extracted content
 * Key: URL, Value: ExtractedContent
 */
const contentCache = new Map<string, ExtractedContent>();

/**
 * Whether sanitized article markup still carries readable text.
 *
 * Counts the text a reader would actually see, ignoring leftover empty
 * elements. A `<div></div>` left behind by the sanitizer is markup without
 * content; `<p>Short</p>` is a short article. Both are "non-empty html", but
 * only one is worth opening.
 */
function hasVisibleText(html: string): boolean {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').trim().length > 0;
}

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

    // Readability output is page-controlled, and this string is later handed
    // to the reader view via dangerouslySetInnerHTML and to the print page —
    // so sanitize it once, here, before it is cached or returned. This also
    // replaces the old stripInlineStyles pass: the sanitizer drops `style`
    // outright, so our reader CSS keeps full control of the layout.
    const cleanContent = addCjkSpacingToHtml(sanitizeArticleHtml(article.content));

    // Gate on the SANITIZED content, and on its TEXT rather than its markup.
    //
    // The old gate measured the raw html, where Readability's own wrapper
    // (`<div id="readability-page-1" class="page">`, ~47 chars) was most of
    // what it counted — so a one-word page cleared it for the wrong reason. The
    // same flaw let a page whose content lives entirely inside a <form> or an
    // inline <style> clear the gate and then sanitize down to nothing: a reader
    // that renders blank and reports success. Text-based gating separates the
    // two cases honestly — leftover empty markup carries no text, a short
    // article does.
    if (!hasVisibleText(cleanContent)) {
      return {
        success: false,
        error: 'Extracted content is too short or empty',
      };
    }

    // Build extracted content object.
    //
    // Every field that reaches a reader gets the same spacing pass as the body:
    // the title renders in the reader header and the print header, the excerpt
    // in the history list. Skipping them would make the heading and the first
    // paragraph disagree about how `React18` is set.
    const textContent = addCjkSpacing(article.textContent ?? '');
    const wordCount = countWords(textContent);
    
    const extractedContent: ExtractedContent = {
      title: addCjkSpacing(article.title || doc.title || 'Untitled'),
      content: cleanContent,
      textContent: textContent,
      excerpt: generateExcerpt(addCjkSpacing(article.excerpt) || textContent),
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
