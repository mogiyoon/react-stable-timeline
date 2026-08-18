/** Pure gesture arithmetic shared by usePan — kept DOM-free so it can be
 *  unit-tested without a browser. */

export interface Span {
  start: number;
  end: number;
}

/** Drag by `dxPx` on a canvas `canvasPx` wide: content follows the
 *  finger, so the viewport moves the other way. */
export function panSpan(base: Span, dxPx: number, canvasPx: number): Span {
  const span = base.end - base.start;
  const dt = -(dxPx / canvasPx) * span;
  return { start: base.start + dt, end: base.end + dt };
}

export interface PinchBase {
  /** Finger distance when the pinch (re-)baselined, px. */
  dist: number;
  /** Midpoint x relative to the canvas left edge, px. */
  midX: number;
}

/** Scale the viewport by finger spread, keeping the time under the
 *  *baseline* midpoint pinned to the *current* midpoint. */
export function pinchSpan(
  base: Span,
  pinch: PinchBase,
  dist: number,
  midX: number,
  canvasPx: number,
): Span {
  const baseSpan = base.end - base.start;
  const scale = Math.max(1, dist) / Math.max(1, pinch.dist);
  const newSpan = baseSpan / scale;
  const midTime = base.start + (pinch.midX / canvasPx) * baseSpan;
  const newStart = midTime - (midX / canvasPx) * newSpan;
  return { start: newStart, end: newStart + newSpan };
}

export interface Sample {
  /** ms timestamp */
  t: number;
  /** position at `t` (px) */
  p: number;
}

/** Retain only samples newer than `now - windowMs`. pointermove streams
 *  while the finger moves, so a moving finger always has fresh samples;
 *  a paused one ages out to nothing (⇒ no fling after a hold). */
export function trimSamples(
  samples: Sample[],
  now: number,
  windowMs: number,
): Sample[] {
  const cutoff = now - windowMs;
  return samples.filter((s) => s.t >= cutoff);
}

/** Release velocity in px/ms from the last `windowMs` of samples.
 *  Zero when the finger paused (no fresh samples) or held still. */
export function releaseVelocity(
  samples: Sample[],
  now: number,
  windowMs = 100,
): number {
  const recent = trimSamples(samples, now, windowMs);
  if (recent.length < 2) return 0;
  const first = recent[0]!;
  const last = recent[recent.length - 1]!;
  // finger lifted after a pause → no fling
  if (now - last.t > windowMs / 2) return 0;
  const dt = last.t - first.t;
  if (dt <= 0) return 0;
  return (last.p - first.p) / dt;
}

/** Friction per 16 ms frame — 0.95 ≈ iOS-ish decay (~1 s to settle). */
export const FLING_FRICTION = 0.95;
/** Below this speed (px/ms) the fling is treated as stopped. */
export const FLING_MIN_VELOCITY = 0.02;

/** Advance a fling by `dtMs`: returns the distance to move and the new
 *  velocity. Exponential decay, frame-rate independent. */
export function flingStep(
  velocity: number,
  dtMs: number,
  friction = FLING_FRICTION,
): { delta: number; velocity: number } {
  if (dtMs <= 0) return { delta: 0, velocity };
  // no friction → constant velocity (and avoids ln(1) = 0 below)
  if (friction >= 1) return { delta: velocity * dtMs, velocity };
  const k = Math.pow(friction, dtMs / 16);
  // ∫ v·k^(t/16) dt over [0, dtMs]  = v · 16 · (k − 1) / ln(friction)
  const delta = (velocity * 16 * (k - 1)) / Math.log(friction);
  return { delta, velocity: velocity * k };
}

/** Clamp a scroll position to `[0, max]`; also reports whether it hit
 *  an edge so a fling can stop there. */
export function clampScroll(
  pos: number,
  max: number,
): { pos: number; hitEdge: boolean } {
  if (pos <= 0) return { pos: 0, hitEdge: true };
  if (pos >= max) return { pos: max, hitEdge: true };
  return { pos, hitEdge: false };
}

/** Which vertical scroller a touch gesture should own, decided once at
 *  the first vertical movement (scroll latching, like native). `inner`
 *  wins if it can still move in the finger's direction; otherwise the
 *  nearest scrollable ancestor; otherwise the page. `wantDelta` is the
 *  scrollTop change the finger asks for (finger down ⇒ negative). */
export function canConsume(
  wantDelta: number,
  scrollPos: number,
  scrollMax: number,
): boolean {
  if (scrollMax <= 0) return false;
  if (wantDelta < 0) return scrollPos > 0.5;
  if (wantDelta > 0) return scrollPos < scrollMax - 0.5;
  return false;
}
