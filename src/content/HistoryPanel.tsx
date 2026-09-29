/**
 * HistoryPanel Component
 * Floating panel listing the reading history the extension has been storing in
 * `chrome.storage.local`. It is the only place those records can be seen,
 * opened again or erased — the data is written on every article the user opens
 * in reading mode, so it has to be visible and removable to be acceptable.
 *
 * The panel is presentational: it owns only the transient interaction state
 * (is a destructive clear-all awaiting confirmation), and the records
 * themselves arrive as a prop from `ReaderView`, which in turn gets them from
 * `src/content/index.ts`. Nothing here touches `chrome.*`.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import type { ReadingRecord } from '../shared/history';
import { usePanelDismiss } from './usePanelDismiss';

interface HistoryPanelProps {
  /** Stored records, newest first — the panel sorts defensively anyway. */
  records: ReadingRecord[];
  /** Storage has not answered yet, so there is nothing truthful to list. */
  loading: boolean;
  /** Set when a delete or clear failed; storage still holds the record. */
  error: string | null;
  onDelete: (recordId: string) => void;
  onClear: () => void;
  onClose: () => void;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Reduce a stored URL to the only form allowed to become a link.
 *
 * Records are written from `window.location.href`, but they round-trip through
 * `chrome.storage.local`, which is plain JSON any extension context can put
 * anything into — including a `javascript:` payload that would execute on click.
 * `new URL` also rejects relative junk, which is why an unparsable value is
 * `null` rather than passed through. Mirrors `safeHttpUrl` in
 * `src/print/buildDocument.ts`, which cannot be imported here: the print page
 * is a separate build entry and sharing the file would pull the whole print
 * module into the content script.
 */
function safeHttpUrl(candidate: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  return parsed.href;
}

/**
 * A record's timestamp, or `null` when storage holds something that is not one.
 *
 * Deliberately not coerced to a number: a corrupt `lastReadAt` must read as
 * "unknown" rather than as an absurd age, and must sort last rather than poison
 * the comparator with NaN.
 */
function recordTimestamp(record: ReadingRecord): number | null {
  return typeof record.lastReadAt === 'number' && Number.isFinite(record.lastReadAt)
    ? record.lastReadAt
    : null;
}

/** Render a stored field only when it really is a string. */
function readText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * How long ago `timestamp` was, in the wording a reader would use.
 *
 * `now` is a parameter rather than a `Date.now()` call inside so every row in
 * one render agrees on the current time, and so a test can pin it.
 */
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  if (!Number.isFinite(timestamp) || !Number.isFinite(now)) return '时间未知';

  const elapsed = now - timestamp;
  // A timestamp in the future is a clock change, not a prediction.
  if (elapsed < MINUTE_MS) return '刚刚';
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)} 分钟前`;
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)} 小时前`;
  if (elapsed < 7 * DAY_MS) return `${Math.floor(elapsed / DAY_MS)} 天前`;

  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return year === new Date(now).getFullYear()
    ? `${month}月${day}日`
    : `${year}年${month}月${day}日`;
}

/** Reading-time estimate, or an honest "unknown" for a record without one. */
function readDuration(record: ReadingRecord): string {
  return Number.isFinite(record.readingTime) && record.readingTime > 0
    ? `约 ${record.readingTime} 分钟`
    : '阅读时长未知';
}

export function HistoryPanel({
  records,
  loading,
  error,
  onDelete,
  onClear,
  onClose,
}: HistoryPanelProps): JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const cancelClearRef = useRef<HTMLButtonElement>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  // One "now" per render, so two rows never disagree about what day it is.
  const now = useMemo(() => Date.now(), [records]);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  usePanelDismiss({
    panelRef,
    onClose,
    ignoreOutsideSelector: '.reader-history-btn',
  });

  // Newest first. `addToHistory` unshifts, so storage is usually already in
  // order — but the panel must not depend on the writer's insertion order for
  // something it displays as a timeline. Records with no usable timestamp sort
  // last rather than comparing NaN against real values.
  const sorted = useMemo(
    () =>
      [...records].sort((a, b) => {
        const aTime = recordTimestamp(a);
        const bTime = recordTimestamp(b);
        if (aTime === null) return 1;
        if (bTime === null) return -1;
        return bTime - aTime;
      }),
    [records]
  );

  /**
   * Deleting a row removes the button the user just pressed. Focus would fall
   * to `<body>`, where the focus trap can no longer see it, so it is moved to
   * the close button — always present, always inside the trap.
   */
  const handleDelete = useCallback(
    (recordId: string) => {
      onDelete(recordId);
      closeButtonRef.current?.focus();
    },
    [onDelete]
  );

  const handleConfirmClear = useCallback(() => {
    setConfirmingClear(false);
    onClear();
    closeButtonRef.current?.focus();
  }, [onClear]);

  // The button that opened the confirmation is gone once it appears, so focus
  // is handed to the cancel button rather than dropped.
  useEffect(() => {
    if (confirmingClear) {
      cancelClearRef.current?.focus();
    }
  }, [confirmingClear]);

  return (
    <div
      ref={panelRef}
      className="reader-history-panel"
      role="dialog"
      aria-label="阅读历史"
      aria-modal="true"
    >
      <div className="reader-history-panel__header">
        <h3 className="reader-history-panel__title" id="history-title">阅读历史</h3>
        {/* Live region: it announces how many records arrived, which is the
            only feedback the empty state gives once the load resolves. */}
        <span className="reader-history-panel__count" role="status">
          {loading ? '' : `${sorted.length} 条`}
        </span>
        <button
          ref={closeButtonRef}
          className="reader-history-panel__close"
          onClick={onClose}
          aria-label="关闭阅读历史"
          type="button"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="reader-history-panel__body">
        {loading ? (
          <p className="reader-history-status" role="status">
            正在加载阅读记录…
          </p>
        ) : sorted.length === 0 ? (
          <p className="reader-history-empty">还没有阅读记录</p>
        ) : (
          <ul className="reader-history-list" aria-labelledby="history-title">
            {sorted.map((record) => {
              const title = readText(record.title) || '未命名';
              const siteName = readText(record.siteName);
              const timestamp = recordTimestamp(record);
              // The single validation point: the string that reaches
              // `window.open` is exactly the one this returned.
              const url = safeHttpUrl(readText(record.url));

              return (
                <li className="reader-history-item" key={record.id}>
                  <div className="reader-history-item__main">
                    {url ? (
                      <button
                        className="reader-history-item__title"
                        onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                        title={url}
                        type="button"
                      >
                        {title}
                      </button>
                    ) : (
                      // An unopenable record is shown as plain text. It is
                      // never a link and never a button, so there is nothing
                      // to click and no scheme to smuggle.
                      <span className="reader-history-item__title reader-history-item__title--inert">
                        {title}
                      </span>
                    )}
                    <p className="reader-history-item__meta">
                      {siteName && <span className="reader-history-item__site">{siteName}</span>}
                      <span className="reader-history-item__time">
                        {timestamp === null ? '时间未知' : formatRelativeTime(timestamp, now)}
                      </span>
                      <span className="reader-history-item__length">{readDuration(record)}</span>
                    </p>
                  </div>
                  <button
                    className="reader-history-item__delete"
                    onClick={() => handleDelete(record.id)}
                    aria-label={`删除《${title}》的阅读记录`}
                    type="button"
                  >
                    <TrashIcon />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {error && (
          <p className="reader-history-error" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="reader-history-panel__footer">
        {confirmingClear && sorted.length > 0 ? (
          <div
            className="reader-history-confirm"
            role="group"
            aria-label="确认清空全部阅读记录"
          >
            <p className="reader-history-confirm__text" role="alert">
              将删除全部 {sorted.length} 条阅读记录，此操作无法撤销。
            </p>
            <div className="reader-history-confirm__actions">
              <button
                ref={cancelClearRef}
                className="reader-history-clear"
                onClick={() => setConfirmingClear(false)}
                type="button"
              >
                取消
              </button>
              <button
                className="reader-history-clear reader-history-clear--danger"
                onClick={handleConfirmClear}
                type="button"
              >
                确认清空
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="reader-history-privacy">
              阅读记录只保存在这台设备上，不会上传到任何服务器，可随时清空。
            </p>
            <button
              className="reader-history-clear"
              onClick={() => setConfirmingClear(true)}
              disabled={loading || sorted.length === 0}
              type="button"
            >
              清空全部
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function CloseIcon(): JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function TrashIcon(): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
