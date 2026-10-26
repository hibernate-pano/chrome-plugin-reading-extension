import { describe, it, expect } from 'vitest';
import {
  assignBlockIds,
  cutTrailingFrom,
  restoreRemoved,
  startsOnPage,
  firstTrimTarget,
  decorateSheetForTrim,
} from '../../src/print/trim';

function content(html: string): HTMLElement {
  const root = document.createElement('div');
  root.className = 'p-content';
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

/** A sheet built by hand: a page start and one clone per block. */
function sheet(pageStart: number, blocks: Array<[string, string]>): HTMLElement {
  const el = document.createElement('div');
  el.className = 'p-sheet';
  el.dataset.pageStart = String(pageStart);
  const content = document.createElement('div');
  content.className = 'p-sheet__content';
  for (const [id, top] of blocks) {
    const clone = document.createElement('p');
    clone.dataset.pBlock = id;
    clone.dataset.docTop = top;
    content.appendChild(clone);
  }
  el.appendChild(content);
  document.body.appendChild(el);
  return el;
}

describe('assignBlockIds', () => {
  it('numbers the flow blocks and leaves wrappers and inline elements alone', () => {
    const root = content('<p>一</p><div><p>二</p><p>三</p></div><p>四 <em>x</em></p>');

    assignBlockIds(root);

    const ids = Array.from(root.querySelectorAll('[data-p-block]')).map((el) =>
      el.getAttribute('data-p-block')
    );
    expect(ids).toEqual(['b1', 'b2', 'b3', 'b4']);
    expect(root.querySelector('div')?.hasAttribute('data-p-block')).toBe(false);
    expect(root.querySelector('em')?.hasAttribute('data-p-block')).toBe(false);
  });
});

describe('cutTrailingFrom', () => {
  it('removes the target and everything after it', () => {
    const root = content('<p>一</p><p>二</p><p>三</p>');
    const target = root.children[1] as HTMLElement;

    const removed = cutTrailingFrom(root, target);

    expect(root.textContent).toBe('一');
    expect(removed.length).toBe(2);
  });

  it('keeps the ancestor and the content before the target inside it', () => {
    const root = content('<div><p>一</p><p>二</p><p>三</p></div><p>四</p>');
    const target = root.querySelectorAll('p')[1] as HTMLElement;

    cutTrailingFrom(root, target);

    expect(root.querySelector('div')?.textContent).toBe('一');
    // The `<p>四</p>` sat after the target in the flow — it followed the
    // wrapper the target lives in — so it goes too. A cut means "nothing
    // after this block prints", and a paragraph that follows the wrapper is
    // still after the block.
    expect(root.textContent).toBe('一');
  });

  it('removes a bare text node that follows the target', () => {
    const root = content('<p>一</p>尾巴');
    const target = root.children[0] as HTMLElement;

    cutTrailingFrom(root, target);

    expect(root.textContent).toBe('');
  });

  it('refuses a target outside the root', () => {
    const root = content('<p>一</p>');
    const stranger = document.createElement('p');

    expect(cutTrailingFrom(root, stranger)).toEqual([]);
    expect(root.textContent).toBe('一');
  });

  it('refuses the root itself as a target', () => {
    const root = content('<p>一</p>');

    expect(cutTrailingFrom(root, root)).toEqual([]);
    expect(root.textContent).toBe('一');
  });

  it('cuts through every level of the ancestor chain', () => {
    const root = content('<div><section><p>一</p><p>二</p></section><p>三</p></div><p>四</p>');
    const target = root.querySelectorAll('p')[1] as HTMLElement;

    const removed = cutTrailingFrom(root, target);

    // Every ancestor loses its trailing siblings, because all of them sat
    // after the target in the flow — the section's sibling and the div's.
    expect(root.textContent).toBe('一');
    expect(root.innerHTML).toBe('<div><section><p>一</p></section></div>');
    expect(removed.length).toBe(3);
  });

  it('keeps an ancestor even when nothing is left inside it', () => {
    const root = content('<div><p>一</p><p>二</p></div>');
    const target = root.querySelectorAll('p')[0] as HTMLElement;

    cutTrailingFrom(root, target);

    // The wrapper survives empty rather than being pruned: pruning it would
    // take the content before the target with it on the next cut.
    expect(root.innerHTML).toBe('<div></div>');
  });
});

describe('restoreRemoved', () => {
  it('puts the document back exactly as it was', () => {
    const root = content('<p>一</p><div><p>二</p><p>三</p></div><p>四</p>');
    const before = root.innerHTML;
    const target = root.querySelectorAll('p')[1] as HTMLElement;

    const removed = cutTrailingFrom(root, target);
    restoreRemoved(removed);

    expect(root.innerHTML).toBe(before);
  });

  it('survives three cut/restore cycles without losing a node', () => {
    const root = content('<p>一</p><p>二</p><p>三</p><p>四</p>');
    const before = root.innerHTML;

    for (let i = 0; i < 3; i += 1) {
      const target = root.querySelectorAll('p')[1] as HTMLElement;
      restoreRemoved(cutTrailingFrom(root, target));
    }

    expect(root.innerHTML).toBe(before);
  });

  it('puts back the content that followed a nested wrapper', () => {
    const root = content('<div><section><p>一</p><p>二</p></section><p>三</p></div><p>四</p>');
    const before = root.innerHTML;
    const target = root.querySelectorAll('p')[1] as HTMLElement;

    const removed = cutTrailingFrom(root, target);
    restoreRemoved(removed);

    // The removals made one level down (the section's sibling) and two levels
    // up (the div's sibling) are restored along with the target's own.
    expect(root.innerHTML).toBe(before);
  });
});

describe('startsOnPage', () => {
  it('accepts a block that begins exactly on the page boundary', () => {
    const block = document.createElement('p');
    block.dataset.docTop = '500';
    expect(startsOnPage(block, 500)).toBe(true);
  });

  it('rejects a block that continues from the previous page', () => {
    const block = document.createElement('p');
    block.dataset.docTop = '450';
    expect(startsOnPage(block, 500)).toBe(false);
  });

  it('rejects a block that carries no offset at all', () => {
    const block = document.createElement('p');
    expect(startsOnPage(block, 500)).toBe(false);
  });

  it('rejects a block whose offset is empty', () => {
    const block = document.createElement('p');
    block.dataset.docTop = '';
    expect(startsOnPage(block, 0)).toBe(false);
  });

  it('rejects a block whose offset is not a number', () => {
    const block = document.createElement('p');
    block.dataset.docTop = 'top';
    expect(startsOnPage(block, 500)).toBe(false);
  });
});

describe('firstTrimTarget', () => {
  it('picks the first block that starts on the page', () => {
    const el = sheet(500, [
      ['b1', '400'],
      ['b2', '500'],
    ]);
    expect(firstTrimTarget(el, 500)?.dataset.pBlock).toBe('b2');
  });

  it('returns nothing when the whole page continues a long block', () => {
    const el = sheet(500, [['b1', '400']]);
    expect(firstTrimTarget(el, 500)).toBeNull();
  });

  it('ignores blocks that carry no id', () => {
    const el = sheet(0, [['b1', '0']]);
    const header = document.createElement('h1');
    el.querySelector('.p-sheet__content')?.prepend(header);
    expect(firstTrimTarget(el, 0)?.dataset.pBlock).toBe('b1');
  });

  it('returns nothing on a sheet that rendered no blocks at all', () => {
    const el = document.createElement('div');
    el.className = 'p-sheet';
    el.dataset.pageStart = '0';
    document.body.appendChild(el);

    expect(firstTrimTarget(el, 0)).toBeNull();
  });
});

describe('decorateSheetForTrim', () => {
  it('marks only the blocks that start on the page as cuttable', () => {
    const el = sheet(500, [
      ['b1', '400'],
      ['b2', '500'],
    ]);

    decorateSheetForTrim(el);

    const eligible = Array.from(el.querySelectorAll('[data-trim-eligible]')).map((node) =>
      node.getAttribute('data-p-block')
    );
    expect(eligible).toEqual(['b2']);
  });

  it('gives the page a shortcut that cuts from the first block that starts there', () => {
    const el = sheet(500, [
      ['b1', '400'],
      ['b2', '500'],
    ]);

    const button = decorateSheetForTrim(el);

    expect(button.textContent).toBe('删除本页及之后');
    expect(button.disabled).toBe(false);
    expect(button.hasAttribute('data-trim-page')).toBe(true);
  });

  it('disables the shortcut on a page that only continues a long block', () => {
    const el = sheet(500, [['b1', '400']]);

    const button = decorateSheetForTrim(el);

    expect(button.disabled).toBe(true);
    expect(button.getAttribute('title')).toContain('延续');
  });

  it('disables the shortcut on a sheet that rendered no blocks at all', () => {
    const el = document.createElement('div');
    el.className = 'p-sheet';
    document.body.appendChild(el);

    const button = decorateSheetForTrim(el);

    expect(button.disabled).toBe(true);
  });
});
