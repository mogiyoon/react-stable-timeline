export interface TickSpec {
  step: number;
  format: (d: Date) => string;
}

/** Pick a tick interval whose pixel spacing lands close to ~100 px.
 *  Walks year/month/week/day/hour steps in turn and picks the first
 *  whose `step` would render at least that wide. The target is
 *  generous so labels never crowd each other even with longer Korean
 *  year-month text. */
export function pickTicks(
  viewportStart: number,
  viewportEnd: number,
  canvasPx: number,
): TickSpec {
  const span = viewportEnd - viewportStart;
  const pxPerMs = canvasPx / Math.max(1, span);
  const targetPx = 100;
  const targetMs = targetPx / pxPerMs;

  const yr = 365.25 * 24 * 3600 * 1000;
  const mo = 30 * 24 * 3600 * 1000;
  const dy = 24 * 3600 * 1000;
  const hr = 3600 * 1000;

  if (targetMs >= 10 * yr) {
    return { step: 10 * yr, format: (d) => `${d.getFullYear()}` };
  }
  if (targetMs >= 5 * yr) {
    return { step: 5 * yr, format: (d) => `${d.getFullYear()}` };
  }
  if (targetMs >= 2 * yr) {
    return { step: 2 * yr, format: (d) => `${d.getFullYear()}` };
  }
  if (targetMs >= yr) {
    return { step: yr, format: (d) => `${d.getFullYear()}` };
  }
  if (targetMs >= 6 * mo) {
    return {
      step: 6 * mo,
      format: (d) =>
        `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`,
    };
  }
  if (targetMs >= 3 * mo) {
    return {
      step: 3 * mo,
      format: (d) =>
        `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`,
    };
  }
  if (targetMs >= mo) {
    return {
      step: mo,
      format: (d) =>
        `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`,
    };
  }
  if (targetMs >= 7 * dy) {
    return {
      step: 7 * dy,
      format: (d) =>
        `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`,
    };
  }
  if (targetMs >= dy) {
    return {
      step: dy,
      format: (d) =>
        `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`,
    };
  }
  return {
    step: hr,
    format: (d) =>
      `${String(d.getHours()).padStart(2, "0")}:${String(
        d.getMinutes(),
      ).padStart(2, "0")}`,
  };
}
