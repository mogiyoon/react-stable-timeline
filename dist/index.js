import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';

// src/Timeline.tsx

// src/constants.ts
var LABEL_HEIGHT = 16;
var DOT_HEIGHT = 10;
var ROW_HEIGHT = LABEL_HEIGHT + DOT_HEIGHT;
var ROW_GAP = 8;
var AXIS_HEIGHT = 28;
var PAN_BUTTON = 0;
var DRAG_PX = 4;
var DEFAULT_ZOOM_FACTOR = 1.2;
var DEFAULT_ACCENT = "#6c8cff";
var DEFAULT_LABELS = {
  fit: "Fit",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  zoomRatio: "Zoom",
  empty: "No events"
};
function Axis({ ticks, canvasPx, timeToPx }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      style: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: AXIS_HEIGHT,
        borderTop: "1px solid rgba(127,127,127,0.25)"
      },
      children: ticks.map((tick) => {
        const x = timeToPx(tick.ms);
        if (x < -40 || x > canvasPx + 40) return null;
        return /* @__PURE__ */ jsxs(
          "div",
          {
            style: {
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
              transform: "translateX(-50%)"
            },
            children: [
              /* @__PURE__ */ jsx(
                "div",
                {
                  style: {
                    height: 4,
                    width: 1,
                    background: "rgba(127,127,127,0.5)"
                  }
                }
              ),
              /* @__PURE__ */ jsx("span", { style: { marginTop: 2, padding: "0 4px" }, children: tick.label })
            ]
          },
          `tick-${tick.ms}`
        );
      })
    }
  );
}
function CursorLine({
  cursorMs,
  canvasPx,
  timeToPx,
  accentColor
}) {
  if (cursorMs === null || cursorMs === void 0) return null;
  const x = timeToPx(cursorMs);
  if (x < 0 || x > canvasPx) return null;
  return /* @__PURE__ */ jsx(
    "div",
    {
      style: {
        pointerEvents: "none",
        position: "absolute",
        top: 0,
        bottom: 0,
        width: 1,
        left: x,
        background: accentColor,
        opacity: 0.85
      }
    }
  );
}
function GridLines({ ticks, canvasPx, timeToPx }) {
  return /* @__PURE__ */ jsx(Fragment, { children: ticks.map((tick) => {
    const x = timeToPx(tick.ms);
    if (x < -1 || x > canvasPx + 1) return null;
    return /* @__PURE__ */ jsx(
      "div",
      {
        style: {
          pointerEvents: "none",
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 1,
          left: x,
          background: "rgba(127,127,127,0.15)"
        }
      },
      `grid-${tick.ms}`
    );
  }) });
}
function TimelineItemView({
  item,
  row,
  startX,
  endX,
  isRange,
  accentColor,
  onSelect
}) {
  const top = row * (ROW_HEIGHT + ROW_GAP);
  const rangeWidth = isRange ? Math.max(2, endX - startX) : 0;
  const itemColor = item.color ?? accentColor;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      role: "button",
      tabIndex: 0,
      onClick: (e) => {
        e.stopPropagation();
        onSelect(item.id);
      },
      onKeyDown: (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item.id);
        }
      },
      style: {
        position: "absolute",
        cursor: "pointer",
        outline: "none",
        left: startX,
        top,
        height: ROW_HEIGHT,
        width: Math.max(DOT_HEIGHT, rangeWidth + DOT_HEIGHT)
      },
      title: item.label,
      children: [
        /* @__PURE__ */ jsx(
          "span",
          {
            style: {
              position: "absolute",
              whiteSpace: "nowrap",
              fontSize: 11,
              top: 0,
              left: 0,
              height: LABEL_HEIGHT,
              lineHeight: `${LABEL_HEIGHT}px`,
              paddingLeft: 2
            },
            children: item.label
          }
        ),
        isRange && /* @__PURE__ */ jsx(
          "div",
          {
            style: {
              position: "absolute",
              height: 2,
              left: 0,
              top: LABEL_HEIGHT + DOT_HEIGHT / 2 - 1,
              width: rangeWidth,
              background: itemColor
            }
          }
        ),
        /* @__PURE__ */ jsx(
          "span",
          {
            style: {
              position: "absolute",
              borderRadius: "50%",
              left: 0,
              top: LABEL_HEIGHT + (DOT_HEIGHT - 8) / 2,
              width: 8,
              height: 8,
              background: itemColor
            }
          }
        ),
        isRange && /* @__PURE__ */ jsx(
          "span",
          {
            style: {
              position: "absolute",
              borderRadius: "50%",
              left: rangeWidth - 8,
              top: LABEL_HEIGHT + (DOT_HEIGHT - 8) / 2,
              width: 8,
              height: 8,
              background: itemColor
            }
          }
        )
      ]
    }
  );
}
var toolbarStyle = {
  display: "flex",
  flexShrink: 0,
  alignItems: "center",
  gap: 8,
  borderBottom: "1px solid rgba(127,127,127,0.25)",
  padding: "6px 12px",
  fontSize: 12
};
var buttonStyle = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "inherit",
  padding: "2px 6px",
  borderRadius: 4,
  font: "inherit"
};
var iconButtonStyle = {
  ...buttonStyle,
  width: 24,
  height: 24,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center"
};
var zoomLabelStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 10,
  opacity: 0.75,
  marginLeft: 4
};
var zoomInputStyle = {
  width: 60,
  padding: "2px 4px",
  fontSize: 10,
  border: "1px solid rgba(127,127,127,0.4)",
  borderRadius: 3,
  background: "transparent",
  color: "inherit",
  fontVariantNumeric: "tabular-nums"
};
function Toolbar({
  labels,
  zoomPct,
  zoomPctDraft,
  setZoomPctDraft,
  setZoomPct,
  zoomMinPct,
  zoomMaxPct,
  onFit,
  onZoomIn,
  onZoomOut
}) {
  return /* @__PURE__ */ jsxs("div", { style: toolbarStyle, children: [
    /* @__PURE__ */ jsx("button", { type: "button", onClick: onFit, style: buttonStyle, children: labels.fit }),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: onZoomOut,
        style: iconButtonStyle,
        "aria-label": labels.zoomOut,
        children: "\u2212"
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: onZoomIn,
        style: iconButtonStyle,
        "aria-label": labels.zoomIn,
        children: "+"
      }
    ),
    /* @__PURE__ */ jsxs("label", { style: zoomLabelStyle, children: [
      /* @__PURE__ */ jsx("span", { children: labels.zoomRatio }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "number",
          value: zoomPctDraft ?? String(zoomPct),
          min: zoomMinPct,
          max: zoomMaxPct,
          step: 5,
          onChange: (e) => {
            setZoomPctDraft(e.target.value);
          },
          onBlur: (e) => {
            const v = Number(e.target.value);
            setZoomPctDraft(null);
            if (!Number.isFinite(v)) return;
            setZoomPct(v);
          },
          onKeyDown: (e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          },
          style: zoomInputStyle
        }
      ),
      /* @__PURE__ */ jsx("span", { children: "%" })
    ] })
  ] });
}
function useContainerWidth(ref, initial = 800) {
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const initialWidth = node.clientWidth;
    if (initialWidth > 0) setWidth(initialWidth);
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setWidth(w);
      }
    });
    obs.observe(node);
    return () => obs.disconnect();
  }, [ref]);
  return width;
}
function useFitWindow(items) {
  return useMemo(() => {
    if (items.length === 0) return null;
    let min = Infinity;
    let max = -Infinity;
    for (const i of items) {
      if (i.start < min) min = i.start;
      if (i.end > max) max = i.end;
    }
    const span = Math.max(1, max - min);
    return {
      start: min - span * 0.05,
      end: max + span * 0.05,
      span: span * 1.1
    };
  }, [items]);
}
function useMeasuredFont(ref, fallback = "11px sans-serif") {
  const [font, setFont] = useState(fallback);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const computed = getComputedStyle(node).font;
    if (computed) setFont(computed);
  }, [ref]);
  return font;
}
function usePan({
  viewportStart,
  viewportEnd,
  canvasPx,
  setViewport
}) {
  return useCallback(
    (e) => {
      if (e.button !== PAN_BUTTON) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const startVp = { start: viewportStart, end: viewportEnd };
      const startSpan = startVp.end - startVp.start;
      let panning = false;
      const onMove = (ev) => {
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
      const onUp = (ev) => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        if (panning) {
          ev.preventDefault();
          ev.stopPropagation();
          const blockClick = (clickEv) => {
            clickEv.stopPropagation();
            clickEv.preventDefault();
          };
          window.addEventListener("click", blockClick, true);
          setTimeout(() => {
            window.removeEventListener("click", blockClick, true);
          }, 0);
        }
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [viewportStart, viewportEnd, canvasPx, setViewport]
  );
}

// src/packing.ts
function packIntoRows(items, pxPerMs, measureLabel) {
  const sorted = [...items].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return a.label.localeCompare(b.label);
  });
  const rowOf = /* @__PURE__ */ new Map();
  if (sorted.length === 0) return rowOf;
  const minTime = sorted[0].start;
  const FIXED_PX = 24;
  const rowEndsPx = [];
  for (const item of sorted) {
    const startPx = (item.start - minTime) * pxPerMs;
    const rangeEndPx = item.isRange ? (item.end - minTime) * pxPerMs : startPx;
    const labelEndPx = startPx + measureLabel(item.label) + FIXED_PX;
    const endPx = Math.max(rangeEndPx, labelEndPx);
    let row = -1;
    for (let i = 0; i < rowEndsPx.length; i++) {
      if (rowEndsPx[i] <= startPx) {
        row = i;
        break;
      }
    }
    if (row === -1) {
      row = rowEndsPx.length;
      rowEndsPx.push(endPx);
    } else {
      rowEndsPx[row] = endPx;
    }
    rowOf.set(item.id, row);
  }
  return rowOf;
}
function makeLabelMeasurer(font = "11px sans-serif") {
  if (typeof document === "undefined") {
    return (s) => s.length * 8;
  }
  const canvas = document.createElement("canvas");
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) return (s) => s.length * 8;
  ctx2d.font = font;
  return (s) => ctx2d.measureText(s).width;
}
function toPackInput(items) {
  return items.map((i) => ({
    id: i.id,
    label: i.label,
    start: i.start,
    end: i.end ?? i.start,
    isRange: i.end !== void 0 && i.end !== i.start
  }));
}

// src/hooks/useRowPacking.ts
function useRowPacking(packInput, packPxPerMs, measureLabel) {
  const rowOf = useMemo(() => {
    if (packPxPerMs <= 0) return /* @__PURE__ */ new Map();
    return packIntoRows(packInput, packPxPerMs, measureLabel);
  }, [packInput, packPxPerMs, measureLabel]);
  const totalRows = useMemo(() => {
    let max = 0;
    for (const r of rowOf.values()) max = Math.max(max, r);
    return rowOf.size === 0 ? 0 : max + 1;
  }, [rowOf]);
  return { rowOf, totalRows };
}

// src/ticks.ts
function pickTicks(viewportStart, viewportEnd, canvasPx) {
  const span = viewportEnd - viewportStart;
  const pxPerMs = canvasPx / Math.max(1, span);
  const targetPx = 100;
  const targetMs = targetPx / pxPerMs;
  const yr = 365.25 * 24 * 3600 * 1e3;
  const mo = 30 * 24 * 3600 * 1e3;
  const dy = 24 * 3600 * 1e3;
  const hr = 3600 * 1e3;
  if (targetMs >= 10 * yr) {
    return { step: 10 * yr, format: (d) => `${d.getFullYear()}` };
  }
  if (targetMs >= 5 * yr) {
    return { step: 5 * yr, format: (d) => `${d.getFullYear()}` };
  }
  if (targetMs >= 2 * yr) {
    return { step: 2 * yr, format: (d) => `${d.getFullYear()}` };
  }
  if (targetMs >= yr) {
    return { step: yr, format: (d) => `${d.getFullYear()}` };
  }
  if (targetMs >= 6 * mo) {
    return {
      step: 6 * mo,
      format: (d) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`
    };
  }
  if (targetMs >= 3 * mo) {
    return {
      step: 3 * mo,
      format: (d) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`
    };
  }
  if (targetMs >= mo) {
    return {
      step: mo,
      format: (d) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`
    };
  }
  if (targetMs >= 7 * dy) {
    return {
      step: 7 * dy,
      format: (d) => `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`
    };
  }
  if (targetMs >= dy) {
    return {
      step: dy,
      format: (d) => `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`
    };
  }
  return {
    step: hr,
    format: (d) => `${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`
  };
}

// src/hooks/useTimelineTicks.ts
function useTimelineTicks(viewportStart, viewportEnd, canvasPx) {
  const viewportSpan = viewportEnd - viewportStart;
  const tickSpec = useMemo(() => {
    if (canvasPx <= 0 || viewportSpan <= 0) return null;
    return pickTicks(viewportStart, viewportEnd, canvasPx);
  }, [viewportStart, viewportEnd, viewportSpan, canvasPx]);
  return useMemo(() => {
    if (!tickSpec) return [];
    const buffer = viewportSpan * 3;
    const first = Math.floor((viewportStart - buffer) / tickSpec.step) * tickSpec.step;
    const last = viewportEnd + buffer;
    const out = [];
    for (let ms = first; ms <= last; ms += tickSpec.step) {
      out.push({ ms, label: tickSpec.format(new Date(ms)) });
    }
    return out;
  }, [tickSpec, viewportStart, viewportEnd, viewportSpan]);
}
function useViewport({
  fitWindow,
  viewportStartProp,
  viewportEndProp,
  onViewportChange,
  zoomMinPct,
  zoomMaxPct
}) {
  const isControlled = viewportStartProp !== void 0 && viewportEndProp !== void 0;
  const [innerStart, setInnerStart] = useState(0);
  const [innerEnd, setInnerEnd] = useState(1);
  useEffect(() => {
    if (isControlled) return;
    if (!fitWindow) return;
    setInnerStart(fitWindow.start);
    setInnerEnd(fitWindow.end);
  }, [fitWindow?.start, fitWindow?.end, isControlled]);
  const rawStart = isControlled ? viewportStartProp : innerStart;
  const rawEnd = isControlled ? viewportEndProp : innerEnd;
  const viewportValid = Number.isFinite(rawStart) && Number.isFinite(rawEnd) && rawEnd > rawStart;
  const viewportStart = viewportValid ? rawStart : 0;
  const viewportEnd = viewportValid ? rawEnd : 1;
  const clampViewport = useCallback(
    (start, end) => {
      if (!fitWindow) return { start, end };
      const span = end - start;
      const maxSpan = fitWindow.span * 100 / zoomMinPct;
      const minSpan = fitWindow.span * 100 / zoomMaxPct;
      if (minSpan > maxSpan) return { start, end };
      if (span > maxSpan) {
        const center = (start + end) / 2;
        return { start: center - maxSpan / 2, end: center + maxSpan / 2 };
      }
      if (span < minSpan) {
        const center = (start + end) / 2;
        return { start: center - minSpan / 2, end: center + minSpan / 2 };
      }
      return { start, end };
    },
    [fitWindow, zoomMinPct, zoomMaxPct]
  );
  const setViewport = useCallback(
    (start, end) => {
      const clamped = clampViewport(start, end);
      if (!isControlled) {
        setInnerStart(clamped.start);
        setInnerEnd(clamped.end);
      }
      onViewportChange?.(clamped.start, clamped.end);
    },
    [clampViewport, isControlled, onViewportChange]
  );
  return { viewportStart, viewportEnd, setViewport, isControlled };
}
function useWheelZoom({
  containerRef,
  viewportStart,
  viewportEnd,
  canvasPx,
  zoomFactor,
  setViewport
}) {
  const handlerRef = useRef(() => {
  });
  const viewportSpan = viewportEnd - viewportStart;
  handlerRef.current = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cursorX = e.clientX - rect.left;
      const cursorTime = viewportStart + cursorX / canvasPx * viewportSpan;
      const factor = e.deltaY > 0 ? zoomFactor : 1 / zoomFactor;
      const newSpan = viewportSpan * factor;
      const newStart = cursorTime - cursorX / canvasPx * newSpan;
      setViewport(newStart, newStart + newSpan);
      return;
    }
    const horizontalDelta = e.deltaX !== 0 ? e.deltaX : e.shiftKey ? e.deltaY : 0;
    if (horizontalDelta === 0) return;
    e.preventDefault();
    const dt = horizontalDelta / canvasPx * viewportSpan;
    setViewport(viewportStart + dt, viewportEnd + dt);
  };
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onWheel = (e) => handlerRef.current(e);
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [containerRef]);
}
function Timeline({
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
  zoomMaxPct = 5e3,
  zoomFactor = DEFAULT_ZOOM_FACTOR,
  zoomStable = false,
  className,
  style
}) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp ?? {} };
  const itemMap = useMemo(() => {
    const m = /* @__PURE__ */ new Map();
    for (const it of items) m.set(it.id, it);
    return m;
  }, [items]);
  const containerRef = useRef(null);
  const probeRef = useRef(null);
  const canvasPx = useContainerWidth(containerRef);
  const measureFont = useMeasuredFont(probeRef);
  const measureLabel = useMemo(
    () => makeLabelMeasurer(measureFont),
    [measureFont]
  );
  const packInput = useMemo(() => toPackInput(items), [items]);
  const fitWindow = useFitWindow(packInput);
  const { viewportStart, viewportEnd, setViewport } = useViewport({
    fitWindow,
    viewportStartProp,
    viewportEndProp,
    onViewportChange,
    zoomMinPct,
    zoomMaxPct
  });
  const viewportSpan = viewportEnd - viewportStart;
  const pxPerMs = viewportSpan > 0 ? canvasPx / viewportSpan : 0;
  const timeToPx = useCallback(
    (ms) => (ms - viewportStart) * pxPerMs,
    [viewportStart, pxPerMs]
  );
  const fitPxPerMs = fitWindow && fitWindow.span > 0 ? canvasPx / fitWindow.span : 0;
  const packPxPerMs = zoomStable ? fitPxPerMs : pxPerMs;
  const { rowOf, totalRows } = useRowPacking(
    packInput,
    packPxPerMs,
    measureLabel
  );
  const handleMouseDown = usePan({
    viewportStart,
    viewportEnd,
    canvasPx,
    setViewport
  });
  useWheelZoom({
    containerRef,
    viewportStart,
    viewportEnd,
    canvasPx,
    zoomFactor,
    setViewport
  });
  const handleItemClick = useCallback(
    (id) => {
      const item = itemMap.get(id);
      if (!item) return;
      onSelect?.(item);
    },
    [itemMap, onSelect]
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
    return Math.round(fitWindow.span / viewportSpan * 100);
  }, [fitWindow, viewportSpan]);
  const [zoomPctDraft, setZoomPctDraft] = useState(null);
  const setZoomPct = useCallback(
    (rawPct) => {
      if (!fitWindow) return;
      const pct = Math.max(zoomMinPct, Math.min(zoomMaxPct, rawPct));
      const center = (viewportStart + viewportEnd) / 2;
      const newSpan = fitWindow.span * 100 / pct;
      setViewport(center - newSpan / 2, center + newSpan / 2);
    },
    [fitWindow, viewportStart, viewportEnd, setViewport, zoomMinPct, zoomMaxPct]
  );
  if (items.length === 0) {
    return /* @__PURE__ */ jsx(
      "div",
      {
        className,
        style: {
          display: "flex",
          flex: "1 1 auto",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
          fontSize: 13,
          color: "#888",
          ...style
        },
        children: labels.empty
      }
    );
  }
  const rowsHeight = totalRows * (ROW_HEIGHT + ROW_GAP);
  const containerStyle = {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 280,
    width: "100%",
    ...style
  };
  return /* @__PURE__ */ jsxs("div", { className, style: containerStyle, children: [
    !hideToolbar && /* @__PURE__ */ jsx(
      Toolbar,
      {
        labels,
        zoomPct,
        zoomPctDraft,
        setZoomPctDraft,
        setZoomPct,
        zoomMinPct,
        zoomMaxPct,
        onFit: handleFit,
        onZoomIn: handleZoomIn,
        onZoomOut: handleZoomOut
      }
    ),
    /* @__PURE__ */ jsxs(
      "div",
      {
        ref: containerRef,
        onMouseDown: handleMouseDown,
        style: {
          position: "relative",
          flex: "1 1 auto",
          userSelect: "none",
          overflow: "hidden",
          cursor: "grab"
        },
        children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              ref: probeRef,
              "aria-hidden": "true",
              style: {
                position: "absolute",
                visibility: "hidden",
                pointerEvents: "none",
                fontSize: 11,
                whiteSpace: "nowrap"
              }
            }
          ),
          /* @__PURE__ */ jsx(
            "div",
            {
              style: {
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                bottom: AXIS_HEIGHT,
                overflowY: "auto",
                overflowX: "hidden"
              },
              children: /* @__PURE__ */ jsxs("div", { style: { position: "relative", minHeight: "100%" }, children: [
                /* @__PURE__ */ jsx(GridLines, { ticks, canvasPx, timeToPx }),
                /* @__PURE__ */ jsx(
                  CursorLine,
                  {
                    cursorMs,
                    canvasPx,
                    timeToPx,
                    accentColor
                  }
                ),
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    style: {
                      position: "relative",
                      height: rowsHeight,
                      paddingTop: 8
                    },
                    children: items.map((item) => {
                      const start = item.start;
                      const end = item.end ?? item.start;
                      const isRange = item.end !== void 0 && item.end !== item.start;
                      const startX = timeToPx(start);
                      const endX = isRange ? timeToPx(end) : startX;
                      return /* @__PURE__ */ jsx(
                        TimelineItemView,
                        {
                          item,
                          row: rowOf.get(item.id) ?? 0,
                          startX,
                          endX,
                          isRange,
                          accentColor,
                          onSelect: handleItemClick
                        },
                        item.id
                      );
                    })
                  }
                )
              ] })
            }
          ),
          /* @__PURE__ */ jsx(Axis, { ticks, canvasPx, timeToPx })
        ]
      }
    )
  ] });
}

export { Timeline, makeLabelMeasurer, packIntoRows, pickTicks };
