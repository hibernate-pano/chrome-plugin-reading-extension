/**
 * Popup Component for AI Reading Extension
 * Minimal design with reading mode toggle and state sync
 * Requirements: 1.1, 1.5, 6.1
 */

import React, { useEffect, useState, useCallback } from 'react';
import type { StateResponse } from '../shared/types';
import { MESSAGE_TYPES } from '../shared/constants';
import { getReadingHistory, type ReadingRecord } from '../shared/history';

/**
 * Simple toggle switch component
 * Inline implementation to avoid external dependencies
 */
interface SwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const Switch: React.FC<SwitchProps> = ({ id, checked, onChange, disabled }) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled) {
        onChange(!checked);
      }
    }
  };

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      onKeyDown={handleKeyDown}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center 
        rounded-full border-2 border-transparent transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50
        ${checked ? 'bg-blue-600' : 'bg-gray-200'}
      `}
    >
      <span
        className={`
          pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg 
          ring-0 transition-transform duration-200
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
};

/**
 * Get the current active tab
 */
async function getCurrentTab(): Promise<chrome.tabs.Tab | null> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0] ?? null;
  } catch (error) {
    console.error('[Popup] Failed to get current tab:', error);
    return null;
  }
}

/**
 * Send message to content script
 */
async function sendToContentScript<T>(
  tabId: number,
  type: string,
  payload?: unknown
): Promise<T | null> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type, payload });
    return response as T;
  } catch (error) {
    console.error('[Popup] Failed to send message:', error);
    return null;
  }
}

/**
 * Main Popup component
 * Displays reading mode toggle with state synchronization
 */
export const Popup: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [canExtract, setCanExtract] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize popup state from content script
   */
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

      // Check if we can communicate with content script
      const response = await sendToContentScript<StateResponse>(
        tab.id,
        MESSAGE_TYPES.GET_STATE
      );

      if (response) {
        setIsActive(response.isActive);
        setCanExtract(response.canExtract);
      } else {
        // Content script might not be injected yet
        setCanExtract(false);
        setError('请刷新页面后重试');
      }
    } catch (err) {
      console.error('[Popup] Initialization error:', err);
      setError('初始化失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Toggle reading mode
   */
  const toggleReadingMode = useCallback(async (enabled: boolean) => {
    // Optimistic update
    setIsActive(enabled);
    setError(null);

    try {
      const tab = await getCurrentTab();
      
      if (!tab?.id) {
        setIsActive(!enabled);
        setError('无法获取当前标签页');
        return;
      }

      const messageType = enabled
        ? MESSAGE_TYPES.ENABLE_READING_MODE
        : MESSAGE_TYPES.DISABLE_READING_MODE;

      const response = await sendToContentScript<{ success: boolean; error?: string }>(
        tab.id,
        messageType
      );

      if (!response?.success) {
        // Revert on failure
        setIsActive(!enabled);
        setError(response?.error ?? '操作失败');
      }
    } catch (err) {
      // Revert on error
      setIsActive(!enabled);
      setError('操作失败，请重试');
      console.error('[Popup] Toggle error:', err);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeState();
  }, [initializeState]);

  // Loading state
  if (isLoading) {
    return (
      <div className="popup-container popup-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="popup-container">
      {/* Header */}
      <header className="popup-header">
        <h1 className="popup-title">阅读助手</h1>
        <p className="popup-subtitle">专注内容，享受阅读</p>
      </header>

      {/* Main toggle */}
      <main className="popup-main">
        <div className={`toggle-card ${isActive ? 'active' : ''}`}>
          <div className="toggle-info">
            <label htmlFor="reading-mode-toggle" className="toggle-label">
              阅读模式
            </label>
            <span className={`toggle-status ${isActive ? 'active' : ''}`}>
              {isActive ? '已开启' : '已关闭'}
            </span>
          </div>
          <Switch
            id="reading-mode-toggle"
            checked={isActive}
            onChange={toggleReadingMode}
            disabled={!canExtract && !isActive}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {/* Cannot extract warning */}
        {!canExtract && !isActive && !error && (
          <div className="warning-message" role="status">
            此页面可能无法提取内容
          </div>
        )}
      </main>

      {/* Features list */}
      <section className="popup-features">
        <h2 className="features-title">功能特性</h2>
        <ul className="features-list">
          <li className="feature-item">
            <span className="feature-dot green" />
            <span>智能提取页面主要内容</span>
          </li>
          <li className="feature-item">
            <span className="feature-dot purple" />
            <span>自定义阅读样式设置</span>
          </li>
          <li className="feature-item">
            <span className="feature-dot amber" />
            <span>快速切换，即时生效</span>
          </li>
        </ul>
      </section>

      {/* Reading History - Pro Feature */}
      <ReadingHistorySection />

      {/* Footer */}
      <footer className="popup-footer">
        <span className="version">Version 1.9.0</span>
      </footer>
    </div>
  );
};

const ReadingHistorySection: React.FC = () => {
  const [history, setHistory] = useState<ReadingRecord[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    getReadingHistory().then(h => setHistory(h.slice(0, 5)));
  }, []);

  if (history.length === 0) return null;

  return (
    <section className="popup-history">
      <button 
        className="history-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>📚 阅读历史</span>
        <span className="history-count">{history.length}</span>
        <span className="history-arrow">{isExpanded ? '▼' : '▶'}</span>
      </button>
      
      {isExpanded && (
        <ul className="history-list">
          {history.map(record => (
            <li key={record.id} className="history-item">
              <a href={record.url} target="_blank" rel="noopener noreferrer">
                <span className="history-title">{record.title}</span>
                <span className="history-meta">
                  {record.siteName} · {record.readingTime}分钟
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default Popup;
