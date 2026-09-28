import { describe, it, expect } from 'vitest';
import {
  resolveLazySrc,
  eagerizeImages,
  constrainImageHeights,
} from '../../src/print/prepareImages';
import { A4 } from '../../src/shared/constants';

function makeImage(attrs: Record<string, string>): HTMLImageElement {
  const img = document.createElement('img');
  for (const [key, value] of Object.entries(attrs)) {
    img.setAttribute(key, value);
  }
  document.body.appendChild(img);
  return img;
}

const TRANSPARENT_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

describe('resolveLazySrc', () => {
  it('promotes data-src when src is a transparent placeholder', () => {
    const img = makeImage({ src: TRANSPARENT_GIF, 'data-src': 'https://example.com/real.png' });
    expect(resolveLazySrc(img)).toBe(true);
    expect(img.getAttribute('src')).toBe('https://example.com/real.png');
  });

  it('promotes when src is missing entirely', () => {
    const img = makeImage({ 'data-original': 'https://example.com/real.png' });
    expect(resolveLazySrc(img)).toBe(true);
    expect(img.getAttribute('src')).toBe('https://example.com/real.png');
  });

  it('promotes from srcset when no other attribute carries the URL', () => {
    const img = makeImage({ src: TRANSPARENT_GIF, srcset: 'https://example.com/s.jpg 1x' });
    expect(resolveLazySrc(img)).toBe(true);
    expect(img.getAttribute('src')).toBe('https://example.com/s.jpg');
  });

  it('prefers the highest resolution candidate in srcset', () => {
    const img = makeImage({
      src: TRANSPARENT_GIF,
      srcset: 'https://example.com/s.jpg 1x, https://example.com/l.jpg 2x',
    });
    resolveLazySrc(img);
    expect(img.getAttribute('src')).toBe('https://example.com/l.jpg');
  });

  it('leaves a real src untouched', () => {
    const img = makeImage({ src: 'https://example.com/real.png', 'data-src': 'https://other/x.png' });
    expect(resolveLazySrc(img)).toBe(false);
    expect(img.getAttribute('src')).toBe('https://example.com/real.png');
  });

  it('does not promote a placeholder from another attribute', () => {
    const img = makeImage({ src: TRANSPARENT_GIF, 'data-src': TRANSPARENT_GIF });
    expect(resolveLazySrc(img)).toBe(false);
  });
});

describe('eagerizeImages', () => {
  it('forces eager decoding and reports how many it repaired', () => {
    const a = makeImage({ src: TRANSPARENT_GIF, 'data-src': 'https://example.com/a.png' });
    const b = makeImage({ src: 'https://example.com/b.png', loading: 'lazy' });

    const root = document.createElement('div');
    root.append(a, b);
    const repaired = eagerizeImages(root);

    expect(repaired).toBe(1);
    expect(a.getAttribute('loading')).toBe('eager');
    expect(b.getAttribute('loading')).toBe('eager');
    expect(b.getAttribute('decoding')).toBe('sync');
  });
});

describe('constrainImageHeights', () => {
  it('caps images just under one printable page height', () => {
    const img = makeImage({ src: 'https://example.com/tall.png' });
    const root = document.createElement('div');
    root.appendChild(img);

    constrainImageHeights(root);

    const expected = `${A4.contentHeight - 10}mm`;
    expect(img.style.maxHeight).toBe(expected);
    expect(img.style.objectFit).toBe('contain');
  });
});
