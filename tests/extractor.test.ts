/**
 * Unit tests for Content Extractor
 * Tests core extraction functionality and caching behavior
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractContent,
  clearCache,
  getCacheSize,
  isCached,
  invalidateCache,
} from '../src/content/extractor';

// Helper to create a minimal document for testing
function createTestDocument(html: string, title: string = 'Test Page'): Document {
  const doc = document.implementation.createHTMLDocument(title);
  doc.body.innerHTML = html;
  return doc;
}

describe('Content Extractor', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('extractContent', () => {
    it('should extract content from a valid article', () => {
      const html = `
        <article>
          <h1>Test Article Title</h1>
          <p>This is a test paragraph with enough content to pass the minimum threshold. 
             We need to add more text here to ensure the extraction succeeds.
             Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
             Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
          <p>Another paragraph with more content to make the article substantial enough
             for Readability to consider it valid content worth extracting.</p>
        </article>
      `;
      
      const doc = createTestDocument(html, 'Test Article');
      const result = extractContent(doc, 'https://example.com/article');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBeTruthy();
        expect(result.data.content).toBeTruthy();
        expect(result.data.wordCount).toBeGreaterThan(0);
        expect(result.data.estimatedReadTime).toBeGreaterThanOrEqual(1);
      }
    });

    it('should return error for empty document', () => {
      const doc = createTestDocument('');
      const result = extractContent(doc, 'https://example.com/empty');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeTruthy();
      }
    });

    it('should handle document with minimal content gracefully', () => {
      // Readability may still extract very short content
      // The extractor should handle this case without crashing
      const html = '<p>Short</p>';
      const doc = createTestDocument(html);
      const result = extractContent(doc, 'https://example.com/short');
      
      // Either succeeds with minimal content or fails gracefully
      expect(typeof result.success).toBe('boolean');
      if (result.success) {
        expect(result.data.content).toBeTruthy();
      } else {
        expect(result.error).toBeTruthy();
      }
    });
  });

  describe('caching', () => {
    it('should cache extracted content', () => {
      const html = `
        <article>
          <h1>Cached Article</h1>
          <p>This is a test paragraph with enough content to pass the minimum threshold. 
             We need to add more text here to ensure the extraction succeeds.
             Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
          <p>Another paragraph with more content to make the article substantial.</p>
        </article>
      `;
      
      const doc = createTestDocument(html);
      const url = 'https://example.com/cached';
      
      expect(isCached(url)).toBe(false);
      expect(getCacheSize()).toBe(0);
      
      const result = extractContent(doc, url);
      
      if (result.success) {
        expect(isCached(url)).toBe(true);
        expect(getCacheSize()).toBe(1);
      }
    });

    it('should return cached content on subsequent calls', () => {
      const html = `
        <article>
          <h1>Cached Article</h1>
          <p>This is a test paragraph with enough content to pass the minimum threshold. 
             We need to add more text here to ensure the extraction succeeds.
             Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
          <p>Another paragraph with more content to make the article substantial.</p>
        </article>
      `;
      
      const doc = createTestDocument(html);
      const url = 'https://example.com/cached2';
      
      const result1 = extractContent(doc, url);
      const result2 = extractContent(doc, url);
      
      if (result1.success && result2.success) {
        expect(result1.data).toEqual(result2.data);
      }
    });

    it('should clear cache correctly', () => {
      const html = `
        <article>
          <h1>Article to Clear</h1>
          <p>This is a test paragraph with enough content to pass the minimum threshold. 
             Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
          <p>Another paragraph with more content.</p>
        </article>
      `;
      
      const doc = createTestDocument(html);
      extractContent(doc, 'https://example.com/clear1');
      extractContent(doc, 'https://example.com/clear2');
      
      expect(getCacheSize()).toBe(2);
      
      clearCache();
      
      expect(getCacheSize()).toBe(0);
    });

    it('should invalidate specific cache entry', () => {
      const html = `
        <article>
          <h1>Article to Invalidate</h1>
          <p>This is a test paragraph with enough content to pass the minimum threshold. 
             Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
          <p>Another paragraph with more content.</p>
        </article>
      `;
      
      const doc = createTestDocument(html);
      const url1 = 'https://example.com/invalidate1';
      const url2 = 'https://example.com/invalidate2';
      
      extractContent(doc, url1);
      extractContent(doc, url2);
      
      expect(getCacheSize()).toBe(2);
      expect(isCached(url1)).toBe(true);
      
      invalidateCache(url1);
      
      expect(getCacheSize()).toBe(1);
      expect(isCached(url1)).toBe(false);
      expect(isCached(url2)).toBe(true);
    });
  });
});
