import { canConsume } from "./gestureMath";

/** Uniform handle over "the thing a vertical gesture scrolls" — an
 *  element's scrollTop or the page. */
export interface Scroller {
  get(): number;
  set(pos: number): void;
  max(): number;
}

// `behavior: "instant"` sidesteps a `scroll-behavior: smooth` on the
// element/page — a finger-driven scroll must land exactly where the
// finger is, not animate towards it. Older WebKit throws on the enum
// value, hence the fallback.
const INSTANT: ScrollToOptions = { behavior: "instant" as ScrollBehavior };

export const elementScroller = (el: HTMLElement): Scroller => ({
  get: () => el.scrollTop,
  set: (pos) => {
    if (typeof el.scrollTo === "function") {
      try {
        el.scrollTo({ ...INSTANT, top: pos });
        return;
      } catch {
        /* fall through */
      }
    }
    el.scrollTop = pos;
  },
  max: () => el.scrollHeight - el.clientHeight,
});

const pageScroller = (): Scroller | null => {
  if (typeof document === "undefined") return null;
  const el = document.scrollingElement as HTMLElement | null;
  if (!el) return null;
  return {
    get: () => el.scrollTop,
    set: (pos) => {
      try {
        window.scrollTo({ ...INSTANT, left: window.scrollX, top: pos });
      } catch {
        window.scrollTo(window.scrollX, pos);
      }
    },
    max: () => el.scrollHeight - el.clientHeight,
  };
};

const isScrollable = (style: CSSStyleDeclaration): boolean => {
  const oy = style.overflowY;
  return oy === "auto" || oy === "scroll" || oy === "overlay";
};

/** `overscroll-behavior: contain | none` on a scroll container ends the
 *  chain there, like native scrolling. */
const containsOverscroll = (style: CSSStyleDeclaration): boolean => {
  const ob =
    style.overscrollBehaviorY ||
    (style as unknown as Record<string, string>).overscrollBehavior ||
    "";
  return ob === "contain" || ob === "none";
};

/** Pick the scroller for a gesture that asks for a scrollTop change of
 *  `wantDelta`: the timeline's own rows container first, then scrollable
 *  ancestors of the canvas (including `body` when it is the scroller),
 *  then the page — the first one that can still move that way. Stops at
 *  an `overscroll-behavior: contain` boundary. Mirrors native scroll
 *  chaining. */
export function findScroller(
  inner: HTMLElement | null,
  from: HTMLElement | null,
  wantDelta: number,
  /** `false` → only `inner` may take it (no chaining past the rows). */
  chain = true,
): Scroller | null {
  if (inner) {
    const s = elementScroller(inner);
    if (canConsume(wantDelta, s.get(), s.max())) return s;
    if (containsOverscroll(getComputedStyle(inner))) return null;
  }
  if (!chain) return null;
  let el: HTMLElement | null = from?.parentElement ?? null;
  const root = typeof document !== "undefined" ? document.documentElement : null;
  while (el && el !== root) {
    const style = getComputedStyle(el);
    if (isScrollable(style)) {
      const s = elementScroller(el);
      if (canConsume(wantDelta, s.get(), s.max())) return s;
      if (containsOverscroll(style)) return null;
    }
    el = el.parentElement;
  }
  const page = pageScroller();
  if (page && canConsume(wantDelta, page.get(), page.max())) return page;
  return null;
}
