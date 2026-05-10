import type { TimelineLabels } from "./types";

export const LABEL_HEIGHT = 16;
export const DOT_HEIGHT = 10;
export const ROW_HEIGHT = LABEL_HEIGHT + DOT_HEIGHT;
export const ROW_GAP = 8;
export const AXIS_HEIGHT = 28;

export const PAN_BUTTON = 0;
export const DRAG_PX = 4;

export const DEFAULT_ZOOM_FACTOR = 1.2;
export const DEFAULT_ACCENT = "#6c8cff";

export const DEFAULT_LABELS: Required<TimelineLabels> = {
  fit: "Fit",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  zoomRatio: "Zoom",
  empty: "No events",
};
