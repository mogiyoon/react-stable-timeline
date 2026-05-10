"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { makeLabelMeasurer, packIntoRows, toPackInput } from "./packing";
import { pickTicks } from "./ticks";
import type { TimelineItem, TimelineLabels, TimelineProps } from "./types";

const LABEL_HEIGHT = 16;
const DOT_HEIGHT = 10;
const ROW_HEIGHT = LABEL_HEIGHT + DOT_HEIGHT;
const ROW_GAP = 8;
const AXIS_HEIGHT = 28;
const PAN_BUTTON = 0;
const ZOOM_FACTOR = 1.2;
const DRAG_PX = 4;

const DEFAULT_ACCENT = "#6c8cff";
const DEFAULT_LABELS: Required<TimelineLabels> = {
  fit: "Fit",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  zoomRatio: "Zoom",
  empty: "No events",
};

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
  const [canvasPx, setCanvasPx] = useState(800);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const initial = node.clientWidth;
    if (initial > 0) setCanvasPx(initial);
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setCanvasPx(w);
      }
    });
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  const packInput = useMemo(() => toPackInput(items), [items]);

  const measureLabel = useMemo(() => makeLabelMeasurer("11px sans-serif"), []);

  const fitWindow = useMemo(() => {
    if (packInput.length === 0) return null;
    let min = Infinity;
    let max = -Infinity;
    for (const i of packInput) {
      if (i.start < min) min = i.start;
      if (i.end > max) max = i.end;
    }
    const span = Math.max(1, max - min);
    return {
      start: min - span * 0.05,
      end: max + span * 0.05,
      span: span * 1.1,
    };
  }, [packInput]);

  const isControlled =
    viewportStartProp !== undefined && viewportEndProp !== undefined;
  const [innerStart, setInnerStart] = useState<number>(0);
  const [innerEnd, setInnerEnd] = useState<number>(1);
  useEffect(() => {
    if (isControlled) return;
    if (!fitWindow) return;
    setInnerStart(fitWindow.start);
    setInnerEnd(fitWindow.end);
  }, [fitWindow, isControlled]);

  const viewportStart = isControlled ? viewportStartProp! : innerStart;
  const viewportEnd = isControlled ? viewportEndProp! : innerEnd;
  const viewportSpan = viewportEnd - viewportStart;
  const pxPerMs = viewportSpan > 0 ? canvasPx / viewportSpan : 0;
  const timeToPx = useCallback(
    (ms: number) => (ms - viewportStart) * pxPerMs,
    [viewportStart, pxPerMs],
  );

  const clampViewport = useCallback(
    (start: number, end: number): { start: number; end: number } => {
      if (!fitWindow) return { start, end };
      const span = end - start;
      if (span > fitWindow.span) {
        const center = (start + end) / 2;
        return {
          start: center - fitWindow.span / 2,
          end: center + fitWindow.span / 2,
        };
      }
      return { start, end };
    },
    [fitWindow],
  );

  const setViewport = useCallback(
    (start: number, end: number) => {
      const clamped = clampViewport(start, end);
      if (isControlled) {
        onViewportChange?.(clamped.start, clamped.end);
      } else {
        setInnerStart(clamped.start);
        setInnerEnd(clamped.end);
        onViewportChange?.(clamped.start, clamped.end);
      }
    },
    [clampViewport, isControlled, onViewportChange],
  );

  const rowOf = useMemo(() => {
    if (pxPerMs <= 0) return new Map<string, number>();
    return packIntoRows(packInput, pxPerMs, measureLabel);
  }, [packInput, pxPerMs, measureLabel]);
  const totalRows = useMemo(() => {
    let max = 0;
    for (const r of rowOf.values()) max = Math.max(max, r);
    return rowOf.size === 0 ? 0 : max + 1;
  }, [rowOf]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== PAN_BUTTON) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const startVp = { start: viewportStart, end: viewportEnd };
      const startSpan = startVp.end - startVp.start;
      let panning = false;

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!panning && Math.abs(dx) < DRAG_PX && Math.abs(dy) < DRAG_PX) {
          return;
        }
        if (!panning) {
          panning = true;
          document.body.style.cursor = "grabbing";
        }
        ev.preventDefault();
        const dt = -(dx / canvasPx) * startSpan;
        setViewport(startVp.start + dt, startVp.end + dt);
      };
      const onUp = (ev: MouseEvent) => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        if (panning) {
          ev.preventDefault();
          ev.stopPropagation();
          const blockClick = (clickEv: MouseEvent) => {
            clickEv.stopPropagation();
            clickEv.preventDefault();
            window.removeEventListener("click", blockClick, true);
          };
          window.addEventListener("click", blockClick, true);
        }
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [viewportStart, viewportEnd, canvasPx, setViewport],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const cursorX = e.clientX - rect.left;
        const cursorTime =
          viewportStart + (cursorX / canvasPx) * viewportSpan;
        const factor = e.deltaY > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
        const newSpan = viewportSpan * factor;
        const newStart = cursorTime - (cursorX / canvasPx) * newSpan;
        setViewport(newStart, newStart + newSpan);
        return;
      }
      const horizontalDelta =
        e.deltaX !== 0 ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (horizontalDelta === 0) return;
      e.preventDefault();
      const dt = (horizontalDelta / canvasPx) * viewportSpan;
      setViewport(viewportStart + dt, viewportEnd + dt);
    },
    [viewportStart, viewportEnd, viewportSpan, canvasPx, setViewport],
  );

  const handleItemClick = useCallback(
    (id: string) => {
      const item = itemMap.get(id);
      if (!item) return;
      onSelect?.(item);
    },
    [itemMap, onSelect],
  );

  const tickSpec = useMemo(() => {
    if (canvasPx <= 0 || viewportSpan <= 0) return null;
    return pickTicks(viewportStart, viewportEnd, canvasPx);
  }, [viewportStart, viewportEnd, viewportSpan, canvasPx]);
  const ticks = useMemo(() => {
    if (!tickSpec) return [] as Array<{ ms: number; label: string }>;
    const buffer = viewportSpan * 3;
    const first =
      Math.floor((viewportStart - buffer) / tickSpec.step) * tickSpec.step;
    const last = viewportEnd + buffer;
    const out: Array<{ ms: number; label: string }> = [];
    for (let ms = first; ms <= last; ms += tickSpec.step) {
      out.push({ ms, label: tickSpec.format(new Date(ms)) });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickSpec]);

  const handleFit = useCallback(() => {
    if (!fitWindow) return;
    setViewport(fitWindow.start, fitWindow.end);
  }, [fitWindow, setViewport]);
  const handleZoomIn = useCallback(() => {
    const center = (viewportStart + viewportEnd) / 2;
    const newSpan = viewportSpan / ZOOM_FACTOR;
    setViewport(center - newSpan / 2, center + newSpan / 2);
  }, [viewportStart, viewportEnd, viewportSpan, setViewport]);
  const handleZoomOut = useCallback(() => {
    const center = (viewportStart + viewportEnd) / 2;
    const newSpan = viewportSpan * ZOOM_FACTOR;
    setViewport(center - newSpan / 2, center + newSpan / 2);
  }, [viewportStart, viewportEnd, viewportSpan, setViewport]);

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

  const toolbarStyle: CSSProperties = {
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    gap: 8,
    borderBottom: "1px solid rgba(127,127,127,0.25)",
    padding: "6px 12px",
    fontSize: 12,
  };

  const buttonStyle: CSSProperties = {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "inherit",
    padding: "2px 6px",
    borderRadius: 4,
    font: "inherit",
  };

  const iconButtonStyle: CSSProperties = {
    ...buttonStyle,
    width: 24,
    height: 24,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div className={className} style={containerStyle}>
      {!hideToolbar && (
        <div style={toolbarStyle}>
          <button type="button" onClick={handleFit} style={buttonStyle}>
            {labels.fit}
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            style={iconButtonStyle}
            aria-label={labels.zoomOut}
          >
            −
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            style={iconButtonStyle}
            aria-label={labels.zoomIn}
          >
            +
          </button>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              opacity: 0.75,
              marginLeft: 4,
            }}
          >
            <span>{labels.zoomRatio}</span>
            <input
              type="number"
              value={zoomPct}
              min={zoomMinPct}
              max={zoomMaxPct}
              step={5}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isFinite(v)) return;
                setZoomPct(v);
              }}
              style={{
                width: 60,
                padding: "2px 4px",
                fontSize: 10,
                border: "1px solid rgba(127,127,127,0.4)",
                borderRadius: 3,
                background: "transparent",
                color: "inherit",
                fontVariantNumeric: "tabular-nums",
              }}
            />
            <span>%</span>
          </label>
        </div>
      )}

      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        style={{
          position: "relative",
          flex: "1 1 auto",
          userSelect: "none",
          overflow: "hidden",
          cursor: "grab",
        }}
      >
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
          {ticks.map((tick) => {
            const x = timeToPx(tick.ms);
            if (x < -1 || x > canvasPx + 1) return null;
            return (
              <div
                key={`grid-${tick.ms}`}
                style={{
                  pointerEvents: "none",
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  width: 1,
                  left: x,
                  background: "rgba(127,127,127,0.15)",
                }}
              />
            );
          })}
          {cursorMs !== null && cursorMs !== undefined &&
            (() => {
              const x = timeToPx(cursorMs);
              if (x < 0 || x > canvasPx) return null;
              return (
                <div
                  style={{
                    pointerEvents: "none",
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    width: 1,
                    left: x,
                    background: accentColor,
                    opacity: 0.85,
                  }}
                />
              );
            })()}

          <div
            style={{
              position: "relative",
              height: rowsHeight,
              paddingTop: 8,
            }}
          >
            {items.map((item) => {
              const row = rowOf.get(item.id) ?? 0;
              const start = item.start;
              const end = item.end ?? item.start;
              const isRange = item.end !== undefined && item.end !== item.start;
              const startX = timeToPx(start);
              const endX = isRange ? timeToPx(end) : startX;
              const top = row * (ROW_HEIGHT + ROW_GAP);
              const rangeWidth = isRange ? Math.max(2, endX - startX) : 0;
              const itemColor = item.color ?? accentColor;
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemClick(item.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleItemClick(item.id);
                    }
                  }}
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    outline: "none",
                    left: startX,
                    top,
                    height: ROW_HEIGHT,
                    width: Math.max(DOT_HEIGHT, rangeWidth + DOT_HEIGHT),
                  }}
                  title={item.label}
                >
                  <span
                    style={{
                      position: "absolute",
                      whiteSpace: "nowrap",
                      fontSize: 11,
                      top: 0,
                      left: 0,
                      height: LABEL_HEIGHT,
                      lineHeight: `${LABEL_HEIGHT}px`,
                      paddingLeft: 2,
                    }}
                  >
                    {item.label}
                  </span>
                  {isRange && (
                    <div
                      style={{
                        position: "absolute",
                        height: 2,
                        left: 0,
                        top: LABEL_HEIGHT + DOT_HEIGHT / 2 - 1,
                        width: rangeWidth,
                        background: itemColor,
                      }}
                    />
                  )}
                  <span
                    style={{
                      position: "absolute",
                      borderRadius: "50%",
                      left: 0,
                      top: LABEL_HEIGHT + (DOT_HEIGHT - 8) / 2,
                      width: 8,
                      height: 8,
                      background: itemColor,
                    }}
                  />
                  {isRange && (
                    <span
                      style={{
                        position: "absolute",
                        borderRadius: "50%",
                        left: rangeWidth - 8,
                        top: LABEL_HEIGHT + (DOT_HEIGHT - 8) / 2,
                        width: 8,
                        height: 8,
                        background: itemColor,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: AXIS_HEIGHT,
            borderTop: "1px solid rgba(127,127,127,0.25)",
          }}
        >
          {ticks.map((tick) => {
            const x = timeToPx(tick.ms);
            if (x < -40 || x > canvasPx + 40) return null;
            return (
              <div
                key={`tick-${tick.ms}`}
                style={{
                  position: "absolute",
                  top: 0,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  fontSize: 10,
                  fontVariantNumeric: "tabular-nums",
                  opacity: 0.7,
                  left: x,
                  transform: "translateX(-50%)",
                }}
              >
                <div
                  style={{
                    height: 4,
                    width: 1,
                    background: "rgba(127,127,127,0.5)",
                  }}
                />
                <span style={{ marginTop: 2, padding: "0 4px" }}>
                  {tick.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
