// @vitest-environment jsdom
//
// Event-flow tests for usePan under `touch-action: none`: one finger
// pans horizontally AND scrolls the rows container vertically, flings
// on release, chains to the page when the rows can't scroll; two
// fingers pinch; mouse only pans. jsdom has no layout, so the scroll
// containers are stubbed with clamping scrollTop accessors.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePan } from "../src/hooks/usePan";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

// ---- fake clock + rAF -----------------------------------------------
let nowMs = 0;
let rafQueue: Array<{ id: number; cb: FrameRequestCallback }> = [];
let rafId = 0;
const flushFrames = (n: number, dt = 16) => {
  for (let i = 0; i < n; i++) {
    nowMs += dt;
    const q = rafQueue;
    rafQueue = [];
    q.forEach((f) => f.cb(nowMs));
  }
};

// ---- fake scroll boxes -----------------------------------------------
function makeScrollBox(el: HTMLElement, height: number, viewport: number) {
  let top = 0;
  Object.defineProperties(el, {
    scrollHeight: { get: () => height, configurable: true },
    clientHeight: { get: () => viewport, configurable: true },
    scrollTop: {
      get: () => top,
      set: (v: number) => {
        top = Math.max(0, Math.min(height - viewport, v));
      },
      configurable: true,
    },
    scrollTo: {
      value: (opts: ScrollToOptions) => {
        el.scrollTop = opts.top ?? 0;
      },
      configurable: true,
    },
  });
  return { setTop: (v: number) => (top = v) };
}

// ---- harness -----------------------------------------------------------
const CANVAS_PX = 1000;
let viewport = { start: 0, end: 10_000 };
let setViewportCalls = 0;
/** Model useViewport's zoom clamp: `null` = no clamp. */
let minSpan: number | null = null;

function Harness({ withScroll }: { withScroll: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState(viewport);
  const onPointerDown = usePan({
    viewportStart: vp.start,
    viewportEnd: vp.end,
    canvasPx: CANVAS_PX,
    setViewport: (start, end) => {
      setViewportCalls++;
      if (minSpan !== null && end - start < minSpan) {
        const c = (start + end) / 2;
        start = c - minSpan / 2;
        end = c + minSpan / 2;
      }
      viewport = { start, end };
      setVp(viewport);
      return viewport;
    },
    scrollRef: withScroll ? scrollRef : undefined,
  });
  return (
    <div id="canvas" onPointerDown={onPointerDown}>
      <div id="scroll" ref={scrollRef} />
    </div>
  );
}

let root: Root;
let host: HTMLDivElement;
let canvas: HTMLElement;
let scrollBox: ReturnType<typeof makeScrollBox>;
let scrollEl: HTMLElement;

function mount(withScroll = true) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<Harness withScroll={withScroll} />));
  canvas = document.getElementById("canvas")!;
  scrollEl = document.getElementById("scroll")!;
  scrollBox = makeScrollBox(scrollEl, 1000, 200); // max scrollTop 800
}

const ptr = (
  type: string,
  id: number,
  x: number,
  y: number,
  pointerType: "touch" | "mouse" = "touch",
  target: EventTarget = window,
) => {
  const ev = new PointerEvent(type, {
    pointerId: id,
    pointerType,
    clientX: x,
    clientY: y,
    button: 0,
    bubbles: true,
    cancelable: true,
  });
  act(() => {
    target.dispatchEvent(ev);
  });
  return ev;
};
const down = (id: number, x: number, y: number, pt?: "touch" | "mouse") =>
  ptr("pointerdown", id, x, y, pt, canvas);
const move = (id: number, x: number, y: number, pt?: "touch" | "mouse") => {
  nowMs += 16;
  return ptr("pointermove", id, x, y, pt);
};
const up = (id: number, x: number, y: number, pt?: "touch" | "mouse") =>
  ptr("pointerup", id, x, y, pt);

beforeEach(() => {
  nowMs = 1000;
  rafQueue = [];
  viewport = { start: 0, end: 10_000 };
  setViewportCalls = 0;
  minSpan = null;
  vi.spyOn(performance, "now").mockImplementation(() => nowMs);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    const id = ++rafId;
    rafQueue.push({ id, cb });
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    rafQueue = rafQueue.filter((f) => f.id !== id);
  });
});
afterEach(() => {
  // end any gesture a failed assertion left open so its window
  // listeners can't leak into the next test
  ptr("pointercancel", 1, 0, 0);
  ptr("pointercancel", 2, 0, 0);
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("usePan — touch, one finger", () => {
  it("horizontal drag pans the viewport and leaves scrollTop alone", () => {
    mount();
    scrollBox.setTop(300);
    down(1, 100, 100);
    move(1, 160, 100); // +60px → 600ms earlier
    expect(viewport).toEqual({ start: -600, end: 9400 });
    expect(scrollEl.scrollTop).toBe(300);
    up(1, 160, 100);
  });

  it("vertical drag scrolls the rows container against the finger", () => {
    mount();
    scrollBox.setTop(300);
    down(1, 100, 100);
    move(1, 100, 160); // finger down 60px → content scrolls up
    expect(scrollEl.scrollTop).toBe(240);
    expect(viewport).toEqual({ start: 0, end: 10_000 });
    up(1, 100, 160);
  });

  it("diagonal drag does both at once (free 2D)", () => {
    mount();
    scrollBox.setTop(300);
    down(1, 100, 100);
    move(1, 150, 130);
    expect(viewport.start).toBeCloseTo(-500);
    expect(scrollEl.scrollTop).toBe(270);
    up(1, 150, 130);
  });

  it("each axis engages on its own: a vertical scroll's x wobble never pans", () => {
    mount();
    scrollBox.setTop(300);
    down(1, 100, 100);
    move(1, 103, 130);
    move(1, 98, 160);
    move(1, 102, 200);
    expect(setViewportCalls).toBe(0); // fit-follow / onViewportChange untouched
    expect(scrollEl.scrollTop).toBe(200);
    up(1, 102, 200);
    flushFrames(50);
    expect(setViewportCalls).toBe(0); // and no horizontal fling either
  });

  it("…and a horizontal pan's y drift never scrolls (rows or page) unless it can", () => {
    mount();
    scrollBox.setTop(300);
    down(1, 100, 100);
    move(1, 160, 103);
    move(1, 260, 106);
    expect(viewport.start).toBeCloseTo(-1600);
    expect(scrollEl.scrollTop).toBe(300);
    up(1, 260, 106);
  });

  it("stays under the 8px touch threshold → tap, no viewport change", () => {
    mount();
    down(1, 100, 100);
    move(1, 105, 104);
    up(1, 105, 104);
    expect(setViewportCalls).toBe(0);
    expect(scrollEl.scrollTop).toBe(0);
  });

  it("overshooting a scroll edge leaves no dead zone on the way back", () => {
    mount();
    scrollBox.setTop(790);
    down(1, 100, 300);
    move(1, 100, 200); // wants 890 → clamps 800
    expect(scrollEl.scrollTop).toBe(800);
    move(1, 100, 100); // 100px further into the wall
    expect(scrollEl.scrollTop).toBe(800);
    move(1, 100, 130); // reverse 30px → moves immediately
    expect(scrollEl.scrollTop).toBe(770);
    up(1, 100, 130);
  });

  it("scrollTop clamps at the edges (browser semantics)", () => {
    mount();
    scrollBox.setTop(790);
    down(1, 100, 200);
    move(1, 100, 100); // wants +100 → clamps at 800
    expect(scrollEl.scrollTop).toBe(800);
    up(1, 100, 100);
  });

  it("flings after a fast release and stops when the finger held still", () => {
    mount();
    scrollBox.setTop(400);
    down(1, 100, 300);
    // 5 moves × 16ms × 20px = ~1.25 px/ms upward flick (scrollTop rising)
    for (let i = 1; i <= 5; i++) move(1, 100, 300 - 20 * i);
    const atRelease = scrollEl.scrollTop;
    expect(atRelease).toBe(500);
    up(1, 100, 200);
    expect(rafQueue.length).toBe(1);
    flushFrames(5);
    expect(scrollEl.scrollTop).toBeGreaterThan(atRelease);
    const mid = scrollEl.scrollTop;
    flushFrames(200);
    expect(scrollEl.scrollTop).toBeGreaterThan(mid);
    expect(rafQueue.length).toBe(0); // came to rest
    expect(scrollEl.scrollTop).toBeLessThanOrEqual(800);

    // hold still before lifting → no fling
    scrollBox.setTop(400);
    down(1, 100, 300);
    for (let i = 1; i <= 5; i++) move(1, 100, 300 - 20 * i);
    nowMs += 300;
    up(1, 100, 200);
    expect(rafQueue.length).toBe(0);
  });

  it("flings horizontally after a fast swipe; the viewport keeps moving then rests", () => {
    mount();
    down(1, 100, 100);
    // 5 moves × 16ms × 20px rightward ≈ 1.25 px/ms
    for (let i = 1; i <= 5; i++) move(1, 100 + 20 * i, 100);
    const atRelease = { ...viewport };
    expect(atRelease.start).toBeCloseTo(-1000);
    up(1, 200, 100);
    expect(rafQueue.length).toBe(1);
    flushFrames(5);
    expect(viewport.start).toBeLessThan(atRelease.start); // still panning right
    expect(viewport.end - viewport.start).toBeCloseTo(10_000); // span intact
    const mid = viewport.start;
    flushFrames(200);
    expect(viewport.start).toBeLessThan(mid);
    expect(rafQueue.length).toBe(0);
    // ~1.25px/ms · 16/−ln(0.95) ≈ 390px ≈ 3900ms of travel, minus threshold
    expect(atRelease.start - viewport.start).toBeGreaterThan(3000);
    expect(atRelease.start - viewport.start).toBeLessThan(4200);
    // held still before lifting → no fling
    down(1, 100, 100);
    for (let i = 1; i <= 5; i++) move(1, 100 + 20 * i, 100);
    nowMs += 300;
    up(1, 200, 100);
    expect(rafQueue.length).toBe(0);
  });

  it("a touch that interrupts a fling continues from the fling's last frame, not a stale render", () => {
    mount();
    down(1, 100, 100);
    for (let i = 1; i <= 5; i++) move(1, 100 + 20 * i, 100);
    up(1, 200, 100);
    // frames run outside act(): the harness's `viewport` advances but
    // React hasn't re-rendered → the hook's `latest` is stale here
    flushFrames(5);
    const flingLast = viewport.start;
    down(1, 100, 100);
    move(1, 110, 100); // 10px → 100ms
    expect(viewport.start).toBeCloseTo(flingLast - 100);
    up(1, 110, 100);
  });

  it("diagonal flick flings both axes in one loop and a touch stops both", () => {
    mount();
    scrollBox.setTop(400);
    down(1, 100, 300);
    for (let i = 1; i <= 5; i++) move(1, 100 + 20 * i, 300 - 20 * i);
    const vp0 = viewport.start;
    const st0 = scrollEl.scrollTop;
    up(1, 200, 200);
    expect(rafQueue.length).toBe(1);
    flushFrames(5);
    expect(viewport.start).toBeLessThan(vp0);
    expect(scrollEl.scrollTop).toBeGreaterThan(st0);
    const vp1 = viewport.start;
    const st1 = scrollEl.scrollTop;
    down(2, 100, 100);
    flushFrames(10);
    expect(viewport.start).toBe(vp1);
    expect(scrollEl.scrollTop).toBe(st1);
    up(2, 100, 100);
  });

  it("a fling stops at the scroll edge", () => {
    mount();
    scrollBox.setTop(700);
    down(1, 100, 300);
    for (let i = 1; i <= 5; i++) move(1, 100, 300 - 20 * i);
    up(1, 100, 200);
    flushFrames(300);
    expect(scrollEl.scrollTop).toBe(800);
    expect(rafQueue.length).toBe(0);
  });

  it("a new touch during a fling grabs the content (cancels the fling)", () => {
    mount();
    scrollBox.setTop(400);
    down(1, 100, 300);
    for (let i = 1; i <= 5; i++) move(1, 100, 300 - 20 * i);
    up(1, 100, 200);
    flushFrames(2);
    const grabbed = scrollEl.scrollTop;
    down(2, 100, 300);
    expect(rafQueue.length).toBe(0);
    flushFrames(10);
    expect(scrollEl.scrollTop).toBe(grabbed);
    up(2, 100, 300);
  });

  it("input anywhere ends a fling — even a pointerdown that never reaches the canvas", () => {
    mount();
    scrollBox.setTop(400);
    down(1, 100, 300);
    for (let i = 1; i <= 5; i++) move(1, 100 + 20 * i, 300 - 20 * i);
    up(1, 200, 200);
    flushFrames(2);
    const vp = viewport.start;
    const st = scrollEl.scrollTop;
    // e.g. a toolbar button or an item handle that stopPropagation()s
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.addEventListener("pointerdown", (ev) => ev.stopPropagation());
    ptr("pointerdown", 9, 0, 0, "touch", outside);
    expect(rafQueue.length).toBe(0);
    flushFrames(10);
    expect(viewport.start).toBe(vp);
    expect(scrollEl.scrollTop).toBe(st);
    outside.remove();

    // wheel too
    down(1, 100, 300);
    for (let i = 1; i <= 5; i++) move(1, 100 + 20 * i, 300);
    up(1, 200, 300);
    expect(rafQueue.length).toBe(1);
    act(() => {
      window.dispatchEvent(new WheelEvent("wheel", { deltaY: 3, bubbles: true }));
    });
    expect(rafQueue.length).toBe(0);
  });

  it("pointercancel ends the gesture; later moves are ignored", () => {
    mount();
    down(1, 100, 100);
    move(1, 150, 100);
    const before = viewport;
    ptr("pointercancel", 1, 150, 100);
    move(1, 300, 100);
    expect(viewport).toEqual(before);
  });
});

describe("usePan — scroll chaining", () => {
  let pageBox: ReturnType<typeof makeScrollBox>;
  let pageEl: HTMLElement;
  let scrollTo: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    pageEl = document.createElement("div");
    pageBox = makeScrollBox(pageEl, 5000, 800);
    Object.defineProperty(document, "scrollingElement", {
      value: pageEl,
      configurable: true,
    });
    scrollTo = vi.fn((opts: ScrollToOptions) => {
      pageEl.scrollTop = opts.top ?? 0;
    });
    vi.stubGlobal("scrollTo", scrollTo);
  });

  it("rows at the top + finger pulling down → page scrolls, rows don't", () => {
    mount();
    scrollBox.setTop(0);
    pageBox.setTop(1000);
    down(1, 100, 100);
    move(1, 100, 160);
    expect(scrollEl.scrollTop).toBe(0);
    expect(scrollTo).toHaveBeenCalled();
    expect(pageEl.scrollTop).toBe(940);
    // latched: reversing keeps driving the page, not the rows
    move(1, 100, 80);
    expect(scrollEl.scrollTop).toBe(0);
    expect(pageEl.scrollTop).toBe(1020);
    up(1, 100, 80);
  });

  it("horizontal start, then vertical → rows scroll, not the page", () => {
    mount();
    scrollBox.setTop(0);
    pageBox.setTop(1000);
    down(1, 100, 100);
    move(1, 140, 102); // horizontal swipe with a 2px downward wobble
    move(1, 180, 101);
    expect(scrollEl.scrollTop).toBe(0);
    expect(pageEl.scrollTop).toBe(1000); // no latch on the wobble
    move(1, 200, 60); // now a real upward move → rows can take it
    expect(scrollEl.scrollTop).toBe(40);
    expect(pageEl.scrollTop).toBe(1000);
    expect(viewport.start).toBeCloseTo(-1000);
    up(1, 200, 60);
  });

  it("mostly-horizontal pan with drift, rows can't take it → page NOT latched", () => {
    mount();
    scrollBox.setTop(0);
    pageBox.setTop(1000);
    down(1, 100, 100);
    move(1, 200, 110); // dx 100, dy 10 (≥ 8) but horizontal-dominant
    move(1, 300, 112);
    expect(pageEl.scrollTop).toBe(1000);
    expect(scrollEl.scrollTop).toBe(0);
    up(1, 300, 112);
  });

  it("body as the page scroller (html overflow:hidden) is found", () => {
    mount();
    scrollBox.setTop(0);
    pageBox.setTop(0); // scrollingElement can't move
    const bodyBox = makeScrollBox(document.body, 5000, 800);
    document.body.style.overflowY = "auto";
    bodyBox.setTop(1000);
    down(1, 100, 100);
    move(1, 100, 160);
    expect(document.body.scrollTop).toBe(940);
    up(1, 100, 160);
    document.body.style.overflowY = "";
    for (const k of ["scrollHeight", "clientHeight", "scrollTop", "scrollTo"]) {
      delete (document.body as unknown as Record<string, unknown>)[k];
    }
  });

  it("rows at the top + finger pushing up → rows scroll (they can)", () => {
    mount();
    scrollBox.setTop(0);
    pageBox.setTop(1000);
    down(1, 100, 100);
    move(1, 100, 40);
    expect(scrollEl.scrollTop).toBe(60);
    expect(pageEl.scrollTop).toBe(1000);
    up(1, 100, 40);
  });

  it("no scrollRef attached → page scrolls", () => {
    mount(false);
    pageBox.setTop(1000);
    down(1, 100, 100);
    move(1, 100, 160);
    expect(pageEl.scrollTop).toBe(940);
    up(1, 100, 160);
  });

  it("nothing can scroll → vertical is a no-op, horizontal still pans", () => {
    mount();
    scrollBox.setTop(0);
    pageBox.setTop(0);
    down(1, 100, 100);
    move(1, 150, 160);
    expect(scrollEl.scrollTop).toBe(0);
    expect(pageEl.scrollTop).toBe(0);
    expect(viewport.start).toBeCloseTo(-500);
    up(1, 150, 160);
  });
});

describe("usePan — pinch", () => {
  it("two fingers spreading zooms in around the midpoint", () => {
    mount();
    down(1, 400, 100);
    down(2, 600, 100); // dist 200, mid 500 → time 5000
    move(1, 300, 100);
    move(2, 700, 100); // dist 400 → span halves
    expect(viewport.end - viewport.start).toBeCloseTo(5000);
    expect((viewport.start + viewport.end) / 2).toBeCloseTo(5000);
    up(2, 700, 100);
    // survivor keeps panning from where it is, no jump
    const afterLift = { ...viewport };
    move(1, 300, 100);
    expect(viewport).toEqual(afterLift);
    move(1, 350, 100); // +50px on a 5000ms span → 250ms earlier
    expect(viewport.start).toBeCloseTo(afterLift.start - 250);
    up(1, 350, 100);
  });

  it("a third finger joins and one of the first two lifts without a jump", () => {
    mount();
    down(1, 400, 100);
    down(2, 600, 100);
    move(1, 300, 100);
    move(2, 700, 100); // span 5000
    down(3, 500, 300); // third finger → re-baseline on (1,2), no change yet
    const before = { ...viewport };
    move(3, 520, 300); // third finger moves: pinch is on 1&2, so nothing
    expect(viewport).toEqual(before);
    up(1, 300, 100); // now pinch = (2,3), re-baselined: no jump
    expect(viewport).toEqual(before);
    move(2, 700, 100);
    expect(viewport).toEqual(before);
    up(2, 700, 100);
    up(3, 520, 300);
  });

  it("continues from the *applied* (clamped) viewport after a pinch hits the zoom limit", () => {
    minSpan = 5000;
    mount();
    down(1, 400, 100);
    down(2, 600, 100); // dist 200
    move(1, 200, 100);
    move(2, 800, 100); // dist 600 → asks span 3333, clamped to 5000
    expect(viewport.end - viewport.start).toBeCloseTo(5000);
    up(2, 800, 100);
    const afterLift = { ...viewport };
    move(1, 300, 100); // +100px on the *applied* 5000ms span → 500ms
    expect(viewport.start).toBeCloseTo(afterLift.start - 500);
    expect(viewport.end - viewport.start).toBeCloseTo(5000);
    up(1, 300, 100);
  });

  it("pinch does not scroll the rows", () => {
    mount();
    scrollBox.setTop(300);
    down(1, 400, 100);
    down(2, 600, 100);
    move(1, 300, 200);
    move(2, 700, 200);
    expect(scrollEl.scrollTop).toBe(300);
    up(1, 300, 200);
    up(2, 700, 200);
  });
});

describe("usePan — mouse", () => {
  it("drags pan horizontally only; vertical never scrolls", () => {
    mount();
    scrollBox.setTop(300);
    down(1, 100, 100, "mouse");
    move(1, 150, 160, "mouse");
    expect(viewport.start).toBeCloseTo(-500);
    expect(scrollEl.scrollTop).toBe(300);
    up(1, 150, 160, "mouse");
  });

  it("never flings after a mouse drag", () => {
    mount();
    down(1, 100, 100, "mouse");
    for (let i = 1; i <= 5; i++) move(1, 100 + 20 * i, 100, "mouse");
    up(1, 200, 100, "mouse");
    expect(rafQueue.length).toBe(0);
  });

  it("uses the 4px mouse threshold", () => {
    mount();
    down(1, 100, 100, "mouse");
    move(1, 105, 100, "mouse");
    expect(setViewportCalls).toBe(1);
    up(1, 105, 100, "mouse");
  });
});
