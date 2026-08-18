"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

import {
  DEFAULT_OVERSCAN_PX,
  DEFAULT_ZOOM_FACTOR,
  ROW_GAP,
  ROW_HEIGHT,
} from "./constants";
import { useContainerWidth } from "./hooks/useContainerWidth";
import { useFitWindow, type FitWindow } from "./hooks/useFitWindow";
import { useItemDrag, type DragState } from "./hooks/useItemDrag";
import { useMeasuredFont } from "./hooks/useMeasuredFont";
import { usePan } from "./hooks/usePan";
import { useRowPacking } from "./hooks/useRowPacking";
import { useScrollWindow } from "./hooks/useScrollWindow";
import { useTimelineTicks, type RenderedTick } from "./hooks/useTimelineTicks";
import { useViewport } from "./hooks/useViewport";
import { useVisibleItems } from "./hooks/useVisibleItems";
import { useWheelZoom } from "./hooks/useWheelZoom";
import { makeLabelMeasurer, toPackInput } from "./packing";
import type {
  DragHandleProps,
  PositionedItem,
  ResizeEdge,
  TimeRange,
  TimelineItem,
} from "./types";

export interface UseTimelineOptions<TData = unknown> {
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

export interface UseTimelineResult<TData = unknown> {
  // ---- refs / prop getters -------------------------------------------
  /** Attach to the pannable canvas element (width + wheel + pan). */
  containerRef: RefObject<HTMLDivElement | null>;
  /** Spread on the canvas element: `{ref, onPointerDown}`. Give that
   *  element `touch-action: none` — one finger pans horizontally and
   *  scrolls `scrollRef` vertically (both fling on release), two fingers pinch;
   *  the browser never competes for the gesture. If you don't attach
   *  `scrollRef`, vertical drags scroll the nearest scrollable ancestor
   *  or the page instead. A release fling ends on any pointer/wheel
   *  input; a programmatic viewport change during a fling (controlled
   *  mode) is overridden by the next frame — call it after, or on
   *  input. */
  containerProps: {
    ref: RefObject<HTMLDivElement | null>;
    onPointerDown: (e: ReactPointerEvent) => void;
  };
  /** Attach to the vertical scroll container for row culling and touch
   *  scrolling (optional). Render it inside the canvas element: it then
   *  gets `touch-action: none` applied automatically (browsers only
   *  consult touch-action up to the nearest scroll container, so the
   *  canvas's value alone wouldn't reach touches inside it). */
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Spread on a hidden span inside the canvas so labels are measured
   *  with the *real* inherited font instead of the fallback. */
  probeProps: {
    ref: RefObject<HTMLSpanElement | null>;
    "aria-hidden": true;
    style: CSSProperties;
  };

  // ---- viewport / geometry -------------------------------------------
  viewportStart: number;
  viewportEnd: number;
  viewportSpan: number;
  canvasPx: number;
  pxPerMs: number;
  timeToPx: (ms: number) => number;
  pxToTime: (px: number) => number;
  fitWindow: FitWindow | null;
  ticks: RenderedTick[];

  // ---- layout ---------------------------------------------------------
  rowOf: Map<string, number>;
  totalRows: number;
  rowHeight: number;
  rowGap: number;
  /** `totalRows * (rowHeight + rowGap)` — height of the rows canvas. */
  rowsHeight: number;
  /** Positioned (and, with virtualization, culled) items to render. */
  visibleItems: PositionedItem<TData>[];
  itemMap: Map<string, TimelineItem<TData>>;

  // ---- zoom / pan actions --------------------------------------------
  setViewport: (start: number, end: number) => void;
  fit: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  /** Current zoom as % of the fit window (100 = fit). */
  zoomPct: number;
  setZoomPct: (pct: number) => void;

  // ---- drag & drop ----------------------------------------------------
  drag: DragState | null;
  canMove: boolean;
  canResize: boolean;
  getMoveHandleProps: (id: string) => DragHandleProps | undefined;
  getResizeHandleProps: (
    id: string,
    edge: ResizeEdge,
  ) => DragHandleProps | undefined;
  /** Shift an item by `deltaMs` without a pointer — keyboard support. */
  moveItemBy: (id: string, deltaMs: number) => void;
  /** Shift one edge of an item by `deltaMs` without a pointer. */
  resizeItemBy: (id: string, edge: ResizeEdge, deltaMs: number) => void;
}

/** Headless timeline core: viewport, zoom/pan, stable row packing,
 *  virtualization, and item drag — no DOM output. The `Timeline`
 *  component is a thin styled layer over this hook. */
export function useTimeline<TData = unknown>({
  items,
  viewportStart: viewportStartProp,
  viewportEnd: viewportEndProp,
  onViewportChange,
  zoomMinPct = 100,
  zoomMaxPct = 5000,
  zoomFactor = DEFAULT_ZOOM_FACTOR,
  zoomStable = false,
  onItemMove,
  onItemResize,
  dragSnapMs,
  virtualization = true,
  overscanPx = DEFAULT_OVERSCAN_PX,
  rowHeight = ROW_HEIGHT,
  rowGap = ROW_GAP,
}: UseTimelineOptions<TData>): UseTimelineResult<TData> {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);

  const itemMap = useMemo(() => {
    const m = new Map<string, TimelineItem<TData>>();
    for (const it of items) m.set(it.id, it);
    return m;
  }, [items]);

  const hasItems = items.length > 0;
  const canvasPx = useContainerWidth(containerRef, hasItems);
  const measureFont = useMeasuredFont(probeRef, hasItems);
  const measureLabel = useMemo(
    () => makeLabelMeasurer(measureFont),
    [measureFont],
  );

  const packInput = useMemo(() => toPackInput(items), [items]);
  const fitWindow = useFitWindow(packInput);

  const { viewportStart, viewportEnd, setViewport } = useViewport({
    fitWindow,
    viewportStartProp,
    viewportEndProp,
    onViewportChange,
    zoomMinPct,
    zoomMaxPct,
  });

  const viewportSpan = viewportEnd - viewportStart;
  const pxPerMs = viewportSpan > 0 ? canvasPx / viewportSpan : 0;
  const timeToPx = useCallback(
    (ms: number) => (ms - viewportStart) * pxPerMs,
    [viewportStart, pxPerMs],
  );
  const pxToTime = useCallback(
    (px: number) => (pxPerMs > 0 ? viewportStart + px / pxPerMs : viewportStart),
    [viewportStart, pxPerMs],
  );

  const fitPxPerMs =
    fitWindow && fitWindow.span > 0 ? canvasPx / fitWindow.span : 0;
  const packPxPerMs = zoomStable ? fitPxPerMs : pxPerMs;
  const { rowOf, totalRows } = useRowPacking(
    packInput,
    packPxPerMs,
    measureLabel,
  );

  const handlePointerDown = usePan({
    viewportStart,
    viewportEnd,
    canvasPx,
    setViewport,
    scrollRef,
  });

  // touch-action is only consulted up to the nearest scroll container,
  // so the canvas's `none` doesn't reach touches inside the rows
  // scroller. Set it there too when the scroller lives inside the
  // canvas — a headless consumer who forgot it would otherwise get the
  // browser's own scrolling racing usePan (device-only breakage).
  useEffect(() => {
    if (!hasItems) return;
    const el = scrollRef.current;
    const canvas = containerRef.current;
    if (!el || !canvas || !canvas.contains(el) || el.style.touchAction) return;
    el.style.touchAction = "none";
    return () => {
      el.style.touchAction = "";
    };
  }, [hasItems]);

  useWheelZoom({
    containerRef,
    attached: hasItems,
    viewportStart,
    viewportEnd,
    canvasPx,
    zoomFactor,
    setViewport,
    scrollRef,
  });

  const ticks = useTimelineTicks(viewportStart, viewportEnd, canvasPx);

  const {
    drag,
    canMove,
    canResize,
    getMoveHandleProps,
    getResizeHandleProps,
    moveItemBy,
    resizeItemBy,
  } = useItemDrag({
    itemMap,
    pxPerMs,
    dragSnapMs,
    onItemMove,
    onItemResize,
  });

  const { scrollTop, height: viewHeight } = useScrollWindow(
    scrollRef,
    virtualization && items.length > 0,
  );

  const visibleItems = useVisibleItems({
    items,
    rowOf,
    timeToPx,
    measureLabel,
    canvasPx,
    drag,
    virtualize: virtualization,
    overscanPx,
    rowHeight,
    rowGap,
    scrollTop,
    viewHeight,
  });

  const fit = useCallback(() => {
    if (!fitWindow) return;
    setViewport(fitWindow.start, fitWindow.end);
  }, [fitWindow, setViewport]);

  const zoomIn = useCallback(() => {
    const center = (viewportStart + viewportEnd) / 2;
    const newSpan = viewportSpan / zoomFactor;
    setViewport(center - newSpan / 2, center + newSpan / 2);
  }, [viewportStart, viewportEnd, viewportSpan, zoomFactor, setViewport]);

  const zoomOut = useCallback(() => {
    const center = (viewportStart + viewportEnd) / 2;
    const newSpan = viewportSpan * zoomFactor;
    setViewport(center - newSpan / 2, center + newSpan / 2);
  }, [viewportStart, viewportEnd, viewportSpan, zoomFactor, setViewport]);

  const zoomPct = useMemo(() => {
    if (!fitWindow || viewportSpan <= 0) return 100;
    return Math.round((fitWindow.span / viewportSpan) * 100);
  }, [fitWindow, viewportSpan]);

  const setZoomPct = useCallback(
    (rawPct: number) => {
      if (!fitWindow) return;
      const pct = Math.max(zoomMinPct, Math.min(zoomMaxPct, rawPct));
      const center = (viewportStart + viewportEnd) / 2;
      const newSpan = (fitWindow.span * 100) / pct;
      setViewport(center - newSpan / 2, center + newSpan / 2);
    },
    [fitWindow, viewportStart, viewportEnd, setViewport, zoomMinPct, zoomMaxPct],
  );

  const probeProps = useMemo(
    () => ({
      ref: probeRef,
      "aria-hidden": true as const,
      style: {
        position: "absolute",
        visibility: "hidden",
        pointerEvents: "none",
        fontSize: 11,
        whiteSpace: "nowrap",
      } satisfies CSSProperties,
    }),
    [],
  );

  return {
    containerRef,
    containerProps: { ref: containerRef, onPointerDown: handlePointerDown },
    scrollRef,
    probeProps,
    viewportStart,
    viewportEnd,
    viewportSpan,
    canvasPx,
    pxPerMs,
    timeToPx,
    pxToTime,
    fitWindow,
    ticks,
    rowOf,
    totalRows,
    rowHeight,
    rowGap,
    rowsHeight: totalRows * (rowHeight + rowGap),
    visibleItems,
    itemMap,
    setViewport,
    fit,
    zoomIn,
    zoomOut,
    zoomPct,
    setZoomPct,
    drag,
    canMove,
    canResize,
    getMoveHandleProps,
    getResizeHandleProps,
    moveItemBy,
    resizeItemBy,
  };
}
