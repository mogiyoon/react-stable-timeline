import { useMemo } from "react";
import { pickTicks } from "../ticks";

export interface RenderedTick {
  ms: number;
  label: string;
}

export function useTimelineTicks(
  viewportStart: number,
  viewportEnd: number,
  canvasPx: number,
): RenderedTick[] {
  const viewportSpan = viewportEnd - viewportStart;

  const tickSpec = useMemo(() => {
    if (canvasPx <= 0 || viewportSpan <= 0) return null;
    return pickTicks(viewportStart, viewportEnd, canvasPx);
  }, [viewportStart, viewportEnd, viewportSpan, canvasPx]);

  return useMemo(() => {
    if (!tickSpec) return [] as RenderedTick[];
    const buffer = viewportSpan * 3;
    const first =
      Math.floor((viewportStart - buffer) / tickSpec.step) * tickSpec.step;
    const last = viewportEnd + buffer;
    const out: RenderedTick[] = [];
    for (let ms = first; ms <= last; ms += tickSpec.step) {
      out.push({ ms, label: tickSpec.format(new Date(ms)) });
    }
    return out;
  }, [tickSpec, viewportStart, viewportEnd, viewportSpan]);
}
