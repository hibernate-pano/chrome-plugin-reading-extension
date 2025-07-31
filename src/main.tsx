import React from 'react';
import ReactDOM from 'react-dom/client';
import PopupMD3 from './popup/PopupMD3';
import './index.css';
import './popup/popup.css';
import './design-system/styles/material-theme.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PopupMD3 />
  </React.StrictMode>,
);
