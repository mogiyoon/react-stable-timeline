import { useEffect, useState, type RefObject } from "react";

export function useMeasuredFont(
  ref: RefObject<HTMLElement | null>,
  fallback = "11px sans-serif",
): string {
  const [font, setFont] = useState(fallback);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const computed = getComputedStyle(node).font;
    if (computed) setFont(computed);
  }, [ref]);

  return font;
}
