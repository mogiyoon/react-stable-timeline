"use client";

import {
  Fragment,
  useCallback,
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
} from "./constants";
import { useTimeline } from "./useTimeline";
import type { TimelineProps } from "./types";

export function Timeline<TData = unknown>({
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
  zoomMaxPct = 5000,
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
  style,
}: TimelineProps<TData>) {
  const labels = { ...DEFAULT_LABELS, ...(labelsProp ?? {}) };

  const tl = useTimeline<TData>({
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
    overscanPx,
  });

  const handleItemClick = useCallback(
    (id: string) => {
      const item = tl.itemMap.get(id);
      if (!item) return;
      onSelect?.(item);
    },
    [tl.itemMap, onSelect],
  );

  const [zoomPctDraft, setZoomPctDraft] = useState<string | null>(null);

  // Arrow-key move/resize step: the snap grid when set, else 1 % of the
  // current viewport so the step scales with zoom.
  const keyStepMs =
    dragSnapMs ?? Math.max(1, Math.round(tl.viewportSpan / 100));

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
          zoomPct={tl.zoomPct}
          zoomPctDraft={zoomPctDraft}
          setZoomPctDraft={setZoomPctDraft}
          setZoomPct={tl.setZoomPct}
          zoomMinPct={zoomMinPct}
          zoomMaxPct={zoomMaxPct}
          typingCommit={zoomInputTypingCommit}
          spinnerCommit={zoomInputSpinnerCommit}
          onFit={tl.fit}
          onZoomIn={tl.zoomIn}
          onZoomOut={tl.zoomOut}
        />
      )}

      <div
        {...tl.containerProps}
        style={{
          position: "relative",
          flex: "1 1 auto",
          userSelect: "none",
          overflow: "hidden",
          cursor: "grab",
          // horizontal touch gestures pan/pinch the timeline; vertical
          // stays native so the rows area can still scroll
          touchAction: "pan-y",
        }}
      >
        <span {...tl.probeProps} />
        <div
          ref={tl.scrollRef}
          role="group"
          aria-label={`${labels.timeline} (${items.length})`}
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
            <GridLines
              ticks={tl.ticks}
              canvasPx={tl.canvasPx}
              timeToPx={tl.timeToPx}
            />
            <CursorLine
              cursorMs={cursorMs}
              canvasPx={tl.canvasPx}
              timeToPx={tl.timeToPx}
              accentColor={accentColor}
            />
            <div
              style={{
                position: "relative",
                height: tl.rowsHeight,
                // NOT padding: absolutely-positioned items anchor to the
                // padding box, so padding wouldn't push them down — a
                // transparent border does, giving the top row's focus
                // outline room instead of clipping at the scroll edge.
                borderTop: "8px solid transparent",
              }}
            >
              {tl.visibleItems.map((positioned) => {
                const id = positioned.item.id;
                const moveBy = (deltaMs: number) => tl.moveItemBy(id, deltaMs);
                const resizeBy = (edge: "start" | "end", deltaMs: number) =>
                  tl.resizeItemBy(id, edge, deltaMs);
                if (renderItem) {
                  return (
                    <Fragment key={id}>
                      {renderItem({
                        ...positioned,
                        select: () => handleItemClick(id),
                        moveHandleProps: tl.getMoveHandleProps(id),
                        resizeStartHandleProps: tl.getResizeHandleProps(
                          id,
                          "start",
                        ),
                        resizeEndHandleProps: tl.getResizeHandleProps(
                          id,
                          "end",
                        ),
                        moveBy,
                        resizeBy,
                      })}
                    </Fragment>
                  );
                }
                return (
                  <TimelineItemView
                    key={id}
                    positioned={positioned}
                    accentColor={accentColor}
                    onSelect={handleItemClick}
                    moveHandleProps={tl.getMoveHandleProps(id)}
                    resizeStartHandleProps={tl.getResizeHandleProps(
                      id,
                      "start",
                    )}
                    resizeEndHandleProps={tl.getResizeHandleProps(id, "end")}
                    keyStepMs={keyStepMs}
                    moveBy={moveBy}
                    resizeBy={resizeBy}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <Axis ticks={tl.ticks} canvasPx={tl.canvasPx} timeToPx={tl.timeToPx} />
      </div>
    </div>
  );
}
