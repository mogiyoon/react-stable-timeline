import { describe, expect, it } from "vitest";
import {
  canConsume,
  clampScroll,
  flingStep,
  panSpan,
  pinchSpan,
  releaseVelocity,
  trimSamples,
} from "../src/hooks/gestureMath";

describe("panSpan", () => {
  it("moves the viewport against the finger, scaled by canvas width", () => {
    // 1000px canvas showing 10_000ms → 100px drag right = 1_000ms earlier
    expect(panSpan({ start: 0, end: 10_000 }, 100, 1000)).toEqual({
      start: -1000,
      end: 9000,
    });
    expect(panSpan({ start: 0, end: 10_000 }, -250, 1000)).toEqual({
      start: 2500,
      end: 12_500,
    });
  });
  it("preserves the span exactly", () => {
    const r = panSpan({ start: 123, end: 456 }, 37, 640);
    expect(r.end - r.start).toBeCloseTo(333);
  });
});

describe("pinchSpan", () => {
  const base = { start: 0, end: 10_000 };
  it("doubling the finger distance halves the span", () => {
    const r = pinchSpan(base, { dist: 100, midX: 500 }, 200, 500, 1000);
    expect(r.end - r.start).toBeCloseTo(5000);
  });
  it("keeps the time under the midpoint pinned", () => {
    // midpoint at 25% of the canvas → time 2500 stays at 25%
    const r = pinchSpan(base, { dist: 100, midX: 250 }, 300, 250, 1000);
    const span = r.end - r.start;
    expect(r.start + span * 0.25).toBeCloseTo(2500);
  });
  it("follows a moving midpoint", () => {
    // no scale change, midpoint slides 100px right → content pans right
    const r = pinchSpan(base, { dist: 100, midX: 500 }, 100, 600, 1000);
    expect(r).toEqual(panSpan(base, 100, 1000));
  });
  it("never divides by a zero distance", () => {
    const r = pinchSpan(base, { dist: 0, midX: 500 }, 0, 500, 1000);
    expect(Number.isFinite(r.start) && Number.isFinite(r.end)).toBe(true);
  });
});

describe("trimSamples / releaseVelocity", () => {
  it("drops samples older than the window", () => {
    const s = [
      { t: 0, p: 0 },
      { t: 50, p: 5 },
      { t: 150, p: 15 },
      { t: 200, p: 20 },
    ];
    expect(trimSamples(s, 200, 100)).toEqual(s.slice(2));
  });
  it("estimates px/ms over the trailing window", () => {
    const s = [
      { t: 0, p: 0 },
      { t: 900, p: 0 }, // long pause, then a flick
      { t: 950, p: 50 },
      { t: 1000, p: 100 },
    ];
    expect(releaseVelocity(s, 1000)).toBeCloseTo(1); // 100px / 100ms
  });
  it("is zero when the finger paused before lifting", () => {
    const s = [
      { t: 0, p: 0 },
      { t: 50, p: 100 },
    ];
    expect(releaseVelocity(s, 400)).toBe(0);
  });
  it("is zero when the finger held still", () => {
    const s = [
      { t: 0, p: 40 },
      { t: 30, p: 40 },
      { t: 60, p: 40 },
    ];
    expect(releaseVelocity(s, 60)).toBe(0);
  });
  it("is zero with fewer than two samples", () => {
    expect(releaseVelocity([], 0)).toBe(0);
    expect(releaseVelocity([{ t: 0, p: 5 }], 10)).toBe(0);
  });
  it("is negative for an upward (decreasing scrollTop) flick", () => {
    expect(
      releaseVelocity(
        [
          { t: 0, p: 200 },
          { t: 100, p: 100 },
        ],
        100,
      ),
    ).toBeCloseTo(-1);
  });
});

describe("flingStep", () => {
  it("decays and travels the same distance regardless of frame rate", () => {
    // 1 px/ms, integrate 320ms in 16ms frames vs 4 × 80ms frames
    let v = 1;
    let d16 = 0;
    for (let i = 0; i < 20; i++) {
      const s = flingStep(v, 16);
      d16 += s.delta;
      v = s.velocity;
    }
    let w = 1;
    let d80 = 0;
    for (let i = 0; i < 4; i++) {
      const s = flingStep(w, 80);
      d80 += s.delta;
      w = s.velocity;
    }
    expect(d80).toBeCloseTo(d16, 6);
    expect(w).toBeCloseTo(v, 6);
    expect(v).toBeLessThan(1);
    expect(v).toBeGreaterThan(0);
  });
  it("moves in the direction of the velocity", () => {
    expect(flingStep(2, 16).delta).toBeGreaterThan(0);
    expect(flingStep(-2, 16).delta).toBeLessThan(0);
  });
  it("is a no-op for non-positive dt", () => {
    expect(flingStep(3, 0)).toEqual({ delta: 0, velocity: 3 });
  });
  it("comes to rest — total travel converges (~1 s at 0.95/frame)", () => {
    let v = 1;
    let total = 0;
    let t = 0;
    while (Math.abs(v) >= 0.02) {
      const s = flingStep(v, 16);
      total += s.delta;
      v = s.velocity;
      t += 16;
    }
    expect(t).toBeGreaterThan(800);
    expect(t).toBeLessThan(1600);
    // closed form: v0·16/−ln(0.95) ≈ 312 px
    expect(total).toBeLessThan(312);
    expect(total).toBeGreaterThan(290);
  });
});

describe("clampScroll", () => {
  it("clamps to [0, max] and reports edges", () => {
    expect(clampScroll(-5, 100)).toEqual({ pos: 0, hitEdge: true });
    expect(clampScroll(150, 100)).toEqual({ pos: 100, hitEdge: true });
    expect(clampScroll(50, 100)).toEqual({ pos: 50, hitEdge: false });
  });
});

describe("canConsume (scroll latching)", () => {
  it("non-scrollable never consumes", () => {
    expect(canConsume(-10, 0, 0)).toBe(false);
    expect(canConsume(10, 0, 0)).toBe(false);
  });
  it("at the top only consumes downward-content (scrollTop increasing)", () => {
    expect(canConsume(10, 0, 500)).toBe(true);
    expect(canConsume(-10, 0, 500)).toBe(false);
  });
  it("at the bottom only consumes upward-content", () => {
    expect(canConsume(-10, 500, 500)).toBe(true);
    expect(canConsume(10, 500, 500)).toBe(false);
  });
  it("mid-way consumes both", () => {
    expect(canConsume(-10, 250, 500)).toBe(true);
    expect(canConsume(10, 250, 500)).toBe(true);
  });
  it("zero delta consumes nothing", () => {
    expect(canConsume(0, 250, 500)).toBe(false);
  });
});
