import type { TimelineItem } from "../types";
import { DOT_HEIGHT, LABEL_HEIGHT, ROW_GAP, ROW_HEIGHT } from "../constants";

interface TimelineItemViewProps<TData> {
  item: TimelineItem<TData>;
  row: number;
  startX: number;
  endX: number;
  isRange: boolean;
  accentColor: string;
  onSelect: (id: string) => void;
}

export function TimelineItemView<TData>({
  item,
  row,
  startX,
  endX,
  isRange,
  accentColor,
  onSelect,
}: TimelineItemViewProps<TData>) {
  const top = row * (ROW_HEIGHT + ROW_GAP);
  const rangeWidth = isRange ? Math.max(2, endX - startX) : 0;
  const itemColor = item.color ?? accentColor;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item.id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item.id);
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
}
