/**
 * Unit tests for the reading history module.
 *
 * This module had no coverage at all. The tests below pin the two things that
 * were wrong (the double-divided reading time, the record lost to an
 * unparsable URL) plus the surrounding behavior of every exported function.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  addToHistory,
  getReadingHistory,
  getReadingStats,
  deleteFromHistory,
  clearHistory,
  generateId,
  type ReadingRecord,
} from '../../src/shared/history';
import { STORAGE_KEYS, READING_SPEED } from '../../src/shared/constants';
import { resetMockStorage } from '../setup';

const WPM = READING_SPEED.WORDS_PER_MINUTE;

/** Fixed clock so timestamp assertions are exact instead of flaky. */
const T0 = 1_700_000_000_000;
const ONE_DAY = 24 * 60 * 60 * 1000;

/** Build a stored record directly, bypassing addToHistory. */
function makeRecord(overrides: Partial<ReadingRecord> = {}): ReadingRecord {
  return {
    id: overrides.id ?? 'r-seed',
    url: 'https://example.com/a',
    title: 'A',
    excerpt: '',
    byline: '',
    siteName: 'example.com',
    length: 1000,
    readingTime: 5,
    theme: 'light',
    fontSize: 18,
    createdAt: T0,
    lastReadAt: T0,
    readCount: 1,
    ...overrides,
  };
}

async function seedHistory(records: ReadingRecord[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.READING_HISTORY]: records });
}

describe('Reading History', () => {
  beforeEach(() => {
    resetMockStorage();
    vi.useFakeTimers();
    vi.setSystemTime(T0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('addToHistory — reading time', () => {
    it('reports 10 minutes for a 2000-word article (regression: it used to report 2)', async () => {
      const record = await addToHistory('https://example.com/long', 'Long Read', {
        length: 2000,
      });

      expect(record).not.toBeNull();
      expect(record!.length).toBe(2000);
      expect(record!.readingTime).toBe(10);
      expect(record!.readingTime).toBe(Math.ceil(2000 / WPM));
    });

    it('divides the word count by the shared reading speed exactly once', async () => {
      // Every one of these was wrong under the old `wordCount / 6` estimate.
      const cases: Array<[words: number, minutes: number]> = [
        [WPM, 1],
        [WPM + 1, 2],
        [WPM * 3, 3],
        [WPM * 5, 5],
        [2000, 10],
        [4001, 21],
      ];

      for (const [words, minutes] of cases) {
        const record = await addToHistory(`https://example.com/w${words}`, `T${words}`, {
          length: words,
        });
        expect(record!.readingTime, `${words} words`).toBe(minutes);
      }
    });

    it('floors at 1 minute for a very short article, matching extractor.ts', async () => {
      const short = await addToHistory('https://example.com/tiny', 'Tiny', { length: 3 });
      expect(short!.readingTime).toBe(1);

      const empty = await addToHistory('https://example.com/empty', 'Empty', { length: 0 });
      expect(empty!.readingTime).toBe(1);

      const missing = await addToHistory('https://example.com/missing', 'Missing', {});
      expect(missing!.length).toBe(0);
      expect(missing!.readingTime).toBe(1);
    });

    it('agrees with the reading time the extractor would report', async () => {
      // src/content/extractor.ts: Math.max(1, Math.ceil(wordCount / READING_SPEED.WORDS_PER_MINUTE))
      const words = 1234;
      const record = await addToHistory('https://example.com/agree', 'Agree', { length: words });
      expect(record!.readingTime).toBe(Math.max(1, Math.ceil(words / READING_SPEED.WORDS_PER_MINUTE)));
    });
  });

  describe('addToHistory — unparsable url (regression: the record was dropped)', () => {
    it('still writes the record when the url cannot be parsed', async () => {
      const record = await addToHistory('not a url', 'Still Saved', { length: 800 });

      expect(record).not.toBeNull();
      expect(record!.url).toBe('not a url');
      expect(record!.title).toBe('Still Saved');
      expect(record!.length).toBe(800);
      expect(record!.readingTime).toBe(4);
      expect(record!.readCount).toBe(1);

      const history = await getReadingHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(record);
    });

    it('falls back to an empty site name instead of throwing', async () => {
      const record = await addToHistory('not a url', 'No Host', { length: 100 });
      expect(record!.siteName).toBe('');
    });

    it.each([
      ['not a url'],
      ['/relative/path'],
      ['example.com/no-scheme'],
      ['about:blank'],
      [''],
      ['http://'],
    ])('survives the unparsable url %j', async (url) => {
      const record = await addToHistory(url, `Title for ${url}`, { length: 400 });
      expect(record).not.toBeNull();
      expect(record!.siteName).toBe('');
      expect(await getReadingHistory()).toHaveLength(1);
    });

    it('resolves the hostname for a valid url when no site name is given', async () => {
      const record = await addToHistory('https://example.com/post/1?utm=x', 'Post', {
        length: 100,
      });
      expect(record!.siteName).toBe('example.com');
    });

    it('prefers an explicit site name over the hostname', async () => {
      const record = await addToHistory('https://news.example.com/p', 'Story', {
        siteName: 'The Example News',
        length: 100,
      });
      expect(record!.siteName).toBe('The Example News');
    });

    it('keeps writing records after an unparsable url poisoned nothing', async () => {
      await addToHistory('not a url', 'First', { length: 100 });
      const second = await addToHistory('https://example.com/ok', 'Second', { length: 100 });

      expect(second).not.toBeNull();
      const history = await getReadingHistory();
      expect(history.map(r => r.title)).toEqual(['Second', 'First']);
    });
  });

  describe('addToHistory — record lifecycle', () => {
    it('creates a record with sane defaults', async () => {
      const record = await addToHistory('https://example.com/x', 'X', {});

      expect(record).toMatchObject({
        url: 'https://example.com/x',
        title: 'X',
        excerpt: '',
        byline: '',
        siteName: 'example.com',
        length: 0,
        readingTime: 1,
        theme: 'light',
        fontSize: 18,
        createdAt: T0,
        lastReadAt: T0,
        readCount: 1,
      });
      expect(record!.id).toBe(generateId('https://example.com/x', 'X'));
    });

    it('keeps the supplied reader settings', async () => {
      const record = await addToHistory('https://example.com/s', 'S', {}, {
        theme: 'sepia',
        fontSize: 24,
      });
      expect(record!.theme).toBe('sepia');
      expect(record!.fontSize).toBe(24);
    });

    it('falls back to "Untitled" for an empty title', async () => {
      const record = await addToHistory('https://example.com/untitled', '', { length: 100 });
      expect(record!.title).toBe('Untitled');
    });

    it('increments readCount and preserves createdAt when the same article is re-added', async () => {
      const first = await addToHistory('https://example.com/reread', 'Reread', { length: 600 });
      expect(first!.readCount).toBe(1);
      expect(first!.createdAt).toBe(T0);

      vi.setSystemTime(T0 + ONE_DAY);
      const second = await addToHistory('https://example.com/reread', 'Reread', { length: 600 });
      expect(second!.readCount).toBe(2);
      expect(second!.createdAt).toBe(T0);
      expect(second!.lastReadAt).toBe(T0 + ONE_DAY);

      vi.setSystemTime(T0 + 2 * ONE_DAY);
      const third = await addToHistory('https://example.com/reread', 'Reread', { length: 600 });
      expect(third!.readCount).toBe(3);
      expect(third!.createdAt).toBe(T0);

      const history = await getReadingHistory();
      expect(history).toHaveLength(1);
      expect(history[0].readCount).toBe(3);
    });

    it('refreshes the stored fields on re-read, not just the counters', async () => {
      await addToHistory('https://example.com/u', 'U', { length: 600, siteName: 'Old Name' });
      const updated = await addToHistory('https://example.com/u', 'U', {
        length: 1200,
        siteName: 'New Name',
      });

      expect(updated!.siteName).toBe('New Name');
      expect(updated!.length).toBe(1200);
      expect(updated!.readingTime).toBe(6);
      expect((await getReadingHistory())[0]).toEqual(updated);
    });

    it('treats a different title for the same url as a different article', async () => {
      await addToHistory('https://example.com/p', 'Title One', { length: 100 });
      await addToHistory('https://example.com/p', 'Title Two', { length: 100 });

      const history = await getReadingHistory();
      expect(history).toHaveLength(2);
      expect(history.every(r => r.readCount === 1)).toBe(true);
    });

    it('puts a new record at the head of the list', async () => {
      await addToHistory('https://example.com/first', 'First', { length: 200 });
      await addToHistory('https://example.com/second', 'Second', { length: 400 });
      const last = await addToHistory('https://example.com/third', 'Third', { length: 600 });

      const history = await getReadingHistory();
      expect(history.map(r => r.title)).toEqual(['Third', 'Second', 'First']);
      expect(history[0]).toEqual(last);
    });

    it('keeps a re-read record in its original position', async () => {
      await addToHistory('https://example.com/a', 'A', { length: 200 });
      await addToHistory('https://example.com/b', 'B', { length: 200 });
      await addToHistory('https://example.com/c', 'C', { length: 200 });

      await addToHistory('https://example.com/a', 'A', { length: 200 });

      const history = await getReadingHistory();
      expect(history.map(r => r.title)).toEqual(['C', 'B', 'A']);
      expect(history[2].readCount).toBe(2);
    });

    it('caps the history at 200 records, dropping the oldest', async () => {
      for (let i = 0; i < 205; i++) {
        await addToHistory(`https://example.com/n${i}`, `Article ${i}`, { length: 200 });
      }

      const history = await getReadingHistory();
      expect(history).toHaveLength(200);
      // Newest first: indices 204 down to 5 survive.
      expect(history[0].title).toBe('Article 204');
      expect(history[199].title).toBe('Article 5');
      expect(history.some(r => r.title === 'Article 4')).toBe(false);
    });

    it('does not trim on an in-place update', async () => {
      for (let i = 0; i < 200; i++) {
        await addToHistory(`https://example.com/full${i}`, `Article ${i}`, { length: 200 });
      }
      await addToHistory('https://example.com/full0', 'Article 0', { length: 200 });

      const history = await getReadingHistory();
      expect(history).toHaveLength(200);
      expect(history[199].readCount).toBe(2);
    });

    it('returns null and logs when the write fails', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(chrome.storage.local.set).mockRejectedValueOnce(new Error('quota exceeded'));

      const record = await addToHistory('https://example.com/fail', 'Fail', { length: 100 });

      expect(record).toBeNull();
      expect(error).toHaveBeenCalled();
    });
  });

  describe('overlapping mutations', () => {
    // Regression: every mutation was an unsynchronized read-modify-write of the
    // whole array, so two of them interleaving both read the same starting array
    // and the second write silently discarded the first one's record — while
    // each caller still got a record back, so nothing reported the loss.
    function cloneOnRead(): () => void {
      const backing = vi.mocked(chrome.storage.local.get).getMockImplementation();
      if (!backing) throw new Error('the storage mock lost its implementation');

      // Real storage structured-clones on read. The shared mock hands back the
      // same array reference, which would mask the race by letting both
      // mutations mutate one array and survive anyway.
      vi.mocked(chrome.storage.local.get).mockImplementation((keys) =>
        backing(keys).then((result) =>
          Object.fromEntries(
            Object.entries(result).map(([key, value]) => [
              key,
              Array.isArray(value) ? [...value] : value,
            ])
          )
        )
      );

      return () => vi.mocked(chrome.storage.local.get).mockImplementation(backing);
    }

    it('keeps both records when two adds overlap', async () => {
      const restore = cloneOnRead();
      try {
        const [first, second] = await Promise.all([
          addToHistory('https://example.com/a', 'A', { length: 100 }),
          addToHistory('https://example.com/b', 'B', { length: 100 }),
        ]);

        expect(first).not.toBeNull();
        expect(second).not.toBeNull();

        const history = await getReadingHistory();
        expect(history.map(r => r.title).sort()).toEqual(['A', 'B']);
      } finally {
        // `vi.clearAllMocks()` clears calls, not implementations, so a failed
        // assertion here would leave the clone wrapper installed for every
        // later test in the file — turning one real failure into dozens.
        restore();
      }
    });

    it('does not wipe stored records when the read fails', async () => {
      // The failure `getReadingHistory` cannot express: a storage read that
      // rejects is indistinguishable from "no history yet" once it has been
      // flattened to `[]`. A mutation that trusted that flattened value would
      // write the empty list back and destroy every record while reporting
      // success.
      await addToHistory('https://example.com/one', 'One', { length: 100 });
      await addToHistory('https://example.com/two', 'Two', { length: 100 });

      vi.mocked(chrome.storage.local.get).mockRejectedValueOnce(
        new Error('storage temporarily unavailable') as never
      );
      const added = await addToHistory('https://example.com/three', 'Three', { length: 100 });

      expect(added, 'a refused read must not report success').toBeNull();

      const history = await getReadingHistory();
      expect(
        history.map(r => r.title).sort(),
        'the two existing records must survive a failed read'
      ).toEqual(['One', 'Two']);
    });

    it('does not clear stored records when a delete cannot read them', async () => {
      await addToHistory('https://example.com/keep', 'Keep', { length: 100 });

      vi.mocked(chrome.storage.local.get).mockRejectedValueOnce(
        new Error('storage temporarily unavailable') as never
      );
      const deleted = await deleteFromHistory(generateId('https://example.com/keep', 'Keep'));

      expect(deleted).toBe(false);
      const history = await getReadingHistory();
      expect(history.map(r => r.title)).toEqual(['Keep']);
    });

    it('does not resurrect a deleted record when an add overlaps it', async () => {
      await addToHistory('https://example.com/gone', 'Gone', { length: 100 });
      await addToHistory('https://example.com/kept', 'Kept', { length: 100 });
      const restore = cloneOnRead();

      const [, added] = await Promise.all([
        deleteFromHistory(generateId('https://example.com/gone', 'Gone')),
        addToHistory('https://example.com/new', 'New', { length: 100 }),
      ]);

      expect(added).not.toBeNull();
      const titles = (await getReadingHistory()).map(r => r.title);
      expect(titles).toContain('New');
      expect(titles).toContain('Kept');
      expect(titles).not.toContain('Gone');
      restore();
    });

    it('keeps serving mutations queued behind one whose write failed', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(chrome.storage.local.set).mockRejectedValueOnce(new Error('quota exceeded'));

      // A rejected chain would reject everything queued behind it, so the
      // second article would silently never be recorded either.
      const [failed, next] = await Promise.all([
        addToHistory('https://example.com/lost', 'Lost', { length: 100 }),
        addToHistory('https://example.com/kept', 'Kept', { length: 100 }),
      ]);

      expect(failed).toBeNull();
      expect(next).not.toBeNull();
      expect((await getReadingHistory()).map(r => r.title)).toEqual(['Kept']);
    });
  });

  describe('generateId', () => {
    it('is deterministic for the same url and title', () => {
      const first = generateId('https://example.com/a', 'Title');
      expect(generateId('https://example.com/a', 'Title')).toBe(first);
      expect(generateId('https://example.com/a', 'Title')).toBe(first);
    });

    it('is stable across module reloads (pure function, no shared state)', async () => {
      const viaApi = (await addToHistory('https://example.com/stable', 'Stable', {}))!.id;
      const viaDirect = generateId('https://example.com/stable', 'Stable');
      expect(viaApi).toBe(viaDirect);
    });

    it('produces distinct ids for different inputs', () => {
      const ids = [
        generateId('https://example.com/a', 'A'),
        generateId('https://example.com/b', 'A'),
        generateId('https://example.com/a', 'B'),
        generateId('https://example.com/a', 'B2'),
        generateId('https://example.com/a', ''),
        generateId('', ''),
      ];
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('always returns a non-negative base36 id', () => {
      const inputs: Array<[string, string]> = [
        ['https://example.com/a', 'A'],
        ['', ''],
        ['not a url', 'Still Saved'],
        ['https://example.com/ünïcödé/ページ', '日本語のタイトル'],
        ['https://example.com/a', 'x'.repeat(500)],
        // Hashes to exactly -2147483648, the one signed value Math.abs cannot
        // turn positive.
        ['https://example.com/article_seed9890', '\uE0A8\uFFEE\u0014'],
        // Mirror-image pair: +5 and -5.
        ['https://a.example.com/p_2990', '\uDC14\uFFEE\u0003'],
        ['https://b.example.com/p_13', '\uFDEC\uFFFC\u000C'],
      ];

      for (const [url, title] of inputs) {
        const id = generateId(url, title);
        expect(id, `${url} + ${title}`).toMatch(/^r-[0-9a-z]+$/);
        expect(id.startsWith('-'), id).toBe(false);
        expect(Number.parseInt(id.slice(2), 36)).toBeGreaterThanOrEqual(0);
      }
    });

    it('normalizes the INT_MIN hash to an unsigned id', () => {
      // The (url, title) below hashes to exactly -2147483648 under the signed
      // 32-bit rolling hash. `>>> 0` turns it into 2147483648, so the id is a
      // plain non-negative base36 string.
      const id = generateId('https://example.com/article_seed9890', '\uE0A8\uFFEE\u0014');
      expect(id).toBe('r-zik0zk');
    });

    it('does not collide on mirror-image hashes', () => {
      // These two inputs hash to +5 and -5. Math.abs mapped both to "5", so
      // the two articles shared one history entry; `>>> 0` keeps them apart.
      const positive = generateId('https://a.example.com/p_2990', '\uDC14\uFFEE\u0003');
      const negative = generateId('https://b.example.com/p_13', '\uFDEC\uFFFC\u000C');
      expect(positive).toBe('r-5');
      expect(negative).toBe('r-1z141yz');
      expect(positive).not.toBe(negative);
    });
  });

  describe('getReadingHistory', () => {
    it('returns an empty array when nothing is stored', async () => {
      expect(await getReadingHistory()).toEqual([]);
    });

    it('returns an empty array when the stored value is not an array', async () => {
      await chrome.storage.local.set({ [STORAGE_KEYS.READING_HISTORY]: 'corrupt' });
      expect(await getReadingHistory()).toEqual([]);
    });

    it('returns the stored records in order', async () => {
      await seedHistory([makeRecord({ id: 'r-1', title: 'One' }), makeRecord({ id: 'r-2', title: 'Two' })]);
      const history = await getReadingHistory();
      expect(history.map(r => r.id)).toEqual(['r-1', 'r-2']);
    });

    it('returns an empty array when storage read fails', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(chrome.storage.local.get).mockRejectedValueOnce(new Error('storage gone'));

      expect(await getReadingHistory()).toEqual([]);
      expect(error).toHaveBeenCalled();
    });
  });

  describe('deleteFromHistory', () => {
    it('removes only the requested record', async () => {
      await seedHistory([
        makeRecord({ id: 'r-keep', title: 'Keep' }),
        makeRecord({ id: 'r-drop', title: 'Drop' }),
        makeRecord({ id: 'r-keep2', title: 'Keep 2' }),
      ]);

      expect(await deleteFromHistory('r-drop')).toBe(true);

      const history = await getReadingHistory();
      expect(history.map(r => r.id)).toEqual(['r-keep', 'r-keep2']);
    });

    it('is a no-op for an unknown id', async () => {
      await seedHistory([makeRecord({ id: 'r-1' })]);

      expect(await deleteFromHistory('r-missing')).toBe(true);

      const history = await getReadingHistory();
      expect(history).toHaveLength(1);
    });

    it('can empty the history', async () => {
      await seedHistory([makeRecord({ id: 'r-1' }), makeRecord({ id: 'r-2' })]);
      await deleteFromHistory('r-1');
      await deleteFromHistory('r-2');
      expect(await getReadingHistory()).toEqual([]);
    });

    it('returns false when the write fails', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(chrome.storage.local.set).mockRejectedValueOnce(new Error('quota exceeded'));

      expect(await deleteFromHistory('r-1')).toBe(false);
      expect(error).toHaveBeenCalled();
    });
  });

  describe('clearHistory', () => {
    it('removes every record', async () => {
      await seedHistory([makeRecord({ id: 'r-1' }), makeRecord({ id: 'r-2' })]);

      expect(await clearHistory()).toBe(true);
      expect(await getReadingHistory()).toEqual([]);
    });

    it('is a no-op on an already empty history', async () => {
      expect(await clearHistory()).toBe(true);
      expect(await getReadingHistory()).toEqual([]);
    });

    it('leaves other storage keys untouched', async () => {
      await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: { theme: 'dark' } });
      await seedHistory([makeRecord({ id: 'r-1' })]);

      await clearHistory();

      const settings = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      expect(settings[STORAGE_KEYS.SETTINGS]).toEqual({ theme: 'dark' });
    });

    it('returns false when the write fails', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(chrome.storage.local.set).mockRejectedValueOnce(new Error('quota exceeded'));

      expect(await clearHistory()).toBe(false);
      expect(error).toHaveBeenCalled();
    });
  });

  describe('getReadingStats', () => {
    it('reports zeroes for an empty history', async () => {
      expect(await getReadingStats()).toEqual({
        totalArticles: 0,
        totalReadingTime: 0,
        avgReadingTime: 0,
        thisWeek: 0,
        sites: {},
      });
    });

    it('totals articles and reading time and averages per article', async () => {
      await seedHistory([
        makeRecord({ id: 'r-1', siteName: 'example.com', readingTime: 10, lastReadAt: T0 }),
        makeRecord({ id: 'r-2', siteName: 'example.com', readingTime: 20, lastReadAt: T0 }),
        makeRecord({ id: 'r-3', siteName: 'other.org', readingTime: 3, lastReadAt: T0 }),
      ]);

      const stats = await getReadingStats();
      expect(stats.totalArticles).toBe(3);
      expect(stats.totalReadingTime).toBe(33);
      expect(stats.avgReadingTime).toBe(11); // 33 / 3, rounded
    });

    it('counts reads inside the last seven days only', async () => {
      const week = 7 * ONE_DAY;
      await seedHistory([
        makeRecord({ id: 'r-now', lastReadAt: T0 }),
        makeRecord({ id: 'r-6d', lastReadAt: T0 - 6 * ONE_DAY }),
        makeRecord({ id: 'r-just-inside', lastReadAt: T0 - week + 1000 }),
        makeRecord({ id: 'r-just-outside', lastReadAt: T0 - week - 1000 }),
        makeRecord({ id: 'r-old', lastReadAt: T0 - 30 * ONE_DAY }),
      ]);

      expect((await getReadingStats()).thisWeek).toBe(3);
    });

    it('counts articles per site, including the blank site name', async () => {
      await seedHistory([
        makeRecord({ id: 'r-1', siteName: 'example.com' }),
        makeRecord({ id: 'r-2', siteName: 'example.com' }),
        makeRecord({ id: 'r-3', siteName: 'other.org' }),
        makeRecord({ id: 'r-4', siteName: '' }),
      ]);

      // A record written from an unparsable url contributes a blank key.
      expect((await getReadingStats()).sites).toEqual({
        'example.com': 2,
        'other.org': 1,
        '': 1,
      });
    });

    it('reflects records written through addToHistory', async () => {
      await addToHistory('https://example.com/one', 'One', { length: 2000 });
      await addToHistory('https://other.org/two', 'Two', { length: 100 });
      await addToHistory('https://other.org/three', 'Three', { length: 50 });

      const stats = await getReadingStats();
      expect(stats.totalArticles).toBe(3);
      expect(stats.totalReadingTime).toBe(12); // 10 + 1 + 1
      expect(stats.avgReadingTime).toBe(4);
      expect(stats.thisWeek).toBe(3);
      expect(stats.sites).toEqual({ 'other.org': 2, 'example.com': 1 });
    });

    it('returns zeroes when storage is unreadable', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(chrome.storage.local.get).mockRejectedValueOnce(new Error('storage gone'));

      expect((await getReadingStats()).totalArticles).toBe(0);
    });
  });
});
