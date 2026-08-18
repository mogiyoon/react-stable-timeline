// @vitest-environment jsdom
//
// Wheel/trackpad on the canvas: horizontal → pan, vertical → rows
// scroll (by hand, since a mixed-axis event must be preventDefault'd
// for its horizontal half), pure vertical the rows can't take → left
// to the browser, ⌘/Ctrl → zoom.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWheelZoom } from "../src/hooks/useWheelZoom";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

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

const CANVAS_PX = 1000;
let viewport = { start: 0, end: 10_000 };

function Harness() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState(viewport);
  useWheelZoom({
    containerRef,
    viewportStart: vp.start,
    viewportEnd: vp.end,
    canvasPx: CANVAS_PX,
    zoomFactor: 2,
    setViewport: (start, end) => {
      viewport = { start, end };
      setVp(viewport);
    },
    scrollRef,
  });
  return (
    <div id="canvas" ref={containerRef}>
      <div id="scroll" ref={scrollRef} />
    </div>
  );
}

let root: Root;
let host: HTMLDivElement;
let canvas: HTMLElement;
let scrollEl: HTMLElement;
let scrollBox: ReturnType<typeof makeScrollBox>;
let pageEl: HTMLElement;
let pageBox: ReturnType<typeof makeScrollBox>;

const wheel = (init: WheelEventInit) => {
  const ev = new WheelEvent("wheel", { bubbles: true, cancelable: true, ...init });
  act(() => {
    canvas.dispatchEvent(ev);
  });
  return ev;
};

beforeEach(() => {
  viewport = { start: 0, end: 10_000 };
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<Harness />));
  canvas = document.getElementById("canvas")!;
  scrollEl = document.getElementById("scroll")!;
  scrollBox = makeScrollBox(scrollEl, 1000, 200); // max 800
  pageEl = document.createElement("div");
  pageBox = makeScrollBox(pageEl, 5000, 800);
  Object.defineProperty(document, "scrollingElement", {
    value: pageEl,
    configurable: true,
  });
  vi.stubGlobal(
    "scrollTo",
    vi.fn((opts: ScrollToOptions) => {
      pageEl.scrollTop = opts.top ?? 0;
    }),
  );
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe("useWheelZoom", () => {
  it("horizontal delta pans and is prevented; rows untouched", () => {
    scrollBox.setTop(300);
    const ev = wheel({ deltaX: 50, deltaY: 0 });
    expect(ev.defaultPrevented).toBe(true);
    expect(viewport).toEqual({ start: 500, end: 10_500 });
    expect(scrollEl.scrollTop).toBe(300);
  });

  it("purely vertical is left to the browser (native rows/page scroll, latching)", () => {
    scrollBox.setTop(300);
    const ev = wheel({ deltaX: 0, deltaY: 40 });
    expect(ev.defaultPrevented).toBe(false);
    expect(scrollEl.scrollTop).toBe(300); // browser would do it, not us
    expect(viewport.start).toBe(0);
  });

  it("mixed deltas (the horizontal→vertical transition) apply both to pan + rows", () => {
    scrollBox.setTop(300);
    const ev = wheel({ deltaX: 20, deltaY: 30 });
    expect(ev.defaultPrevented).toBe(true);
    expect(viewport.start).toBe(200);
    expect(scrollEl.scrollTop).toBe(330);
    wheel({ deltaX: 2, deltaY: 30 });
    expect(scrollEl.scrollTop).toBe(360);
    // horizontal part gone → hand back to the browser
    const pure = wheel({ deltaX: 0, deltaY: 30 });
    expect(pure.defaultPrevented).toBe(false);
    expect(scrollEl.scrollTop).toBe(360);
  });

  it("mixed deltas never chain the vertical jitter to the page", () => {
    scrollBox.setTop(800); // rows can't take it
    pageBox.setTop(1000);
    const ev = wheel({ deltaX: 20, deltaY: 3 });
    expect(ev.defaultPrevented).toBe(true); // horizontal must be prevented
    expect(scrollEl.scrollTop).toBe(800);
    expect(pageEl.scrollTop).toBe(1000); // page stays put
    expect(viewport.start).toBe(200);
  });

  it("Shift + vertical wheel pans", () => {
    scrollBox.setTop(300);
    const ev = wheel({ deltaX: 0, deltaY: 50, shiftKey: true });
    expect(ev.defaultPrevented).toBe(true);
    expect(viewport.start).toBe(500);
    expect(scrollEl.scrollTop).toBe(300);
  });

  it("⌘/Ctrl + wheel zooms around the cursor", () => {
    const ev = wheel({ deltaY: 1, ctrlKey: true, clientX: 0 });
    expect(ev.defaultPrevented).toBe(true);
    // zoom out ×2 anchored at x=0 (rect is 0 in jsdom): start pinned
    expect(viewport.start).toBeCloseTo(0);
    expect(viewport.end - viewport.start).toBeCloseTo(20_000);
  });

  it("scales line-mode deltas (Firefox) to px on both axes", () => {
    scrollBox.setTop(300);
    wheel({ deltaX: 2, deltaY: 3, deltaMode: 1 });
    expect(viewport.start).toBe(2 * 16 * 10); // 32px on 1000px/10000ms
    expect(scrollEl.scrollTop).toBe(300 + 3 * 16);
  });
});
