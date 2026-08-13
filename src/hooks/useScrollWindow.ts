import { useEffect, useState, type RefObject } from "react";

export interface ScrollWindow {
  scrollTop: number;
  /** `Infinity` until the scroll container is attached and measured. */
  height: number;
}

const UNMEASURED: ScrollWindow = { scrollTop: 0, height: Infinity };

/** Track a scroll container's scrollTop + client height so rows outside
 *  the visible band can be culled. `enabled` doubles as a re-attach
 *  trigger: pass `virtualization && items.length > 0` so the effect
 *  re-runs when the container first mounts. */
export function useScrollWindow(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
): ScrollWindow {
  const [win, setWin] = useState<ScrollWindow>(UNMEASURED);

  useEffect(() => {
    if (!enabled) {
      setWin(UNMEASURED);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const update = () => {
      setWin((prev) => {
        const next = {
          scrollTop: node.scrollTop,
          height: node.clientHeight || Infinity,
        };
        return prev.scrollTop === next.scrollTop && prev.height === next.height
          ? prev
          : next;
      });
    };
    update();
    node.addEventListener("scroll", update, { passive: true });
    const obs = new ResizeObserver(update);
    obs.observe(node);
    return () => {
      node.removeEventListener("scroll", update);
      obs.disconnect();
    };
  }, [ref, enabled]);

  return win;
}
