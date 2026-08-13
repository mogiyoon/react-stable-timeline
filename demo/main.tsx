import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import {
  Timeline,
  useTimeline,
  type TimeRange,
  type TimelineItem,
} from "../src";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

const initialItems: TimelineItem[] = [
  { id: "kickoff", label: "Project kickoff", start: Date.parse("2025-01-15"), color: "#f59e0b" },
  { id: "alpha", label: "Alpha build", start: Date.parse("2025-02-20"), end: Date.parse("2025-03-10") },
  { id: "beta", label: "베타 릴리즈", start: Date.parse("2025-04-01"), end: Date.parse("2025-06-30"), color: "#10b981" },
  { id: "infra", label: "인프라 마이그레이션", start: Date.parse("2025-05-12"), end: Date.parse("2025-05-19") },
  { id: "launch", label: "공식 런칭 🚀", start: Date.parse("2025-09-12"), color: "#ef4444" },
  { id: "retro", label: "Launch retrospective", start: Date.parse("2025-09-30") },
  { id: "v2", label: "v2 planning", start: Date.parse("2025-10-10"), end: Date.parse("2025-12-20"), color: "#8b5cf6" },
];

function useApplyTimes(
  setItems: React.Dispatch<React.SetStateAction<TimelineItem[]>>,
) {
  return useCallback(
    (item: TimelineItem, next: TimeRange) => {
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                start: next.start,
                end: it.end !== undefined ? next.end : undefined,
              }
            : it,
        ),
      );
    },
    [setItems],
  );
}

function Card({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 17 }}>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

const fmt = (ms: number) =>
  new Date(ms).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });

function PlaygroundDemo() {
  const [items, setItems] = useState(initialItems);
  const [snap, setSnap] = useState(DAY);
  const [zoomStable, setZoomStable] = useState(false);
  const [selected, setSelected] = useState<TimelineItem | null>(null);
  const apply = useApplyTimes(setItems);
  const shown = selected ? items.find((i) => i.id === selected.id) : null;

  return (
    <Card
      title="1. Drag & Drop"
      aside={
        <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#475569", alignItems: "center" }}>
          <label>
            스냅{" "}
            <select value={snap} onChange={(e) => setSnap(Number(e.target.value))}>
              <option value={0}>없음</option>
              <option value={HOUR}>1시간</option>
              <option value={DAY}>1일</option>
              <option value={7 * DAY}>1주</option>
            </select>
          </label>
          <label>
            <input type="checkbox" checked={zoomStable} onChange={(e) => setZoomStable(e.target.checked)} /> zoomStable
          </label>
          <span>아이템 드래그 = 이동 · 막대 양끝 = 리사이즈 · 클릭 = 선택</span>
        </div>
      }
    >
      <div style={{ height: 300, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
        <Timeline
          items={items}
          onItemMove={apply}
          onItemResize={apply}
          dragSnapMs={snap || undefined}
          zoomStable={zoomStable}
          onSelect={setSelected}
          cursorMs={Date.now()}
        />
      </div>
      <div style={{ fontSize: 13, color: "#334155", minHeight: 20 }}>
        {shown ? (
          <>
            <b>{shown.label}</b> — {fmt(shown.start)}
            {shown.end !== undefined && ` ~ ${fmt(shown.end)}`}
          </>
        ) : (
          "아이템을 클릭하면 여기에 시간이 표시됩니다 (드래그 후 값이 바뀌는지 확인해보세요)."
        )}
      </div>
    </Card>
  );
}

function makeBigItems(count: number): TimelineItem[] {
  const out: TimelineItem[] = [];
  const base = Date.parse("2024-01-01");
  for (let i = 0; i < count; i++) {
    const start = base + i * HOUR * 1.3;
    if (i % 3 === 0) out.push({ id: "b" + i, label: "이벤트 " + i, start, end: start + 5 * HOUR });
    else out.push({ id: "b" + i, label: "evt " + i, start });
  }
  return out;
}

function VirtualizationDemo() {
  const [count, setCount] = useState(20000);
  const [virtualization, setVirtualization] = useState(true);
  const [items, setItems] = useState(() => makeBigItems(20000));
  const apply = useApplyTimes(setItems);
  useEffect(() => setItems(makeBigItems(count)), [count]);

  const boxRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setRendered(boxRef.current?.querySelectorAll("[title]").length ?? 0);
    }, 500);
    return () => clearInterval(t);
  }, []);

  return (
    <Card
      title="2. Virtualization"
      aside={
        <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#475569", alignItems: "center" }}>
          <label>
            아이템 수{" "}
            <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
              <option value={1000}>1,000</option>
              <option value={5000}>5,000</option>
              <option value={20000}>20,000</option>
              <option value={50000}>50,000</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={virtualization}
              onChange={(e) => setVirtualization(e.target.checked)}
            />{" "}
            virtualization
          </label>
          <b style={{ color: "#0f766e" }}>
            DOM 렌더링: {rendered.toLocaleString()} / {count.toLocaleString()}
          </b>
        </div>
      }
    >
      <div
        ref={boxRef}
        style={{ height: 260, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}
      >
        <Timeline items={items} virtualization={virtualization} onItemMove={apply} />
      </div>
    </Card>
  );
}

function HeadlessDemo() {
  const tl = useTimeline({ items: initialItems });
  return (
    <Card title="3. Headless useTimeline — 커스텀 UI (팬/줌 동작)">
      <div
        {...tl.containerProps}
        style={{
          position: "relative",
          height: 140,
          overflow: "hidden",
          background: "#0f172a",
          borderRadius: 10,
          cursor: "grab",
          userSelect: "none",
        }}
      >
        <span {...tl.probeProps} />
        {tl.visibleItems.map((p) => (
          <div
            key={p.item.id}
            style={{
              position: "absolute",
              left: p.startX,
              top: 12 + p.top,
              fontSize: 11,
              color: "#e2e8f0",
              background: p.item.color ?? "#334155",
              padding: "2px 8px",
              borderRadius: 10,
              whiteSpace: "nowrap",
            }}
          >
            {p.item.label}
            {p.isRange && (
              <span style={{ opacity: 0.7 }}> · {Math.round((p.endX - p.startX) / tl.pxPerMs / DAY)}d</span>
            )}
          </div>
        ))}
        {tl.ticks
          .filter((t) => {
            const x = tl.timeToPx(t.ms);
            return x >= 0 && x <= tl.canvasPx;
          })
          .map((t) => (
            <span
              key={t.ms}
              style={{ position: "absolute", bottom: 4, left: tl.timeToPx(t.ms), fontSize: 10, color: "#64748b" }}
            >
              {t.label}
            </span>
          ))}
      </div>
    </Card>
  );
}

function App() {
  return (
    <div style={{ padding: 24, maxWidth: 1150, margin: "0 auto", display: "grid", gap: 28 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22 }}>react-stable-timeline playground</h1>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
          팬: 드래그 / 두 손가락 가로 스크롤 · 줌: ⌘/Ctrl + 휠 · <code>src/</code>를 수정하고 새로고침하면 반영됩니다
        </p>
      </div>
      <PlaygroundDemo />
      <VirtualizationDemo />
      <HeadlessDemo />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
