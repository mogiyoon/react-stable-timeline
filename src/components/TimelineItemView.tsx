import { useState } from "react";
import type { DragHandleProps, PositionedItem, ResizeEdge } from "../types";
import { DOT_HEIGHT, LABEL_HEIGHT, ROW_HEIGHT } from "../constants";

interface TimelineItemViewProps<TData> {
  positioned: PositionedItem<TData>;
  accentColor: string;
  onSelect: (id: string) => void;
  moveHandleProps?: DragHandleProps;
  resizeStartHandleProps?: DragHandleProps;
  resizeEndHandleProps?: DragHandleProps;
  /** Time shift applied per arrow-key press, in ms. */
  keyStepMs: number;
  moveBy: (deltaMs: number) => void;
  resizeBy: (edge: ResizeEdge, deltaMs: number) => void;
}

export function TimelineItemView<TData>({
  positioned,
  accentColor,
  onSelect,
  moveHandleProps,
  resizeStartHandleProps,
  resizeEndHandleProps,
  keyStepMs,
  moveBy,
  resizeBy,
}: TimelineItemViewProps<TData>) {
  const { item, top, startX, endX, isRange, labelWidth, isDragging } =
    positioned;
  const [focused, setFocused] = useState(false);
  const rangeWidth = isRange ? Math.max(2, endX - startX) : 0;
  // Wide enough to wrap whichever is longer — the range bar (box ends
  // exactly at the right dot, mirroring the left edge) or the label
  // text (2px pad each side) — so the focus outline encloses both.
  const boxWidth = Math.max(DOT_HEIGHT, rangeWidth, labelWidth + 4);
  const itemColor = item.color ?? accentColor;
  const canMove = !!moveHandleProps;
  const canResize = !!resizeStartHandleProps;
  const showResize = isRange && canResize;

  const ariaLabel = isRange
    ? `${item.label}, ${new Date(item.start).toLocaleDateString()} – ${new Date(item.end!).toLocaleDateString()}`
    : `${item.label}, ${new Date(item.start).toLocaleDateString()}`;

  const resizeHandleStyle = {
    position: "absolute",
    top: LABEL_HEIGHT,
    width: 10,
    height: DOT_HEIGHT,
    cursor: "ew-resize",
  } as const;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item.id);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyDown={(e) => {
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
      }}
      {...moveHandleProps}
      style={{
        position: "absolute",
        cursor: canMove ? "grab" : "pointer",
        // touch-drag on a movable item must not turn into a scroll
        touchAction: canMove || canResize ? "none" : undefined,
        outline: focused ? `2px solid ${itemColor}` : "none",
        outlineOffset: 2,
        borderRadius: 2,
        left: startX,
        top,
        height: ROW_HEIGHT,
        width: boxWidth,
        opacity: isDragging ? 0.75 : 1,
      }}
      title={item.label}
    >
      <span
        aria-hidden="true"
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
      {showResize && (
        <>
          <span
            aria-hidden="true"
            {...resizeStartHandleProps}
            style={{ ...resizeHandleStyle, left: -4 }}
          />
          <span
            aria-hidden="true"
            {...resizeEndHandleProps}
            style={{ ...resizeHandleStyle, left: rangeWidth - 6 }}
          />
        </>
      )}
    </div>
  );
}
