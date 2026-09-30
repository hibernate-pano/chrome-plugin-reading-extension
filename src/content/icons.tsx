/**
 * Icon set — Material Icons (Apache-2.0)
 *
 * One source for every glyph in the reader. Path data is inlined rather than
 * loaded from a webfont: an extension cannot fetch anything at runtime under
 * the MV3 CSP, and inlining keeps the reader working offline and at first
 * paint.
 *
 * The paths are exported separately from the components because the toast is
 * built with the DOM API — it lives outside React, in the page's document —
 * and still has to draw the same glyphs.
 */

import type { JSX, ReactNode } from 'react';

/** Material icon path data on a 24px grid. */
export const ICON_PATHS = {
  close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
  history:
    'M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z',
  settings:
    'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41L9.25 5.35c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.22-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z',
  trash: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  copy: 'M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z',
  check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  error:
    'M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20a8 8 0 1 1 0-16 8 8 0 0 1 0 16z',
  refresh: 'M12 5V2L8 6l4 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z',
} as const;

export type IconName = keyof typeof ICON_PATHS;

interface IconProps {
  /** Rendered size in px. Icons stay on the 24px grid regardless. */
  size?: number;
}

function Svg({
  size = 20,
  className,
  children,
}: IconProps & { className?: string; children: ReactNode }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Dismiss / close. */
export function CloseIcon(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <path d={ICON_PATHS.close} />
    </Svg>
  );
}

/** Export the article. */
export function DownloadIcon(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <path d={ICON_PATHS.download} />
    </Svg>
  );
}

/** Busy state for the export action. */
export function SpinnerIcon(props: IconProps): JSX.Element {
  return (
    <svg
      width={props.size ?? 20}
      height={props.size ?? 20}
      viewBox="0 0 24 24"
      className="reader-spinner"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="42 15"
      />
    </svg>
  );
}

/** Reading history. */
export function HistoryIcon(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <path d={ICON_PATHS.history} />
    </Svg>
  );
}

/** Reading settings. */
export function SettingsIcon(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <path d={ICON_PATHS.settings} />
    </Svg>
  );
}

/** Remove one history record. */
export function TrashIcon(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <path d={ICON_PATHS.trash} />
    </Svg>
  );
}

/** Copy code to the clipboard. */
export function CopyIcon(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <path d={ICON_PATHS.copy} />
    </Svg>
  );
}

/** Confirms the copy, and marks the selected theme swatch. */
export function CheckIcon(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <path d={ICON_PATHS.check} />
    </Svg>
  );
}

/** Failure notice. */
export function ErrorIcon(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <path d={ICON_PATHS.error} />
    </Svg>
  );
}

/** The reader hit an error and offers to try again. */
export function RefreshIcon(props: IconProps): JSX.Element {
  return (
    <Svg {...props}>
      <path d={ICON_PATHS.refresh} />
    </Svg>
  );
}
