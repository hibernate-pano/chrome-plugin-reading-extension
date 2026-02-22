/**
 * Text Selection Handler
 * Shows a popup when user selects text in the reader
 */

import { createRoot, type Root } from 'react-dom/client';

let popupRoot: Root | null = null;
let popupContainer: HTMLDivElement | null = null;

/**
 * Initialize text selection handler
 */
export function initTextSelection(): void {
  document.addEventListener('mouseup', handleTextSelect);
  document.addEventListener('keyup', handleTextSelect);
}

/**
 * Cleanup text selection handler
 */
export function cleanupTextSelection(): void {
  document.removeEventListener('mouseup', handleTextSelect);
  document.removeEventListener('keyup', handleTextSelect);
  removePopup();
}

/**
 * Handle text selection
 */
function handleTextSelect(): void {
  const selection = window.getSelection();
  const selectedText = selection?.toString().trim();
  
  if (!selectedText || selectedText.length < 3) {
    removePopup();
    return;
  }
  
  // Get selection position
  const range = selection?.getRangeAt(0);
  if (!range) return;
  
  const rect = range.getBoundingClientRect();
  showPopup(rect, selectedText);
}

/**
 * Show the selection popup
 */
function showPopup(rect: DOMRect, text: string): void {
  removePopup();
  
  // Create popup container
  popupContainer = document.createElement('div');
  popupContainer.className = 'reader-selection-popup';
  popupContainer.style.cssText = `
    position: fixed;
    left: ${rect.left + window.scrollX + rect.width / 2}px;
    top: ${rect.top + window.scrollY - 40}px;
    transform: translateX(-50%);
    background: var(--reader-bg, #fff);
    border: 1px solid var(--reader-border, #ddd);
    border-radius: 8px;
    padding: 6px 12px;
    display: flex;
    gap: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.15);
    z-index: 10000;
    font-size: 14px;
  `;
  
  // Copy button
  const copyBtn = document.createElement('button');
  copyBtn.textContent = '📋 Copy';
  copyBtn.style.cssText = `
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    color: var(--reader-text, #333);
  `;
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(text);
    copyBtn.textContent = '✅ Copied!';
    setTimeout(() => {
      copyBtn.textContent = '📋 Copy';
    }, 1500);
  };
  
  // Quote button
  const quoteBtn = document.createElement('button');
  quoteBtn.textContent = '💬 Quote';
  quoteBtn.style.cssText = copyBtn.style.cssText;
  quoteBtn.onclick = () => {
    navigator.clipboard.writeText(`"${text}"`);
    quoteBtn.textContent = '✅ Copied!';
    setTimeout(() => {
      quoteBtn.textContent = '💬 Quote';
    }, 1500);
  };
  
  popupContainer.appendChild(copyBtn);
  popupContainer.appendChild(quoteBtn);
  document.body.appendChild(popupContainer);
}

/**
 * Remove the popup
 */
function removePopup(): void {
  if (popupContainer) {
    popupContainer.remove();
    popupContainer = null;
  }
}
