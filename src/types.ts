import type { CSSProperties } from "react";

export interface TimelineItem<TData = unknown> {
  id: string;
  label: string;
  /** Start time in ms (Unix epoch). */
  start: number;
  /** End time in ms. Omit or set equal to `start` for point events. */
  end?: number;
  /** Optional per-item accent color. Falls back to `accentColor` prop. */
  color?: string;
  /** Free-form payload — passed straight back to `onSelect`. */
  data?: TData;
}

export interface TimelineLabels {
  fit?: string;
  zoomIn?: string;
  zoomOut?: string;
  zoomRatio?: string;
  /** Shown when `items` is empty. */
  empty?: string;
}

export interface TimelineProps<TData = unknown> {
  items: TimelineItem<TData>[];

  /**
   * Controlled viewport in ms. When omitted, the timeline manages its
   * own viewport, initialised to the data's fit window (extents +
   * 5 % padding each side).
   */
  viewportStart?: number;
  viewportEnd?: number;
  onViewportChange?: (start: number, end: number) => void;

  /** Optional vertical cursor line, in ms. */
  cursorMs?: number | null;

  /** Fired when the user clicks an item (or presses Enter/Space). */
  onSelect?: (item: TimelineItem<TData>) => void;

  /** Default accent for dots, range bars, and the cursor line. */
  accentColor?: string;

  /** Replace the default English toolbar/empty labels. */
  labels?: TimelineLabels;

  /** Hide the top toolbar (Fit / zoom in / out / zoom %). */
  hideToolbar?: boolean;

  /**
   * Min / max zoom percentage relative to the fit window.
   * Defaults: min 100 (== fit, hardest zoom-out), max 5000 (50× zoom-in).
   * Zoom-out cannot go below 100 — the row packing assumes pixel
   * widths at fit-zoom and would invalidate otherwise.
   */
  zoomMinPct?: number;
  zoomMaxPct?: number;

  className?: string;
  style?: CSSProperties;
}
