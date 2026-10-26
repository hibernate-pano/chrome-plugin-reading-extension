/**
 * Pure DOM primitives for the print-tail trim.
 *
 * The trim lets the reader drop the tail of an article — everything from a
 * given page onwards — before printing, so a long article can be printed as
 * the part that is actually wanted. What that needs is tree surgery, not
 * layout: the blocks have already been placed, and removing one removes its
 * whole box.
 *
 * Nothing here measures anything or writes a style. The trim runs against a
 * document that has already been laid out, and re-measuring after every cut
 * would make the interaction slow for no gain. It also means the whole module
 * can be tested in jsdom, which has no layout engine.
 */

import { collectFlowBlocks } from './paginate';
import { PAGE_CLONE_CLASS } from './renderSheets';

/**
 * A node that was detached by `cutTrailingFrom`, with enough context to put
 * it back exactly where it was.
 */
export interface RemovedNode {
  /** The node the removed node was attached to. */
  parent: Node;
  /** The sibling that followed it when it was removed, if any. */
  next: Node | null;
  /** The node that was removed. */
  node: Node;
}

/**
 * Give every flow block in `content` a stable `data-p-block` id.
 *
 * The id is what lets a clone on a sheet be traced back to the block it was
 * copied from, and it is what names a cut point. Ids are handed out in
 * document order over the *flow* blocks — the same units the paginator
 * measures — so wrappers and inline elements are left alone: a wrapper has no
 * box of its own, and an inline element is part of the block around it.
 *
 * Calling this twice renumbers from scratch; the caller is expected to call it
 * once per rendered document.
 *
 * @param content The article body whose blocks are labelled.
 */
export function assignBlockIds(content: HTMLElement): void {
  const blocks = collectFlowBlocks(content);
  blocks.forEach((block, index) => {
    block.dataset.pBlock = `b${index + 1}`;
  });
}

/**
 * Remove `target` and everything after it inside `root`. Returns what was removed.
 *
 * "Everything after it" is document order, so the cut runs up the ancestor
 * chain: the target goes first, together with every sibling after it, and
 * then each of its ancestors loses its own trailing siblings. An ancestor is
 * kept — it may still hold the content that came *before* the target — but
 * what followed it in the flow is gone, because that came after the target.
 *
 * @param root The document the cut happens in.
 * @param target The node the document is cut at. Must be a descendant of `root`.
 * @returns Every node that was detached, in removal order. Hand it to
 *   `restoreRemoved` to undo the cut.
 */
export function cutTrailingFrom(root: HTMLElement, target: Node): RemovedNode[] {
  // The root itself is not a cut point: cutting "at the root" would mean
  // cutting the whole document, and a target from outside the root belongs to
  // a different document entirely.
  if (target === root || !root.contains(target)) return [];

  const removed: RemovedNode[] = [];

  // The target's parent is captured *before* anything is detached: removing
  // the target takes its parent with it, and the ancestor walk below starts
  // from that parent.
  const parent = target.parentNode;
  if (parent === null) return [];

  // Level 0 — the target itself, and every sibling after it.
  for (let node: Node | null = target; node !== null; ) {
    const next: ChildNode | null = node.nextSibling;
    parent.removeChild(node);
    removed.push({ parent, next, node });
    node = next;
  }

  // Each ancestor above keeps what came before the target but loses its
  // trailing siblings, which sat after the target in the flow — so a cut
  // inside a wrapper also drops whatever followed the wrapper. The ancestors
  // themselves are never removed: an emptied wrapper is harmless, and pruning
  // it would take the content before the target with it.
  for (
    let ancestor: Node | null = parent;
    ancestor !== null && ancestor !== root;
    ancestor = ancestor.parentNode
  ) {
    const ancestorParent = ancestor.parentNode;
    if (ancestorParent === null) break;
    for (let node = ancestor.nextSibling; node !== null; ) {
      const next: ChildNode | null = node.nextSibling;
      ancestorParent.removeChild(node);
      removed.push({ parent: ancestorParent, next, node });
      node = next;
    }
  }

  return removed;
}

/**
 * Put back what `cutTrailingFrom` removed, in reverse order.
 *
 * Reverse order is not cosmetic. A cut removes several siblings in a row, and
 * each record remembers the sibling that followed it — so the node has to go
 * back *in front of* that sibling, and that sibling is only in place again
 * once it has been restored itself. Restoring forwards would put the nodes
 * back in reverse order.
 */
export function restoreRemoved(removed: RemovedNode[]): void {
  for (let i = removed.length - 1; i >= 0; i -= 1) {
    const entry = removed[i];
    if (entry === undefined) continue;
    const { parent, next, node } = entry;
    if (next !== null && next.parentNode === parent) {
      parent.insertBefore(node, next);
    } else {
      parent.appendChild(node);
    }
  }
}

/**
 * Whether a block clone starts on this page (rather than continuing from the previous one).
 *
 * A page cut in the middle of a long block carries that block on both sides:
 * the copy on the later page continues the one before it, and must not be
 * treated as a cut point — cutting there would throw away the part of the
 * block that did fit. The copy's own document offset tells the two apart: a
 * block that begins on the page has an offset of exactly the page start, a
 * continuing one has a smaller offset.
 *
 * The tolerance is half a pixel and it is *subtractive*. A block that begins
 * exactly at the boundary is a block that starts here, so the test is
 * `docTop >= pageStart - 0.5`; a continuing copy sits strictly below the
 * boundary and stays excluded either way.
 *
 * @param block The block clone on a sheet.
 * @param pageStart The document offset at which the page begins.
 */
export function startsOnPage(block: HTMLElement, pageStart: number): boolean {
  const top = Number(block.dataset.docTop);
  return Number.isFinite(top) && top >= pageStart - 0.5;
}

/**
 * The block clones a sheet carries, in document order.
 *
 * Only the direct children of the sheet's block container count. The sheet
 * also holds the page number, and the first page holds the title and the
 * metadata — none of which are article blocks. A clone without a block id is
 * skipped for the same reason: the header and the footer carry no id.
 */
function blockClones(sheet: HTMLElement): HTMLElement[] {
  const container = sheet.querySelector(`.${PAGE_CLONE_CLASS}`);
  if (container === null) return [];

  return Array.from(container.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.hasAttribute('data-p-block')
  );
}

/**
 * The first block on a page that may be cut — a block that starts there.
 *
 * @param sheet The rendered sheet.
 * @param pageStart The document offset at which the page begins.
 * @returns The first cuttable block on the page, or `null` when the page has
 *   no block boundary at all.
 */
export function firstTrimTarget(sheet: HTMLElement, pageStart: number): HTMLElement | null {
  for (const block of blockClones(sheet)) {
    if (startsOnPage(block, pageStart)) return block;
  }
  return null;
}

/**
 * Mark the cuttable blocks on a sheet and give it its page shortcut.
 *
 * The shortcut is a button on the paper itself rather than in the toolbar:
 * what is being cut is a *page*, so the control has to sit on the page it
 * cuts. It is disabled on a page that carries nothing but the tail of a long
 * block, because there is no block boundary there to cut at — cutting such a
 * page would leave the reader with half a paragraph and no way to ask for the
 * rest.
 *
 * The button is found by its `data-trim-page` marker; the page it acts on is
 * the sheet the button lives on.
 *
 * @param sheet The rendered sheet to decorate.
 * @returns The shortcut button, so the caller can wire it up or inspect it.
 */
export function decorateSheetForTrim(sheet: HTMLElement): HTMLButtonElement {
  const pageStart = Number(sheet.dataset.pageStart);

  for (const block of blockClones(sheet)) {
    if (startsOnPage(block, pageStart)) block.dataset.trimEligible = 'true';
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'p-sheet__trim';
  button.dataset.trimPage = '';
  button.textContent = '删除本页及之后';

  if (firstTrimTarget(sheet, pageStart) === null) {
    button.disabled = true;
    button.title = '本页由上一页的长内容延续，请用段落级截断';
  }

  sheet.appendChild(button);
  return button;
}
