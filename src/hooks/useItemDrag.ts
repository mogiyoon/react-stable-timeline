import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { dragThresholdFor } from "../constants";
import type {
  DragHandleProps,
  ResizeEdge,
  TimeRange,
  TimelineItem,
} from "../types";

export type DragMode = "move" | "resize-start" | "resize-end";

export interface DragState {
  id: string;
  mode: DragMode;
  deltaMs: number;
}

/** Apply an in-flight drag to an item's times. Used both for the live
 *  preview and for the final value handed to the drop callback, so the
 *  two can never disagree. Resizes clamp the span to ≥ 1 ms. */
export function applyDrag(
  start: number,
  end: number,
  drag: DragState,
): TimeRange {
  if (drag.mode === "move") {
    return { start: start + drag.deltaMs, end: end + drag.deltaMs };
  }
  if (drag.mode === "resize-start") {
    return { start: Math.min(start + drag.deltaMs, end - 1), end };
  }
  return { start, end: Math.max(end + drag.deltaMs, start + 1) };
}

interface UseItemDragArgs<TData> {
  itemMap: Map<string, TimelineItem<TData>>;
  pxPerMs: number;
  dragSnapMs?: number;
  onItemMove?: (item: TimelineItem<TData>, next: TimeRange) => void;
  onItemResize?: (item: TimelineItem<TData>, next: TimeRange) => void;
}

export interface UseItemDragResult {
  drag: DragState | null;
  canMove: boolean;
  canResize: boolean;
  getMoveHandleProps: (id: string) => DragHandleProps | undefined;
  getResizeHandleProps: (
    id: string,
    edge: ResizeEdge,
  ) => DragHandleProps | undefined;
  /** Shift an item by `deltaMs` without a pointer — keyboard support. */
  moveItemBy: (id: string, deltaMs: number) => void;
  /** Shift one edge of an item by `deltaMs` without a pointer. */
  resizeItemBy: (id: string, edge: ResizeEdge, deltaMs: number) => void;
}

export function useItemDrag<TData>({
  itemMap,
  pxPerMs,
  dragSnapMs,
  onItemMove,
  onItemResize,
}: UseItemDragArgs<TData>): UseItemDragResult {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const startDrag = useCallback(
    (e: ReactPointerEvent, id: string, mode: DragMode) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const item = itemMap.get(id);
      if (!item || pxPerMs <= 0) return;
      const commit = mode === "move" ? onItemMove : onItemResize;
      if (!commit) return;
      // Claim the gesture — otherwise the canvas pan starts too.
      e.stopPropagation();

      const pointerId = e.pointerId;
      const threshold = dragThresholdFor(e.pointerType);
      const originX = e.clientX;
      const start = item.start;
      const end = item.end ?? item.start;
      // Snapping aligns the absolute time of the edge being dragged,
      // not the delta, so items land on the grid (e.g. on the hour).
      const anchor = mode === "resize-end" ? end : start;
      const cursor = mode === "move" ? "grabbing" : "ew-resize";
      let active = false;

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const dx = ev.clientX - originX;
        if (!active && Math.abs(dx) < threshold) return;
        if (!active) {
          active = true;
          document.body.style.cursor = cursor;
        }
        ev.preventDefault();
        const rawDelta = dx / pxPerMs;
        const deltaMs =
          dragSnapMs && dragSnapMs > 0
            ? Math.round((anchor + rawDelta) / dragSnapMs) * dragSnapMs -
              anchor
            : Math.round(rawDelta);
        dragRef.current = { id, mode, deltaMs };
        setDrag(dragRef.current);
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        document.body.style.cursor = "";
        const final = dragRef.current;
        dragRef.current = null;
        setDrag(null);
        // pointercancel = the browser took the gesture over (e.g. it
        // became a scroll) — abort without committing.
        if (!active || !final || ev.type === "pointercancel") return;
        ev.preventDefault();
        // Swallow the click that follows a drag so onSelect doesn't fire.
        const blockClick = (clickEv: MouseEvent) => {
          clickEv.stopPropagation();
          clickEv.preventDefault();
        };
        window.addEventListener("click", blockClick, true);
        setTimeout(() => {
          window.removeEventListener("click", blockClick, true);
        }, 0);
        commit(item, applyDrag(start, end, final));
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [itemMap, pxPerMs, dragSnapMs, onItemMove, onItemResize],
  );

  const getMoveHandleProps = useCallback(
    (id: string): DragHandleProps | undefined =>
      onItemMove
        ? { onPointerDown: (e) => startDrag(e, id, "move") }
        : undefined,
    [onItemMove, startDrag],
  );

  const getResizeHandleProps = useCallback(
    (id: string, edge: ResizeEdge): DragHandleProps | undefined =>
      onItemResize
        ? {
            onPointerDown: (e) =>
              startDrag(e, id, edge === "start" ? "resize-start" : "resize-end"),
          }
        : undefined,
    [onItemResize, startDrag],
  );

  const moveItemBy = useCallback(
    (id: string, deltaMs: number) => {
      const item = itemMap.get(id);
      if (!item || !onItemMove || deltaMs === 0) return;
      const end = item.end ?? item.start;
      onItemMove(item, applyDrag(item.start, end, { id, mode: "move", deltaMs }));
    },
    [itemMap, onItemMove],
  );

  const resizeItemBy = useCallback(
    (id: string, edge: ResizeEdge, deltaMs: number) => {
      const item = itemMap.get(id);
      if (!item || !onItemResize || deltaMs === 0) return;
      const end = item.end ?? item.start;
      const mode = edge === "start" ? "resize-start" : "resize-end";
      onItemResize(item, applyDrag(item.start, end, { id, mode, deltaMs }));
    },
    [itemMap, onItemResize],
  );

  return {
    drag,
    canMove: !!onItemMove,
    canResize: !!onItemResize,
    getMoveHandleProps,
    getResizeHandleProps,
    moveItemBy,
    resizeItemBy,
  };
}
