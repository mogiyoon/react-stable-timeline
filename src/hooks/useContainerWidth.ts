import { useEffect, useState, type RefObject } from "react";

export function useContainerWidth(
  ref: RefObject<HTMLElement | null>,
  initial = 800,
): number {
  const [width, setWidth] = useState(initial);

  useEffect(() => {
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
  }, [ref]);

  return width;
}
