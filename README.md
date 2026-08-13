# @mogiyoon/react-stable-timeline
<img width="640" height="369" alt="화면 기록 2026-05-10 11 37 51_small" src="https://github.com/user-attachments/assets/1f01199a-fae6-4d7e-aa35-1540402d43c8" />

A React timeline with **stable row packing** — events keep their row when you pan, instead of jumping around as the viewport changes.

Viewport-based stacking algorithms recompute the row layout from whatever is currently visible, so the same event lands on row 3 at one pan position and row 1 at another. This library packs rows from the **full dataset**, so panning never reshuffles rows. Zooming optionally too — see `zoomStable`.

- **Pan-stable rows** — first-fit packing on the full data, not the viewport
- **Label-aware** — uses `Canvas2D.measureText`, so Hangul / CJK / mixed text measures correctly (per-character estimates under-count Hangul by ~30 %)
- **Optional zoom-stable mode** — `zoomStable` freezes the row layout at fit-zoom so rows never change at any zoom level
- **Photoshop-style zoom %** — 100 % = fit, up to 5000 %, anchored on viewport center
- **Trackpad-friendly** — two-finger horizontal scroll pans, ⌘/Ctrl + wheel zooms anchored at the cursor, drag-from-anywhere pans (with a click/drag threshold)
- **Touch-ready** — Pointer Events throughout: one-finger pan, two-finger pinch zoom anchored at the midpoint, touch drag & resize
- **Accessible** — date-carrying `aria-label`s, total-count announcement despite virtualization, full keyboard move/resize parity, visible focus outline
- **Range items** — bar with start + end dots; point items get a single dot
- **Drag & drop** — move items along the time axis and resize range edges, with optional grid snapping (`onItemMove` / `onItemResize` / `dragSnapMs`)
- **Virtualized** — only items intersecting the viewport (plus overscan) hit the DOM, horizontally *and* vertically, so tens of thousands of events stay smooth
- **Headless core** — `useTimeline()` exposes the whole engine (viewport, zoom/pan, packing, virtualization, drag) with zero DOM output; the `<Timeline>` component is just a thin styled layer you can replace, or override per-item with `renderItem`
- **SSR-safe** — ships with a `"use client"` banner for Next.js App Router; server rendering falls back gracefully where Canvas2D isn't available
- **Zero CSS framework** — inline styles only, no Tailwind / styled-components / etc. required
- **Controlled or uncontrolled** — pass `viewportStart` / `viewportEnd` to drive externally, or let it manage itself
- **Tiny** — ~9 KB gzipped, tree-shakable, no dependencies beyond React

## Is this the right tool?

**Good fit** — event/history/log timelines: releases, incidents, biographies, project milestones, chronologies. Mixed point + range events, from a handful to tens of thousands. Custom-designed UIs (headless), Next.js/SSR apps, CJK-heavy labels.

**Not designed for** — Gantt charts (task dependencies, resource rows), calendar scheduling (day/week grids, recurring events), or media-editing timelines (tracks, clips, scrubbing). Those need different data models — reaching for this library there will fight you.

## Install

```bash
npm i @mogiyoon/react-stable-timeline
```

Peer deps: `react >= 18`, `react-dom >= 18`.

## Usage
<img width="1117" height="631" alt="image" src="https://github.com/user-attachments/assets/0820d6a6-1a04-4f6f-85de-cd2bdba5798c" />
The screenshot above is rendered by exactly this code:

```tsx
import { useState } from "react";
import {
  Timeline,
  type TimelineItem,
} from "@mogiyoon/react-stable-timeline";

interface EventMeta {
  category: "milestone" | "release" | "ops";
  description: string;
}

const items: TimelineItem<EventMeta>[] = [
  {
    id: "kickoff",
    label: "Project kickoff",
    start: Date.parse("2025-01-15"),
    color: "#f59e0b",
    data: { category: "milestone", description: "Scope alignment + design mockups" },
  },
  {
    id: "alpha",
    label: "Alpha build",
    start: Date.parse("2025-02-20"),
    end: Date.parse("2025-03-10"),
    data: { category: "release", description: "First build for internal QA" },
  },
  {
    id: "beta",
    label: "Beta release",
    start: Date.parse("2025-04-01"),
    end: Date.parse("2025-06-30"),
    color: "#10b981",
    data: { category: "release", description: "Invite-based external testing" },
  },
  {
    id: "infra",
    label: "Infrastructure migration",
    start: Date.parse("2025-05-12"),
    end: Date.parse("2025-05-19"),
    data: { category: "ops", description: "Vercel → self-hosted" },
  },
  {
    id: "launch",
    label: "Official launch 🚀",
    start: Date.parse("2025-09-12"),
    color: "#ef4444",
    data: { category: "milestone", description: "Press announcement + blog post" },
  },
  {
    id: "postmortem",
    label: "Launch retrospective",
    start: Date.parse("2025-09-30"),
    data: { category: "ops", description: "Team retro + next-quarter plan" },
  },
  {
    id: "v2",
    label: "v2 planning",
    start: Date.parse("2025-10-10"),
    end: Date.parse("2025-12-20"),
    color: "#8b5cf6",
    data: { category: "milestone", description: "Define next-version spec" },
  },
];

export function App() {
  const [selected, setSelected] = useState<TimelineItem<EventMeta> | null>(
    null,
  );

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 4 }}>react-stable-timeline demo</h1>
      <p style={{ color: "#666", marginTop: 0 }}>
        Pan: drag or two-finger horizontal scroll · Zoom: ⌘/Ctrl + wheel · Click
        an item to select
      </p>

      <div
        style={{
          height: 420,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <Timeline<EventMeta>
          items={items}
          accentColor="#6c8cff"
          cursorMs={Date.now()}
          onSelect={setSelected}
          labels={{
            fit: "Fit all",
            zoomIn: "Zoom in",
            zoomOut: "Zoom out",
            zoomRatio: "Zoom",
            empty: "No events",
          }}
        />
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          minHeight: 80,
          background: "#f9fafb",
        }}
      >
        {selected ? (
          <>
            <div style={{ fontWeight: 600, fontSize: 16 }}>
              {selected.label}
            </div>
            <div style={{ color: "#555", marginTop: 4 }}>
              {new Date(selected.start).toLocaleDateString("en-US")}
              {selected.end != null &&
                ` ~ ${new Date(selected.end).toLocaleDateString("en-US")}`}
              {" · "}
              <span style={{ color: "#888" }}>
                {selected.data?.category}
              </span>
            </div>
            <div style={{ marginTop: 8 }}>{selected.data?.description}</div>
          </>
        ) : (
          <span style={{ color: "#888" }}>
            Click an item to see its details here.
          </span>
        )}
      </div>
    </div>
  );
}
```

## Controlled viewport

Drive the viewport from outside (e.g. from a global time-bar):

```tsx
const [start, setStart] = useState(...);
const [end, setEnd] = useState(...);

<Timeline
  items={items}
  viewportStart={start}
  viewportEnd={end}
  onViewportChange={(s, e) => {
    setStart(s);
    setEnd(e);
  }}
  cursorMs={Date.now()}
/>
```

## Drag & drop

The timeline never mutates `items` — drags are fully controlled. Pass `onItemMove` to make items draggable along the time axis, and/or `onItemResize` to show resize handles on both edges of range items. On drop you get the item and its proposed new times; apply them to your state:

```tsx
const [items, setItems] = useState(initialItems);

const applyTimes = (item: TimelineItem, next: { start: number; end: number }) =>
  setItems((prev) =>
    prev.map((it) =>
      it.id === item.id
        ? { ...it, start: next.start, end: it.end !== undefined ? next.end : undefined }
        : it,
    ),
  );

<Timeline
  items={items}
  onItemMove={applyTimes}
  onItemResize={applyTimes}
  dragSnapMs={60 * 60 * 1000} // optional: snap to the hour
/>
```

While dragging, the item follows the cursor as a live preview (rows stay frozen); the callback fires once on drop. A drag under the 4 px threshold is treated as a click, so `onSelect` still works. Snapping aligns the *absolute* time of the dragged edge to the grid, so items land on round values. Resizes clamp the span to ≥ 1 ms.

## Custom item rendering

Keep the engine (toolbar, axis, pan/zoom, packing, virtualization, drag) but draw items yourself:

```tsx
<Timeline
  items={items}
  onItemMove={applyTimes}
  renderItem={(ctx) => (
    <div
      style={{
        position: "absolute",
        left: ctx.startX,
        top: ctx.top,
        width: Math.max(8, ctx.endX - ctx.startX),
        opacity: ctx.isDragging ? 0.6 : 1,
      }}
      onClick={ctx.select}
      {...ctx.moveHandleProps}
    >
      {ctx.item.label}
    </div>
  )}
/>
```

`ctx` extends `PositionedItem` (`item`, `row`, `top`, `startX`, `endX`, `isRange`, `isDragging`) with `select()`, `moveHandleProps`, `resizeStartHandleProps`, and `resizeEndHandleProps` — spread the handle props on whatever element should own that gesture.

## Headless: `useTimeline`

For full control over the DOM, skip `<Timeline>` entirely. The hook owns viewport state, zoom/pan gestures, stable packing, virtualization, and drag — and returns positions + prop getters; you render whatever you want:

```tsx
import { useTimeline } from "@mogiyoon/react-stable-timeline";

function MyTimeline({ items }) {
  const tl = useTimeline({ items, onItemMove: applyTimes });

  return (
    <div>
      <button onClick={tl.fit}>Fit</button>
      <button onClick={tl.zoomIn}>+</button>
      <button onClick={tl.zoomOut}>−</button>

      {/* the pannable / zoomable canvas */}
      <div {...tl.containerProps} style={{ position: "relative", height: 400, overflow: "hidden" }}>
        <span {...tl.probeProps} /> {/* lets labels measure with your real font */}

        {/* optional vertical scroll container — attach scrollRef to get row culling */}
        <div ref={tl.scrollRef} style={{ position: "absolute", inset: 0, overflowY: "auto" }}>
          <div style={{ position: "relative", height: tl.rowsHeight }}>
            {tl.visibleItems.map((p) => (
              <div
                key={p.item.id}
                {...tl.getMoveHandleProps(p.item.id)}
                style={{ position: "absolute", left: p.startX, top: p.top }}
              >
                {p.item.label}
              </div>
            ))}
          </div>
        </div>

        {/* axis from tl.ticks */}
        {tl.ticks.map((t) => (
          <span key={t.ms} style={{ position: "absolute", bottom: 0, left: tl.timeToPx(t.ms) }}>
            {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}
```

`useTimeline` accepts every logic prop of `<Timeline>` (viewport control, zoom options, drag callbacks, virtualization) plus `rowHeight` / `rowGap` for your own geometry. It returns the viewport (`viewportStart/End`, `pxPerMs`, `timeToPx`, `pxToTime`), layout (`visibleItems`, `rowOf`, `totalRows`, `rowsHeight`, `ticks`), actions (`setViewport`, `fit`, `zoomIn/Out`, `zoomPct`, `setZoomPct`), and drag state (`drag`, handle-prop getters).

## Virtualization

On by default. Items whose rendered extent — range bar **and** label overflow — falls outside the canvas plus `overscanPx` (default 200) are not rendered; rows outside the vertical scroll window are culled too. Positions are recomputed per pan/zoom frame from a pre-measured label cache, so the per-frame cost is arithmetic only. Set `virtualization={false}` to always render everything (e.g. for `window.print()`).

## Props

| Prop | Type | Default | |
|---|---|---|---|
| `items` | `TimelineItem<TData>[]` | — | Required. Each item needs `id`, `label`, `start` (ms). `end` is optional — omit for a point event. |
| `viewportStart` / `viewportEnd` | `number` | data fit window | Controlled mode when both supplied. |
| `onViewportChange` | `(s, e) => void` | — | Fires on every pan/zoom (controlled or not). |
| `cursorMs` | `number \| null` | `null` | Vertical cursor line in ms. |
| `onSelect` | `(item) => void` | — | Click or Enter/Space on an item. |
| `accentColor` | `string` | `#6c8cff` | Default color for dots / range bars / cursor. Per-item `color` overrides. |
| `labels` | `TimelineLabels` | English | Override toolbar / a11y labels (`fit`, `zoomIn`, `zoomOut`, `zoomRatio`, `empty`, `timeline`). |
| `hideToolbar` | `boolean` | `false` | Hide the top toolbar. |
| `zoomMinPct` / `zoomMaxPct` | `number` | `100` / `5000` | Zoom range relative to fit. Min cannot go below 100 — packing is computed at fit-zoom and would otherwise invalidate. |
| `zoomFactor` | `number` | `1.2` | Multiplier applied per zoom step — toolbar `+` / `−` buttons and each `⌘`/`Ctrl` + wheel tick. `1.2` = 20 % per step; `1.5` = chunkier; `1.05` = smoother. Must be > 1. |
| `zoomStable` | `boolean` | `false` | When `true`, freezes the row layout at fit-zoom so items never change rows at any zoom level. When `false`, rows recompute at the current zoom — items can collapse upward as zooming spreads them out. Panning is always stable regardless. |
| `zoomInputTypingCommit` | `"immediate" \| "blur"` | `"immediate"` | When the user **types** in the zoom % input, does each keystroke apply (`"immediate"`) or only the final value on blur / Enter (`"blur"`)? Mid-stroke values get clamped to `[zoomMinPct, zoomMaxPct]`, so typing `"15"` toward `"150"` with the default `zoomMinPct: 100` will visibly snap to 100 % until the third digit is typed. |
| `zoomInputSpinnerCommit` | `"immediate" \| "blur"` | `"immediate"` | When the user clicks the native ▲/▼ **spinner** inside the zoom % input, does it apply right away (`"immediate"`) or only on blur (`"blur"`)? |
| `onItemMove` | `(item, next) => void` | — | Enables move-dragging. Called on drop with the proposed `{ start, end }` — apply it to your data. |
| `onItemResize` | `(item, next) => void` | — | Enables edge resize handles on range items. Span clamps to ≥ 1 ms. |
| `dragSnapMs` | `number` | — | Snap dragged/resized edges to this grid (e.g. `3600_000` = 1 h). |
| `virtualization` | `boolean` | `true` | Cull items outside the viewport + overscan. |
| `overscanPx` | `number` | `200` | Extra px margin kept rendered around the viewport. |
| `renderItem` | `(ctx) => ReactNode` | built-in | Replace the item renderer — see [Custom item rendering](#custom-item-rendering). |
| `className` / `style` | — | — | Forwarded to the outer wrapper. |

## TimelineItem

```ts
interface TimelineItem<TData = unknown> {
  id: string;
  label: string;
  start: number;        // ms (Unix epoch)
  end?: number;         // ms; omit for point events
  color?: string;       // overrides accentColor for this item
  data?: TData;         // passed through to onSelect
}
```

## Interactions

- **Pan** — drag anywhere on the canvas with mouse or one finger (4 px mouse / 8 px touch threshold so taps still register as clicks).
- **Pan with trackpad** — two-finger horizontal scroll, or `Shift` + vertical wheel.
- **Zoom** — `⌘`/`Ctrl` + wheel, anchored at the cursor; on touch, two-finger pinch anchored at the midpoint. Toolbar `+` / `−` zoom around the center. The numeric input snaps to a percentage.
- **Fit** — toolbar button resets to the data's full extent + 5 % padding.
- **Select** — click an item, or focus + Enter/Space.
- **Move** — with `onItemMove`, drag an item horizontally (same 4 px threshold; a short drag is still a click), or focus it and press `←`/`→`.
- **Resize** — with `onItemResize`, drag either edge of a range item (`ew-resize` cursor zones over the end dots), or `Shift + ←/→` (end edge) / `Alt + ←/→` (start edge) on a focused item.

Keyboard steps use `dragSnapMs` when set, otherwise 1 % of the current viewport (so the step scales with zoom).

## Accessibility

- Every item is a focusable `role="button"` whose `aria-label` includes the dates (`"Alpha build, 2/20/2025 – 3/10/2025"`), so screen readers announce something meaningful instead of the bare label.
- The items area is a `role="group"` labelled with the **total** item count (`labels.timeline`, default `"Timeline"`) — with virtualization on, only ~200 items exist in the DOM, so this is how assistive tech learns the real dataset size.
- Move/resize have full keyboard parity (see Interactions above) — drag is never the only way.
- Focused items show a visible outline in the item's accent color (no `outline: none` traps).
- Axis ticks, grid lines, and the cursor line are `aria-hidden` — hundreds of tick labels would otherwise drown out the content.

## Why "stable"?

The same event landing on row 3 at one pan position and row 5 at another is what viewport-based stack algorithms produce — they recompute against viewport-relative pixel positions, so the visible items determine where everything lands.

This library runs first-fit packing over **all items** at once, so panning never changes anyone's row. Zoom is a separate axis: by default rows do recompute on zoom (items spread apart, so previously-stacked items can collapse upward) which is usually what you want. Pass `zoomStable` to lock rows at fit-zoom and keep them put across every zoom level too.

### Row packing algorithm

Pure first-fit interval partitioning. For each item sorted by `(start, label)`, compute its pixel footprint and place it on the lowest row whose previous occupant ended before this item's `startPx`.

```
sort items by (start, label)
rowEnds := []                                     // rightmost px occupied per row
for each item in sorted:
    startPx     = (item.start - minTime) * pxPerMs
    rangeEndPx  = item.range ? (item.end - minTime) * pxPerMs : startPx
    labelEndPx  = startPx + measureLabel(item.label) + 24
    endPx       = max(rangeEndPx, labelEndPx)

    row = first index i where rowEnds[i] <= startPx, or -1
    if row == -1:
        rowEnds.push(endPx)            // open a new row
        row = rowEnds.length - 1
    else:
        rowEnds[row] = endPx           // reuse the row
    rowOf[item.id] = row
```

The `+ 24` reserves the dot diameter plus breathing room so labels don't collide visually. Label width comes from `Canvas2D.measureText` — Hangul / CJK / mixed scripts measure correctly, whereas character-count estimates under-count Hangul by ~30 % and produce overlaps.

**Complexity.** Let `n` = item count, `R` = rows produced.

- Time: `O(n log n)` for the sort + `O(n · R)` for placement (linear scan of `rowEnds` per item). `R ≤ n` always, so worst case `O(n²)`; in practice `R` is small (10–50) and dominated by the sort term.
- Space: `O(n)` for `rowOf` + `O(R)` for `rowEnds`.

`packIntoRows(items, pxPerMs, measureLabel)` is exported so you can pre-compute layouts off-screen or in a worker.

### Tick selection algorithm

`pickTicks(viewportStart, viewportEnd, canvasPx)` picks the largest human-friendly step that still renders within a ~100 px spacing target (so ticks are at most ~100 px apart, with 1 hour as the floor). It walks a fixed ladder from largest to smallest:

```
10y → 5y → 2y → 1y → 6mo → 3mo → 1mo → 1w → 1d → 1h
```

Returns `{ step, format }`. Constant time — no allocations beyond the returned object. The 100 px target is generous so Korean year-month labels (`2025.06`) never crowd.

## License

MIT © mogiyoon
