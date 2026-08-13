import * as react_jsx_runtime from 'react/jsx-runtime';
import { PointerEvent, ReactNode, CSSProperties, RefObject } from 'react';

interface TimelineItem<TData = unknown> {
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
interface TimeRange {
    start: number;
    end: number;
}
type ResizeEdge = "start" | "end";
/** Pointer-down props to spread on a drag/resize handle element.
 *  Pointer events cover mouse, touch, and pen; pair with
 *  `touch-action: none` on the handle so the browser doesn't turn the
 *  gesture into a scroll. */
interface DragHandleProps {
    onPointerDown: (e: PointerEvent) => void;
}
/** An item with its computed layout for the current viewport. */
interface PositionedItem<TData = unknown> {
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
    /** True while this item is being dragged (positions include the preview offset). */
    isDragging: boolean;
}
/** Everything `renderItem` needs to draw one item. */
interface TimelineItemRenderContext<TData = unknown> extends PositionedItem<TData> {
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
interface TimelineLabels {
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
interface TimelineProps<TData = unknown> {
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

declare function Timeline<TData = unknown>({ items, viewportStart, viewportEnd, onViewportChange, cursorMs, onSelect, accentColor, labels: labelsProp, hideToolbar, zoomMinPct, zoomMaxPct, zoomFactor, zoomStable, zoomInputTypingCommit, zoomInputSpinnerCommit, onItemMove, onItemResize, dragSnapMs, virtualization, overscanPx, renderItem, className, style, }: TimelineProps<TData>): react_jsx_runtime.JSX.Element;

interface FitWindow {
    start: number;
    end: number;
    span: number;
}

type DragMode = "move" | "resize-start" | "resize-end";
interface DragState {
    id: string;
    mode: DragMode;
    deltaMs: number;
}

interface RenderedTick {
    ms: number;
    label: string;
}

interface UseTimelineOptions<TData = unknown> {
    items: TimelineItem<TData>[];
    /** Controlled viewport (ms). Omit for uncontrolled (starts at fit). */
    viewportStart?: number;
    viewportEnd?: number;
    onViewportChange?: (start: number, end: number) => void;
    zoomMinPct?: number;
    zoomMaxPct?: number;
    zoomFactor?: number;
    zoomStable?: boolean;
    /** Enables item move-dragging. See `TimelineProps.onItemMove`. */
    onItemMove?: (item: TimelineItem<TData>, next: TimeRange) => void;
    /** Enables edge resize handles. See `TimelineProps.onItemResize`. */
    onItemResize?: (item: TimelineItem<TData>, next: TimeRange) => void;
    dragSnapMs?: number;
    /** Cull items outside the viewport (+ overscan). Default `true`. */
    virtualization?: boolean;
    overscanPx?: number;
    /** Row geometry used for `top` / `rowsHeight`. Defaults match the built-in UI. */
    rowHeight?: number;
    rowGap?: number;
}
interface UseTimelineResult<TData = unknown> {
    /** Attach to the pannable canvas element (width + wheel + pan). */
    containerRef: RefObject<HTMLDivElement | null>;
    /** Spread on the canvas element: `{ref, onPointerDown}`. Give that
     *  element `touch-action: pan-y` so horizontal touch gestures reach
     *  the pan/pinch handlers while vertical scrolling stays native. */
    containerProps: {
        ref: RefObject<HTMLDivElement | null>;
        onPointerDown: (e: PointerEvent) => void;
    };
    /** Attach to the vertical scroll container for row culling (optional). */
    scrollRef: RefObject<HTMLDivElement | null>;
    /** Spread on a hidden span inside the canvas so labels are measured
     *  with the *real* inherited font instead of the fallback. */
    probeProps: {
        ref: RefObject<HTMLSpanElement | null>;
        "aria-hidden": true;
        style: CSSProperties;
    };
    viewportStart: number;
    viewportEnd: number;
    viewportSpan: number;
    canvasPx: number;
    pxPerMs: number;
    timeToPx: (ms: number) => number;
    pxToTime: (px: number) => number;
    fitWindow: FitWindow | null;
    ticks: RenderedTick[];
    rowOf: Map<string, number>;
    totalRows: number;
    rowHeight: number;
    rowGap: number;
    /** `totalRows * (rowHeight + rowGap)` — height of the rows canvas. */
    rowsHeight: number;
    /** Positioned (and, with virtualization, culled) items to render. */
    visibleItems: PositionedItem<TData>[];
    itemMap: Map<string, TimelineItem<TData>>;
    setViewport: (start: number, end: number) => void;
    fit: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    /** Current zoom as % of the fit window (100 = fit). */
    zoomPct: number;
    setZoomPct: (pct: number) => void;
    drag: DragState | null;
    canMove: boolean;
    canResize: boolean;
    getMoveHandleProps: (id: string) => DragHandleProps | undefined;
    getResizeHandleProps: (id: string, edge: ResizeEdge) => DragHandleProps | undefined;
    /** Shift an item by `deltaMs` without a pointer — keyboard support. */
    moveItemBy: (id: string, deltaMs: number) => void;
    /** Shift one edge of an item by `deltaMs` without a pointer. */
    resizeItemBy: (id: string, edge: ResizeEdge, deltaMs: number) => void;
}
/** Headless timeline core: viewport, zoom/pan, stable row packing,
 *  virtualization, and item drag — no DOM output. The `Timeline`
 *  component is a thin styled layer over this hook. */
declare function useTimeline<TData = unknown>({ items, viewportStart: viewportStartProp, viewportEnd: viewportEndProp, onViewportChange, zoomMinPct, zoomMaxPct, zoomFactor, zoomStable, onItemMove, onItemResize, dragSnapMs, virtualization, overscanPx, rowHeight, rowGap, }: UseTimelineOptions<TData>): UseTimelineResult<TData>;

interface PackInput {
    id: string;
    label: string;
    start: number;
    end: number;
    isRange: boolean;
}
/** First-Fit interval partitioning, label-aware.
 *
 *  Each item's footprint = max of:
 *    - dot diameter + breathing room
 *    - range bar pixel length (range items only)
 *    - measured label width + dot + padding
 *
 *  Output is stable: every item lands in the same row regardless of
 *  the current viewport — the same `(items, pxPerMs)` always returns
 *  the same Map. */
declare function packIntoRows(items: PackInput[], pxPerMs: number, measureLabel: (s: string) => number): Map<string, number>;
/** Build a label-width measurer using Canvas2D `measureText`. Hangul,
 *  Latin, and mixed text all measure correctly — character-count
 *  estimates under-count Hangul by ~30 % and produce overlaps. */
declare function makeLabelMeasurer(font?: string): (s: string) => number;

interface TickSpec {
    step: number;
    format: (d: Date) => string;
}
/** Pick a tick interval whose pixel spacing lands close to ~100 px.
 *  Walks year/month/week/day steps from coarse to fine and picks the
 *  largest step that still renders within the ~100 px target (so
 *  ticks are at most ~100 px apart), with 1 hour as the floor. The
 *  target is generous so labels never crowd each other even with
 *  longer Korean year-month text. */
declare function pickTicks(viewportStart: number, viewportEnd: number, canvasPx: number): TickSpec;

declare const LABEL_HEIGHT = 16;
declare const DOT_HEIGHT = 10;
declare const ROW_HEIGHT: number;
declare const ROW_GAP = 8;
declare const AXIS_HEIGHT = 28;

export { AXIS_HEIGHT, DOT_HEIGHT, type DragHandleProps, type DragMode, type DragState, type FitWindow, LABEL_HEIGHT, type PositionedItem, ROW_GAP, ROW_HEIGHT, type RenderedTick, type ResizeEdge, type TickSpec, type TimeRange, Timeline, type TimelineItem, type TimelineItemRenderContext, type TimelineLabels, type TimelineProps, type UseTimelineOptions, type UseTimelineResult, makeLabelMeasurer, packIntoRows, pickTicks, useTimeline };
