import type { NormalizedPoint } from "@/components/scan/useFaceLandmarker";
import type { ZoneKey } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Maps the on-device MediaPipe 478-point face mesh to the eight Volume &
// Structure zones: an on-face marker (one per side for bilateral zones) and a
// crop rectangle for each zone's close-up. Presentational only — not a
// measurement. "left" = image-left (MediaPipe 234 side), "right" = image-right.
// ─────────────────────────────────────────────────────────────────────────────

export interface NormRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface NormEllipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

interface ZoneGeometry {
  /** Anchor landmark groups — one per marker (two for bilateral zones). */
  anchors: number[][];
  /** Ellipse radius clamps (normalized). */
  rx: [number, number];
  ry: [number, number];
  /** Padding around the anchors for the close-up crop. */
  margin: number;
}

const GEOMETRY: Record<ZoneKey, ZoneGeometry> = {
  temples: {
    anchors: [
      [21, 71, 139, 162, 156, 54],
      [251, 301, 368, 389, 383, 284],
    ],
    rx: [0.03, 0.06],
    ry: [0.03, 0.06],
    margin: 0.9,
  },
  teartrough: {
    anchors: [
      [117, 118, 119, 120, 121, 111, 116],
      [346, 347, 348, 349, 350, 340, 345],
    ],
    rx: [0.035, 0.07],
    ry: [0.018, 0.035],
    margin: 0.9,
  },
  cheeks: {
    anchors: [
      [123, 50, 101, 116, 117, 187],
      [352, 280, 330, 345, 346, 411],
    ],
    rx: [0.035, 0.07],
    ry: [0.03, 0.06],
    margin: 0.7,
  },
  nasolabial: {
    anchors: [
      [129, 203, 206, 216, 92, 165, 98],
      [358, 423, 426, 436, 322, 391, 327],
    ],
    rx: [0.018, 0.035],
    ry: [0.03, 0.06],
    margin: 0.9,
  },
  lips: {
    anchors: [[0, 17, 61, 291, 13, 14, 37, 267, 84, 314]],
    rx: [0.05, 0.1],
    ry: [0.025, 0.05],
    margin: 0.5,
  },
  marionette: {
    anchors: [
      [57, 43, 106, 182, 204, 202],
      [287, 273, 335, 406, 424, 422],
    ],
    rx: [0.018, 0.035],
    ry: [0.025, 0.05],
    margin: 0.9,
  },
  chin: {
    anchors: [[152, 175, 199, 200, 18, 148, 377, 176, 400]],
    rx: [0.035, 0.07],
    ry: [0.025, 0.05],
    margin: 0.6,
  },
  jawline: {
    anchors: [
      [172, 136, 150, 149, 58, 132],
      [397, 365, 379, 378, 288, 361],
    ],
    rx: [0.025, 0.05],
    ry: [0.04, 0.08],
    margin: 0.6,
  },
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const clampTo = (n: number, [lo, hi]: [number, number]) => Math.max(lo, Math.min(hi, n));

function bbox(indices: number[], lm: NormalizedPoint[]) {
  const pts = indices.map((i) => lm[i]).filter(Boolean);
  if (pts.length < 3) return null;
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

/** On-face markers for a zone (two for bilateral zones). */
export function zoneMarkers(zone: ZoneKey, lm: NormalizedPoint[]): NormEllipse[] {
  const g = GEOMETRY[zone];
  const out: NormEllipse[] = [];
  for (const group of g.anchors) {
    const b = bbox(group, lm);
    if (!b) continue;
    out.push({
      cx: clamp01((b.minX + b.maxX) / 2),
      cy: clamp01((b.minY + b.maxY) / 2),
      rx: clampTo(((b.maxX - b.minX) / 2) * 1.2 + 0.008, g.rx),
      ry: clampTo(((b.maxY - b.minY) / 2) * 1.2 + 0.008, g.ry),
    });
  }
  return out;
}

/** Close-up crop rect for a zone (the larger / camera-facing side for bilateral zones). */
export function zoneRect(zone: ZoneKey, lm: NormalizedPoint[]): NormRect | null {
  const markers = zoneMarkers(zone, lm);
  if (markers.length === 0) return null;
  const e = [...markers].sort((a, b) => b.rx * b.ry - a.rx * a.ry)[0];
  const g = GEOMETRY[zone];
  const half = Math.max(e.rx, e.ry) * (1 + g.margin) + 0.02;
  const x = clamp01(e.cx - half);
  const y = clamp01(e.cy - half);
  const w = Math.min(1 - x, half * 2);
  const h = Math.min(1 - y, half * 2);
  if (w < 0.03 || h < 0.03) return null;
  return { x, y, w, h };
}

/**
 * Which side of the face is toward the camera. On a turned photo the far-side
 * markers are foreshortened, so only the visible side is drawn.
 */
export function faceVisibleSide(lm: NormalizedPoint[]): "left" | "right" | "both" {
  const nose = lm[1];
  const leftEdge = lm[234];
  const rightEdge = lm[454];
  if (!nose || !leftEdge || !rightEdge) return "both";
  const leftGap = nose.x - leftEdge.x;
  const rightGap = rightEdge.x - nose.x;
  if (leftGap <= 0.01 || rightGap <= 0.01) return leftGap > rightGap ? "left" : "right";
  const ratio = leftGap / rightGap;
  if (ratio > 2.2) return "left";
  if (ratio < 1 / 2.2) return "right";
  return "both";
}

/** Markers to draw, honouring a turned face. */
export function visibleMarkers(zone: ZoneKey, lm: NormalizedPoint[]): NormEllipse[] {
  const markers = zoneMarkers(zone, lm);
  const side = faceVisibleSide(lm);
  if (markers.length < 2 || side === "both") return markers;
  const sorted = [...markers].sort((a, b) => a.cx - b.cx);
  return [side === "right" ? sorted[1] : sorted[0]];
}
