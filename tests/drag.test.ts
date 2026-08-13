import { describe, expect, it } from "vitest";
import { applyDrag } from "../src/hooks/useItemDrag";

describe("applyDrag", () => {
  it("move shifts both edges by the same delta", () => {
    expect(
      applyDrag(1000, 2000, { id: "a", mode: "move", deltaMs: 500 }),
    ).toEqual({ start: 1500, end: 2500 });
    expect(
      applyDrag(1000, 2000, { id: "a", mode: "move", deltaMs: -500 }),
    ).toEqual({ start: 500, end: 1500 });
  });

  it("move keeps point items pointy", () => {
    const r = applyDrag(1000, 1000, { id: "a", mode: "move", deltaMs: 300 });
    expect(r.start).toBe(r.end);
  });

  it("resize-start only touches start", () => {
    expect(
      applyDrag(1000, 2000, { id: "a", mode: "resize-start", deltaMs: -400 }),
    ).toEqual({ start: 600, end: 2000 });
  });

  it("resize-end only touches end", () => {
    expect(
      applyDrag(1000, 2000, { id: "a", mode: "resize-end", deltaMs: 400 }),
    ).toEqual({ start: 1000, end: 2400 });
  });

  it("resizes clamp the span to at least 1ms", () => {
    // dragging start past end
    expect(
      applyDrag(1000, 2000, { id: "a", mode: "resize-start", deltaMs: 5000 }),
    ).toEqual({ start: 1999, end: 2000 });
    // dragging end past start
    expect(
      applyDrag(1000, 2000, { id: "a", mode: "resize-end", deltaMs: -5000 }),
    ).toEqual({ start: 1000, end: 1001 });
  });
});
