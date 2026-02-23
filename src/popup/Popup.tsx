/**
 * Popup Component — Clean Reading Assistant
 */

import React, { useEffect, useState, useCallback } from 'react';
import type { StateResponse } from '../shared/types';
import { MESSAGE_TYPES } from '../shared/constants';

async function getCurrentTab(): Promise<chrome.tabs.Tab | null> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] ?? null;
  } catch {
    return null;
  }
}

async function sendToContentScript<T>(tabId: number, type: string): Promise<T | null> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type });
    return response as T;
  } catch {
    return null;
  }
}

export const Popup: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [canExtract, setCanExtract] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeState = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const tab = await getCurrentTab();
      if (!tab?.id) {
        setError('无法获取当前标签页');
        setIsLoading(false);
        return;
      }
      const response = await sendToContentScript<StateResponse>(tab.id, MESSAGE_TYPES.GET_STATE);
      if (response) {
        setIsActive(response.isActive);
        setCanExtract(response.canExtract);
      } else {
        setCanExtract(false);
        setError('请刷新页面后重试');
      }
    } catch {
      setError('初始化失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleReadingMode = useCallback(async (enabled: boolean) => {
    setIsActive(enabled);
    setError(null);
    try {
      const tab = await getCurrentTab();
      if (!tab?.id) {
        setIsActive(!enabled);
        setError('无法获取当前标签页');
        return;
      }
      const messageType = enabled ? MESSAGE_TYPES.ENABLE_READING_MODE : MESSAGE_TYPES.DISABLE_READING_MODE;
      const response = await sendToContentScript<{ success: boolean; error?: string }>(tab.id, messageType);
      if (!response?.success) {
        setIsActive(!enabled);
        setError(response?.error ?? '操作失败');
      }
    } catch {
      setIsActive(!enabled);
      setError('操作失败，请重试');
    }
  }, []);

  useEffect(() => {
    initializeState();
  }, [initializeState]);

  if (isLoading) {
    return (
      <div className="popup-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="popup-container">
      <header className="popup-header">
        <div className="popup-logo">
          <BookIcon />
        </div>
        <div>
          <h1 className="popup-title">阅读助手</h1>
          <p className="popup-subtitle">专注内容，享受阅读</p>
        </div>
      </header>

      <main className="popup-main">
        <button
          className={`toggle-card${isActive ? ' active' : ''}`}
          onClick={() => !(!canExtract && !isActive) && toggleReadingMode(!isActive)}
          disabled={!canExtract && !isActive}
          type="button"
          aria-pressed={isActive}
        >
          <div className="toggle-info">
            <span className="toggle-label">阅读模式</span>
            <span className={`toggle-status${isActive ? ' active' : ''}`}>
              {isActive ? '已开启' : '已关闭'}
            </span>
          </div>
          <div className={`toggle-switch${isActive ? ' on' : ''}`} aria-hidden="true">
            <div className="toggle-thumb" />
          </div>
        </button>

        {error && (
          <p className="message error" role="alert">{error}</p>
        )}
        {!canExtract && !isActive && !error && (
          <p className="message warning" role="status">此页面可能无法提取内容</p>
        )}
      </main>

      <footer className="popup-footer">
        <span className="version">v2.9.0</span>
      </footer>
    </div>
  );
};

function BookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export default Popup;
