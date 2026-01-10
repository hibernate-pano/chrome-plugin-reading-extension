/**
 * Popup Entry Point for AI Reading Extension
 * Sets up React rendering and imports styles
 * Requirements: 1.1
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Popup } from './Popup';
import './styles.css';

/**
 * Initialize the popup application
 */
function initializePopup(): void {
  const container = document.getElementById('root');
  
  if (!container) {
    console.error('[Popup] Root container not found');
    return;
  }

  const root = createRoot(container);
  
  root.render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>
  );
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  initializePopup();
}
