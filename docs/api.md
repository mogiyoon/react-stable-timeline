# API reference

Times are Unix epoch milliseconds. The accessibility and keyboard behavior below describe the built-in item renderer. For a custom UI, see the [rendering examples](examples.md#custom-item-rendering).

## Virtualization

On by default. Items whose rendered extent — range bar **and** label overflow — falls outside the canvas plus `overscanPx` (default 200) are not rendered; rows outside the vertical scroll window are culled too. Positions are recomputed per pan/zoom frame from a pre-measured label cache, so the per-frame cost is arithmetic only. Set `virtualization={false}` to always render everything (e.g. for `window.print()`).

## Props

| Prop | Type | Default | Description |
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
| `renderItem` | `(ctx) => ReactNode` | built-in | Replace the item renderer — see [Custom item rendering](examples.md#custom-item-rendering). |
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

- **Pan** — drag anywhere on the canvas with mouse or one finger (4 px mouse / 8 px touch threshold so taps still register as clicks). On touch the same finger also scrolls the rows vertically (each axis engages once it moves 8 px; engaged axes fling on release) — the canvas and the rows scroll container are `touch-action: none`, so the browser never takes the gesture over mid-pan.
- **Pan with trackpad** — two-finger horizontal scroll, or `Shift` + vertical wheel. Vertical wheel scrolls the rows natively; a swipe that turns from horizontal to vertical keeps working (mixed events apply both axes).
- **Zoom** — `⌘`/`Ctrl` + wheel, anchored at the cursor; on touch, two-finger pinch anchored at the midpoint. Toolbar `+` / `−` zoom around the center. The numeric input snaps to a percentage.
- **Fit** — toolbar button resets to the data's full extent + 5 % padding.
- **Select** — click an item, or focus + Enter/Space.
- **Move** — with `onItemMove`, drag an item horizontally (4 px mouse / 8 px touch threshold; a short drag is still a click), or focus it and press `←`/`→`.
- **Resize** — with `onItemResize`, drag either edge of a range item (`ew-resize` cursor zones over the end dots), or `Shift + ←/→` (end edge) / `Alt + ←/→` (start edge) on a focused item.

Keyboard steps use `dragSnapMs` when set, otherwise 1 % of the current viewport (so the step scales with zoom).

## Accessibility

- Every item is a focusable `role="button"` whose `aria-label` includes the dates (`"Alpha build, 2/20/2025 – 3/10/2025"`), so screen readers announce something meaningful instead of the bare label.
- The items area is a `role="group"` labelled with the **total** item count (`labels.timeline`, default `"Timeline"`) — with virtualization on, the DOM contains only the visible items and overscan, so this is how assistive tech learns the real dataset size.
- Move/resize have full keyboard parity (see Interactions above) — drag is never the only way.
- Focused items show a visible outline in the item's accent color (no `outline: none` traps).
- Axis ticks, grid lines, and the cursor line are `aria-hidden` — hundreds of tick labels would otherwise drown out the content.

[Back to README](../README.md)
