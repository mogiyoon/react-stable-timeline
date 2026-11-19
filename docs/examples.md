# Examples

Start with the [quick start](../README.md#quick-start) for a complete component example. The snippets below show additional options; component snippets use `items` from your application state.

## Controlled viewport

Drive the viewport from outside (e.g. from a global time-bar):

```tsx
const [start, setStart] = useState(Date.parse("2025-01-01"));
const [end, setEnd] = useState(Date.parse("2026-01-01"));

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

While dragging, the item follows the cursor as a live preview (rows stay frozen); the callback fires once on drop. A drag under the 4 px mouse / 8 px touch threshold is treated as a click, so `onSelect` still works. Snapping aligns the *absolute* time of the dragged edge to the grid, so items land on round values. Resizes clamp the span to ≥ 1 ms.

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

`ctx` extends `PositionedItem` (`item`, `row`, `top`, `startX`, `endX`, `isRange`, `labelWidth`, `isDragging`) with `select()`, `moveHandleProps`, `resizeStartHandleProps`, `resizeEndHandleProps`, `moveBy(deltaMs)`, and `resizeBy(edge, deltaMs)` — spread the handle props on whatever element should own that gesture.

## Headless: `useTimeline`

For full control over the DOM, skip `<Timeline>` entirely. The hook owns viewport state, zoom/pan gestures, stable packing, virtualization, and drag — and returns positions + prop getters; you render whatever you want:

```tsx
import { useTimeline, type TimelineItem } from "@mogiyoon/react-stable-timeline";

function MyTimeline({ items }: { items: TimelineItem[] }) {
  const tl = useTimeline({ items });

  return (
    <div>
      <button onClick={tl.fit}>Fit</button>
      <button onClick={tl.zoomIn}>+</button>
      <button onClick={tl.zoomOut}>−</button>

      {/* the pannable / zoomable canvas — touch-action: none lets usePan own touch gestures */}
      <div {...tl.containerProps} style={{ position: "relative", height: 400, overflow: "hidden", touchAction: "none" }}>
        <span {...tl.probeProps} /> {/* lets labels measure with your real font */}

        {/* optional vertical scroll container — attach scrollRef (inside the canvas) to get
            row culling + touch scrolling; touch-action: none is applied to it for you */}
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

Custom renderers and headless UIs own focus, accessible names, selection, and keyboard handlers. Use `moveBy` / `resizeBy` in `renderItem`, or `moveItemBy` / `resizeItemBy` from the hook, to add keyboard editing. The built-in component provides these behaviors for its default items.

[Back to README](../README.md)
