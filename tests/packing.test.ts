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
});
