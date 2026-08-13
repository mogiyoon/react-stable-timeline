// SSR-shaped rendering tests: renderToString runs the full component
// tree in Node with no DOM, which pins down both server-rendering
// safety and the virtualization culling decisions.
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { Timeline, useTimeline } from "../src";
import type { TimelineItem } from "../src";

const items: TimelineItem[] = [
  { id: "a", label: "알파 이벤트", start: 1_000, end: 500_000 },
  { id: "b", label: "beta", start: 2_000 },
  { id: "c", label: "감마 릴리즈", start: 300_000, end: 900_000 },
];

describe("Timeline SSR", () => {
  it("renders item labels on the server", () => {
    const html = renderToString(
      <Timeline items={items} onItemMove={() => {}} onItemResize={() => {}} />,
    );
    expect(html).toContain("알파 이벤트");
    expect(html).toContain("beta");
  });

  it("renders the empty state", () => {
    const html = renderToString(<Timeline items={[]} />);
    expect(html).toContain("No events");
  });

  it("labels the items area with the total count", () => {
    const html = renderToString(<Timeline items={items} />);
    expect(html).toContain("Timeline (3)");
  });

  it("gives items a date-carrying aria-label", () => {
    const html = renderToString(<Timeline items={items} />);
    expect(html).toMatch(/aria-label="beta, [^"]+"/);
  });
});

describe("virtualization", () => {
  const vp = { viewportStart: 0, viewportEnd: 2_000 };
  const withFar: TimelineItem[] = [
    { id: "near", label: "NEAR_ITEM", start: 500 },
    { id: "far", label: "FAR_ITEM", start: 10_000_000_000 },
  ];

  it("culls items far outside the viewport", () => {
    const html = renderToString(<Timeline items={withFar} {...vp} />);
    expect(html).toContain("NEAR_ITEM");
    expect(html).not.toContain("FAR_ITEM");
  });

  it("renders everything when disabled", () => {
    const html = renderToString(
      <Timeline items={withFar} {...vp} virtualization={false} />,
    );
    expect(html).toContain("NEAR_ITEM");
    expect(html).toContain("FAR_ITEM");
  });

  it("keeps an item whose label overflows into the viewport", () => {
    // starts left of the viewport, but the range bar reaches into it
    const html = renderToString(
      <Timeline
        items={[{ id: "edge", label: "EDGE_ITEM", start: -50_000, end: 1_000 }]}
        {...vp}
      />,
    );
    expect(html).toContain("EDGE_ITEM");
  });
});

describe("useTimeline (headless)", () => {
  function Headless() {
    const tl = useTimeline({ items });
    return (
      <div {...tl.containerProps}>
        <span {...tl.probeProps} />
        {tl.visibleItems.map((p) => (
          <i key={p.item.id} data-x={Math.round(p.startX)} data-row={p.row}>
            {p.item.label}
          </i>
        ))}
      </div>
    );
  }

  it("provides positioned items with no DOM available", () => {
    const html = renderToString(<Headless />);
    expect(html).toContain("beta");
    expect(html).toMatch(/data-x="-?\d+"/);
  });

  it("renders custom items through renderItem", () => {
    const html = renderToString(
      <Timeline
        items={items}
        renderItem={(ctx) => (
          <b style={{ position: "absolute", left: ctx.startX, top: ctx.top }}>
            CUSTOM_{ctx.item.label}
          </b>
        )}
      />,
    );
    // React SSR may emit a `<!-- -->` between adjacent text nodes
    expect(html).toMatch(/CUSTOM_(<!-- -->)?beta/);
  });
});
