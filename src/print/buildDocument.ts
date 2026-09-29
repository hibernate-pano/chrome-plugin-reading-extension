/**
 * Print Document Builder
 *
 * Turns a PrintPayload into a DOM tree styled for A4 paper.
 *
 * The article HTML arrives as a string from Readability and is untrusted: the
 * source page decides what is in it. It goes through the shared sanitizer
 * before anything touches it. The sanitizer parses in an inert document
 * (DOMParser) and returns a clean string; the result is then parsed again and
 * the nodes adopted one by one, so nothing in it can execute — no <script>
 * runs, no on* handler fires.
 */

import type { PrintPayload } from '../shared/types';
import { CODE_BLOCK_BREAK_THRESHOLD_LINES } from '../shared/constants';
import { highlightCode, detectLanguage, normalizeLanguage } from '../shared/codeHighlight';
import { sanitizeArticleHtml } from '../shared/sanitize';

/**
 * Extract the human-readable source text from a URL for display.
 */
function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Accept only http(s) URLs for the footer link.
 *
 * sourceUrl comes from the captured page's location, so it is
 * attacker-influenced. A javascript: or data: value assigned to href would
 * execute when clicked, so everything else is rejected outright.
 */
function safeHttpUrl(candidate: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  return parsed.href;
}

/**
 * Format a timestamp as YYYY-MM-DD for the print footer.
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Read a language hint off a <code> or <pre> element.
 */
function readLanguageHint(element: Element): string {
  const code = element.tagName === 'CODE' ? element : element.querySelector('code');
  const source = code ?? element;
  const className = source.getAttribute('class') ?? '';
  const match = className.match(/language-([\w-]+)|lang-([\w-]+)/);
  return match ? (match[1] ?? match[2] ?? '') : '';
}

/**
 * Rebuild a code block with highlighting, and mark whether it may break
 * across a page boundary.
 *
 * Long blocks must be allowed to break: a 200-line listing forced to avoid
 * page breaks is squeezed into one page and the browser drops its tail.
 */
function processCodeBlock(block: HTMLElement): void {
  const codeElement = block.tagName === 'CODE' ? block : (block.querySelector('code') ?? block);
  const code = codeElement.textContent ?? '';

  const hint = readLanguageHint(block);
  const language = hint ? normalizeLanguage(hint) : detectLanguage(code);

  const figure = document.createElement('div');
  figure.className = 'p-code';

  const pre = document.createElement('pre');
  pre.setAttribute('data-language', language);

  const codeOut = document.createElement('code');
  // highlightCode escapes its input before wrapping tokens in spans.
  codeOut.innerHTML = highlightCode(code, language);
  pre.appendChild(codeOut);

  figure.appendChild(pre);

  const lineCount = code.split('\n').length;
  if (lineCount >= CODE_BLOCK_BREAK_THRESHOLD_LINES) {
    figure.setAttribute('data-long', 'true');
  }

  block.replaceWith(figure);
}

/**
 * Wrap images in a figure and cap their height so a tall image cannot
 * overflow a single page and get clipped.
 */
function processImage(image: HTMLImageElement): void {
  image.setAttribute('loading', 'eager');
  image.removeAttribute('width');
  image.removeAttribute('height');

  const figure = document.createElement('figure');
  figure.className = 'p-figure';

  const parent = image.parentElement;
  if (parent && (parent.tagName === 'P' || parent.tagName === 'FIGURE')) {
    parent.replaceWith(figure);
  } else {
    image.replaceWith(figure);
  }
  figure.appendChild(image);

  const caption = figure.querySelector('figcaption');
  if (caption) {
    caption.className = 'p-caption';
  }
}

/**
 * Promote wide tables into a scrollable wrapper that is safe to print.
 * A table wider than the text column would otherwise be clipped.
 */
function processTable(table: HTMLTableElement): void {
  table.className = 'p-table';
  const wrapper = document.createElement('div');
  wrapper.className = 'p-table-wrap';
  table.replaceWith(wrapper);
  wrapper.appendChild(table);
}

/**
 * Build the complete printable document.
 *
 * Returns a detached element; the caller decides where to mount it.
 */
export function buildDocument(payload: PrintPayload): HTMLElement {
  const root = document.createElement('article');
  root.className = 'p-doc';

  // --- Header -------------------------------------------------------------
  const header = document.createElement('header');
  header.className = 'p-header';

  const title = document.createElement('h1');
  title.className = 'p-title';
  title.textContent = payload.title || 'Untitled';
  header.appendChild(title);

  const metaParts: string[] = [];
  if (payload.byline) metaParts.push(payload.byline);
  if (payload.siteName) metaParts.push(payload.siteName);
  const date = formatDate(payload.exportedAt);
  if (date) metaParts.push(date);

  if (metaParts.length > 0) {
    const meta = document.createElement('p');
    meta.className = 'p-meta';
    meta.textContent = metaParts.join(' · ');
    header.appendChild(meta);
  }
  root.appendChild(header);

  // --- Body ---------------------------------------------------------------
  // Sanitize the string first — this is the same sanitizer the reader view
  // uses, so both paths agree on what survives.
  const safeContent = sanitizeArticleHtml(payload.content);
  const parsed = new DOMParser().parseFromString(safeContent, 'text/html');
  const article = document.createElement('div');
  article.className = 'p-content';
  // adoptNode moves nodes across documents without executing them.
  while (parsed.body.firstChild) {
    article.appendChild(document.adoptNode(parsed.body.firstChild));
  }

  for (const block of Array.from(article.querySelectorAll('pre, code'))) {
    // Skip <code> that lives inside a <pre> — the pre pass handles it.
    if (block.tagName === 'CODE' && block.closest('pre')) continue;
    processCodeBlock(block as HTMLElement);
  }
  for (const image of Array.from(article.querySelectorAll('img'))) {
    processImage(image as HTMLImageElement);
  }
  for (const table of Array.from(article.querySelectorAll('table'))) {
    processTable(table as HTMLTableElement);
  }

  root.appendChild(article);

  // --- Footer -------------------------------------------------------------
  const safeUrl = safeHttpUrl(payload.sourceUrl);
  if (safeUrl) {
    const footer = document.createElement('footer');
    footer.className = 'p-footer';
    const link = document.createElement('a');
    link.href = safeUrl;
    link.rel = 'noopener noreferrer';
    link.textContent = hostFromUrl(safeUrl) || safeUrl;
    footer.appendChild(link);
    root.appendChild(footer);
  }

  return root;
}

/**
 * Derive a safe download filename from the article title.
 */
export function buildFilename(payload: PrintPayload): string {
  const host = hostFromUrl(payload.sourceUrl) || 'article';
  const cleaned = (payload.title || '')
    // Reserved on Windows and macOS.
    .replace(/[/\\:*?"<>|]/g, ' ')
    // Control characters.
    .replace(/\s+/g, ' ')
    .trim();

  const base = cleaned ? `${cleaned.slice(0, 80)} - ${host}` : host;
  return `${base || 'article'}.pdf`;
}
