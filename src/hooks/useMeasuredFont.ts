import { useEffect, useState, type RefObject } from "react";

export function useMeasuredFont(
  ref: RefObject<HTMLElement | null>,
  // See useContainerWidth: re-run when the probe element first mounts.
  attached = true,
  fallback = "11px sans-serif",
): string {
  const [font, setFont] = useState(fallback);

  useEffect(() => {
    if (!attached) return;
    const node = ref.current;
    if (!node) return;
    const computed = getComputedStyle(node).font;
    if (computed) setFont(computed);
  }, [ref, attached]);

  return font;
}
