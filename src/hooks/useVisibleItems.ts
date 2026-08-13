import { useMemo } from "react";
import { LABEL_FIXED_PX } from "../constants";
import { applyDrag, type DragState } from "./useItemDrag";
import type { PositionedItem, TimelineItem } from "../types";

interface UseVisibleItemsArgs<TData> {
  items: TimelineItem<TData>[];
  rowOf: Map<string, number>;
  timeToPx: (ms: number) => number;
  measureLabel: (s: string) => number;
  canvasPx: number;
  drag: DragState | null;
  virtualize: boolean;
  overscanPx: number;
  rowHeight: number;
  rowGap: number;
  scrollTop: number;
  viewHeight: number;
}

/** Position every item for the current viewport and — when `virtualize`
 *  is on — drop the ones whose rendered extent (range bar *and* label
 *  overflow) falls outside the canvas + overscan, horizontally and
 *  vertically. */
export function useVisibleItems<TData>({
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
  viewHeight,
}: UseVisibleItemsArgs<TData>): PositionedItem<TData>[] {
  // Canvas2D measureText per item per frame is too hot for pan/zoom —
  // measure once per (items, font) and reuse.
  const labelWidths = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) m.set(it.id, measureLabel(it.label));
    return m;
  }, [items, measureLabel]);

  return useMemo(() => {
    const out: PositionedItem<TData>[] = [];
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
          startX + (labelWidths.get(item.id) ?? 0) + LABEL_FIXED_PX,
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
    labelWidths,
  ]);
}
