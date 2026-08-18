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

const makeItems = (): TimelineItem[] => [
  { id: "kickoff", label: "Project kickoff", start: Date.parse("2025-01-15"), color: "#f59e0b" },
  { id: "alpha", label: "Alpha build", start: Date.parse("2025-02-20"), end: Date.parse("2025-03-10") },
  { id: "beta", label: "베타 릴리즈", start: Date.parse("2025-04-01"), end: Date.parse("2025-06-30"), color: "#10b981" },
  { id: "infra", label: "인프라 마이그레이션", start: Date.parse("2025-05-12"), end: Date.parse("2025-05-19") },
  { id: "launch", label: "공식 런칭 🚀", start: Date.parse("2025-09-12"), color: "#ef4444" },
  { id: "retro", label: "Launch retrospective", start: Date.parse("2025-09-30") },
  { id: "v2", label: "v2 planning", start: Date.parse("2025-10-10"), end: Date.parse("2025-12-20"), color: "#8b5cf6" },
];

const fmt = (ms: number) =>
  new Date(ms).toLocaleDateString("ko-KR", { year: "2-digit", month: "short", day: "numeric" });

function useItemsWithLog() {
  const [items, setItems] = useState(makeItems);
  const [log, setLog] = useState<string[]>([]);
  const push = useCallback((msg: string) => {
    setLog((prev) => [`${new Date().toLocaleTimeString("ko-KR")} · ${msg}`, ...prev].slice(0, 6));
  }, []);
  const onMove = useCallback(
    (item: TimelineItem, next: TimeRange) => {
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, start: next.start, end: it.end !== undefined ? next.end : undefined }
            : it,
        ),
      );
      push(`이동: ${item.label} → ${fmt(next.start)}`);
    },
    [push],
  );
  const onResize = useCallback(
    (item: TimelineItem, next: TimeRange) => {
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, start: next.start, end: next.end } : it,
        ),
      );
      push(`리사이즈: ${item.label} → ${fmt(next.start)} ~ ${fmt(next.end)}`);
    },
    [push],
  );
  const onSelect = useCallback(
    (item: TimelineItem) => push(`선택: ${item.label}`),
    [push],
  );
  return { items, onMove, onResize, onSelect, log, push };
}

// ---------------------------------------------------------------- UI --

function Section({
  no,
  title,
  checks,
  controls,
  children,
}: {
  no: number;
  title: string;
  checks: string[];
  controls?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section style={{ display: "grid", gap: 8, borderTop: "2px solid #e2e8f0", paddingTop: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 17 }}>{no}. {title}</h2>
        {controls}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "#64748b", lineHeight: 1.7 }}>
        {checks.map((c, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: c }} />
        ))}
      </ul>
      {children}
    </section>
  );
}

const boxStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  background: "#fff",
} as const;

function LogPanel({ log }: { log: string[] }) {
  return (
    <div style={{ fontSize: 12, color: "#334155", background: "#f1f5f9", borderRadius: 8, padding: "6px 10px", minHeight: 24 }}>
      {log.length === 0 ? "이벤트 로그 — 조작하면 여기에 찍힙니다" : log.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  );
}

const selStyle = { fontSize: 12 } as const;
const ctlStyle = { display: "flex", gap: 14, fontSize: 12.5, color: "#475569", alignItems: "center", flexWrap: "wrap" } as const;

// ------------------------------------------------------- 1. 통합 --

function FullDemo() {
  const { items, onMove, onResize, onSelect, log } = useItemsWithLog();
  return (
    <Section
      no={1}
      title="전체 통합 — 모든 기능 켜짐"
      checks={[
        "드래그로 <b>팬</b>, ⌘/Ctrl+휠로 <b>줌</b>(커서 기준), 트랙패드 두 손가락 가로 스크롤",
        "아이템 <b>드래그 = 이동</b>(1일 스냅) · 막대 <b>양끝 = 리사이즈</b> · 짧은 클릭 = 선택",
        "팬/줌/드래그 중 아이템이 <b>다른 행으로 튀지 않는지</b> (stable packing)",
        "빨간 세로선 = <code>cursorMs</code>(현재 시각)",
        "<b>터치</b>: 한 손가락 가로 = 팬, 세로 = 행 스크롤, 놓으면 양쪽 다 관성, 두 손가락 = 핀치 줌",
      ]}
    >
      <div style={{ height: 280, ...boxStyle }}>
        <Timeline
          items={items}
          onItemMove={onMove}
          onItemResize={onResize}
          onSelect={onSelect}
          dragSnapMs={DAY}
          cursorMs={Date.now()}
        />
      </div>
      <LogPanel log={log} />
    </Section>
  );
}

// ------------------------------------------------------- 2. Zoom/Pan --

function ZoomDemo() {
  const [zoomStable, setZoomStable] = useState(false);
  const [zoomFactor, setZoomFactor] = useState(1.2);
  const [typing, setTyping] = useState<"immediate" | "blur">("immediate");
  const [spinner, setSpinner] = useState<"immediate" | "blur">("immediate");
  const items = useMemo(makeItems, []);
  return (
    <Section
      no={2}
      title="Zoom / Pan 옵션"
      controls={
        <div style={ctlStyle}>
          <label><input type="checkbox" checked={zoomStable} onChange={(e) => setZoomStable(e.target.checked)} /> zoomStable</label>
          <label>zoomFactor{" "}
            <select style={selStyle} value={zoomFactor} onChange={(e) => setZoomFactor(Number(e.target.value))}>
              <option value={1.05}>1.05 (부드럽게)</option>
              <option value={1.2}>1.2 (기본)</option>
              <option value={1.5}>1.5 (큼직하게)</option>
            </select>
          </label>
          <label>입력 커밋{" "}
            <select style={selStyle} value={typing} onChange={(e) => setTyping(e.target.value as never)}>
              <option value="immediate">타이핑: immediate</option>
              <option value="blur">타이핑: blur</option>
            </select>
          </label>
          <select style={selStyle} value={spinner} onChange={(e) => setSpinner(e.target.value as never)}>
            <option value="immediate">스피너: immediate</option>
            <option value="blur">스피너: blur</option>
          </select>
        </div>
      }
      checks={[
        "<b>zoomStable off</b>(기본): 줌인하면 겹쳤던 아이템이 위 행으로 올라옴 / <b>on</b>: 어떤 줌에서도 행 고정",
        "zoomFactor 바꾸고 +/− 버튼·⌘휠 한 칸의 줌 폭 차이 확인",
        "줌 % 입력창에서 타이핑/스피너 커밋 모드(immediate vs blur) 차이 확인",
        "Fit 버튼 = 전체 데이터 + 5% 여백으로 복귀",
      ]}
    >
      <div style={{ height: 240, ...boxStyle }}>
        <Timeline items={items} zoomStable={zoomStable} zoomFactor={zoomFactor}
          zoomInputTypingCommit={typing} zoomInputSpinnerCommit={spinner} />
      </div>
    </Section>
  );
}

// ------------------------------------------------------- 3. DnD --

function DndDemo() {
  const { items, onMove, onResize, onSelect, log } = useItemsWithLog();
  const [snap, setSnap] = useState(DAY);
  const [move, setMove] = useState(true);
  const [resize, setResize] = useState(true);
  return (
    <Section
      no={3}
      title="Drag & Drop"
      controls={
        <div style={ctlStyle}>
          <label><input type="checkbox" checked={move} onChange={(e) => setMove(e.target.checked)} /> onItemMove</label>
          <label><input type="checkbox" checked={resize} onChange={(e) => setResize(e.target.checked)} /> onItemResize</label>
          <label>스냅{" "}
            <select style={selStyle} value={snap} onChange={(e) => setSnap(Number(e.target.value))}>
              <option value={0}>없음</option>
              <option value={HOUR}>1시간</option>
              <option value={DAY}>1일</option>
              <option value={7 * DAY}>1주</option>
            </select>
          </label>
        </div>
      }
      checks={[
        "onItemMove를 끄면 드래그가 <b>팬으로 동작</b>하는지 (핸들 비활성화)",
        "onItemResize를 끄면 양끝 리사이즈 존이 사라지는지",
        "스냅 1일: 드롭한 날짜가 항상 자정 정각인지 (로그로 확인)",
        "드래그 중 반투명 프리뷰 + 행 고정, 드롭 후 로그에 새 시간 기록",
        "리사이즈로 시작이 끝을 넘어가지 않는지 (1ms 클램프)",
      ]}
    >
      <div style={{ height: 260, ...boxStyle }}>
        <Timeline items={items}
          onItemMove={move ? onMove : undefined}
          onItemResize={resize ? onResize : undefined}
          onSelect={onSelect}
          dragSnapMs={snap || undefined} />
      </div>
      <LogPanel log={log} />
    </Section>
  );
}

// ------------------------------------------------- 4. Virtualization --

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

function VirtDemo() {
  const [count, setCount] = useState(20000);
  const [on, setOn] = useState(true);
  const [overscan, setOverscan] = useState(200);
  const items = useMemo(() => makeBigItems(count), [count]);
  const boxRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setRendered(boxRef.current?.querySelectorAll("[title]").length ?? 0);
    }, 500);
    return () => clearInterval(t);
  }, []);
  return (
    <Section
      no={4}
      title="Virtualization"
      controls={
        <div style={ctlStyle}>
          <label>아이템{" "}
            <select style={selStyle} value={count} onChange={(e) => setCount(Number(e.target.value))}>
              <option value={1000}>1,000</option>
              <option value={5000}>5,000</option>
              <option value={20000}>20,000</option>
              <option value={50000}>50,000</option>
            </select>
          </label>
          <label><input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} /> virtualization</label>
          <label>overscan{" "}
            <select style={selStyle} value={overscan} onChange={(e) => setOverscan(Number(e.target.value))}>
              <option value={0}>0px</option>
              <option value={200}>200px (기본)</option>
              <option value={600}>600px</option>
            </select>
          </label>
          <b style={{ color: "#0f766e" }}>DOM: {rendered.toLocaleString()} / {count.toLocaleString()}</b>
        </div>
      }
      checks={[
        "20,000개에서 팬/줌이 부드러운지 ↔ <b>virtualization 끄면</b> 확연히 무거워지는지",
        "세로 스크롤/팬 시 DOM 수가 일정 범위를 유지하는지",
        "overscan 0px으로 줄이고 빠르게 팬하면 가장자리 <b>팝인</b>이 보이는지 (600px에선 사라짐)",
        "50,000개도 시도해보세요",
        "<b>터치</b>: 세로 플릭 → 관성 스크롤이 끝(위/아래)에서 멈추는지, 맨 위에서 아래로 당기면 <b>페이지</b>가 스크롤되는지",
      ]}
    >
      <div ref={boxRef} style={{ height: 260, ...boxStyle }}>
        <Timeline items={items} virtualization={on} overscanPx={overscan} />
      </div>
    </Section>
  );
}

// --------------------------------------------- 5. 키보드 & 접근성 --

function A11yDemo() {
  const { items, onMove, onResize, onSelect, log } = useItemsWithLog();
  return (
    <Section
      no={5}
      title="키보드 & 접근성"
      checks={[
        "<b>Tab</b>으로 아이템 포커스 → 아이템 색 아웃라인이 보이는지",
        "<b>←/→</b> 이동 · <b>Shift+←/→</b> 끝 리사이즈 · <b>Alt(⌥)+←/→</b> 시작 리사이즈 (스냅 없음 → 뷰포트의 1%씩)",
        "<b>Enter/Space</b> = 선택 (로그 확인)",
        "요소 검사: 아이템 aria-label에 날짜 포함, 스크롤 영역 role=group aria-label에 <b>전체 개수</b>",
        "macOS VoiceOver(⌘F5)로 아이템 낭독 확인 (선택)",
      ]}
    >
      <div style={{ height: 240, ...boxStyle }}>
        <Timeline items={items} onItemMove={onMove} onItemResize={onResize} onSelect={onSelect} />
      </div>
      <LogPanel log={log} />
    </Section>
  );
}

// --------------------------------------------------- 6. renderItem --

function RenderItemDemo() {
  const { items, onMove, log } = useItemsWithLog();
  return (
    <Section
      no={6}
      title="renderItem — 아이템만 커스텀"
      checks={[
        "엔진(툴바·축·팬/줌·가상화·드래그)은 그대로, 아이템만 카드 UI로 교체됨",
        "카드를 드래그하면 이동이 동작하는지 (moveHandleProps 전파)",
        "isDragging 중 카드가 기울어지는지",
      ]}
    >
      <div style={{ height: 240, ...boxStyle }}>
        <Timeline
          items={items}
          onItemMove={onMove}
          dragSnapMs={DAY}
          renderItem={(ctx) => (
            <div
              onClick={ctx.select}
              {...ctx.moveHandleProps}
              style={{
                position: "absolute",
                left: ctx.startX,
                top: ctx.top,
                minWidth: Math.max(60, ctx.endX - ctx.startX),
                padding: "2px 8px",
                fontSize: 11,
                background: (ctx.item.color ?? "#6c8cff") + "22",
                border: `1px solid ${ctx.item.color ?? "#6c8cff"}`,
                borderRadius: 6,
                cursor: "grab",
                whiteSpace: "nowrap",
                touchAction: "none",
                transform: ctx.isDragging ? "rotate(-2deg)" : undefined,
                opacity: ctx.isDragging ? 0.8 : 1,
              }}
            >
              {ctx.item.label}
            </div>
          )}
        />
      </div>
      <LogPanel log={log} />
    </Section>
  );
}

// ----------------------------------------------------- 7. Headless --

function HeadlessDemo() {
  const items = useMemo(makeItems, []);
  const tl = useTimeline({ items });
  return (
    <Section
      no={7}
      title="Headless useTimeline — 전부 커스텀"
      checks={[
        "라이브러리 기본 UI가 하나도 없는데 <b>팬(드래그)과 핀치 줌</b>이 동작하는지",
        "화면 밖 아이템은 visibleItems에서 빠지는지 (줌인 후 팬)",
        "우측 상단 숫자 = zoomPct, 버튼은 훅의 액션 호출",
      ]}
    >
      <div
        {...tl.containerProps}
        style={{ position: "relative", height: 150, overflow: "hidden", background: "#0f172a",
          borderRadius: 10, cursor: "grab", userSelect: "none", touchAction: "none" }}
      >
        <span {...tl.probeProps} />
        <div style={{ position: "absolute", top: 6, right: 8, display: "flex", gap: 6, alignItems: "center", zIndex: 1 }}>
          <span style={{ color: "#94a3b8", fontSize: 11 }}>{tl.zoomPct}%</span>
          {[["Fit", tl.fit], ["−", tl.zoomOut], ["+", tl.zoomIn]].map(([t, fn]) => (
            <button key={t as string} onClick={fn as () => void}
              style={{ background: "#1e293b", color: "#e2e8f0", border: "none", borderRadius: 4, fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>
              {t as string}
            </button>
          ))}
        </div>
        {tl.visibleItems.map((p) => (
          <div key={p.item.id}
            style={{ position: "absolute", left: p.startX, top: 14 + p.top, fontSize: 11, color: "#e2e8f0",
              background: p.item.color ?? "#334155", padding: "2px 8px", borderRadius: 10, whiteSpace: "nowrap" }}>
            {p.item.label}
          </div>
        ))}
        {tl.ticks
          .filter((t) => { const x = tl.timeToPx(t.ms); return x >= 0 && x <= tl.canvasPx; })
          .map((t) => (
            <span key={t.ms} style={{ position: "absolute", bottom: 4, left: tl.timeToPx(t.ms), fontSize: 10, color: "#64748b" }}>
              {t.label}
            </span>
          ))}
      </div>
    </Section>
  );
}

// -------------------------------------- 8. Controlled viewport 동기화 --

function ControlledDemo() {
  const itemsA = useMemo(makeItems, []);
  const itemsB = useMemo(() => makeItems().map((i) => ({ ...i, id: i.id + "-b" })), []);
  const [vp, setVp] = useState<{ start: number; end: number }>(() => {
    const s = Date.parse("2025-01-01");
    return { start: s, end: Date.parse("2026-01-01") };
  });
  const onChange = useCallback((start: number, end: number) => setVp({ start, end }), []);
  return (
    <Section
      no={8}
      title="Controlled viewport — 두 타임라인 동기화"
      checks={[
        "위쪽을 팬/줌하면 <b>아래쪽이 똑같이 따라오는지</b> (반대도)",
        "viewportStart/End를 부모 state로 공유하는 controlled 모드 검증",
      ]}
    >
      {[itemsA, itemsB].map((its, i) => (
        <div key={i} style={{ height: 170, ...boxStyle }}>
          <Timeline items={its} viewportStart={vp.start} viewportEnd={vp.end}
            onViewportChange={onChange} hideToolbar={i === 1}
            style={{ minHeight: 0 }} />
        </div>
      ))}
    </Section>
  );
}

// ---------------------------------------------------------------- App --

function App() {
  return (
    <div style={{ padding: 24, maxWidth: 1150, margin: "0 auto", display: "grid", gap: 26 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22 }}>react-stable-timeline — 릴리즈 검수 페이지</h1>
        <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13, lineHeight: 1.7 }}>
          v0.4.0 배포 전 전체 + 기능별 수동 테스트. 각 섹션의 체크리스트를 따라가면 됩니다.<br />
          📱 <b>터치 테스트</b>: 같은 Wi-Fi의 휴대폰에서 이 주소로 접속 — 한 손가락 팬 · 두 손가락 핀치 줌 · 아이템 터치 드래그
        </p>
      </div>
      <FullDemo />
      <ZoomDemo />
      <DndDemo />
      <VirtDemo />
      <A11yDemo />
      <RenderItemDemo />
      <HeadlessDemo />
      <ControlledDemo />
      <p style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", margin: "8px 0 24px" }}>
        src/를 수정하고 새로고침하면 즉시 반영됩니다 · npm run demo
      </p>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
