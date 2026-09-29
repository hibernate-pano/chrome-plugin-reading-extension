import { describe, it, expect } from 'vitest';
import { validatePrintSettings, DEFAULT_PRINT_SETTINGS } from '../../src/shared/printSettings';
import { PRINT_FONT_SIZES, A4 } from '../../src/shared/constants';
import { detectLanguage, normalizeLanguage, highlightCode } from '../../src/shared/codeHighlight';

describe('validatePrintSettings', () => {
  it('returns defaults for an empty object', () => {
    expect(validatePrintSettings({})).toEqual(DEFAULT_PRINT_SETTINGS);
  });

  it('keeps a valid theme', () => {
    expect(validatePrintSettings({ theme: 'sepia' }).theme).toBe('sepia');
  });

  it('rejects a theme that is not offered for print', () => {
    // Reading mode has a dark theme; print deliberately does not.
    expect(validatePrintSettings({ theme: 'dark' as never }).theme).toBe('light');
  });

  it('keeps a valid image size', () => {
    for (const size of ['large', 'medium', 'small'] as const) {
      expect(validatePrintSettings({ imageSize: size }).imageSize).toBe(size);
    }
  });

  it('rejects an unknown image size', () => {
    expect(validatePrintSettings({ imageSize: 'huge' as never }).imageSize).toBe('large');
  });

  it('accepts every offered font size', () => {
    for (const size of PRINT_FONT_SIZES) {
      expect(validatePrintSettings({ fontSize: size }).fontSize).toBe(size);
    }
  });

  it('snaps an arbitrary size to the nearest offered step', () => {
    expect(validatePrintSettings({ fontSize: 10.8 }).fontSize).toBe(11);
    expect(validatePrintSettings({ fontSize: 100 }).fontSize).toBe(13);
    expect(validatePrintSettings({ fontSize: 1 }).fontSize).toBe(9);
  });

  it('falls back to the default when the size is not a number', () => {
    expect(validatePrintSettings({ fontSize: NaN }).fontSize).toBe(DEFAULT_PRINT_SETTINGS.fontSize);
    expect(validatePrintSettings({ fontSize: 'big' as never }).fontSize).toBe(
      DEFAULT_PRINT_SETTINGS.fontSize
    );
  });
});

describe('A4 geometry', () => {
  it('derives a 174mm text column', () => {
    expect(A4.contentWidth).toBe(174);
  });

  it('derives a 257mm text block', () => {
    expect(A4.contentHeight).toBe(257);
  });
});

describe('codeHighlight', () => {
  it('detects common languages', () => {
    expect(detectLanguage('const x = 1;')).toBe('javascript');
    expect(detectLanguage('def main():\n    pass')).toBe('python');
    expect(detectLanguage('plain prose with no code at all')).toBe('plaintext');
  });

  it('normalizes aliases', () => {
    expect(normalizeLanguage('JS')).toBe('javascript');
    expect(normalizeLanguage('c++')).toBe('cpp');
    expect(normalizeLanguage('yml')).toBe('yaml');
  });

  it('escapes HTML before wrapping tokens', () => {
    const html = highlightCode('<script>alert(1)</script>', 'javascript');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('wraps keywords in token spans', () => {
    expect(highlightCode('const x = 1;', 'javascript')).toContain('token-keyword');
  });

  it('returns an empty string for empty input', () => {
    expect(highlightCode('', 'javascript')).toBe('');
  });
});
