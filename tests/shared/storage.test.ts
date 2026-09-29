/**
 * Unit tests for the settings storage wrapper.
 *
 * `storage.ts` had no coverage at all. It is the only place that talks to
 * `chrome.storage.local` for reading settings, so every consumer (ReaderView,
 * SettingsPanel, the background worker) depends on the normalization and the
 * failure contract pinned below.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateSettings,
  getSettings,
  saveSettings,
  getSetting,
  saveSetting,
  resetSettings,
} from '../../src/shared/storage';
import { DEFAULT_SETTINGS, SETTINGS_CONSTRAINTS, STORAGE_KEYS } from '../../src/shared/constants';
import { READER_THEMES } from '../../src/shared/readerThemes';
import { resetMockStorage } from '../setup';

const { fontSize, lineHeight, pageWidth } = SETTINGS_CONSTRAINTS;

/** Object actually handed to `chrome.storage.local.set` on the last call. */
function lastWritten(): Record<string, unknown> {
  const calls = vi.mocked(chrome.storage.local.set).mock.calls;
  return calls[calls.length - 1][0];
}

/** Object actually handed to `chrome.storage.local.set` on the first call. */
function firstWritten(): Record<string, unknown> {
  return vi.mocked(chrome.storage.local.set).mock.calls[0][0];
}

function storedSettings(): unknown {
  return lastWritten()[STORAGE_KEYS.SETTINGS];
}

describe('validateSettings', () => {
  describe('theme', () => {
    it('accepts every id the theme registry defines', () => {
      for (const theme of READER_THEMES) {
        expect(validateSettings({ theme: theme.id }).theme).toBe(theme.id);
      }
    });

    it('accepts the ids by literal, not just by registry iteration', () => {
      expect(validateSettings({ theme: 'light' }).theme).toBe('light');
      expect(validateSettings({ theme: 'dark' }).theme).toBe('dark');
      expect(validateSettings({ theme: 'sepia' }).theme).toBe('sepia');
    });

    it('falls back to the default for an unknown theme string', () => {
      expect(validateSettings({ theme: 'solarized' as never }).theme).toBe(DEFAULT_SETTINGS.theme);
      expect(validateSettings({ theme: 'Dark' as never }).theme).toBe(DEFAULT_SETTINGS.theme);
    });

    it('falls back to the default for a non-string theme', () => {
      for (const bad of [null, undefined, 0, 1, true, {}, [], () => {}]) {
        expect(
          validateSettings({ theme: bad as never }).theme,
          JSON.stringify(bad) ?? String(bad)
        ).toBe(DEFAULT_SETTINGS.theme);
      }
    });

    it('does not accept inherited Object properties as a theme', () => {
      expect(validateSettings({ theme: 'toString' as never }).theme).toBe(DEFAULT_SETTINGS.theme);
      expect(validateSettings({ theme: 'constructor' as never }).theme).toBe(DEFAULT_SETTINGS.theme);
      expect(validateSettings({ theme: '__proto__' as never }).theme).toBe(DEFAULT_SETTINGS.theme);
    });
  });

  describe('numeric clamping', () => {
    it('clamps fontSize to both bounds', () => {
      expect(validateSettings({ fontSize: 0 }).fontSize).toBe(fontSize.min);
      expect(validateSettings({ fontSize: 11 }).fontSize).toBe(fontSize.min);
      expect(validateSettings({ fontSize: 12 }).fontSize).toBe(12);
      expect(validateSettings({ fontSize: 32 }).fontSize).toBe(32);
      expect(validateSettings({ fontSize: 33 }).fontSize).toBe(fontSize.max);
      expect(validateSettings({ fontSize: 9999 }).fontSize).toBe(fontSize.max);
      expect(validateSettings({ fontSize: -9999 }).fontSize).toBe(fontSize.min);
    });

    it('clamps lineHeight to both bounds', () => {
      expect(validateSettings({ lineHeight: 0.1 }).lineHeight).toBe(lineHeight.min);
      expect(validateSettings({ lineHeight: 1.2 }).lineHeight).toBe(1.2);
      expect(validateSettings({ lineHeight: 2.0 }).lineHeight).toBe(2.0);
      expect(validateSettings({ lineHeight: 9 }).lineHeight).toBe(lineHeight.max);
    });

    it('clamps pageWidth to both bounds', () => {
      expect(validateSettings({ pageWidth: 100 }).pageWidth).toBe(pageWidth.min);
      expect(validateSettings({ pageWidth: 600 }).pageWidth).toBe(600);
      expect(validateSettings({ pageWidth: 1200 }).pageWidth).toBe(1200);
      expect(validateSettings({ pageWidth: 4000 }).pageWidth).toBe(pageWidth.max);
    });

    it('clamps rather than rejecting an out-of-range value', () => {
      // A hand-edited or older stored value must still yield a usable object;
      // there is no "invalid" branch that throws or drops the field.
      const result = validateSettings({ fontSize: 100, lineHeight: 10, pageWidth: 10 });
      expect(result).toEqual({
        theme: DEFAULT_SETTINGS.theme,
        fontSize: fontSize.max,
        lineHeight: lineHeight.max,
        pageWidth: pageWidth.min,
      });
    });

    it('leaves in-range values untouched', () => {
      const input = { theme: 'sepia', fontSize: 21, lineHeight: 1.6, pageWidth: 800 } as const;
      expect(validateSettings(input)).toEqual(input);
    });

    it('accepts fractional in-range values', () => {
      expect(validateSettings({ lineHeight: 1.65 }).lineHeight).toBe(1.65);
      expect(validateSettings({ fontSize: 19.5 }).fontSize).toBe(19.5);
    });

    it('clamps infinities to the nearest bound', () => {
      expect(validateSettings({ fontSize: Infinity }).fontSize).toBe(fontSize.max);
      expect(validateSettings({ fontSize: -Infinity }).fontSize).toBe(fontSize.min);
      expect(validateSettings({ pageWidth: Infinity }).pageWidth).toBe(pageWidth.max);
      expect(validateSettings({ lineHeight: -Infinity }).lineHeight).toBe(lineHeight.min);
    });
  });

  describe('wrong types fall back to the defaults', () => {
    it('falls back for a stringly-typed number', () => {
      expect(validateSettings({ fontSize: 'big' as never }).fontSize).toBe(DEFAULT_SETTINGS.fontSize);
      expect(validateSettings({ lineHeight: 'loose' as never }).lineHeight).toBe(
        DEFAULT_SETTINGS.lineHeight
      );
      expect(validateSettings({ pageWidth: 'wide' as never }).pageWidth).toBe(
        DEFAULT_SETTINGS.pageWidth
      );
    });

    it('falls back for null, undefined and booleans', () => {
      for (const bad of [null, undefined, true, false, {}, []]) {
        expect(validateSettings({ fontSize: bad as never }).fontSize, String(bad)).toBe(
          DEFAULT_SETTINGS.fontSize
        );
        expect(validateSettings({ pageWidth: bad as never }).pageWidth, String(bad)).toBe(
          DEFAULT_SETTINGS.pageWidth
        );
      }
    });

    it('falls back to the default for NaN instead of letting it through', () => {
      // `typeof NaN === 'number'` and `clamp(NaN, min, max)` is NaN, because
      // every Math.min/Math.max comparison against NaN is false. The guard
      // therefore has to be a Number.isNaN check, not a typeof check.
      const result = validateSettings({
        fontSize: NaN,
        lineHeight: NaN,
        pageWidth: NaN,
      });

      expect(Number.isNaN(result.fontSize)).toBe(false);
      expect(result.fontSize).toBe(DEFAULT_SETTINGS.fontSize);
      expect(result.lineHeight).toBe(DEFAULT_SETTINGS.lineHeight);
      expect(result.pageWidth).toBe(DEFAULT_SETTINGS.pageWidth);
    });

    it('falls back for NaN mixed with valid fields', () => {
      const result = validateSettings({ theme: 'dark', fontSize: NaN, pageWidth: 900 });
      expect(result).toEqual({
        theme: 'dark',
        fontSize: DEFAULT_SETTINGS.fontSize,
        lineHeight: DEFAULT_SETTINGS.lineHeight,
        pageWidth: 900,
      });
    });

    it('does not let a NaN field poison the others', () => {
      const result = validateSettings({ fontSize: NaN, lineHeight: 1.5, pageWidth: 700 });
      expect(result.fontSize).toBe(DEFAULT_SETTINGS.fontSize);
      expect(result.lineHeight).toBe(1.5);
      expect(result.pageWidth).toBe(700);
    });

    it('returns the defaults for an empty object', () => {
      expect(validateSettings({})).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('unknown fields from an older version', () => {
    it('drops every field it does not know about', () => {
      const legacy = {
        theme: 'dark',
        fontSize: 20,
        lineHeight: 1.5,
        pageWidth: 700,
        // Settings that existed in earlier versions / sibling modules:
        fontFamily: 'serif',
        showImages: true,
        justifyText: true,
        shortcutsEnabled: false,
        printFontSize: 12,
        legacyThemeName: 'midnight',
      } as never;

      const result = validateSettings(legacy);

      expect(Object.keys(result).sort()).toEqual([
        'fontSize',
        'lineHeight',
        'pageWidth',
        'theme',
      ]);
      expect(result).toEqual({ theme: 'dark', fontSize: 20, lineHeight: 1.5, pageWidth: 700 });
      expect(Object.keys(result)).not.toContain('fontFamily');
      expect(Object.keys(result)).not.toContain('printFontSize');
    });

    it('drops a stale `__proto__` key instead of polluting the result', () => {
      const result = validateSettings(JSON.parse('{"__proto__": {"theme": "dark"}, "fontSize": 20}'));
      expect(result.theme).toBe(DEFAULT_SETTINGS.theme);
      expect(Object.keys(result).sort()).toEqual(['fontSize', 'lineHeight', 'pageWidth', 'theme']);
    });

    it('always returns exactly the four settings fields', () => {
      const results = [
        validateSettings({}),
        validateSettings({ theme: 'sepia' }),
        validateSettings({ fontSize: 'x' as never }),
        validateSettings({ extra: true } as never),
      ];

      for (const result of results) {
        expect(Object.keys(result).sort()).toEqual([
          'fontSize',
          'lineHeight',
          'pageWidth',
          'theme',
        ]);
      }
    });

    it('returns a fresh object each call, never a shared one', () => {
      const first = validateSettings({});
      const second = validateSettings({});
      expect(first).not.toBe(second);
      expect(first).toEqual(second);

      first.fontSize = 99;
      expect(validateSettings({}).fontSize).toBe(DEFAULT_SETTINGS.fontSize);
      expect(DEFAULT_SETTINGS.fontSize).not.toBe(99);
    });
  });
});

describe('getSettings', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  it('reads the settings key', async () => {
    await getSettings();
    expect(chrome.storage.local.get).toHaveBeenCalledWith(STORAGE_KEYS.SETTINGS);
  });

  it('returns the defaults when the key is missing', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('returns a copy of the defaults, not the shared constant', async () => {
    const settings = await getSettings();
    expect(settings).not.toBe(DEFAULT_SETTINGS);

    settings.fontSize = 99;
    expect(DEFAULT_SETTINGS.fontSize).toBe(19);
    expect((await getSettings()).fontSize).toBe(19);
  });

  it('returns the defaults when the stored value is not an object', async () => {
    for (const bad of ['corrupt', 42, true, null]) {
      await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: bad });
      expect(await getSettings(), String(bad)).toEqual(DEFAULT_SETTINGS);
    }
  });

  it('treats a stored array as a valid object and normalizes it to defaults', async () => {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: [1, 2, 3] });
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('returns the stored settings when they are valid', async () => {
    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: { theme: 'sepia', fontSize: 22, lineHeight: 1.6, pageWidth: 900 },
    });

    expect(await getSettings()).toEqual({
      theme: 'sepia',
      fontSize: 22,
      lineHeight: 1.6,
      pageWidth: 900,
    });
  });

  it('normalizes an out-of-range stored value on read', async () => {
    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: { theme: 'nope', fontSize: 1000, lineHeight: 0, pageWidth: 1 },
    });

    expect(await getSettings()).toEqual({
      theme: DEFAULT_SETTINGS.theme,
      fontSize: fontSize.max,
      lineHeight: lineHeight.min,
      pageWidth: pageWidth.min,
    });
  });

  it('fills the gaps of a partially stored object', async () => {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: { theme: 'dark' } });
    expect(await getSettings()).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark' });
  });

  it('returns the defaults and logs when the storage read throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(chrome.storage.local.get).mockRejectedValueOnce(new Error('storage gone'));

    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
    expect(error).toHaveBeenCalledWith('[Reader] Failed to get settings:', expect.any(Error));
  });

  it('never rejects when the storage read throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(chrome.storage.local.get).mockRejectedValueOnce(new Error('storage gone'));

    await expect(getSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });
});

describe('saveSettings', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes the settings key with a fully populated object', async () => {
    await saveSettings({ theme: 'dark' });

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [STORAGE_KEYS.SETTINGS]: { ...DEFAULT_SETTINGS, theme: 'dark' },
    });
    expect(Object.keys(storedSettings() as object).sort()).toEqual([
      'fontSize',
      'lineHeight',
      'pageWidth',
      'theme',
    ]);
  });

  it('merges a partial patch into the existing stored values', async () => {
    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: { theme: 'sepia', fontSize: 24, lineHeight: 1.9, pageWidth: 1000 },
    });

    await saveSettings({ fontSize: 16 });

    expect(await getSettings()).toEqual({
      theme: 'sepia',
      fontSize: 16,
      lineHeight: 1.9,
      pageWidth: 1000,
    });
  });

  it('merges successive patches', async () => {
    await saveSettings({ theme: 'dark' });
    await saveSettings({ fontSize: 30 });
    await saveSettings({ pageWidth: 600 });

    expect(await getSettings()).toEqual({
      theme: 'dark',
      fontSize: 30,
      lineHeight: DEFAULT_SETTINGS.lineHeight,
      pageWidth: 600,
    });
  });

  it('validates the patch before persisting it', async () => {
    await saveSettings({ fontSize: 999, lineHeight: 0.1, pageWidth: 99999, theme: 'neon' as never });

    expect(storedSettings()).toEqual({
      theme: DEFAULT_SETTINGS.theme,
      fontSize: fontSize.max,
      lineHeight: lineHeight.min,
      pageWidth: pageWidth.max,
    });
  });

  it('replaces an invalid stored value instead of merging into it', async () => {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: 'corrupt' });
    await saveSettings({ fontSize: 20 });

    expect(await getSettings()).toEqual({ ...DEFAULT_SETTINGS, fontSize: 20 });
  });

  it('drops unknown fields handed in by a caller', async () => {
    await saveSettings({ theme: 'dark', fontFamily: 'serif' } as never);
    expect(storedSettings()).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark' });
  });

  it('re-throws when the write fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('quota exceeded');
    vi.mocked(chrome.storage.local.set).mockRejectedValueOnce(failure);

    await expect(saveSettings({ fontSize: 20 })).rejects.toThrow('quota exceeded');
    expect(error).toHaveBeenCalledWith('[Reader] Failed to save settings:', failure);
  });

  it('survives a failing read — getSettings swallows it, so only writes can fail', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(chrome.storage.local.get).mockRejectedValueOnce(new Error('storage gone'));

    await expect(saveSettings({ fontSize: 20 })).resolves.toBeUndefined();

    // The read failure degraded to defaults and the patch was still applied.
    expect(storedSettings()).toEqual({ ...DEFAULT_SETTINGS, fontSize: 20 });
  });

  it('round-trips through getSettings', async () => {
    await saveSettings({ theme: 'sepia', fontSize: 15, lineHeight: 1.4, pageWidth: 640 });
    expect(await getSettings()).toEqual({
      theme: 'sepia',
      fontSize: 15,
      lineHeight: 1.4,
      pageWidth: 640,
    });
  });
});

describe('getSetting', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  it('returns a single field', async () => {
    await saveSettings({ theme: 'dark', fontSize: 21, lineHeight: 1.5, pageWidth: 800 });

    expect(await getSetting('theme')).toBe('dark');
    expect(await getSetting('fontSize')).toBe(21);
    expect(await getSetting('lineHeight')).toBe(1.5);
    expect(await getSetting('pageWidth')).toBe(800);
  });

  it('returns the default when nothing is stored', async () => {
    for (const key of ['theme', 'fontSize', 'lineHeight', 'pageWidth'] as const) {
      expect(await getSetting(key)).toBe(DEFAULT_SETTINGS[key]);
    }
  });

  it('returns a normalized value for a corrupt store', async () => {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: { fontSize: 9999 } });
    expect(await getSetting('fontSize')).toBe(fontSize.max);
  });
});

describe('saveSetting', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  it('persists a single field and leaves the rest alone', async () => {
    await saveSettings({ theme: 'sepia', fontSize: 21, lineHeight: 1.5, pageWidth: 800 });

    await saveSetting('fontSize', 25);

    expect(await getSettings()).toEqual({
      theme: 'sepia',
      fontSize: 25,
      lineHeight: 1.5,
      pageWidth: 800,
    });
  });

  it('works on an empty store', async () => {
    await saveSetting('theme', 'dark');
    expect(await getSettings()).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark' });
  });

  it('validates the value it is given', async () => {
    await saveSetting('fontSize', 1000);
    expect(await getSetting('fontSize')).toBe(fontSize.max);

    await saveSetting('theme', 'neon' as never);
    expect(await getSetting('theme')).toBe(DEFAULT_SETTINGS.theme);
  });

  it('re-throws when the write fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(chrome.storage.local.set).mockRejectedValueOnce(new Error('quota exceeded'));

    await expect(saveSetting('fontSize', 20)).rejects.toThrow('quota exceeded');
    vi.restoreAllMocks();
  });
});

describe('resetSettings', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes the defaults', async () => {
    await resetSettings();
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
    expect(lastWritten()).toEqual({ [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS });
  });

  it('writes a fresh copy, never the shared DEFAULT_SETTINGS object', async () => {
    await resetSettings();

    const written = storedSettings();
    expect(written).not.toBe(DEFAULT_SETTINGS);
    expect(written).toEqual(DEFAULT_SETTINGS);
  });

  it('does not let a consumer mutate the defaults through what it wrote', async () => {
    await resetSettings();

    // Simulate the classic aliasing bug: mutate the object that was handed to
    // storage and see whether DEFAULT_SETTINGS changes underneath every other
    // caller in the extension.
    (storedSettings() as Record<string, unknown>).fontSize = 99;
    (storedSettings() as Record<string, unknown>).theme = 'dark';

    expect(DEFAULT_SETTINGS).toEqual({
      theme: 'light',
      fontSize: 19,
      lineHeight: 1.75,
      pageWidth: 680,
    });
  });

  it('does not hand out the shared object to getSettings either', async () => {
    await resetSettings();
    const read = await getSettings();
    expect(read).not.toBe(DEFAULT_SETTINGS);
    expect(firstWritten()[STORAGE_KEYS.SETTINGS]).not.toBe(DEFAULT_SETTINGS);
  });

  it('overwrites existing values', async () => {
    await saveSettings({ theme: 'sepia', fontSize: 30, lineHeight: 1.9, pageWidth: 1100 });

    await resetSettings();

    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('re-throws when the write fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('quota exceeded');
    vi.mocked(chrome.storage.local.set).mockRejectedValueOnce(failure);

    await expect(resetSettings()).rejects.toThrow('quota exceeded');
    expect(error).toHaveBeenCalledWith('[Reader] Failed to reset settings:', failure);
  });
});
