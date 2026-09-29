/**
 * Shared HTML Sanitizer
 *
 * One sanitizer for every place article HTML is turned back into live DOM:
 * the reader view (`dangerouslySetInnerHTML`) and the print document. Before
 * this existed the two paths disagreed — print stripped scripts and event
 * handlers, the reader did not — which hid an assumption that the source page
 * is always benign. Both now go through the same function.
 *
 * The HTML is parsed with DOMParser, which produces an *inert* document: no
 * script runs, no image is fetched, no `on*` handler fires while we walk it.
 * We only ever look at attributes and remove nodes, then hand back a string.
 *
 * Threat model: the input comes from a page the user is already looking at, so
 * this is defense in depth and path consistency, not privilege escalation. It
 * removes the easy payloads (inline handlers, `javascript:` links, fixed
 * positioning that would escape the reader column) so a later refactor cannot
 * quietly reintroduce them on one path only.
 */

/**
 * Elements dropped entirely — subtree included.
 *
 * A `<form>` can submit elsewhere and a `<base>` rewrites every relative URL
 * in the fragment, so both go rather than get unwrapped. SVG/MathML are
 * removed as whole subtrees because they carry their own scripting surface
 * (`<script>` inside `<svg>`, `<animate attributeName=href>`, event
 * attributes that are not spelled `on*`).
 */
const DANGEROUS_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'FORM',
  'SVG',
  'MATH',
  'LINK',
  'META',
  'BASE',
  'TEMPLATE',
]);

/**
 * Presentational and positional attributes removed from every element.
 *
 * `style` alone is enough to break the reader: `position:fixed` escapes the
 * column and paints over the toolbar, `z-index` stacks a fake dialog on top.
 * `width`/`height` do the same thing without CSS. `class` and `id` are dropped
 * so page CSS (and page scripts watching the DOM) cannot reach into ours.
 */
const STRIPPED_ATTRS = new Set([
  'style',
  'class',
  'id',
  'width',
  'height',
  'loading',
  'srcset',
  'sizes',
  'decoding',
]);

/** Attributes whose value is a URL and therefore needs a scheme check. */
const URL_ATTRS = new Set(['href', 'src', 'action', 'formaction', 'xlink:href', 'poster']);

/** Schemes an article may point at. */
const SAFE_SCHEMES = new Set(['http', 'https']);

/** A scheme only counts as such when it starts the value: `/a:b` is a path. */
const SCHEME_RE = /^([a-z][a-z0-9+.-]*):/i;

/** Inline `data:` images are legitimate article content. `data:text/html` is not. */
const DATA_IMAGE_RE = /^data:image\//i;

/** Named references that browsers decode inside a URL before resolving it. */
const NAMED_ENTITIES: Record<string, string> = {
  colon: ':',
  tab: '\t',
  newline: '\n',
};

/**
 * ASCII control characters and space - stripped before a scheme check.
 *
 * Matching control characters is the whole point: browsers ignore them when
 * resolving a URL, so a tab inside `java<TAB>script:` and a leading NUL have to
 * be seen through rather than passed on.
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = /[\u0000-\u0020\u007F]/g;

function fromCodePoint(code: number): string {
  // Lone surrogates and out-of-range values would throw; they are never valid
  // in a URL anyway, so drop them.
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

/**
 * Decode the entity forms a URL check has to see through.
 *
 * DOMParser already decodes well-formed references, so this is belt and
 * braces for a payload that survived as a literal `&#106;avascript:` — the
 * browser decodes it a second time at navigation time. The trailing `;` is
 * optional because browsers accept `&#106avascript:` and decode the digits
 * before the scheme even starts.
 */
function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec) => fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

/**
 * Normalize a URL value the way a browser would before it picks a scheme.
 *
 * `"  jAvAsCrIpT:alert(1)"`, `"java\tscript:alert(1)"` and a leading NUL all
 * resolve to `javascript:alert(1)`. The normalized value is used only for the
 * decision — the attribute itself is never rewritten, so a legitimate URL
 * keeps its original bytes.
 */
function normalizeForSchemeCheck(raw: string): string {
  const withoutControls = raw.replace(CONTROL_CHARS_RE, '');
  return decodeEntities(withoutControls).replace(CONTROL_CHARS_RE, '');
}

/**
 * Decide whether a URL-bearing attribute may keep its value.
 *
 * A value with no scheme (`/img.png`, `#section`, `//cdn/x`) is relative and
 * resolves to the page's own http(s) origin, so it is safe to keep.
 */
function isSafeUrlValue(raw: string, attrName: string): boolean {
  const value = normalizeForSchemeCheck(raw);
  if (value === '') return true;

  const match = SCHEME_RE.exec(value);
  if (!match) return true;

  const scheme = match[1].toLowerCase();
  if (SAFE_SCHEMES.has(scheme)) return true;

  // A `data:` image on a `src` is normal article content (inline screenshots,
  // pasted data URIs). It is loaded in a media context that never parses it as
  // a document, so even `data:image/svg+xml` cannot script there. `data:` on
  // `href` is a different story — navigating to it is a document load — and
  // stays blocked.
  if (scheme === 'data' && attrName === 'src') {
    return DATA_IMAGE_RE.test(value);
  }

  return false;
}

/**
 * Strip scripts, event handlers, hostile URLs and layout escapes from an
 * article HTML fragment.
 *
 * Content-bearing markup (`p`, headings, lists, quotes, `a[href]`, `img[src]`,
 * `pre`/`code`, tables, figures, inline text elements) is preserved as-is.
 * The function is idempotent: sanitizing already-sanitized HTML is a no-op,
 * so it is safe to run on a value that may have been sanitized elsewhere.
 *
 * @param html - Untrusted HTML, typically Readability output
 * @returns A sanitized HTML string
 */
export function sanitizeArticleHtml(html: string): string {
  if (typeof html !== 'string' || html.length === 0) return '';

  // DOMParser builds a document that is never navigated, so nothing in it runs.
  const parsed = new DOMParser().parseFromString(html, 'text/html');

  const doomed: Element[] = [];

  for (const element of Array.from(parsed.querySelectorAll('*'))) {
    // Foreign content reports its tag name verbatim (`svg`, `foreignObject`),
    // so compare case-insensitively.
    const tagName = element.tagName.toUpperCase();
    if (DANGEROUS_TAGS.has(tagName)) {
      doomed.push(element);
      continue;
    }

    for (const attr of Array.from(element.attributes)) {
      const name = attr.name.toLowerCase();

      if (name.startsWith('on') || STRIPPED_ATTRS.has(name)) {
        element.removeAttribute(attr.name);
        continue;
      }

      if (URL_ATTRS.has(name) && !isSafeUrlValue(attr.value, name)) {
        element.removeAttribute(attr.name);
      }
    }
  }

  // Remove after the walk: a dangerous element's descendants are still in the
  // snapshot, and stripping attributes on an already-detached node is a no-op.
  for (const element of doomed) {
    element.remove();
  }

  // head is dropped wholesale — a fragment never needs <title> or <meta>.
  return parsed.body.innerHTML;
}
