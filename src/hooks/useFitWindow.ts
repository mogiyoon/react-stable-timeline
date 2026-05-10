import { useMemo } from "react";

export interface FitWindow {
  start: number;
  end: number;
  span: number;
}

export function useFitWindow(
  items: { start: number; end: number }[],
): FitWindow | null {
  return useMemo(() => {
    if (items.length === 0) return null;
    let min = Infinity;
    let max = -Infinity;
    for (const i of items) {
      if (i.start < min) min = i.start;
      if (i.end > max) max = i.end;
    }
    const span = Math.max(1, max - min);
    return {
      start: min - span * 0.05,
      end: max + span * 0.05,
      span: span * 1.1,
    };
  }, [items]);
}
