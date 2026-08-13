import {
  useCallback,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { DRAG_PX, PAN_BUTTON, TOUCH_DRAG_PX } from "../constants";

interface UsePanArgs {
  viewportStart: number;
  viewportEnd: number;
  canvasPx: number;
  setViewport: (start: number, end: number) => void;
}

interface Gesture {
  pointers: Map<number, { x: number; y: number }>;
  /** Viewport at the last (re-)baseline — gesture math is relative to
   *  this, so state updates mid-gesture can't drift it. */
  base: { start: number; end: number };
  origin: { x: number; y: number };
  rectLeft: number;
  pinchBase: { dist: number; midX: number } | null;
  active: boolean;
  threshold: number;
  cleanup: () => void;
}

/** Pointer-based canvas gestures: one pointer (mouse drag or finger)
 *  pans, a second finger turns the gesture into a pinch zoom anchored
 *  at the midpoint. Clicks under the drag threshold pass through. */
export function usePan({
  viewportStart,
  viewportEnd,
  canvasPx,
  setViewport,
}: UsePanArgs) {
  const latest = useRef({ viewportStart, viewportEnd, canvasPx, setViewport });
  latest.current = { viewportStart, viewportEnd, canvasPx, setViewport };
  const gestureRef = useRef<Gesture | null>(null);

  return useCallback((e: ReactPointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== PAN_BUTTON) return;

    const existing = gestureRef.current;
    if (existing) {
      // Second finger joins → become a pinch. Re-baseline off the
      // current viewport so the transition doesn't jump.
      existing.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (existing.pointers.size === 2) {
        const [p1, p2] = [...existing.pointers.values()];
        existing.base = {
          start: latest.current.viewportStart,
          end: latest.current.viewportEnd,
        };
        existing.pinchBase = {
          dist: Math.max(1, Math.hypot(p1!.x - p2!.x, p1!.y - p2!.y)),
          midX: (p1!.x + p2!.x) / 2,
        };
        existing.active = true;
      }
      return;
    }

    const rectLeft =
      (e.currentTarget as HTMLElement).getBoundingClientRect?.().left ?? 0;

    const onMove = (ev: PointerEvent) => {
      const g = gestureRef.current;
      if (!g) return;
      const p = g.pointers.get(ev.pointerId);
      if (!p) return;
      p.x = ev.clientX;
      p.y = ev.clientY;
      const { canvasPx, setViewport } = latest.current;
      if (canvasPx <= 0) return;
      const baseSpan = g.base.end - g.base.start;

      if (g.pointers.size >= 2 && g.pinchBase) {
        const [p1, p2] = [...g.pointers.values()];
        const dist = Math.max(1, Math.hypot(p1!.x - p2!.x, p1!.y - p2!.y));
        const midX = (p1!.x + p2!.x) / 2;
        const scale = dist / g.pinchBase.dist;
        const newSpan = baseSpan / scale;
        // keep the time under the pinch midpoint pinned to the fingers
        const midTime =
          g.base.start +
          ((g.pinchBase.midX - g.rectLeft) / canvasPx) * baseSpan;
        const newStart = midTime - ((midX - g.rectLeft) / canvasPx) * newSpan;
        setViewport(newStart, newStart + newSpan);
        return;
      }

      const dx = p.x - g.origin.x;
      const dy = p.y - g.origin.y;
      if (!g.active && Math.abs(dx) < g.threshold && Math.abs(dy) < g.threshold) {
        return;
      }
      if (!g.active) {
        g.active = true;
        document.body.style.cursor = "grabbing";
      }
      ev.preventDefault();
      const dt = -(dx / canvasPx) * baseSpan;
      setViewport(g.base.start + dt, g.base.end + dt);
    };

    const onUp = (ev: PointerEvent) => {
      const g = gestureRef.current;
      if (!g || !g.pointers.has(ev.pointerId)) return;
      g.pointers.delete(ev.pointerId);
      if (g.pointers.size === 1) {
        // pinch → single-pointer pan: re-baseline on the survivor
        const [p] = [...g.pointers.values()];
        g.base = {
          start: latest.current.viewportStart,
          end: latest.current.viewportEnd,
        };
        g.origin = { x: p!.x, y: p!.y };
        g.pinchBase = null;
        return;
      }
      if (g.pointers.size > 0) return;
      g.cleanup();
      gestureRef.current = null;
      document.body.style.cursor = "";
      if (g.active && ev.type === "pointerup") {
        ev.preventDefault();
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
      base: {
        start: latest.current.viewportStart,
        end: latest.current.viewportEnd,
      },
      origin: { x: e.clientX, y: e.clientY },
      rectLeft,
      pinchBase: null,
      active: false,
      threshold: e.pointerType === "touch" ? TOUCH_DRAG_PX : DRAG_PX,
      cleanup,
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, []);
}
