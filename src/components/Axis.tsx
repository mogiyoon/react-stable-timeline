import { AXIS_HEIGHT } from "../constants";
import type { RenderedTick } from "../hooks/useTimelineTicks";

interface AxisProps {
  ticks: RenderedTick[];
  canvasPx: number;
  timeToPx: (ms: number) => number;
}

export function Axis({ ticks, canvasPx, timeToPx }: AxisProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: AXIS_HEIGHT,
        borderTop: "1px solid rgba(127,127,127,0.25)",
      }}
    >
      {ticks.map((tick) => {
        const x = timeToPx(tick.ms);
        if (x < -40 || x > canvasPx + 40) return null;
        return (
          <div
            key={`tick-${tick.ms}`}
            style={{
              position: "absolute",
              top: 0,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              fontSize: 10,
              fontVariantNumeric: "tabular-nums",
              opacity: 0.7,
              left: x,
              transform: "translateX(-50%)",
            }}
          >
            <div
              style={{
                height: 4,
                width: 1,
                background: "rgba(127,127,127,0.5)",
              }}
            />
            <span style={{ marginTop: 2, padding: "0 4px" }}>{tick.label}</span>
          </div>
        );
      })}
    </div>
  );
}
