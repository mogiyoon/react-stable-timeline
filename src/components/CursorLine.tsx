interface CursorLineProps {
  cursorMs: number | null | undefined;
  canvasPx: number;
  timeToPx: (ms: number) => number;
  accentColor: string;
}

export function CursorLine({
  cursorMs,
  canvasPx,
  timeToPx,
  accentColor,
}: CursorLineProps) {
  if (cursorMs === null || cursorMs === undefined) return null;
  const x = timeToPx(cursorMs);
  if (x < 0 || x > canvasPx) return null;
  return (
    <div
      aria-hidden="true"
      style={{
        pointerEvents: "none",
        position: "absolute",
        top: 0,
        bottom: 0,
        width: 1,
        left: x,
        background: accentColor,
        opacity: 0.85,
      }}
    />
  );
}
