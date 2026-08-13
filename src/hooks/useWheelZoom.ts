import { useEffect, useRef, type RefObject } from "react";

interface UseWheelZoomArgs {
  containerRef: RefObject<HTMLElement | null>;
  /** See useContainerWidth: re-attach when the container first mounts. */
  attached?: boolean;
  viewportStart: number;
  viewportEnd: number;
  canvasPx: number;
  zoomFactor: number;
  setViewport: (start: number, end: number) => void;
}

export function useWheelZoom({
  containerRef,
  attached = true,
  viewportStart,
  viewportEnd,
  canvasPx,
  zoomFactor,
  setViewport,
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
    const horizontalDelta =
      e.deltaX !== 0 ? e.deltaX : e.shiftKey ? e.deltaY : 0;
    if (horizontalDelta === 0) return;
    e.preventDefault();
    const dt = (horizontalDelta / canvasPx) * viewportSpan;
    setViewport(viewportStart + dt, viewportEnd + dt);
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
