<h1 align="center">react-stable-timeline</h1>
<h3 align="center">Keep events in place as you explore time.</h3>

**A React timeline that keeps events on the same row while you pan.**

Show milestones and date ranges, explore them with mouse or touch, and let users move or resize events.
Rows are packed from the full dataset, so moving the viewport keeps the layout steady. Enable `zoomStable` to keep rows fixed while zooming too.

| Entry point | What it does |
|---|---|
| `<Timeline>` | Render a timeline with a toolbar, date axis, pan, zoom and keyboard controls |
| `renderItem` | Draw your own items inside the built-in timeline |
| `useTimeline()` | Build a custom UI with the same layout, viewport and gesture engine |

## Install

```sh
npm install @mogiyoon/react-stable-timeline
```

Requires React 18+ and React DOM 18+. Includes TypeScript types and uses inline styles, so no stylesheet or CSS framework is required.

## Quick start

```tsx
import { Timeline, type TimelineItem } from "@mogiyoon/react-stable-timeline";

const items: TimelineItem[] = [
  {
    id: "kickoff",
    label: "Project kickoff",
    start: Date.parse("2025-01-15"),
    color: "#f59e0b",
  },
  {
    id: "beta",
    label: "Beta testing",
    start: Date.parse("2025-04-01"),
    end: Date.parse("2025-06-30"),
    color: "#10b981",
  },
];

export function App() {
  return (
    <div style={{ height: 400 }}>
      <Timeline
        items={items}
        onSelect={(item) => console.log(item)}
      />
    </div>
  );
}
```

Give the wrapper a height. Times are Unix epoch milliseconds; omit `end` for a point event, or add it for a range. The timeline initially fits all items and manages its own viewport.

For Next.js App Router, use this example in a Client Component with `"use client"`. The package supports server rendering and falls back to estimated label widths when Canvas2D is unavailable.

## The timeline

<img width="640" height="369" alt="React timeline with labeled events and date ranges" src="https://github.com/user-attachments/assets/1f01199a-fae6-4d7e-aa35-1540402d43c8" />

Drag the canvas or scroll horizontally to pan. Use `⌘`/`Ctrl` + wheel to zoom at the cursor, or pinch on touch screens. The toolbar fits all events and adjusts zoom from 100% (fit) to 5000% by default.

The built-in renderer supports keyboard selection, moving and resizing. Labels are measured with Canvas2D to handle Hangul, CJK and mixed text. Horizontal and vertical virtualization render visible items with overscan.

## Move and resize events

Pass callbacks to enable editing, then apply the proposed times to your state:

```tsx
import { useState } from "react";
import {
  Timeline,
  type TimelineItem,
  type TimeRange,
} from "@mogiyoon/react-stable-timeline";

export function EditableTimeline({ initialItems }: { initialItems: TimelineItem[] }) {
  const [items, setItems] = useState(initialItems);

  function applyTimes(item: TimelineItem, next: TimeRange) {
    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id
          ? {
              ...entry,
              start: next.start,
              end: entry.end !== undefined ? next.end : undefined,
            }
          : entry,
      ),
    );
  }

  return (
    <div style={{ height: 400 }}>
      <Timeline
        items={items}
        onItemMove={applyTimes}
        onItemResize={applyTimes}
        dragSnapMs={60 * 60 * 1000}
      />
    </div>
  );
}
```

The timeline previews the edit and calls back on drop. `dragSnapMs` snaps edits to an hourly grid here. Your application owns the data and commits each change.

## Why "stable"?

Packing only the visible events can move an event to a different row each time you pan. This library packs all items together, including their label widths, so panning preserves each event's row.

Zooming recomputes rows by default, allowing events to share rows as space opens up. Pass `zoomStable` to pack at fit zoom and keep the same rows across zoom levels. See [how row packing works](docs/layout.md).

## Documentation

<a id="usage"></a><a id="controlled-viewport"></a><a id="drag--drop"></a>
<a id="custom-item-rendering"></a><a id="headless-usetimeline"></a>
<a id="virtualization"></a><a id="props"></a><a id="timelineitem"></a>
<a id="interactions"></a><a id="accessibility"></a>
<a id="row-packing-algorithm"></a><a id="tick-selection-algorithm"></a>

| Guide | Covers |
|---|---|
| [Examples](docs/examples.md) | Controlled viewport, drag and drop, custom item rendering and headless UI |
| [API reference](docs/api.md) | Props, item types, virtualization, interactions and accessibility |
| [Layout](docs/layout.md) | Stable row packing, label measurement, complexity and tick selection |
| [Demo source](demo/main.tsx) | A complete application with event selection and editing |

To work on the library locally, run `npm install`, then `npm run typecheck`, `npm test` and `npm run build`. Run `npm run demo` to serve the demo at `http://localhost:5173`.

## License

[MIT](LICENSE) © mogiyoon
