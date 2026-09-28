import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Guards the message hand-off between the reading view and the background.
 *
 * Regression: the export button used to call chrome.runtime.sendMessage
 * itself, with no payload. Chrome does not deliver a content script's own
 * message back to that same context, so it went straight to the background,
 * which rejected it as "Invalid payload" and opened no tab. The button looked
 * dead. The view must therefore call the content script's own exportToPdf
 * through a prop, and only that function may talk to the background.
 */

const read = (relative: string): string =>
  readFileSync(resolve(__dirname, '../../src', relative), 'utf8');

describe('export hand-off wiring', () => {
  it('ReaderView does not send EXPORT_PDF itself', () => {
    const source = read('content/ReaderView.tsx');
    expect(source).not.toContain('EXPORT_PDF');
    expect(source).not.toMatch(/sendMessage/);
  });

  it('ReaderView receives onExportPdf as a prop and calls it', () => {
    const source = read('content/ReaderView.tsx');
    expect(source).toContain('onExportPdf');
    expect(source).toMatch(/await onExportPdf\(\)/);
  });

  it('the content script builds the payload and sends it to the background', () => {
    const source = read('content/index.ts');
    expect(source).toContain('MESSAGE_TYPES.EXPORT_PDF');
    // The payload must be attached, not sent bare.
    expect(source).toMatch(/sendMessage\(\{[\s\S]*?payload[\s\S]*?\}\)/);
  });

  it('the content script passes exportToPdf into ReaderView', () => {
    const source = read('content/index.ts');
    expect(source).toMatch(/onExportPdf:\s*exportToPdf/);
  });

  it('the background rejects a payload-less export loudly', () => {
    const source = read('background/index.ts');
    expect(source).toContain("error: 'Invalid payload'");
  });
});
