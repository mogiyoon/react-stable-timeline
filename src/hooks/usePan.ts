import { useCallback, type MouseEvent as ReactMouseEvent } from "react";
import { DRAG_PX, PAN_BUTTON } from "../constants";

interface UsePanArgs {
  viewportStart: number;
  viewportEnd: number;
  canvasPx: number;
  setViewport: (start: number, end: number) => void;
}

export function usePan({
  viewportStart,
  viewportEnd,
  canvasPx,
  setViewport,
}: UsePanArgs) {
  return useCallback(
    (e: ReactMouseEvent) => {
      if (e.button !== PAN_BUTTON) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const startVp = { start: viewportStart, end: viewportEnd };
      const startSpan = startVp.end - startVp.start;
      let panning = false;

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!panning && Math.abs(dx) < DRAG_PX && Math.abs(dy) < DRAG_PX) {
          return;
        }
        if (!panning) {
          panning = true;
          document.body.style.cursor = "grabbing";
        }
        ev.preventDefault();
        const dt = -(dx / canvasPx) * startSpan;
        setViewport(startVp.start + dt, startVp.end + dt);
      };
      const onUp = (ev: MouseEvent) => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        if (panning) {
          ev.preventDefault();
          ev.stopPropagation();
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
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [viewportStart, viewportEnd, canvasPx, setViewport],
  );
}
