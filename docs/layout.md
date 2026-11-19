# Stable row packing

The same event landing on row 3 at one pan position and row 5 at another is what viewport-based stack algorithms produce — they recompute against viewport-relative pixel positions, so the visible items determine where everything lands.

This library runs first-fit packing over **all items** at once, so panning never changes anyone's row. Zoom is a separate axis: by default rows do recompute on zoom (items spread apart, so previously-stacked items can collapse upward) which is usually what you want. Pass `zoomStable` to lock rows at fit-zoom and keep them put across every zoom level too.

## Row packing algorithm

Pure first-fit interval partitioning. For each item sorted by `(start, label)`, compute its pixel footprint and place it on the lowest row whose previous occupant ended before this item's `startPx`.

```
sort items by (start, label)
rowEnds := []                                     // rightmost px occupied per row
for each item in sorted:
    startPx     = (item.start - minTime) * pxPerMs
    rangeEndPx  = item.range ? (item.end - minTime) * pxPerMs : startPx
    labelEndPx  = startPx + measureLabel(item.label) + 24
    endPx       = max(rangeEndPx, labelEndPx)

    row = leftmost index i where rowEnds[i] <= startPx, or -1
    if row == -1:
        row = open a new row
    rowEnds[row] = endPx
    rowOf[item.id] = row
```

The `leftmost index` lookup runs on a min-segment tree over `rowEnds` (descend left whenever the left subtree's minimum fits). The tree reserves capacity for all input items, so each placement costs `O(log n)` while producing exactly the same layout as a linear first-fit scan.

The `+ 24` reserves the dot diameter plus breathing room so labels don't collide visually. Label width comes from `Canvas2D.measureText` — Hangul / CJK / mixed scripts use their measured widths instead of character-count estimates. Server rendering falls back to an estimate when Canvas2D is unavailable.

**Complexity.** Let `n` = item count, `R` = rows produced.

- Time: `O(n log n)` — the sort plus one segment-tree query/update per item. A linear scan would be `O(n · R)`, degrading to `O(n²)` when every item overlaps.
- Space: `O(n)` overall for the sorted copy, `rowOf`, and the tree. The current tree reserves capacity for up to `n` rows.

`packIntoRows(items, pxPerMs, measureLabel)` is exported so you can pre-compute layouts off-screen or in a worker. Each input needs `id`, `label`, `start`, `end`, and `isRange`; use `end: start` and `isRange: false` for a point event. Supply a label measurer when running outside the browser.

## Tick selection algorithm

`pickTicks(viewportStart, viewportEnd, canvasPx)` picks the largest human-friendly step no greater than a roughly 100 px spacing target, with 1 hour as the minimum interval. It walks a fixed ladder from largest to smallest:

```
10y → 5y → 2y → 1y → 6mo → 3mo → 1mo → 1w → 1d → 1h
```

Returns `{ step, format }`. Constant time over a fixed set of intervals. The formatter uses year, year-month, month-day or hour-minute labels depending on the interval.

[Back to README](../README.md)
