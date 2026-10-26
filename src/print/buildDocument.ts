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
 * Give every caption inside a figure the class the print stylesheet styles.
 */
function markCaptions(figure: Element): void {
  for (const caption of Array.from(figure.querySelectorAll('figcaption'))) {
    caption.classList.add('p-caption');
  }
}

/**
 * Tell whether a node is a caption element.
 */
function isCaption(node: Node): boolean {
  return node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'FIGCAPTION';
}

/**
 * Elements that render something of their own.
 *
 * An empty inline shell (`<span></span>`) shows nothing, so it must not keep
 * a paragraph alive on its own. A line break does render — the source had
 * that empty line on the screen, and the PDF has to show it too.
 */
const RENDERED_TAGS = new Set([
  'IMG',
  'BR',
  'HR',
  'TABLE',
  'SVG',
  'CANVAS',
  'VIDEO',
  'AUDIO',
  'IFRAME',
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'BUTTON',
  'EMBED',
  'OBJECT',
]);

/**
 * Tell whether an element still holds anything a reader would see.
 *
 * A paragraph that carried nothing but a picture is empty once the picture
 * moves into its figure, and an empty paragraph still spends its margins.
 * "Anything to see" means text, or an element that renders on its own — see
 * RENDERED_TAGS.
 */
function isBlank(element: Element): boolean {
  if ((element.textContent ?? '').trim() !== '') return false;
  for (const child of Array.from(element.querySelectorAll('*'))) {
    // tagName keeps its case for SVG and MathML elements, so compare in
    // upper case — an inline SVG must not pass for invisible.
    if (RENDERED_TAGS.has(child.tagName.toUpperCase())) return false;
  }
  return true;
}

/**
 * Wrap images in a figure and cap their height so a tall image cannot
 * overflow a single page and get clipped.
 *
 * The image is not the only thing worth printing. A caption and the prose
 * that shared a paragraph with the image used to disappear together with the
 * parent node, so the PDF showed less than the reader saw on screen. Each
 * branch therefore keeps whatever else the parent held.
 */
function processImage(image: HTMLImageElement): void {
  image.setAttribute('loading', 'eager');
  image.removeAttribute('width');
  image.removeAttribute('height');

  const parent = image.parentElement;

  // The closest figure ancestor is the unit of the picture, however deep the
  // image sits in it — WordPress writes <figure><div><img></div><figcaption>.
  // Reusing it is what keeps the document free of nested figures, which are
  // invalid HTML and would leave the outer figure without the margins and
  // the caption styles. The reader view centres a figure's content too, so
  // printing the figure as a whole matches what the screen shows.
  const figureAncestor = image.closest('figure');
  if (figureAncestor) {
    figureAncestor.classList.add('p-figure');
    markCaptions(figureAncestor);
    return;
  }

  if (parent?.tagName === 'P') {
    // A paragraph that mixes prose and a picture. The prose stays in
    // paragraphs and only the picture — with the caption that belongs to it
    // — becomes a figure. This branch applies to a picture that has no
    // figure ancestor: with one, that figure is the unit of the picture and
    // the prose is centred along with it, which is what the reader view
    // does too (.reader-content figure centres its content).
    const figure = document.createElement('figure');
    figure.className = 'p-figure';

    // Snapshot the children before the picture moves: the split is decided
    // on what the paragraph held, not on what is left of it afterwards.
    const nodes = Array.from(parent.childNodes);
    const imageIndex = nodes.indexOf(image);
    const trailing = nodes.slice(imageIndex + 1);

    figure.appendChild(image);

    // The caption belongs to the picture. A <figcaption> written inside the
    // paragraph is hoisted out of it by the HTML parser — a <p> may not hold
    // one — so it arrives as the paragraph's next sibling. Adopting it here
    // is safe: this branch only runs for a picture that has no figure
    // ancestor, and a legal <figcaption> always lives inside its own
    // figure, so the one found here was left on its own and belongs to this
    // picture.
    const caption = parent.nextElementSibling;
    if (caption && isCaption(caption)) {
      figure.appendChild(caption);
    }

    // The prose that followed the picture starts a second paragraph — a copy
    // of the first, so that whatever the paragraph carried (a language, a
    // direction) is carried over as well.
    let tail: HTMLParagraphElement | null = null;
    if (trailing.length > 0) {
      tail = parent.cloneNode(false) as HTMLParagraphElement;
      for (const node of trailing) {
        tail.appendChild(node);
      }
    }

    // The figure takes the paragraph's place and the second paragraph
    // follows it, so the order is the one the reader saw on screen.
    if (isBlank(parent)) {
      // The paragraph held nothing but the picture: it leaves no empty
      // paragraph behind.
      parent.replaceWith(figure);
    } else {
      parent.after(figure);
    }
    if (tail && !isBlank(tail)) {
      figure.after(tail);
    }

    markCaptions(figure);
    return;
  }

  // Any other container (a div, a link): the image is wrapped where it
  // stands, because replacing the container would take its siblings with it.
  const figure = document.createElement('figure');
  figure.className = 'p-figure';
  image.replaceWith(figure);
  figure.appendChild(image);
  markCaptions(figure);
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
