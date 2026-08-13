import { LABEL_FIXED_PX } from "./constants";
import type { TimelineItem } from "./types";

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
export function packIntoRows(
  items: PackInput[],
  pxPerMs: number,
  measureLabel: (s: string) => number,
): Map<string, number> {
  const sorted = [...items].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return a.label.localeCompare(b.label);
  });
  const rowOf = new Map<string, number>();
  if (sorted.length === 0) return rowOf;

  const minTime = sorted[0]!.start;
  const FIXED_PX = LABEL_FIXED_PX;

  const rowEndsPx: number[] = [];
  for (const item of sorted) {
    const startPx = (item.start - minTime) * pxPerMs;
    const rangeEndPx = item.isRange ? (item.end - minTime) * pxPerMs : startPx;
    const labelEndPx = startPx + measureLabel(item.label) + FIXED_PX;
    const endPx = Math.max(rangeEndPx, labelEndPx);
    let row = -1;
    for (let i = 0; i < rowEndsPx.length; i++) {
      if (rowEndsPx[i]! <= startPx) {
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

/** Build a label-width measurer using Canvas2D `measureText`. Hangul,
 *  Latin, and mixed text all measure correctly — character-count
 *  estimates under-count Hangul by ~30 % and produce overlaps. */
export function makeLabelMeasurer(
  font = "11px sans-serif",
): (s: string) => number {
  if (typeof document === "undefined") {
    return (s) => s.length * 8;
  }
  const canvas = document.createElement("canvas");
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) return (s) => s.length * 8;
  ctx2d.font = font;
  return (s) => ctx2d.measureText(s).width;
}

export function toPackInput<TData>(items: TimelineItem<TData>[]): PackInput[] {
  return items.map((i) => ({
    id: i.id,
    label: i.label,
    start: i.start,
    end: i.end ?? i.start,
    isRange: i.end !== undefined && i.end !== i.start,
  }));
}
