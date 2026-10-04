/**
 * CJK / Latin inter-script spacing.
 *
 * Chinese text set against Latin words or digits with nothing between them is
 * hard to read — the two scripts have different colour and rhythm, and the eye
 * gets no seam to land on. pangu.js solves it by rewriting the text; the
 * browser's own `text-autospace` solves it at layout time. The CSS property
 * needs Chrome 140 and this extension supports 102, so the gap is inserted
 * into the text instead, once, at extraction time.
 *
 * Doing it there rather than at render time is what keeps the two surfaces
 * honest: the PDF export page is built from the same extracted string, so it
 * inherits the spacing and screen text cannot drift from paper text.
 *
 * The rules are deliberately narrow — a space goes in only where a Han or kana
 * character directly touches a half-width letter or digit. Full-width
 * punctuation and full-width forms are *not* part of the CJK class here, so
 * `中文（React）` keeps its brackets tight instead of becoming `中文 （React）`.
 * Already-spaced text is left alone, which makes both functions idempotent:
 * running them twice, or running them on output that has passed through the
 * print page's own sanitizer, adds nothing.
 */

/**
 * Han ideographs (BMP, extension A, compatibility) plus kana.
 *
 * The compatibility block is included because font fallbacks emit it for some
 * traditional characters; leaving it out would space `說A` but not `說A`.
 */
const CJK = '\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff';

/** Han/kana immediately followed by a half-width letter or digit. */
const CJK_THEN_ALNUM = new RegExp(`([${CJK}])([0-9A-Za-z])`, 'g');

/** Half-width letter or digit immediately followed by Han/kana. */
const ALNUM_THEN_CJK = new RegExp(`([0-9A-Za-z])([${CJK}])`, 'g');

/**
 * Insert a space between directly adjacent CJK and half-width alphanumeric
 * characters in a plain string.
 *
 * Each pass inserts spaces, and inserting a space can only *break* an
 * adjacency, never create one — so the two passes cannot interfere and the
 * result is stable under re-running.
 *
 * @param text - Plain text (a title, an excerpt). Never pass HTML: the regex
 *   has no idea where tags are.
 * @returns The spaced text, or the input unchanged when there was nothing to do
 */
export function addCjkSpacing(text: string): string {
  if (!text) return text;

  return text.replace(CJK_THEN_ALNUM, '$1 $2').replace(ALNUM_THEN_CJK, '$1 $2');
}

/**
 * Apply {@link addCjkSpacing} to every text node in an HTML fragment.
 *
 * The fragment is parsed into an inert document and the text nodes are edited
 * in place, so tags and attribute values are never seen by the regex — the
 * failure mode of running it over a raw HTML string. Only text nodes change,
 * which means the walk is safe to do while iterating: nothing is inserted or
 * removed from the tree.
 *
 * `<pre>` and `<code>` are skipped. Their text is source code, where a space
 * is meaningful: it changes an indent, a string literal, or the shell command
 * the reader's copy button hands the user verbatim.
 *
 * @param html - Sanitized article HTML
 * @returns The same markup with inter-script spacing applied to its prose
 */
export function addCjkSpacingToHtml(html: string): string {
  if (!html) return html;

  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const walker = parsed.createTreeWalker(parsed.body, NodeFilter.SHOW_TEXT);

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    if (text.parentElement?.closest('pre, code')) continue;

    const spaced = addCjkSpacing(text.nodeValue ?? '');
    // Writing an unchanged value would still dirty the node; skip the write so
    // an article with no mixed-script text costs a walk and nothing else.
    if (spaced !== text.nodeValue) text.nodeValue = spaced;
  }

  return parsed.body.innerHTML;
}
