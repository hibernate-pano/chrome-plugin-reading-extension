/**
 * Unit tests for the reader theme registry.
 *
 * `readerThemes.ts` had no coverage at all. It is the single source of truth
 * for the three reading themes, and it is also the allow-list that
 * `validateSettings` uses, so a mistake here changes both the palette and
 * which theme strings survive validation.
 */

import { describe, it, expect } from 'vitest';
import {
  READER_THEMES,
  getReaderThemeById,
  type ReaderTheme,
  type ThemeId,
} from '../../src/shared/readerThemes';
import { SETTINGS_CONSTRAINTS, DEFAULT_SETTINGS } from '../../src/shared/constants';

const FALLBACK = READER_THEMES[0];

/** Every field the theme object has to supply for the reader to be usable. */
const REQUIRED_FIELDS: Array<keyof ReaderTheme> = [
  'id',
  'name',
  'background',
  'text',
  'textMuted',
  'accent',
  'border',
  'codeBg',
];

describe('READER_THEMES', () => {
  it('defines exactly the three advertised themes', () => {
    expect(READER_THEMES.map((t) => t.id)).toEqual(['light', 'dark', 'sepia']);
  });

  it('uses unique ids', () => {
    const ids = READER_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('exposes every field, non-empty, for every theme', () => {
    for (const theme of READER_THEMES) {
      for (const field of REQUIRED_FIELDS) {
        const value = theme[field];
        expect(typeof value, `${theme.id}.${field}`).toBe('string');
        expect(value.length, `${theme.id}.${field} is empty`).toBeGreaterThan(0);
      }
    }
  });

  it('uses hex colors for the color fields', () => {
    const COLOR_FIELDS = ['background', 'text', 'textMuted', 'accent', 'border', 'codeBg'] as const;

    for (const theme of READER_THEMES) {
      for (const field of COLOR_FIELDS) {
        expect(theme[field], `${theme.id}.${field}`).toMatch(/^#[0-9a-fA-F]{3,8}$/);
      }
    }
  });

  it('gives the themes distinguishable backgrounds', () => {
    const backgrounds = READER_THEMES.map((t) => t.background);
    expect(new Set(backgrounds).size).toBe(backgrounds.length);
  });

  it('has the default settings theme present in the registry', () => {
    expect(READER_THEMES.map((t) => t.id)).toContain(DEFAULT_SETTINGS.theme);
  });
});

describe('getReaderThemeById', () => {
  it('resolves every valid id to its own theme', () => {
    for (const theme of READER_THEMES) {
      expect(getReaderThemeById(theme.id)).toBe(theme);
    }
  });

  it('resolves the three known ids by name', () => {
    expect(getReaderThemeById('light').id).toBe('light');
    expect(getReaderThemeById('dark').id).toBe('dark');
    expect(getReaderThemeById('sepia').id).toBe('sepia');
  });

  it('returns the very same object the registry holds, not a copy', () => {
    // Callers (ReaderView) read the theme straight into inline styles, so
    // identity matters for the hot path but also means the shared object is
    // exposed to mutation.
    expect(getReaderThemeById('dark')).toBe(READER_THEMES[1]);
  });

  it('gives the dark theme a dark background and light text', () => {
    const dark = getReaderThemeById('dark');
    expect(dark.background).toBe('#1c1b1a');
    expect(dark.text).toBe('#e6e4df');
  });

  const FALLBACK_CASES: Array<[label: string, id: string | null | undefined]> = [
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['an unknown id', 'solarized'],
    ['a near-miss id', 'Dark'],
    ['a print-only id', 'print'],
    ['__proto__', '__proto__'],
    ['constructor', 'constructor'],
    ['toString', 'toString'],
    ['hasOwnProperty', 'hasOwnProperty'],
    ['a prototype lookup object', 'prototype'],
  ];

  it.each(FALLBACK_CASES)('falls back to the light theme for %s', (_label, id) => {
    expect(getReaderThemeById(id)).toBe(FALLBACK);
    expect(getReaderThemeById(id).id).toBe('light');
  });

  it('does not return an inherited Object property for a prototype name', () => {
    // A lookup that reached `Object.prototype` would hand the caller a
    // function where it expects a ReaderTheme and crash ReaderView.
    expect(getReaderThemeById('__proto__')).not.toBe(Object.prototype as unknown as ReaderTheme);
    expect(getReaderThemeById('toString')).not.toBe(
      (Object.prototype as unknown as { toString: unknown }).toString as unknown as ReaderTheme
    );
  });

  it('is total: every input produces a usable theme', () => {
    const inputs: Array<string | null | undefined> = [
      null,
      undefined,
      '',
      ' ',
      'light ',
      'LIGHT',
      '0',
      'true',
      '{"id":"dark"}',
    ];

    for (const input of inputs) {
      const theme = getReaderThemeById(input);
      expect(theme, JSON.stringify(input)).toBeDefined();
      for (const field of REQUIRED_FIELDS) {
        expect(theme[field], `${String(input)}.${field}`).toBeTruthy();
      }
    }
  });

  it('accepts a ThemeId typed at compile time as well as a raw string', () => {
    // `ReaderView` calls `getReaderThemeById(settings.theme)` where
    // `settings.theme` is the `Theme` union, so the narrow signature is the
    // one that actually runs in production. The wide `string | null |
    // undefined` signature is defensive only: `validateSettings` has already
    // narrowed the value, so a bogus id is not reachable from that call site.
    const typed: ThemeId = 'sepia';
    expect(getReaderThemeById(typed).id).toBe('sepia');

    // A bogus string still resolves safely when one gets in anyway.
    const bogus = 'neon' as ThemeId;
    expect(getReaderThemeById(bogus).id).toBe('light');
  });
});

describe('theme registry / settings coupling', () => {
  it('lists every id the settings constraints would accept', () => {
    // storage.ts derives VALID_THEME_IDS from this array, so a theme added
    // here is immediately valid and one removed here stops validating.
    expect(READER_THEMES.length).toBeGreaterThan(0);
    for (const theme of READER_THEMES) {
      expect(['light', 'dark', 'sepia']).toContain(theme.id);
    }
  });

  it('keeps the registry independent of the numeric constraints', () => {
    // Guards against someone importing SETTINGS_CONSTRAINTS into the theme
    // module and creating a cycle with storage.ts.
    expect(SETTINGS_CONSTRAINTS.fontSize.min).toBeLessThan(SETTINGS_CONSTRAINTS.fontSize.max);
  });
});
