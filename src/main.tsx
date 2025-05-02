import React from 'react';
import ReactDOM from 'react-dom/client';
import NewPopup from './popup/NewPopup';
import './index.css';
import './popup/newPopup.css';
// 使用简化版 store 和预设

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NewPopup />
  </React.StrictMode>,
);
