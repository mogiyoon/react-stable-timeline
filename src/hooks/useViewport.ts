import { useCallback, useEffect, useState } from "react";
import type { FitWindow } from "./useFitWindow";

interface UseViewportArgs {
  fitWindow: FitWindow | null;
  viewportStartProp: number | undefined;
  viewportEndProp: number | undefined;
  onViewportChange?: (start: number, end: number) => void;
  zoomMinPct: number;
  zoomMaxPct: number;
}

interface UseViewportResult {
  viewportStart: number;
  viewportEnd: number;
  setViewport: (start: number, end: number) => void;
  isControlled: boolean;
}

export function useViewport({
  fitWindow,
  viewportStartProp,
  viewportEndProp,
  onViewportChange,
  zoomMinPct,
  zoomMaxPct,
}: UseViewportArgs): UseViewportResult {
  const isControlled =
    viewportStartProp !== undefined && viewportEndProp !== undefined;

  const [innerStart, setInnerStart] = useState<number>(0);
  const [innerEnd, setInnerEnd] = useState<number>(1);

  useEffect(() => {
    if (isControlled) return;
    if (!fitWindow) return;
    setInnerStart(fitWindow.start);
    setInnerEnd(fitWindow.end);
  }, [fitWindow?.start, fitWindow?.end, isControlled]);

  const rawStart = isControlled ? viewportStartProp! : innerStart;
  const rawEnd = isControlled ? viewportEndProp! : innerEnd;
  const viewportValid =
    Number.isFinite(rawStart) && Number.isFinite(rawEnd) && rawEnd > rawStart;
  const viewportStart = viewportValid ? rawStart : 0;
  const viewportEnd = viewportValid ? rawEnd : 1;

  const clampViewport = useCallback(
    (start: number, end: number): { start: number; end: number } => {
      if (!fitWindow) return { start, end };
      const span = end - start;
      const maxSpan = (fitWindow.span * 100) / zoomMinPct;
      const minSpan = (fitWindow.span * 100) / zoomMaxPct;
      if (minSpan > maxSpan) return { start, end };
      if (span > maxSpan) {
        const center = (start + end) / 2;
        return { start: center - maxSpan / 2, end: center + maxSpan / 2 };
      }
      if (span < minSpan) {
        const center = (start + end) / 2;
        return { start: center - minSpan / 2, end: center + minSpan / 2 };
      }
      return { start, end };
    },
    [fitWindow, zoomMinPct, zoomMaxPct],
  );

  const setViewport = useCallback(
    (start: number, end: number) => {
      const clamped = isControlled
        ? { start, end }
        : clampViewport(start, end);
      if (!isControlled) {
        setInnerStart(clamped.start);
        setInnerEnd(clamped.end);
      }
      onViewportChange?.(clamped.start, clamped.end);
    },
    [clampViewport, isControlled, onViewportChange],
  );

  return { viewportStart, viewportEnd, setViewport, isControlled };
}
