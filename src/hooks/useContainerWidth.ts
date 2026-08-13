import { useEffect, useState, type RefObject } from "react";

export function useContainerWidth(
  ref: RefObject<HTMLElement | null>,
  // The element this ref points at may not exist on first mount (empty
  // state) — flip `attached` when it appears so the effect re-runs.
  attached = true,
  initial = 800,
): number {
  const [width, setWidth] = useState(initial);

  useEffect(() => {
    if (!attached) return;
    const node = ref.current;
    if (!node) return;
    const initialWidth = node.clientWidth;
    if (initialWidth > 0) setWidth(initialWidth);
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setWidth(w);
      }
    });
    obs.observe(node);
    return () => obs.disconnect();
  }, [ref, attached]);

  return width;
}
