import { describe, expect, it } from "vitest";
import { pickTicks } from "../src/ticks";

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const YEAR = 365.25 * DAY;

describe("pickTicks", () => {
  it("picks the densest step still within ~100px spacing (1h floor)", () => {
    const spans = [2 * HOUR, DAY, 30 * DAY, YEAR, 10 * YEAR, 50 * YEAR];
    for (const span of spans) {
      for (const canvasPx of [400, 800, 1600]) {
        const { step } = pickTicks(0, span, canvasPx);
        const pxPerTick = (step / span) * canvasPx;
        // the chosen step never exceeds the ~100px target — unless the
        // 1-hour floor forces it wider at extreme zoom-in
        if (step !== HOUR) expect(pxPerTick).toBeLessThanOrEqual(100);
        expect(step).toBeGreaterThanOrEqual(HOUR);
      }
    }
  });

  it("zooming in produces a finer step", () => {
    const wide = pickTicks(0, 10 * YEAR, 1000).step;
    const narrow = pickTicks(0, 10 * DAY, 1000).step;
    expect(narrow).toBeLessThan(wide);
  });

  it("falls back to hourly ticks at extreme zoom", () => {
    const { step } = pickTicks(0, 2 * HOUR, 1000);
    expect(step).toBe(HOUR);
  });

  it("formats year steps as bare years", () => {
    const { format } = pickTicks(0, 50 * YEAR, 800);
    expect(format(new Date(Date.UTC(2025, 5, 1)))).toMatch(/^\d{4}$/);
  });
});
