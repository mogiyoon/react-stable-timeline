import type { CSSProperties } from "react";
import type { TimelineLabels } from "../types";

const toolbarStyle: CSSProperties = {
  display: "flex",
  flexShrink: 0,
  alignItems: "center",
  gap: 8,
  borderBottom: "1px solid rgba(127,127,127,0.25)",
  padding: "6px 12px",
  fontSize: 12,
};

const buttonStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "inherit",
  padding: "2px 6px",
  borderRadius: 4,
  font: "inherit",
};

const iconButtonStyle: CSSProperties = {
  ...buttonStyle,
  width: 24,
  height: 24,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const zoomLabelStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 10,
  opacity: 0.75,
  marginLeft: 4,
};

const zoomInputStyle: CSSProperties = {
  width: 60,
  padding: "2px 4px",
  fontSize: 10,
  border: "1px solid rgba(127,127,127,0.4)",
  borderRadius: 3,
  background: "transparent",
  color: "inherit",
  fontVariantNumeric: "tabular-nums",
};

interface ToolbarProps {
  labels: Required<TimelineLabels>;
  zoomPct: number;
  zoomPctDraft: string | null;
  setZoomPctDraft: (v: string | null) => void;
  setZoomPct: (pct: number) => void;
  zoomMinPct: number;
  zoomMaxPct: number;
  onFit: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function Toolbar({
  labels,
  zoomPct,
  zoomPctDraft,
  setZoomPctDraft,
  setZoomPct,
  zoomMinPct,
  zoomMaxPct,
  onFit,
  onZoomIn,
  onZoomOut,
}: ToolbarProps) {
  return (
    <div style={toolbarStyle}>
      <button type="button" onClick={onFit} style={buttonStyle}>
        {labels.fit}
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        style={iconButtonStyle}
        aria-label={labels.zoomOut}
      >
        −
      </button>
      <button
        type="button"
        onClick={onZoomIn}
        style={iconButtonStyle}
        aria-label={labels.zoomIn}
      >
        +
      </button>
      <label style={zoomLabelStyle}>
        <span>{labels.zoomRatio}</span>
        <input
          type="number"
          value={zoomPctDraft ?? String(zoomPct)}
          min={zoomMinPct}
          max={zoomMaxPct}
          step={5}
          onChange={(e) => {
            const inputType = (e.nativeEvent as InputEvent).inputType;
            if (inputType) {
              setZoomPctDraft(e.target.value);
              return;
            }
            const v = Number(e.target.value);
            setZoomPctDraft(null);
            if (Number.isFinite(v)) setZoomPct(v);
          }}
          onBlur={(e) => {
            const v = Number(e.target.value);
            setZoomPctDraft(null);
            if (!Number.isFinite(v)) return;
            setZoomPct(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          style={zoomInputStyle}
        />
        <span>%</span>
      </label>
    </div>
  );
}
