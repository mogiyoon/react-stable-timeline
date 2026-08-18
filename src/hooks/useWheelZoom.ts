import { useEffect, useRef, type RefObject } from "react";
import { canConsume } from "./gestureMath";
import { elementScroller } from "./scrollers";

interface UseWheelZoomArgs {
  containerRef: RefObject<HTMLElement | null>;
  /** See useContainerWidth: re-attach when the container first mounts. */
  attached?: boolean;
  viewportStart: number;
  viewportEnd: number;
  canvasPx: number;
  zoomFactor: number;
  setViewport: (start: number, end: number) => void;
  /** Rows scroll container — vertical wheel deltas that arrive mixed
   *  with horizontal ones are applied here by hand (see below). */
  scrollRef?: RefObject<HTMLElement | null>;
}

/** Approximate px per line for `deltaMode === DOM_DELTA_LINE` (Firefox). */
const LINE_PX = 16;

/** Wheel / trackpad on the canvas:
 *  - ⌘/Ctrl + wheel → zoom anchored at the cursor
 *  - horizontal delta (or Shift + vertical) → pan
 *  - purely vertical → left to the browser (native rows / page scroll,
 *    with its own smooth scrolling and per-gesture latching)
 *
 *  A trackpad swipe that turns from horizontal to vertical emits events
 *  carrying *both* deltas. Those must be preventDefault'd for their
 *  horizontal part (or the browser turns it into back/forward
 *  navigation), which also kills the browser's vertical scroll for that
 *  event — so their vertical part is applied to the rows container by
 *  hand. Only the rows: chaining a few px of jitter to the page would
 *  drag the host page along during a horizontal pan. */
export function useWheelZoom({
  containerRef,
  attached = true,
  viewportStart,
  viewportEnd,
  canvasPx,
  zoomFactor,
  setViewport,
  scrollRef,
}: UseWheelZoomArgs) {
  const handlerRef = useRef<(e: WheelEvent) => void>(() => {});
  const viewportSpan = viewportEnd - viewportStart;

  handlerRef.current = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cursorX = e.clientX - rect.left;
      const cursorTime = viewportStart + (cursorX / canvasPx) * viewportSpan;
      const factor = e.deltaY > 0 ? zoomFactor : 1 / zoomFactor;
      const newSpan = viewportSpan * factor;
      const newStart = cursorTime - (cursorX / canvasPx) * newSpan;
      setViewport(newStart, newStart + newSpan);
      return;
    }

    const unit =
      e.deltaMode === 1
        ? LINE_PX
        : e.deltaMode === 2
          ? (scrollRef?.current?.clientHeight ?? 0) || LINE_PX * 20
          : 1;
    let dx = e.deltaX * unit;
    let dy = e.deltaY * unit;
    if (dx === 0 && e.shiftKey) {
      dx = dy;
      dy = 0;
    }
    if (dx === 0) return; // pure vertical: native

    e.preventDefault();
    if (canvasPx > 0) {
      const dt = (dx / canvasPx) * viewportSpan;
      setViewport(viewportStart + dt, viewportEnd + dt);
    }
    const inner = scrollRef?.current;
    if (dy !== 0 && inner) {
      const s = elementScroller(inner);
      if (canConsume(dy, s.get(), s.max())) s.set(s.get() + dy);
    }
  };

  useEffect(() => {
    if (!attached) return;
    const node = containerRef.current;
    if (!node) return;
    const onWheel = (e: WheelEvent) => handlerRef.current(e);
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [containerRef, attached]);
}
