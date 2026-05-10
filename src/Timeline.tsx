"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { Axis } from "./components/Axis";
import { CursorLine } from "./components/CursorLine";
import { GridLines } from "./components/GridLines";
import { TimelineItemView } from "./components/TimelineItemView";
import { Toolbar } from "./components/Toolbar";
import {
  AXIS_HEIGHT,
  DEFAULT_ACCENT,
  DEFAULT_LABELS,
  DEFAULT_ZOOM_FACTOR,
  ROW_GAP,
  ROW_HEIGHT,
} from "./constants";
import { useContainerWidth } from "./hooks/useContainerWidth";
import { useFitWindow } from "./hooks/useFitWindow";
import { useMeasuredFont } from "./hooks/useMeasuredFont";
import { usePan } from "./hooks/usePan";
import { useRowPacking } from "./hooks/useRowPacking";
import { useTimelineTicks } from "./hooks/useTimelineTicks";
import { useViewport } from "./hooks/useViewport";
import { useWheelZoom } from "./hooks/useWheelZoom";
import { makeLabelMeasurer, toPackInput } from "./packing";
import type { TimelineItem, TimelineProps } from "./types";

export function Timeline<TData = unknown>({
  items,
  viewportStart: viewportStartProp,
  viewportEnd: viewportEndProp,
  onViewportChange,
  cursorMs = null,
  onSelect,
  accentColor = DEFAULT_ACCENT,
  labels: labelsProp,
  hideToolbar = false,
  zoomMinPct = 100,
  zoomMaxPct = 5000,
  zoomFactor = DEFAULT_ZOOM_FACTOR,
  zoomStable = false,
  className,
  style,
}: TimelineProps<TData>) {
  const labels = { ...DEFAULT_LABELS, ...(labelsProp ?? {}) };
  const itemMap = useMemo(() => {
    const m = new Map<string, TimelineItem<TData>>();
    for (const it of items) m.set(it.id, it);
    return m;
  }, [items]);

  const containerRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);

  const canvasPx = useContainerWidth(containerRef);
  const measureFont = useMeasuredFont(probeRef);
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

  const fitPxPerMs =
    fitWindow && fitWindow.span > 0 ? canvasPx / fitWindow.span : 0;
  const packPxPerMs = zoomStable ? fitPxPerMs : pxPerMs;
  const { rowOf, totalRows } = useRowPacking(
    packInput,
    packPxPerMs,
    measureLabel,
  );

  const handleMouseDown = usePan({
    viewportStart,
    viewportEnd,
    canvasPx,
    setViewport,
  });

  useWheelZoom({
    containerRef,
    viewportStart,
    viewportEnd,
    canvasPx,
    zoomFactor,
    setViewport,
  });

  const handleItemClick = useCallback(
    (id: string) => {
      const item = itemMap.get(id);
      if (!item) return;
      onSelect?.(item);
    },
    [itemMap, onSelect],
  );

  const ticks = useTimelineTicks(viewportStart, viewportEnd, canvasPx);

  const handleFit = useCallback(() => {
    if (!fitWindow) return;
    setViewport(fitWindow.start, fitWindow.end);
  }, [fitWindow, setViewport]);
  const handleZoomIn = useCallback(() => {
    const center = (viewportStart + viewportEnd) / 2;
    const newSpan = viewportSpan / zoomFactor;
    setViewport(center - newSpan / 2, center + newSpan / 2);
  }, [viewportStart, viewportEnd, viewportSpan, zoomFactor, setViewport]);
  const handleZoomOut = useCallback(() => {
    const center = (viewportStart + viewportEnd) / 2;
    const newSpan = viewportSpan * zoomFactor;
    setViewport(center - newSpan / 2, center + newSpan / 2);
  }, [viewportStart, viewportEnd, viewportSpan, zoomFactor, setViewport]);

  const zoomPct = useMemo(() => {
    if (!fitWindow || viewportSpan <= 0) return 100;
    return Math.round((fitWindow.span / viewportSpan) * 100);
  }, [fitWindow, viewportSpan]);
  const [zoomPctDraft, setZoomPctDraft] = useState<string | null>(null);
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

  if (items.length === 0) {
    return (
      <div
        className={className}
        style={{
          display: "flex",
          flex: "1 1 auto",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
          fontSize: 13,
          color: "#888",
          ...style,
        }}
      >
        {labels.empty}
      </div>
    );
  }

  const rowsHeight = totalRows * (ROW_HEIGHT + ROW_GAP);

  const containerStyle: CSSProperties = {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 280,
    width: "100%",
    ...style,
  };

  return (
    <div className={className} style={containerStyle}>
      {!hideToolbar && (
        <Toolbar
          labels={labels}
          zoomPct={zoomPct}
          zoomPctDraft={zoomPctDraft}
          setZoomPctDraft={setZoomPctDraft}
          setZoomPct={setZoomPct}
          zoomMinPct={zoomMinPct}
          zoomMaxPct={zoomMaxPct}
          onFit={handleFit}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
        />
      )}

      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        style={{
          position: "relative",
          flex: "1 1 auto",
          userSelect: "none",
          overflow: "hidden",
          cursor: "grab",
        }}
      >
        <span
          ref={probeRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            visibility: "hidden",
            pointerEvents: "none",
            fontSize: 11,
            whiteSpace: "nowrap",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: AXIS_HEIGHT,
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <div style={{ position: "relative", minHeight: "100%" }}>
            <GridLines ticks={ticks} canvasPx={canvasPx} timeToPx={timeToPx} />
            <CursorLine
              cursorMs={cursorMs}
              canvasPx={canvasPx}
              timeToPx={timeToPx}
              accentColor={accentColor}
            />
            <div
              style={{
                position: "relative",
                height: rowsHeight,
                paddingTop: 8,
              }}
            >
              {items.map((item) => {
                const start = item.start;
                const end = item.end ?? item.start;
                const isRange =
                  item.end !== undefined && item.end !== item.start;
                const startX = timeToPx(start);
                const endX = isRange ? timeToPx(end) : startX;
                return (
                  <TimelineItemView
                    key={item.id}
                    item={item}
                    row={rowOf.get(item.id) ?? 0}
                    startX={startX}
                    endX={endX}
                    isRange={isRange}
                    accentColor={accentColor}
                    onSelect={handleItemClick}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <Axis ticks={ticks} canvasPx={canvasPx} timeToPx={timeToPx} />
      </div>
    </div>
  );
}
