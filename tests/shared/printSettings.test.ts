/**
 * Unit tests for the async persistence layer of print settings.
 *
 * `tests/print/printSettings.test.ts` already covers the pure validator; this
 * file covers `getPrintSettings` / `savePrintSettings` — the two functions that
 * actually talk to `chrome.storage.local`, and whose failure contract differs
 * from the reading-settings wrapper on purpose.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getPrintSettings,
  savePrintSettings,
  DEFAULT_PRINT_SETTINGS,
} from '../../src/shared/printSettings';
import { PRINT_FONT_SIZES, STORAGE_KEYS } from '../../src/shared/constants';
import { resetMockStorage } from '../setup';

/** Object actually handed to `chrome.storage.local.set` on the last call. */
function lastWritten(): Record<string, unknown> {
  const calls = vi.mocked(chrome.storage.local.set).mock.calls;
  return calls[calls.length - 1][0];
}

function storedPrintSettings(): unknown {
  return lastWritten()[STORAGE_KEYS.PRINT_SETTINGS];
}

describe('getPrintSettings', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads the print settings key', async () => {
    await getPrintSettings();
    expect(chrome.storage.local.get).toHaveBeenCalledWith(STORAGE_KEYS.PRINT_SETTINGS);
  });

  it('returns the defaults when the key is missing', async () => {
    expect(await getPrintSettings()).toEqual(DEFAULT_PRINT_SETTINGS);
  });

  it('returns a copy of the defaults, not the shared constant', async () => {
    const settings = await getPrintSettings();
    expect(settings).not.toBe(DEFAULT_PRINT_SETTINGS);

    settings.fontSize = 99;
    expect(DEFAULT_PRINT_SETTINGS.fontSize).toBe(11);
    expect((await getPrintSettings()).fontSize).toBe(11);
  });

  it('returns the defaults when the stored value is not an object', async () => {
    for (const bad of ['corrupt', 42, true, null]) {
      await chrome.storage.local.set({ [STORAGE_KEYS.PRINT_SETTINGS]: bad });
      expect(await getPrintSettings(), String(bad)).toEqual(DEFAULT_PRINT_SETTINGS);
    }
  });

  it('returns the stored settings when they are valid', async () => {
    await chrome.storage.local.set({
      [STORAGE_KEYS.PRINT_SETTINGS]: { theme: 'sepia', fontSize: 12, imageSize: 'small' },
    });

    expect(await getPrintSettings()).toEqual({
      theme: 'sepia',
      fontSize: 12,
      imageSize: 'small',
    });
  });

  it('normalizes an invalid stored value on read', async () => {
    // Reading modes are not printable: a stored `dark` theme comes back light.
    await chrome.storage.local.set({
      [STORAGE_KEYS.PRINT_SETTINGS]: { theme: 'dark', fontSize: 999, imageSize: 'huge' },
    });

    expect(await getPrintSettings()).toEqual({
      theme: DEFAULT_PRINT_SETTINGS.theme,
      fontSize: 13,
      imageSize: DEFAULT_PRINT_SETTINGS.imageSize,
    });
  });

  it('fills the gaps of a partially stored object', async () => {
    await chrome.storage.local.set({ [STORAGE_KEYS.PRINT_SETTINGS]: { fontSize: 9 } });

    expect(await getPrintSettings()).toEqual({
      ...DEFAULT_PRINT_SETTINGS,
      fontSize: 9,
    });
  });

  it('returns the defaults and logs when the storage read throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(chrome.storage.local.get).mockRejectedValueOnce(new Error('storage gone'));

    expect(await getPrintSettings()).toEqual(DEFAULT_PRINT_SETTINGS);
    expect(error).toHaveBeenCalledWith('[Print] Failed to get print settings:', expect.any(Error));
  });

  it('never rejects when the storage read throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(chrome.storage.local.get).mockRejectedValueOnce(new Error('storage gone'));

    await expect(getPrintSettings()).resolves.toEqual(DEFAULT_PRINT_SETTINGS);
  });
});

describe('savePrintSettings', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes the print settings key with a fully populated object', async () => {
    await savePrintSettings({ theme: 'sepia' });

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [STORAGE_KEYS.PRINT_SETTINGS]: { ...DEFAULT_PRINT_SETTINGS, theme: 'sepia' },
    });
    expect(Object.keys(storedPrintSettings() as object).sort()).toEqual([
      'fontSize',
      'imageSize',
      'theme',
    ]);
  });

  it('merges a partial patch into the existing stored values', async () => {
    await chrome.storage.local.set({
      [STORAGE_KEYS.PRINT_SETTINGS]: { theme: 'sepia', fontSize: 12, imageSize: 'small' },
    });

    await savePrintSettings({ fontSize: 10.5 });

    expect(await getPrintSettings()).toEqual({
      theme: 'sepia',
      fontSize: 10.5,
      imageSize: 'small',
    });
  });

  it('merges successive patches', async () => {
    await savePrintSettings({ theme: 'sepia' });
    await savePrintSettings({ fontSize: 13 });
    await savePrintSettings({ imageSize: 'medium' });

    expect(await getPrintSettings()).toEqual({
      theme: 'sepia',
      fontSize: 13,
      imageSize: 'medium',
    });
  });

  it('validates the patch before persisting it', async () => {
    await savePrintSettings({ theme: 'dark' as never, fontSize: 4, imageSize: 'gigantic' as never });

    expect(storedPrintSettings()).toEqual({
      theme: DEFAULT_PRINT_SETTINGS.theme,
      fontSize: 9,
      imageSize: DEFAULT_PRINT_SETTINGS.imageSize,
    });
  });

  it('snaps a hand-edited font size to an offered step', async () => {
    await savePrintSettings({ fontSize: 10.8 });
    expect((await getPrintSettings()).fontSize).toBe(11);
    expect(PRINT_FONT_SIZES).toContain(11);

    await savePrintSettings({ fontSize: 1 });
    expect((await getPrintSettings()).fontSize).toBe(9);

    await savePrintSettings({ fontSize: 100 });
    expect((await getPrintSettings()).fontSize).toBe(13);
  });

  it('replaces an invalid stored value instead of merging into it', async () => {
    await chrome.storage.local.set({ [STORAGE_KEYS.PRINT_SETTINGS]: 'corrupt' });
    await savePrintSettings({ fontSize: 12 });

    expect(await getPrintSettings()).toEqual({ ...DEFAULT_PRINT_SETTINGS, fontSize: 12 });
  });

  it('drops unknown fields handed in by a caller', async () => {
    await savePrintSettings({ theme: 'sepia', margins: 20 } as never);
    expect(storedPrintSettings()).toEqual({ ...DEFAULT_PRINT_SETTINGS, theme: 'sepia' });
  });

  it('writes a fresh object, never the shared DEFAULT_PRINT_SETTINGS', async () => {
    await savePrintSettings({ theme: 'sepia' });

    const written = storedPrintSettings();
    expect(written).not.toBe(DEFAULT_PRINT_SETTINGS);
    expect(written).toEqual({ ...DEFAULT_PRINT_SETTINGS, theme: 'sepia' });

    (written as Record<string, unknown>).fontSize = 99;
    expect(DEFAULT_PRINT_SETTINGS.fontSize).toBe(11);
  });

  it('logs and swallows a write failure instead of re-throwing', async () => {
    // Deliberate contract difference from src/shared/storage.ts, which
    // re-throws: the print toolbar treats a failed save as best-effort.
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('quota exceeded');
    vi.mocked(chrome.storage.local.set).mockRejectedValueOnce(failure);

    await expect(savePrintSettings({ fontSize: 12 })).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith('[Print] Failed to save print settings:', failure);
  });

  it('swallows a repeated write failure without throwing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const set = vi.mocked(chrome.storage.local.set);
    set.mockRejectedValueOnce(new Error('quota exceeded'));
    set.mockRejectedValueOnce(new Error('quota exceeded'));

    await expect(savePrintSettings({ fontSize: 12 })).resolves.toBeUndefined();
    await expect(savePrintSettings({ fontSize: 13 })).resolves.toBeUndefined();
  });

  it('still applies the patch when the read fails', async () => {
    // getPrintSettings degrades to defaults, so a read failure is invisible to
    // the caller and the patch is written on top of the defaults.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(chrome.storage.local.get).mockRejectedValueOnce(new Error('storage gone'));

    await expect(savePrintSettings({ imageSize: 'small' })).resolves.toBeUndefined();

    expect(storedPrintSettings()).toEqual({
      ...DEFAULT_PRINT_SETTINGS,
      imageSize: 'small',
    });
  });

  it('does not touch the reading settings key', async () => {
    await chrome.storage.local.set({ reader_settings: { theme: 'dark' } });
    await savePrintSettings({ theme: 'sepia' });

    const written = lastWritten();
    expect(Object.keys(written)).toEqual([STORAGE_KEYS.PRINT_SETTINGS]);
  });

  it('round-trips through getPrintSettings', async () => {
    await savePrintSettings({ theme: 'sepia', fontSize: 10.5, imageSize: 'medium' });
    expect(await getPrintSettings()).toEqual({
      theme: 'sepia',
      fontSize: 10.5,
      imageSize: 'medium',
    });
  });
});
