import { describe, expect, it } from "vitest";
import { packIntoRows } from "../src/packing";

// deterministic measurer: 8px per character (the SSR fallback)
const measure = (s: string) => s.length * 8;

const point = (id: string, start: number, label = id) => ({
  id,
  label,
  start,
  end: start,
  isRange: false,
});

const range = (id: string, start: number, end: number, label = id) => ({
  id,
  label,
  start,
  end,
  isRange: true,
});

describe("packIntoRows", () => {
  it("stacks items whose labels would overlap", () => {
    // 1px/ms: "aa" occupies 0..(16+24)=40px, so an item at 10ms collides
    const rows = packIntoRows([point("aa", 0), point("bb", 10)], 1, measure);
    expect(rows.get("aa")).toBe(0);
    expect(rows.get("bb")).toBe(1);
  });

  it("reuses row 0 once the previous label ends", () => {
    const rows = packIntoRows([point("aa", 0), point("bb", 100)], 1, measure);
    expect(rows.get("aa")).toBe(0);
    expect(rows.get("bb")).toBe(0);
  });

  it("blocks a row for the whole range bar, not just the label", () => {
    // range bar 0..500px beats its label width; next item at 100ms collides
    const rows = packIntoRows(
      [range("r", 0, 500), point("p", 100)],
      1,
      measure,
    );
    expect(rows.get("r")).toBe(0);
    expect(rows.get("p")).toBe(1);
  });

  it("is deterministic — same input, same layout", () => {
    const items = Array.from({ length: 200 }, (_, i) =>
      i % 3 === 0
        ? range(`r${i}`, i * 10, i * 10 + 40)
        : point(`p${i}`, i * 10),
    );
    const a = packIntoRows(items, 0.7, measure);
    const b = packIntoRows([...items].reverse(), 0.7, measure);
    expect([...a.entries()].sort()).toEqual([...b.entries()].sort());
  });

  it("breaks start-time ties by label so layout can't flicker", () => {
    const rows = packIntoRows(
      [point("b", 0, "bbb"), point("a", 0, "aaa")],
      1,
      measure,
    );
    expect(rows.get("a")).toBe(0);
    expect(rows.get("b")).toBe(1);
  });

  it("assigns every item exactly one row", () => {
    const items = Array.from({ length: 500 }, (_, i) => point(`p${i}`, i * 3));
    const rows = packIntoRows(items, 0.5, measure);
    expect(rows.size).toBe(500);
    for (const r of rows.values()) expect(r).toBeGreaterThanOrEqual(0);
  });

  // reference implementation: the original O(n·R) linear scan — the
  // segment-tree version must reproduce it exactly, item for item
  function naiveFirstFit(
    items: Parameters<typeof packIntoRows>[0],
    pxPerMs: number,
  ): Map<string, number> {
    const sorted = [...items].sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return a.label.localeCompare(b.label);
    });
    const rowOf = new Map<string, number>();
    if (sorted.length === 0) return rowOf;
    const minTime = sorted[0]!.start;
    const rowEndsPx: number[] = [];
    for (const item of sorted) {
      const startPx = (item.start - minTime) * pxPerMs;
      const rangeEndPx = item.isRange
        ? (item.end - minTime) * pxPerMs
        : startPx;
      const endPx = Math.max(rangeEndPx, startPx + measure(item.label) + 24);
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

  it("matches the naive linear scan exactly on randomized datasets", () => {
    let seed = 42;
    const rnd = () =>
      (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    for (let trial = 0; trial < 10; trial++) {
      const n = 50 + Math.floor(rnd() * 400);
      const items = Array.from({ length: n }, (_, i) => {
        const start = Math.floor(rnd() * 4000);
        const isRange = rnd() < 0.4;
        return {
          id: `x${i}`,
          label: "L".repeat(1 + Math.floor(rnd() * 12)),
          start,
          end: isRange ? start + 1 + Math.floor(rnd() * 900) : start,
          isRange,
        };
      });
      const pxPerMs = 0.1 + rnd();
      expect(packIntoRows(items, pxPerMs, measure)).toEqual(
        naiveFirstFit(items, pxPerMs),
      );
    }
  });

  it("handles the all-overlapping worst case in O(n log n)", () => {
    // every item at the same start → every item opens a new row; the
    // old linear scan needed ~n²/2 comparisons here
    const n = 20000;
    const items = Array.from({ length: n }, (_, i) => ({
      id: `w${i}`,
      label: `w${String(i).padStart(5, "0")}`,
      start: 0,
      end: 0,
      isRange: false,
    }));
    const began = performance.now();
    const rows = packIntoRows(items, 1, measure);
    const elapsed = performance.now() - began;
    expect(new Set(rows.values()).size).toBe(n); // n개 행, 전부 서로 다름
    expect(elapsed).toBeLessThan(1000);
  });
});
