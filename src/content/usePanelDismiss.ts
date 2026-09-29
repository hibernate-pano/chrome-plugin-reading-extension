/**
 * Shared dismissal behaviour for the reader's floating panels.
 *
 * The settings and history panels are both modal dialogs floating over the
 * reader, so both need the same three things: Escape to close, a focus trap,
 * and a click-outside dismissal that survives Shadow DOM retargeting. Keeping
 * one implementation is the point — two copies of a focus trap drift, and the
 * drifted one is always the panel whose Tab key walks focus into the page
 * behind it.
 */

import { useEffect, type RefObject } from 'react';

/**
 * The elements Tab can reach inside `container`, in DOM order.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'button:not([disabled])',
    'input:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    'a[href]',
    'select:not([disabled])',
    'textarea:not([disabled])',
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(selector));
}

export interface PanelDismissOptions {
  /** The dialog root. Its root node is what the listeners are attached to. */
  panelRef: RefObject<HTMLElement>;
  /** Called for Escape and for a mousedown outside the panel. */
  onClose: () => void;
  /**
   * Selector for the control that opened the panel. A mousedown on it is a
   * toggle, not a dismissal, so it must not close on `mousedown` and then
   * toggle again on `click`.
   */
  ignoreOutsideSelector?: string;
}

/**
 * Wire Escape-to-close, a Tab focus trap and click-outside to a floating panel.
 *
 * Listeners go on the panel's root node rather than on `document`: inside a
 * Shadow DOM a document-level listener sees events retargeted to the shadow
 * host, so `panel.contains(event.target)` is false for every click inside the
 * panel and the panel would close under the user's cursor.
 */
export function usePanelDismiss({
  panelRef,
  onClose,
  ignoreOutsideSelector,
}: PanelDismissOptions): void {
  useEffect(() => {
    function handleClickOutside(event: Event) {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (panelRef.current && !panelRef.current.contains(target)) {
        if (ignoreOutsideSelector && target.closest?.(ignoreOutsideSelector)) return;
        onClose();
      }
    }

    const root = panelRef.current?.getRootNode() ?? document;
    root.addEventListener('mousedown', handleClickOutside);
    return () => root.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, ignoreOutsideSelector, panelRef]);

  useEffect(() => {
    function handleKeyDown(event: Event) {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key === 'Escape') {
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        onClose();
        return;
      }

      if (keyboardEvent.key === 'Tab' && panelRef.current) {
        const focusableElements = getFocusableElements(panelRef.current);
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const root = panelRef.current.getRootNode() as ShadowRoot | Document;
        const active = root.activeElement;

        // Focus is outside the trap, or nowhere at all.
        //
        // Clicking panel content that is not focusable — a heading, a
        // paragraph, the padding — drops focus to <body>, so `active` is null
        // and neither the first nor the last element matches. Without this
        // branch Tab walks straight out of an `aria-modal="true"` dialog into
        // the host page behind it, and Escape stops working too, because the
        // panel's own listener never sees the keydown. Re-entering from the
        // correct end keeps the trap closed.
        const focusEscaped = active === null || !panelRef.current.contains(active);

        if (focusEscaped) {
          keyboardEvent.preventDefault();
          (keyboardEvent.shiftKey ? lastElement : firstElement).focus();
          return;
        }

        if (keyboardEvent.shiftKey) {
          if (active === firstElement) {
            keyboardEvent.preventDefault();
            lastElement.focus();
          }
        } else {
          if (active === lastElement) {
            keyboardEvent.preventDefault();
            firstElement.focus();
          }
        }
      }
    }

    const root = panelRef.current?.getRootNode() ?? document;
    root.addEventListener('keydown', handleKeyDown, true);
    return () => root.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose, panelRef]);
}
