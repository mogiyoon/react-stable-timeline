import { LABEL_FIXED_PX } from "./constants";
import type { TimelineItem } from "./types";

interface PackInput {
  id: string;
  label: string;
  start: number;
  end: number;
  isRange: boolean;
}

/** Min-segment tree over row end positions answering the first-fit
 *  query — "leftmost row whose end ≤ x" — in O(log R). Unused capacity
 *  holds +Infinity, which can never satisfy `≤ x`, so it never wins. */
class LeftmostFitTree {
  private readonly cap: number;
  private readonly tree: Float64Array;

  constructor(maxRows: number) {
    let cap = 1;
    while (cap < maxRows) cap *= 2;
    this.cap = cap;
    this.tree = new Float64Array(cap * 2).fill(Infinity);
  }

  /** Leftmost index whose value is ≤ x, or -1 if none. Descends the
   *  tree preferring the left child whenever it contains a fit, which
   *  is exactly the linear scan's "first index" semantics. */
  queryLeftmost(x: number): number {
    if (this.tree[1]! > x) return -1;
    let node = 1;
    while (node < this.cap) {
      node *= 2;
      if (this.tree[node]! > x) node += 1;
    }
    return node - this.cap;
  }

  set(index: number, value: number): void {
    let node = this.cap + index;
    this.tree[node] = value;
    for (node >>= 1; node >= 1; node >>= 1) {
      this.tree[node] = Math.min(
        this.tree[node * 2]!,
        this.tree[node * 2 + 1]!,
      );
    }
  }
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
 *  the same Map.
 *
 *  O(n log n): sort + one LeftmostFitTree query/update per item. The
 *  layout is identical to a naive linear scan of the rows (verified by
 *  a differential test), without its O(n²) worst case when every item
 *  overlaps. */
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

  const rowEnds = new LeftmostFitTree(sorted.length);
  let rowCount = 0;
  for (const item of sorted) {
    const startPx = (item.start - minTime) * pxPerMs;
    const rangeEndPx = item.isRange ? (item.end - minTime) * pxPerMs : startPx;
    const labelEndPx = startPx + measureLabel(item.label) + FIXED_PX;
    const endPx = Math.max(rangeEndPx, labelEndPx);
    let row = rowEnds.queryLeftmost(startPx);
    if (row === -1) row = rowCount++;
    rowEnds.set(row, endPx);
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
