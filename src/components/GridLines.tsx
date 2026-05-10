import type { RenderedTick } from "../hooks/useTimelineTicks";

interface GridLinesProps {
  ticks: RenderedTick[];
  canvasPx: number;
  timeToPx: (ms: number) => number;
}

export function GridLines({ ticks, canvasPx, timeToPx }: GridLinesProps) {
  return (
    <>
      {ticks.map((tick) => {
        const x = timeToPx(tick.ms);
        if (x < -1 || x > canvasPx + 1) return null;
        return (
          <div
            key={`grid-${tick.ms}`}
            style={{
              pointerEvents: "none",
              position: "absolute",
              top: 0,
              bottom: 0,
              width: 1,
              left: x,
              background: "rgba(127,127,127,0.15)",
            }}
          />
        );
      })}
    </>
  );
}
