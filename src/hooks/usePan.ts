import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { PAN_BUTTON, dragThresholdFor, isDirectPointer } from "../constants";
import {
  clampScroll,
  flingStep,
  FLING_MIN_VELOCITY,
  panSpan,
  pinchSpan,
  releaseVelocity,
  trimSamples,
  type PinchBase,
  type Sample,
  type Span,
} from "./gestureMath";
import { findScroller, type Scroller } from "./scrollers";

/** Window over which release velocity is measured. */
const VELOCITY_WINDOW_MS = 100;

interface UsePanArgs {
  viewportStart: number;
  viewportEnd: number;
  canvasPx: number;
  /** May return the span actually applied (e.g. zoom-clamped); the
   *  gesture then continues from that instead of what it asked for. */
  setViewport: (start: number, end: number) => Span | void;
  /** Vertical scroll container the touch gesture drives (the canvas has
   *  `touch-action: none`, so the browser won't scroll it for us). */
  scrollRef?: RefObject<HTMLElement | null>;
}

const now = (): number =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

interface Gesture {
  pointers: Map<number, { x: number; y: number }>;
  /** Viewport at the last (re-)baseline — pan/pinch math is relative
   *  to this, so state updates mid-gesture can't drift it. */
  base: Span;
  /** Last viewport actually applied for this gesture — the baseline
   *  for re-baselines and the release fling (`latest` may not have
   *  re-rendered yet, and setViewport may have clamped the request). */
  current: Span;
  origin: { x: number; y: number };
  rectLeft: number;
  pinchBase: PinchBase | null;
  /** Past the drag threshold on some axis: swallow the click. */
  active: boolean;
  /** Horizontal axis engaged (|dx| crossed the threshold). */
  panning: boolean;
  threshold: number;
  /** Finger / pen: also drives vertical scrolling and flings. */
  isDirect: boolean;
  /** Vertical target, latched once |dy| crosses the threshold. */
  scroller: Scroller | null;
  /** Finger y at the last vertical step (incremental, so overshooting a
   *  scroll edge leaves no dead zone on the way back). */
  lastY: number;
  /** (time, finger x) and (time, scroll position) samples for flings. */
  xSamples: Sample[];
  ySamples: Sample[];
  cleanup: () => void;
}

/** Make the first two pointers the pinch, measured from the gesture's
 *  last applied viewport. */
function rebaselinePinch(g: Gesture) {
  const [p1, p2] = [...g.pointers.values()];
  g.base = { ...g.current };
  g.pinchBase = {
    dist: Math.hypot(p1!.x - p2!.x, p1!.y - p2!.y),
    midX: (p1!.x + p2!.x) / 2 - g.rectLeft,
  };
  g.active = true;
}

/** Pointer-based canvas gestures. Mouse: one button pans. Finger/pen:
 *  each axis engages independently once it crosses the drag threshold
 *  — horizontal pans the viewport, vertical scrolls the rows (or, when
 *  they can't move and the gesture is mostly vertical, the nearest
 *  scrollable ancestor / the page); engaged axes fling on release. A
 *  second finger turns the gesture into a pinch zoom anchored at the
 *  midpoint. Clicks under the threshold pass through. The canvas and
 *  rows container are `touch-action: none`, so this replaces the
 *  browser's own scrolling. */
export function usePan({
  viewportStart,
  viewportEnd,
  canvasPx,
  setViewport,
  scrollRef,
}: UsePanArgs) {
  const latest = useRef({ viewportStart, viewportEnd, canvasPx, setViewport });
  latest.current = { viewportStart, viewportEnd, canvasPx, setViewport };
  const gestureRef = useRef<Gesture | null>(null);
  const flingRef = useRef<number | null>(null);
  /** Last viewport the fling applied — seeds the next gesture if it
   *  starts before React has committed that frame. */
  const flingLastRef = useRef<Span | null>(null);

  const stopFling = useCallback(() => {
    if (flingRef.current !== null) {
      cancelAnimationFrame(flingRef.current);
      flingRef.current = null;
    }
    window.removeEventListener("pointerdown", stopFling, true);
    window.removeEventListener("wheel", stopFling, true);
    // Keep the last applied span just long enough for a canvas
    // pointerdown in this same event to seed from it (the window
    // capture listener above runs before React's handler); anything
    // later must not see it — the viewport may have moved on.
    if (flingLastRef.current) {
      setTimeout(() => {
        flingLastRef.current = null;
      }, 0);
    }
  }, []);
  useEffect(() => stopFling, [stopFling]);

  /** One rAF loop decays both axes: vertical moves `scroller`,
   *  horizontal pans from a fixed baseline by an accumulated px offset. */
  const startFling = useCallback(
    (
      vertical: { scroller: Scroller; velocity: number } | null,
      horizontal: { base: Span; velocity: number; canvasPx: number } | null,
    ) => {
      stopFling();
      let vy =
        vertical && Math.abs(vertical.velocity) >= FLING_MIN_VELOCITY
          ? vertical.velocity
          : 0;
      let vx =
        horizontal && Math.abs(horizontal.velocity) >= FLING_MIN_VELOCITY
          ? horizontal.velocity
          : 0;
      if (vy === 0 && vx === 0) return;
      let posY = vertical ? vertical.scroller.get() : 0;
      let offX = 0;
      let last = now();
      // Any input anywhere ends the fling — a toolbar zoom must not be
      // overwritten by the next frame, and grabbing an item (whose
      // handle stops propagation, so the canvas never sees it) must
      // freeze the content under the finger. Capture phase, so
      // stopPropagation downstream can't hide it.
      window.addEventListener("pointerdown", stopFling, true);
      window.addEventListener("wheel", stopFling, true);
      const tick = () => {
        const t = now();
        const dt = t - last;
        last = t;
        if (vy !== 0 && vertical) {
          const step = flingStep(vy, dt);
          vy = step.velocity;
          const clamped = clampScroll(posY + step.delta, vertical.scroller.max());
          posY = clamped.pos;
          vertical.scroller.set(posY);
          if (clamped.hitEdge || Math.abs(vy) < FLING_MIN_VELOCITY) vy = 0;
        }
        if (vx !== 0 && horizontal) {
          const step = flingStep(vx, dt);
          vx = step.velocity;
          offX += step.delta;
          const next = panSpan(horizontal.base, offX, horizontal.canvasPx);
          flingLastRef.current =
            latest.current.setViewport(next.start, next.end) ?? next;
          if (Math.abs(vx) < FLING_MIN_VELOCITY) vx = 0;
        }
        if (vy === 0 && vx === 0) {
          stopFling();
          return;
        }
        flingRef.current = requestAnimationFrame(tick);
      };
      flingRef.current = requestAnimationFrame(tick);
    },
    [stopFling],
  );

  return useCallback(
    (e: ReactPointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== PAN_BUTTON) return;
      // A touch during a fling grabs the content, like native scrolling.
      // Seed from what the fling last applied — React may not have
      // committed that frame yet, so `latest` can be one step behind.
      const seed: Span = flingLastRef.current ?? {
        start: latest.current.viewportStart,
        end: latest.current.viewportEnd,
      };
      flingLastRef.current = null;
      stopFling();

      const existing = gestureRef.current;
      if (existing) {
        // Another finger joins → (re)become a pinch on the first two.
        existing.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        rebaselinePinch(existing);
        return;
      }

      const container = e.currentTarget as HTMLElement;
      const rectLeft = container.getBoundingClientRect?.().left ?? 0;

      const apply = (g: Gesture, next: Span) => {
        g.current = latest.current.setViewport(next.start, next.end) ?? next;
      };

      const onMove = (ev: PointerEvent) => {
        const g = gestureRef.current;
        if (!g) return;
        const p = g.pointers.get(ev.pointerId);
        if (!p) return;
        p.x = ev.clientX;
        p.y = ev.clientY;
        const { canvasPx } = latest.current;
        if (canvasPx <= 0) return;

        if (g.pointers.size >= 2 && g.pinchBase) {
          const [p1, p2] = [...g.pointers.values()];
          const dist = Math.hypot(p1!.x - p2!.x, p1!.y - p2!.y);
          const midX = (p1!.x + p2!.x) / 2 - g.rectLeft;
          apply(g, pinchSpan(g.base, g.pinchBase, dist, midX, canvasPx));
          return;
        }

        const dx = p.x - g.origin.x;
        const dy = p.y - g.origin.y;
        const overX = Math.abs(dx) >= g.threshold;
        const overY = Math.abs(dy) >= g.threshold;
        if (!g.active && !overX && !overY) return;
        if (!g.active) {
          g.active = true;
          document.body.style.cursor = "grabbing";
        }
        ev.preventDefault();

        // Horizontal engages on its own threshold, so the x wobble of a
        // vertical scroll never pans (and never flips an uncontrolled
        // viewport out of fit-follow). Mouse: this is the only axis.
        if (!g.panning && overX) g.panning = true;
        if (g.panning) apply(g, panSpan(g.base, dx, canvasPx));

        if (!g.isDirect) return;
        const t = now();
        g.xSamples.push({ t, p: p.x });
        g.xSamples = trimSamples(g.xSamples, t, VELOCITY_WINDOW_MS);

        // Vertical latches its own target once |dy| is real. The rows
        // take it whenever they can move; falling through to an
        // ancestor / the page needs the gesture to be mostly vertical,
        // so a horizontal pan with a little drift doesn't drag the host
        // page along. Retries while nothing can take it.
        if (!g.scroller && overY) {
          const s = findScroller(
            scrollRef?.current ?? null,
            container,
            -dy,
            Math.abs(dy) > Math.abs(dx),
          );
          if (s) {
            g.scroller = s;
            // first step covers the slop, like the horizontal axis
            g.lastY = g.origin.y;
            g.ySamples = [];
          }
        }
        if (g.scroller) {
          const s = g.scroller;
          s.set(s.get() + (g.lastY - p.y));
          g.lastY = p.y;
          g.ySamples.push({ t, p: s.get() });
          g.ySamples = trimSamples(g.ySamples, t, VELOCITY_WINDOW_MS);
        }
      };

      const onUp = (ev: PointerEvent) => {
        const g = gestureRef.current;
        if (!g || !g.pointers.has(ev.pointerId)) return;
        g.pointers.delete(ev.pointerId);
        if (g.pointers.size >= 2) {
          // one of three+ fingers left: pinch continues on the next two
          rebaselinePinch(g);
          return;
        }
        if (g.pointers.size === 1) {
          // pinch → single-pointer pan: re-baseline on the survivor
          const [p] = [...g.pointers.values()];
          g.base = { ...g.current };
          g.origin = { x: p!.x, y: p!.y };
          g.pinchBase = null;
          g.xSamples = [];
          g.lastY = p!.y;
          g.ySamples = [];
          return;
        }
        g.cleanup();
        gestureRef.current = null;
        document.body.style.cursor = "";
        if (g.active && ev.type === "pointerup") {
          ev.preventDefault();
          if (g.isDirect) {
            const t = now();
            const { canvasPx } = latest.current;
            startFling(
              g.scroller
                ? { scroller: g.scroller, velocity: releaseVelocity(g.ySamples, t) }
                : null,
              g.panning && canvasPx > 0
                ? {
                    base: g.current,
                    velocity: releaseVelocity(g.xSamples, t),
                    canvasPx,
                  }
                : null,
            );
          }
          // swallow the click that follows a pan
          const blockClick = (clickEv: MouseEvent) => {
            clickEv.stopPropagation();
            clickEv.preventDefault();
          };
          window.addEventListener("click", blockClick, true);
          setTimeout(() => {
            window.removeEventListener("click", blockClick, true);
          }, 0);
        }
      };

      const cleanup = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };

      gestureRef.current = {
        pointers: new Map([[e.pointerId, { x: e.clientX, y: e.clientY }]]),
        base: { ...seed },
        current: { ...seed },
        origin: { x: e.clientX, y: e.clientY },
        rectLeft,
        pinchBase: null,
        active: false,
        panning: false,
        threshold: dragThresholdFor(e.pointerType),
        isDirect: isDirectPointer(e.pointerType),
        scroller: null,
        lastY: e.clientY,
        xSamples: [],
        ySamples: [],
        cleanup,
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [scrollRef, startFling, stopFling],
  );
}
