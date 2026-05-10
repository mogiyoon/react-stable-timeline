import * as react_jsx_runtime from 'react/jsx-runtime';
import { CSSProperties } from 'react';

interface TimelineItem<TData = unknown> {
    id: string;
    label: string;
    /** Start time in ms (Unix epoch). */
    start: number;
    /** End time in ms. Omit or set equal to `start` for point events. */
    end?: number;
    /** Optional per-item accent color. Falls back to `accentColor` prop. */
    color?: string;
    /** Free-form payload — passed straight back to `onSelect`. */
    data?: TData;
}
interface TimelineLabels {
    fit?: string;
    zoomIn?: string;
    zoomOut?: string;
    zoomRatio?: string;
    /** Shown when `items` is empty. */
    empty?: string;
}
interface TimelineProps<TData = unknown> {
    items: TimelineItem<TData>[];
    /**
     * Controlled viewport in ms. When omitted, the timeline manages its
     * own viewport, initialised to the data's fit window (extents +
     * 5 % padding each side).
     */
    viewportStart?: number;
    viewportEnd?: number;
    onViewportChange?: (start: number, end: number) => void;
    /** Optional vertical cursor line, in ms. */
    cursorMs?: number | null;
    /** Fired when the user clicks an item (or presses Enter/Space). */
    onSelect?: (item: TimelineItem<TData>) => void;
    /** Default accent for dots, range bars, and the cursor line. */
    accentColor?: string;
    /** Replace the default English toolbar/empty labels. */
    labels?: TimelineLabels;
    /** Hide the top toolbar (Fit / zoom in / out / zoom %). */
    hideToolbar?: boolean;
    /**
     * Min / max zoom percentage relative to the fit window.
     * Defaults: min 100 (== fit, hardest zoom-out), max 5000 (50× zoom-in).
     * Zoom-out cannot go below 100 — the row packing assumes pixel
     * widths at fit-zoom and would invalidate otherwise.
     */
    zoomMinPct?: number;
    zoomMaxPct?: number;
    className?: string;
    style?: CSSProperties;
}

declare function Timeline<TData = unknown>({ items, viewportStart: viewportStartProp, viewportEnd: viewportEndProp, onViewportChange, cursorMs, onSelect, accentColor, labels: labelsProp, hideToolbar, zoomMinPct, zoomMaxPct, className, style, }: TimelineProps<TData>): react_jsx_runtime.JSX.Element;

interface PackInput {
    id: string;
    label: string;
    start: number;
    end: number;
    isRange: boolean;
}
/** First-Fit interval partitioning, label-aware.
 *
 *  Each item's footprint = max of:
 *    - dot diameter + breathing room
 *    - range bar pixel length (range items only)
 *    - measured label width + dot + padding
 *
 *  Output is stable: every item lands in the same row regardless of
 *  the current viewport — the same `(items, pxPerMs)` always returns
 *  the same Map. */
declare function packIntoRows(items: PackInput[], pxPerMs: number, measureLabel: (s: string) => number): Map<string, number>;
/** Build a label-width measurer using Canvas2D `measureText`. Hangul,
 *  Latin, and mixed text all measure correctly — character-count
 *  estimates under-count Hangul by ~30 % and produce overlaps. */
declare function makeLabelMeasurer(font?: string): (s: string) => number;

interface TickSpec {
    step: number;
    format: (d: Date) => string;
}
/** Pick a tick interval whose pixel spacing lands close to ~100 px.
 *  Walks year/month/week/day/hour steps in turn and picks the first
 *  whose `step` would render at least that wide. The target is
 *  generous so labels never crowd each other even with longer Korean
 *  year-month text. */
declare function pickTicks(viewportStart: number, viewportEnd: number, canvasPx: number): TickSpec;

export { type TickSpec, Timeline, type TimelineItem, type TimelineLabels, type TimelineProps, makeLabelMeasurer, packIntoRows, pickTicks };
