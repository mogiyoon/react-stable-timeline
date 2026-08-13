"use client";
import { useRef, useMemo, useCallback, useState, Fragment, useEffect } from 'react';
import { jsx, jsxs, Fragment as Fragment$1 } from 'react/jsx-runtime';

// src/Timeline.tsx

// src/constants.ts
var LABEL_HEIGHT = 16;
var DOT_HEIGHT = 10;
var ROW_HEIGHT = LABEL_HEIGHT + DOT_HEIGHT;
var ROW_GAP = 8;
var AXIS_HEIGHT = 28;
var PAN_BUTTON = 0;
var DRAG_PX = 4;
var TOUCH_DRAG_PX = 8;
var LABEL_FIXED_PX = 24;
var DEFAULT_OVERSCAN_PX = 200;
var DEFAULT_ZOOM_FACTOR = 1.2;
var DEFAULT_ACCENT = "#6c8cff";
var DEFAULT_LABELS = {
  fit: "Fit",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  zoomRatio: "Zoom",
  empty: "No events",
  timeline: "Timeline"
};
function Axis({ ticks, canvasPx, timeToPx }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      "aria-hidden": "true",
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
      "aria-hidden": "true",
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
  return /* @__PURE__ */ jsx(Fragment$1, { children: ticks.map((tick) => {
    const x = timeToPx(tick.ms);
    if (x < -1 || x > canvasPx + 1) return null;
    return /* @__PURE__ */ jsx(
      "div",
      {
        "aria-hidden": "true",
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
  positioned,
  accentColor,
  onSelect,
  moveHandleProps,
  resizeStartHandleProps,
  resizeEndHandleProps,
  keyStepMs,
  moveBy,
  resizeBy
}) {
  const { item, top, startX, endX, isRange, isDragging } = positioned;
  const [focused, setFocused] = useState(false);
  const rangeWidth = isRange ? Math.max(2, endX - startX) : 0;
  const itemColor = item.color ?? accentColor;
  const canMove = !!moveHandleProps;
  const canResize = !!resizeStartHandleProps;
  const showResize = isRange && canResize;
  const ariaLabel = isRange ? `${item.label}, ${new Date(item.start).toLocaleDateString()} \u2013 ${new Date(item.end).toLocaleDateString()}` : `${item.label}, ${new Date(item.start).toLocaleDateString()}`;
  const resizeHandleStyle = {
    position: "absolute",
    top: LABEL_HEIGHT,
    width: 10,
    height: DOT_HEIGHT,
    cursor: "ew-resize"
  };
  return /* @__PURE__ */ jsxs(
    "div",
    {
      role: "button",
      tabIndex: 0,
      "aria-label": ariaLabel,
      onClick: (e) => {
        e.stopPropagation();
        onSelect(item.id);
      },
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
      onKeyDown: (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item.id);
          return;
        }
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          const delta = (e.key === "ArrowRight" ? 1 : -1) * keyStepMs;
          if (e.altKey && canResize && isRange) {
            e.preventDefault();
            resizeBy("start", delta);
          } else if (e.shiftKey && canResize && isRange) {
            e.preventDefault();
            resizeBy("end", delta);
          } else if (canMove) {
            e.preventDefault();
            moveBy(delta);
          }
        }
      },
      ...moveHandleProps,
      style: {
        position: "absolute",
        cursor: canMove ? "grab" : "pointer",
        // touch-drag on a movable item must not turn into a scroll
        touchAction: canMove || canResize ? "none" : void 0,
        outline: focused ? `2px solid ${itemColor}` : "none",
        outlineOffset: 2,
        borderRadius: 2,
        left: startX,
        top,
        height: ROW_HEIGHT,
        width: Math.max(DOT_HEIGHT, rangeWidth + DOT_HEIGHT),
        opacity: isDragging ? 0.75 : 1
      },
      title: item.label,
      children: [
        /* @__PURE__ */ jsx(
          "span",
          {
            "aria-hidden": "true",
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
        ),
        showResize && /* @__PURE__ */ jsxs(Fragment$1, { children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              "aria-hidden": "true",
              ...resizeStartHandleProps,
              style: { ...resizeHandleStyle, left: -4 }
            }
          ),
          /* @__PURE__ */ jsx(
            "span",
            {
              "aria-hidden": "true",
              ...resizeEndHandleProps,
              style: { ...resizeHandleStyle, left: rangeWidth - 6 }
            }
          )
        ] })
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
  typingCommit,
  spinnerCommit,
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
            const raw = e.target.value;
            const v = Number(raw);
            const isTyping = !!e.nativeEvent.inputType;
            const mode = isTyping ? typingCommit : spinnerCommit;
            if (mode === "blur") {
              setZoomPctDraft(raw);
              return;
            }
            if (isTyping) {
              setZoomPctDraft(raw);
              if (Number.isFinite(v)) setZoomPct(v);
              return;
            }
            setZoomPctDraft(null);
            if (Number.isFinite(v)) setZoomPct(v);
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
function useContainerWidth(ref, attached = true, initial = 800) {
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    if (!attached) return;
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
  }, [ref, attached]);
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
function applyDrag(start, end, drag) {
  if (drag.mode === "move") {
    return { start: start + drag.deltaMs, end: end + drag.deltaMs };
  }
  if (drag.mode === "resize-start") {
    return { start: Math.min(start + drag.deltaMs, end - 1), end };
  }
  return { start, end: Math.max(end + drag.deltaMs, start + 1) };
}
function useItemDrag({
  itemMap,
  pxPerMs,
  dragSnapMs,
  onItemMove,
  onItemResize
}) {
  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null);
  const startDrag = useCallback(
    (e, id, mode) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const item = itemMap.get(id);
      if (!item || pxPerMs <= 0) return;
      const commit = mode === "move" ? onItemMove : onItemResize;
      if (!commit) return;
      e.stopPropagation();
      const pointerId = e.pointerId;
      const threshold = e.pointerType === "touch" ? TOUCH_DRAG_PX : DRAG_PX;
      const originX = e.clientX;
      const start = item.start;
      const end = item.end ?? item.start;
      const anchor = mode === "resize-end" ? end : start;
      const cursor = mode === "move" ? "grabbing" : "ew-resize";
      let active = false;
      const onMove = (ev) => {
        if (ev.pointerId !== pointerId) return;
        const dx = ev.clientX - originX;
        if (!active && Math.abs(dx) < threshold) return;
        if (!active) {
          active = true;
          document.body.style.cursor = cursor;
        }
        ev.preventDefault();
        const rawDelta = dx / pxPerMs;
        const deltaMs = dragSnapMs && dragSnapMs > 0 ? Math.round((anchor + rawDelta) / dragSnapMs) * dragSnapMs - anchor : Math.round(rawDelta);
        dragRef.current = { id, mode, deltaMs };
        setDrag(dragRef.current);
      };
      const onUp = (ev) => {
        if (ev.pointerId !== pointerId) return;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        document.body.style.cursor = "";
        const final = dragRef.current;
        dragRef.current = null;
        setDrag(null);
        if (!active || !final || ev.type === "pointercancel") return;
        ev.preventDefault();
        const blockClick = (clickEv) => {
          clickEv.stopPropagation();
          clickEv.preventDefault();
        };
        window.addEventListener("click", blockClick, true);
        setTimeout(() => {
          window.removeEventListener("click", blockClick, true);
        }, 0);
        commit(item, applyDrag(start, end, final));
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [itemMap, pxPerMs, dragSnapMs, onItemMove, onItemResize]
  );
  const getMoveHandleProps = useCallback(
    (id) => onItemMove ? { onPointerDown: (e) => startDrag(e, id, "move") } : void 0,
    [onItemMove, startDrag]
  );
  const getResizeHandleProps = useCallback(
    (id, edge) => onItemResize ? {
      onPointerDown: (e) => startDrag(e, id, edge === "start" ? "resize-start" : "resize-end")
    } : void 0,
    [onItemResize, startDrag]
  );
  const moveItemBy = useCallback(
    (id, deltaMs) => {
      const item = itemMap.get(id);
      if (!item || !onItemMove || deltaMs === 0) return;
      const end = item.end ?? item.start;
      onItemMove(item, applyDrag(item.start, end, { mode: "move", deltaMs }));
    },
    [itemMap, onItemMove]
  );
  const resizeItemBy = useCallback(
    (id, edge, deltaMs) => {
      const item = itemMap.get(id);
      if (!item || !onItemResize || deltaMs === 0) return;
      const end = item.end ?? item.start;
      const mode = edge === "start" ? "resize-start" : "resize-end";
      onItemResize(item, applyDrag(item.start, end, { mode, deltaMs }));
    },
    [itemMap, onItemResize]
  );
  return {
    drag,
    canMove: !!onItemMove,
    canResize: !!onItemResize,
    getMoveHandleProps,
    getResizeHandleProps,
    moveItemBy,
    resizeItemBy
  };
}
function useMeasuredFont(ref, attached = true, fallback = "11px sans-serif") {
  const [font, setFont] = useState(fallback);
  useEffect(() => {
    if (!attached) return;
    const node = ref.current;
    if (!node) return;
    const computed = getComputedStyle(node).font;
    if (computed) setFont(computed);
  }, [ref, attached]);
  return font;
}
function usePan({
  viewportStart,
  viewportEnd,
  canvasPx,
  setViewport
}) {
  const latest = useRef({ viewportStart, viewportEnd, canvasPx, setViewport });
  latest.current = { viewportStart, viewportEnd, canvasPx, setViewport };
  const gestureRef = useRef(null);
  return useCallback((e) => {
    if (e.pointerType === "mouse" && e.button !== PAN_BUTTON) return;
    const existing = gestureRef.current;
    if (existing) {
      existing.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (existing.pointers.size === 2) {
        const [p1, p2] = [...existing.pointers.values()];
        existing.base = {
          start: latest.current.viewportStart,
          end: latest.current.viewportEnd
        };
        existing.pinchBase = {
          dist: Math.max(1, Math.hypot(p1.x - p2.x, p1.y - p2.y)),
          midX: (p1.x + p2.x) / 2
        };
        existing.active = true;
      }
      return;
    }
    const rectLeft = e.currentTarget.getBoundingClientRect?.().left ?? 0;
    const onMove = (ev) => {
      const g = gestureRef.current;
      if (!g) return;
      const p = g.pointers.get(ev.pointerId);
      if (!p) return;
      p.x = ev.clientX;
      p.y = ev.clientY;
      const { canvasPx: canvasPx2, setViewport: setViewport2 } = latest.current;
      if (canvasPx2 <= 0) return;
      const baseSpan = g.base.end - g.base.start;
      if (g.pointers.size >= 2 && g.pinchBase) {
        const [p1, p2] = [...g.pointers.values()];
        const dist = Math.max(1, Math.hypot(p1.x - p2.x, p1.y - p2.y));
        const midX = (p1.x + p2.x) / 2;
        const scale = dist / g.pinchBase.dist;
        const newSpan = baseSpan / scale;
        const midTime = g.base.start + (g.pinchBase.midX - g.rectLeft) / canvasPx2 * baseSpan;
        const newStart = midTime - (midX - g.rectLeft) / canvasPx2 * newSpan;
        setViewport2(newStart, newStart + newSpan);
        return;
      }
      const dx = p.x - g.origin.x;
      const dy = p.y - g.origin.y;
      if (!g.active && Math.abs(dx) < g.threshold && Math.abs(dy) < g.threshold) {
        return;
      }
      if (!g.active) {
        g.active = true;
        document.body.style.cursor = "grabbing";
      }
      ev.preventDefault();
      const dt = -(dx / canvasPx2) * baseSpan;
      setViewport2(g.base.start + dt, g.base.end + dt);
    };
    const onUp = (ev) => {
      const g = gestureRef.current;
      if (!g || !g.pointers.has(ev.pointerId)) return;
      g.pointers.delete(ev.pointerId);
      if (g.pointers.size === 1) {
        const [p] = [...g.pointers.values()];
        g.base = {
          start: latest.current.viewportStart,
          end: latest.current.viewportEnd
        };
        g.origin = { x: p.x, y: p.y };
        g.pinchBase = null;
        return;
      }
      if (g.pointers.size > 0) return;
      g.cleanup();
      gestureRef.current = null;
      document.body.style.cursor = "";
      if (g.active && ev.type === "pointerup") {
        ev.preventDefault();
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
    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    gestureRef.current = {
      pointers: /* @__PURE__ */ new Map([[e.pointerId, { x: e.clientX, y: e.clientY }]]),
      base: {
        start: latest.current.viewportStart,
        end: latest.current.viewportEnd
      },
      origin: { x: e.clientX, y: e.clientY },
      rectLeft,
      pinchBase: null,
      active: false,
      threshold: e.pointerType === "touch" ? TOUCH_DRAG_PX : DRAG_PX,
      cleanup
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, []);
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
  const FIXED_PX = LABEL_FIXED_PX;
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
var UNMEASURED = { scrollTop: 0, height: Infinity };
function useScrollWindow(ref, enabled) {
  const [win, setWin] = useState(UNMEASURED);
  useEffect(() => {
    if (!enabled) {
      setWin(UNMEASURED);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const update = () => {
      setWin((prev) => {
        const next = {
          scrollTop: node.scrollTop,
          height: node.clientHeight || Infinity
        };
        return prev.scrollTop === next.scrollTop && prev.height === next.height ? prev : next;
      });
    };
    update();
    node.addEventListener("scroll", update, { passive: true });
    const obs = new ResizeObserver(update);
    obs.observe(node);
    return () => {
      node.removeEventListener("scroll", update);
      obs.disconnect();
    };
  }, [ref, enabled]);
  return win;
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
  const [inner, setInner] = useState(
    null
  );
  const rawStart = isControlled ? viewportStartProp : inner?.start ?? fitWindow?.start ?? 0;
  const rawEnd = isControlled ? viewportEndProp : inner?.end ?? fitWindow?.end ?? 1;
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
      const clamped = isControlled ? { start, end } : clampViewport(start, end);
      if (!isControlled) {
        setInner(clamped);
      }
      onViewportChange?.(clamped.start, clamped.end);
    },
    [clampViewport, isControlled, onViewportChange]
  );
  return { viewportStart, viewportEnd, setViewport, isControlled };
}
function useVisibleItems({
  items,
  rowOf,
  timeToPx,
  measureLabel,
  canvasPx,
  drag,
  virtualize,
  overscanPx,
  rowHeight,
  rowGap,
  scrollTop,
  viewHeight
}) {
  const labelWidths = useMemo(() => {
    const m = /* @__PURE__ */ new Map();
    for (const it of items) m.set(it.id, measureLabel(it.label));
    return m;
  }, [items, measureLabel]);
  return useMemo(() => {
    const out = [];
    const minX = -overscanPx;
    const maxX = canvasPx + overscanPx;
    const cullRows = virtualize && Number.isFinite(viewHeight);
    const minTop = scrollTop - overscanPx;
    const maxTop = scrollTop + viewHeight + overscanPx;
    for (const item of items) {
      const isDragging = drag !== null && drag.id === item.id;
      let start = item.start;
      let end = item.end ?? item.start;
      if (isDragging && drag) {
        ({ start, end } = applyDrag(start, end, drag));
      }
      const isRange = end !== start;
      const row = rowOf.get(item.id) ?? 0;
      const top = row * (rowHeight + rowGap);
      if (cullRows && (top + rowHeight < minTop || top > maxTop)) continue;
      const startX = timeToPx(start);
      const endX = isRange ? timeToPx(end) : startX;
      if (virtualize) {
        const renderEndX = Math.max(
          endX,
          startX + (labelWidths.get(item.id) ?? 0) + LABEL_FIXED_PX
        );
        if (renderEndX < minX || startX > maxX) continue;
      }
      out.push({ item, row, top, startX, endX, isRange, isDragging });
    }
    return out;
  }, [
    items,
    rowOf,
    timeToPx,
    canvasPx,
    drag,
    virtualize,
    overscanPx,
    rowHeight,
    rowGap,
    scrollTop,
    viewHeight,
    labelWidths
  ]);
}
function useWheelZoom({
  containerRef,
  attached = true,
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
    if (!attached) return;
    const node = containerRef.current;
    if (!node) return;
    const onWheel = (e) => handlerRef.current(e);
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [containerRef, attached]);
}

// src/useTimeline.ts
function useTimeline({
  items,
  viewportStart: viewportStartProp,
  viewportEnd: viewportEndProp,
  onViewportChange,
  zoomMinPct = 100,
  zoomMaxPct = 5e3,
  zoomFactor = DEFAULT_ZOOM_FACTOR,
  zoomStable = false,
  onItemMove,
  onItemResize,
  dragSnapMs,
  virtualization = true,
  overscanPx = DEFAULT_OVERSCAN_PX,
  rowHeight = ROW_HEIGHT,
  rowGap = ROW_GAP
}) {
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const probeRef = useRef(null);
  const itemMap = useMemo(() => {
    const m = /* @__PURE__ */ new Map();
    for (const it of items) m.set(it.id, it);
    return m;
  }, [items]);
  const hasItems = items.length > 0;
  const canvasPx = useContainerWidth(containerRef, hasItems);
  const measureFont = useMeasuredFont(probeRef, hasItems);
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
  const pxToTime = useCallback(
    (px) => pxPerMs > 0 ? viewportStart + px / pxPerMs : viewportStart,
    [viewportStart, pxPerMs]
  );
  const fitPxPerMs = fitWindow && fitWindow.span > 0 ? canvasPx / fitWindow.span : 0;
  const packPxPerMs = zoomStable ? fitPxPerMs : pxPerMs;
  const { rowOf, totalRows } = useRowPacking(
    packInput,
    packPxPerMs,
    measureLabel
  );
  const handlePointerDown = usePan({
    viewportStart,
    viewportEnd,
    canvasPx,
    setViewport
  });
  useWheelZoom({
    containerRef,
    attached: hasItems,
    viewportStart,
    viewportEnd,
    canvasPx,
    zoomFactor,
    setViewport
  });
  const ticks = useTimelineTicks(viewportStart, viewportEnd, canvasPx);
  const {
    drag,
    canMove,
    canResize,
    getMoveHandleProps,
    getResizeHandleProps,
    moveItemBy,
    resizeItemBy
  } = useItemDrag({
    itemMap,
    pxPerMs,
    dragSnapMs,
    onItemMove,
    onItemResize
  });
  const { scrollTop, height: viewHeight } = useScrollWindow(
    scrollRef,
    virtualization && items.length > 0
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
    viewHeight
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
    return Math.round(fitWindow.span / viewportSpan * 100);
  }, [fitWindow, viewportSpan]);
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
  const probeProps = useMemo(
    () => ({
      ref: probeRef,
      "aria-hidden": true,
      style: {
        position: "absolute",
        visibility: "hidden",
        pointerEvents: "none",
        fontSize: 11,
        whiteSpace: "nowrap"
      }
    }),
    []
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
    resizeItemBy
  };
}
function Timeline({
  items,
  viewportStart,
  viewportEnd,
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
  zoomInputTypingCommit = "immediate",
  zoomInputSpinnerCommit = "immediate",
  onItemMove,
  onItemResize,
  dragSnapMs,
  virtualization = true,
  overscanPx,
  renderItem,
  className,
  style
}) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp ?? {} };
  const tl = useTimeline({
    items,
    viewportStart,
    viewportEnd,
    onViewportChange,
    zoomMinPct,
    zoomMaxPct,
    zoomFactor,
    zoomStable,
    onItemMove,
    onItemResize,
    dragSnapMs,
    virtualization,
    overscanPx
  });
  const handleItemClick = useCallback(
    (id) => {
      const item = tl.itemMap.get(id);
      if (!item) return;
      onSelect?.(item);
    },
    [tl.itemMap, onSelect]
  );
  const [zoomPctDraft, setZoomPctDraft] = useState(null);
  const keyStepMs = dragSnapMs ?? Math.max(1, Math.round(tl.viewportSpan / 100));
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
        zoomPct: tl.zoomPct,
        zoomPctDraft,
        setZoomPctDraft,
        setZoomPct: tl.setZoomPct,
        zoomMinPct,
        zoomMaxPct,
        typingCommit: zoomInputTypingCommit,
        spinnerCommit: zoomInputSpinnerCommit,
        onFit: tl.fit,
        onZoomIn: tl.zoomIn,
        onZoomOut: tl.zoomOut
      }
    ),
    /* @__PURE__ */ jsxs(
      "div",
      {
        ...tl.containerProps,
        style: {
          position: "relative",
          flex: "1 1 auto",
          userSelect: "none",
          overflow: "hidden",
          cursor: "grab",
          // horizontal touch gestures pan/pinch the timeline; vertical
          // stays native so the rows area can still scroll
          touchAction: "pan-y"
        },
        children: [
          /* @__PURE__ */ jsx("span", { ...tl.probeProps }),
          /* @__PURE__ */ jsx(
            "div",
            {
              ref: tl.scrollRef,
              role: "group",
              "aria-label": `${labels.timeline} (${items.length})`,
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
                /* @__PURE__ */ jsx(
                  GridLines,
                  {
                    ticks: tl.ticks,
                    canvasPx: tl.canvasPx,
                    timeToPx: tl.timeToPx
                  }
                ),
                /* @__PURE__ */ jsx(
                  CursorLine,
                  {
                    cursorMs,
                    canvasPx: tl.canvasPx,
                    timeToPx: tl.timeToPx,
                    accentColor
                  }
                ),
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    style: {
                      position: "relative",
                      height: tl.rowsHeight,
                      // NOT padding: absolutely-positioned items anchor to the
                      // padding box, so padding wouldn't push them down — a
                      // transparent border does, giving the top row's focus
                      // outline room instead of clipping at the scroll edge.
                      borderTop: "8px solid transparent"
                    },
                    children: tl.visibleItems.map((positioned) => {
                      const id = positioned.item.id;
                      const moveBy = (deltaMs) => tl.moveItemBy(id, deltaMs);
                      const resizeBy = (edge, deltaMs) => tl.resizeItemBy(id, edge, deltaMs);
                      if (renderItem) {
                        return /* @__PURE__ */ jsx(Fragment, { children: renderItem({
                          ...positioned,
                          select: () => handleItemClick(id),
                          moveHandleProps: tl.getMoveHandleProps(id),
                          resizeStartHandleProps: tl.getResizeHandleProps(
                            id,
                            "start"
                          ),
                          resizeEndHandleProps: tl.getResizeHandleProps(
                            id,
                            "end"
                          ),
                          moveBy,
                          resizeBy
                        }) }, id);
                      }
                      return /* @__PURE__ */ jsx(
                        TimelineItemView,
                        {
                          positioned,
                          accentColor,
                          onSelect: handleItemClick,
                          moveHandleProps: tl.getMoveHandleProps(id),
                          resizeStartHandleProps: tl.getResizeHandleProps(
                            id,
                            "start"
                          ),
                          resizeEndHandleProps: tl.getResizeHandleProps(id, "end"),
                          keyStepMs,
                          moveBy,
                          resizeBy
                        },
                        id
                      );
                    })
                  }
                )
              ] })
            }
          ),
          /* @__PURE__ */ jsx(Axis, { ticks: tl.ticks, canvasPx: tl.canvasPx, timeToPx: tl.timeToPx })
        ]
      }
    )
  ] });
}

export { AXIS_HEIGHT, DOT_HEIGHT, LABEL_HEIGHT, ROW_GAP, ROW_HEIGHT, Timeline, makeLabelMeasurer, packIntoRows, pickTicks, useTimeline };
