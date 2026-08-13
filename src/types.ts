import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";

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

export interface TimeRange {
  start: number;
  end: number;
}

export type ResizeEdge = "start" | "end";

/** Pointer-down props to spread on a drag/resize handle element.
 *  Pointer events cover mouse, touch, and pen; pair with
 *  `touch-action: none` on the handle so the browser doesn't turn the
 *  gesture into a scroll. */
export interface DragHandleProps {
  onPointerDown: (e: ReactPointerEvent) => void;
}

/** An item with its computed layout for the current viewport. */
export interface PositionedItem<TData = unknown> {
  item: TimelineItem<TData>;
  /** Packed row index (0-based). */
  row: number;
  /** `row * (rowHeight + rowGap)` — vertical offset in px. */
  top: number;
  /** Pixel x of `start` relative to the canvas left edge. */
  startX: number;
  /** Pixel x of `end` (same as `startX` for point events). */
  endX: number;
  isRange: boolean;
  /** Measured pixel width of the label text (Canvas2D; SSR fallback estimate). */
  labelWidth: number;
  /** True while this item is being dragged (positions include the preview offset). */
  isDragging: boolean;
}

/** Everything `renderItem` needs to draw one item. */
export interface TimelineItemRenderContext<TData = unknown>
  extends PositionedItem<TData> {
  /** Call to fire `onSelect` for this item. */
  select: () => void;
  /** Spread on the item root to make it movable. `undefined` unless `onItemMove` is set. */
  moveHandleProps: DragHandleProps | undefined;
  /** Spread on a left-edge handle. `undefined` unless `onItemResize` is set. */
  resizeStartHandleProps: DragHandleProps | undefined;
  /** Spread on a right-edge handle. `undefined` unless `onItemResize` is set. */
  resizeEndHandleProps: DragHandleProps | undefined;
  /** Shift this item by `deltaMs` (keyboard support). No-op unless `onItemMove` is set. */
  moveBy: (deltaMs: number) => void;
  /** Shift one edge by `deltaMs` (keyboard support). No-op unless `onItemResize` is set. */
  resizeBy: (edge: ResizeEdge, deltaMs: number) => void;
}

export interface TimelineLabels {
  fit?: string;
  zoomIn?: string;
  zoomOut?: string;
  zoomRatio?: string;
  /** Shown when `items` is empty. */
  empty?: string;
  /** Screen-reader name for the items area (`aria-label`), announced
   *  with the total item count. */
  timeline?: string;
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

  /**
   * Multiplier applied per zoom step — toolbar `+` / `−` buttons and
   * each `⌘`/`Ctrl` + wheel tick. `1.2` (default) = 20 % per step;
   * `1.5` = chunkier; `1.05` = smoother. Must be > 1.
   */
  zoomFactor?: number;

  /**
   * When `true`, rows are computed once at fit-zoom and never change
   * on zoom — items keep the same row at every zoom level. When
   * `false` (default), rows are recomputed at the current zoom, so
   * zooming in lets previously-stacked items collapse upward as
   * their labels stop overlapping. Panning is always stable
   * regardless of this flag.
   */
  zoomStable?: boolean;

  /**
   * When the user *types* into the zoom percent input, should the new
   * value apply on every keystroke (`"immediate"`, default) or only
   * after the input loses focus / Enter is pressed (`"blur"`)?
   *
   * Mid-stroke values outside `[zoomMinPct, zoomMaxPct]` are clamped
   * by `setZoomPct`, so typing `"15"` toward `"150"` with the default
   * `zoomMinPct: 100` will visibly snap the canvas to 100 % until the
   * third digit is typed.
   */
  zoomInputTypingCommit?: "immediate" | "blur";

  /**
   * When the user clicks the native ▲/▼ spinner inside the zoom
   * percent input, should the new value apply right away
   * (`"immediate"`, default) or only after the input loses focus
   * (`"blur"`)?
   */
  zoomInputSpinnerCommit?: "immediate" | "blur";

  /**
   * Enables moving items along the time axis by dragging. Called on
   * drop with the item and its proposed new `{ start, end }` — apply
   * it to your data (controlled: the timeline never mutates `items`).
   */
  onItemMove?: (item: TimelineItem<TData>, next: TimeRange) => void;

  /**
   * Enables resize handles on both edges of range items. Called on
   * drop with the proposed new `{ start, end }` (span is clamped to
   * ≥ 1 ms).
   */
  onItemResize?: (item: TimelineItem<TData>, next: TimeRange) => void;

  /** Snap dragged/resized edges to this grid, in ms (e.g. 3600_000 = 1 h). */
  dragSnapMs?: number;

  /**
   * Only render items whose pixel extent intersects the viewport
   * (plus `overscanPx`). Default `true` — set `false` to always
   * render every item.
   */
  virtualization?: boolean;

  /** Extra px margin around the viewport kept rendered. Default 200. */
  overscanPx?: number;

  /**
   * Replace the built-in item renderer. Receives layout + interaction
   * props; return your own element (position it absolutely with
   * `startX` / `top`).
   */
  renderItem?: (ctx: TimelineItemRenderContext<TData>) => ReactNode;

  className?: string;
  style?: CSSProperties;
}
