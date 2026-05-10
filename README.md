# @mogiyoon/react-stable-timeline

A React timeline where **items never jump rows** when you pan or zoom.

Most timeline libraries (`vis-timeline`, `react-calendar-timeline`, …) recompute their stack on every viewport change, so the same event lands in different rows depending on what's on screen. This one packs rows once from the full dataset and keeps them put.

- **Stable rows** — first-fit packing on the full data, not the viewport
- **Label-aware** — uses `Canvas2D.measureText`, so Hangul / CJK / mixed text measures correctly (per-character estimates under-count Hangul by ~30 %)
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

```tsx
import { Timeline, type TimelineItem } from "@mogiyoon/react-stable-timeline";

const items: TimelineItem[] = [
  { id: "1", label: "프로젝트 시작", start: Date.parse("2025-01-15") },
  {
    id: "2",
    label: "베타 릴리즈",
    start: Date.parse("2025-04-01"),
    end: Date.parse("2025-06-30"),
  },
  { id: "3", label: "정식 출시", start: Date.parse("2025-09-12") },
];

export function App() {
  return (
    <div style={{ height: 400 }}>
      <Timeline
        items={items}
        accentColor="#6c8cff"
        onSelect={(item) => console.log("clicked", item)}
      />
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

Imagine the same event being on row 3 at one zoom level, row 5 at another, and row 1 if you pan slightly. That's what most stack algorithms do — they recompute against viewport-relative pixel positions. With this library, every item gets a row index from the full dataset's pixel layout at fit-zoom, and that index never changes. Zooming in only widens the gap between same-row items; zooming out is capped at fit so widths stay valid.

## License

MIT © mogiyoon
