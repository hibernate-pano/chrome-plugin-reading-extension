import { describe, it, expect } from 'vitest';

import { paginate, PAGE_CONTENT_HEIGHT_PX, type BreakCandidate } from '../../src/print/paginate';

/** A breakable candidate at `offset`. */
function at(offset: number): BreakCandidate {
  return { offset, breakable: true };
}

/** A candidate the policy forbids — e.g. a break that would orphan a heading. */
function blocked(offset: number): BreakCandidate {
  return { offset, breakable: false };
}

/** Breakable candidates every `step` px, up to `length`. */
function even(step: number, length: number): BreakCandidate[] {
  const out: BreakCandidate[] = [];
  for (let o = step; o < length; o += step) out.push(at(o));
  return out;
}

const H = 1000;

describe('paginate', () => {
  it('produces a single page when the content fits', () => {
    // Content 500 tall, page holds 1000. There is nothing to place.
    expect(paginate(even(100, 500), H, 500)).toEqual([0]);
  });

  it('produces a single page when there are no candidates at all', () => {
    expect(paginate([], H, 400)).toEqual([0]);
  });

  it('always starts the document at offset 0', () => {
    expect(paginate([], H, 0)).toEqual([0]);
  });

  it('breaks at the last candidate that fits, not at the page limit', () => {
    // Content runs to 2500, so the loop keeps going past 1000. Each break takes
    // the furthest legal candidate at or before the limit.
    expect(paginate(even(100, 2500), H, 2500)).toEqual([0, 1000, 2000]);
  });

  it('skips candidates the policy forbids', () => {
    // 900 is the nearest opportunity but is blocked, so the break falls back
    // to 800. Content continues past it, so this is a genuine second page.
    expect(paginate([at(400), at(800), blocked(900), at(1500)], H, 1800)).toEqual([0, 800]);
  });

  it('uses a later breakable candidate when a closer one is blocked', () => {
    expect(paginate([blocked(600), at(700), at(900), at(1500)], H, 1800)).toEqual([0, 900]);
  });

  it('cuts at the page limit when nothing is breakable', () => {
    // A single atomic block three pages tall offers nowhere legal to break. The
    // content still has to appear, so the engine cuts at the limit rather than
    // stopping — which is the case that used to drop the tail silently.
    const starts = paginate([blocked(2500)], H, 2500);
    expect(starts).toEqual([0, 1000, 2000]);
  });

  it('skips past forbidden candidates when forced to cut', () => {
    // The forced branch also has to move the scan cursor, or every later page
    // would re-examine the same forbidden candidates from the start.
    const starts = paginate([blocked(400), blocked(800), blocked(1200)], H, 3000);
    expect(starts).toEqual([0, 1000, 2000]);
  });

  it('covers content that ends beyond the last candidate', () => {
    // Candidates stop at 1200 but the document is 2600 tall. Pages must keep
    // being emitted until the height is covered, or the last 1400px vanish.
    const starts = paginate(even(100, 1200), H, 2600);
    expect(starts[starts.length - 1]).toBeGreaterThanOrEqual(2600 - H);
  });

  it('never starts a page past the content it has to cover', () => {
    const starts = paginate(even(37, 4000), H, 4000);
    for (const start of starts) expect(start).toBeLessThan(4000);
  });

  it('produces pages in ascending order with no duplicates', () => {
    const starts = paginate(even(37, 4000), 900, 4000);
    expect(starts.length).toBeGreaterThan(2);
    for (let i = 1; i < starts.length; i += 1) {
      expect(starts[i]).toBeGreaterThan(starts[i - 1] as number);
    }
  });

  it('emits a page whenever the content does not fit in the last one', () => {
    // The invariant the old tests missed: a document is only finished when the
    // final page's height covers the rest of it.
    for (const height of [100, 999, 1000, 1001, 2500, 7300]) {
      const starts = paginate(even(50, height), H, height);
      const last = starts[starts.length - 1] as number;
      expect(last + H, `content ${height} tall`).toBeGreaterThanOrEqual(height);
    }
  });

  it('does not emit a zero-height page', () => {
    const starts = paginate([at(500), at(500.2), at(600), at(1500)], H, 1800);
    for (let i = 1; i < starts.length; i += 1) {
      expect((starts[i] as number) - (starts[i - 1] as number)).toBeGreaterThan(0.5);
    }
  });

  it('terminates on a pathological candidate list', () => {
    const many: BreakCandidate[] = [];
    for (let i = 1; i <= 50000; i += 1) many.push(at(i));
    const starts = paginate(many, 10, 50000);
    expect(starts.length).toBeLessThanOrEqual(2001);
  });

  it('returns a single page for a non-positive page height', () => {
    expect(paginate(even(10, 100), 0, 5000)).toEqual([0]);
  });

  it('does not loop when the content height is enormous', () => {
    // Guard against a runaway driven purely by the height term.
    const starts = paginate(even(100, 1000), H, 10_000_000);
    expect(starts.length).toBeLessThanOrEqual(2001);
  });
});

describe('PAGE_CONTENT_HEIGHT_PX', () => {
  it('is A4 minus the vertical margins, at 96dpi', () => {
    // 297 - 20 * 2 = 257mm; 257 * 96 / 25.4 = 971.34px.
    expect(PAGE_CONTENT_HEIGHT_PX).toBeCloseTo(971.34, 1);
  });
});
