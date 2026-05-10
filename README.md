# @mogiyoon/react-stable-timeline

A React timeline with **stable row packing** — events keep their row when you pan, instead of jumping around like other timeline libraries.

Most timeline libraries (`vis-timeline`, `react-calendar-timeline`, …) recompute their stack from whatever is currently visible, so the same event lands on row 3 at one pan position and row 1 at another. This library packs rows from the **full dataset**, so panning never reshuffles rows. Zooming optionally too — see `zoomStable`.

- **Pan-stable rows** — first-fit packing on the full data, not the viewport
- **Label-aware** — uses `Canvas2D.measureText`, so Hangul / CJK / mixed text measures correctly (per-character estimates under-count Hangul by ~30 %)
- **Optional zoom-stable mode** — `zoomStable` freezes the row layout at fit-zoom so rows never change at any zoom level
- **Photoshop-style zoom %** — 100 % = fit, up to 5000 %, anchored on viewport center
- **Trackpad-friendly** — two-finger horizontal scroll pans, ⌘/Ctrl + wheel zooms anchored at the cursor, drag-from-anywhere pans (with a click/drag threshold)
- **Range items** — bar with start + end dots; point items get a single dot
- **Zero CSS framework** — inline styles only, no Tailwind / styled-components / etc. required
- **Controlled or uncontrolled** — pass `viewportStart` / `viewportEnd` to drive externally, or let it manage itself

## Install

```bash
npm i @mogiyoon/react-stable-timeline
```

Peer deps: `react >= 18`, `react-dom >= 18`.

## Usage

A complete example with typed items, range bars, per-item colors, a selection state, and a "now" cursor:

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
    id: "launch",
    label: "Official launch 🚀",
    start: Date.parse("2025-09-12"),
    color: "#ef4444",
    data: { category: "milestone", description: "Press announcement + blog post" },
  },
];

export function App() {
  const [selected, setSelected] = useState<TimelineItem<EventMeta> | null>(null);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div
        style={{
          height: 420,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <Timeline<EventMeta>
          items={items}
          accentColor="#6c8cff"
          cursorMs={Date.now()}
          onSelect={setSelected}
        />
      </div>

      {selected && (
        <div style={{ marginTop: 16 }}>
          <strong>{selected.label}</strong> — {selected.data?.description}
        </div>
      )}
    </div>
  );
}
```

A runnable version of this example lives at [`react-stable-timeline-example`](../react-stable-timeline-example) (Vite + React 19 + TS, with localized toolbar labels and a detail panel).

### Minimal setup

If you just want to drop a timeline in:

```tsx
import { Timeline, type TimelineItem } from "@mogiyoon/react-stable-timeline";

const items: TimelineItem[] = [
  { id: "1", label: "Kickoff", start: Date.parse("2025-01-15") },
  {
    id: "2",
    label: "Beta",
    start: Date.parse("2025-04-01"),
    end: Date.parse("2025-06-30"),
  },
  { id: "3", label: "Launch", start: Date.parse("2025-09-12") },
];

<div style={{ height: 400 }}>
  <Timeline items={items} />
</div>;
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

## Props

| Prop | Type | Default | |
|---|---|---|---|
| `items` | `TimelineItem<TData>[]` | — | Required. Each item needs `id`, `label`, `start` (ms). `end` is optional — omit for a point event. |
| `viewportStart` / `viewportEnd` | `number` | data fit window | Controlled mode when both supplied. |
| `onViewportChange` | `(s, e) => void` | — | Fires on every pan/zoom (controlled or not). |
| `cursorMs` | `number \| null` | `null` | Vertical cursor line in ms. |
| `onSelect` | `(item) => void` | — | Click or Enter/Space on an item. |
| `accentColor` | `string` | `#6c8cff` | Default color for dots / range bars / cursor. Per-item `color` overrides. |
| `labels` | `TimelineLabels` | English | Override toolbar labels (`fit`, `zoomIn`, `zoomOut`, `zoomRatio`, `empty`). |
| `hideToolbar` | `boolean` | `false` | Hide the top toolbar. |
| `zoomMinPct` / `zoomMaxPct` | `number` | `100` / `5000` | Zoom range relative to fit. Min cannot go below 100 — packing is computed at fit-zoom and would otherwise invalidate. |
| `zoomStable` | `boolean` | `false` | When `true`, freezes the row layout at fit-zoom so items never change rows at any zoom level. When `false`, rows recompute at the current zoom — items can collapse upward as zooming spreads them out. Panning is always stable regardless. |
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

- **Pan** — drag anywhere on the canvas (4 px threshold so taps still register as clicks).
- **Pan with trackpad** — two-finger horizontal scroll, or `Shift` + vertical wheel.
- **Zoom** — `⌘`/`Ctrl` + wheel, anchored at the cursor. Toolbar `+` / `−` zoom around the center. The numeric input snaps to a percentage.
- **Fit** — toolbar button resets to the data's full extent + 5 % padding.
- **Select** — click an item, or focus + Enter/Space.

## Why "stable"?

The same event being on row 3 at one pan position and row 5 at another is what most stack algorithms do — they recompute against viewport-relative pixel positions, so the visible items determine where everything lands.

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

`pickTicks(viewportStart, viewportEnd, canvasPx)` picks the coarsest tick step whose pixel spacing is at least ~100 px. It walks a fixed ladder of human-friendly steps from largest to smallest:

```
10y → 5y → 2y → 1y → 6mo → 3mo → 1mo → 1w → 1d → 1h
```

Returns `{ step, format }`. Constant time — no allocations beyond the returned object. The 100 px target is generous so Korean year-month labels (`2025.06`) never crowd.

## License

MIT © mogiyoon
