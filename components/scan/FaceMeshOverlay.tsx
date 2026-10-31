"use client";

import { useEffect, useRef } from "react";
import type { NormalizedPoint } from "./useFaceLandmarker";

interface FaceMeshOverlayProps {
  landmarks: NormalizedPoint[] | null;
  className?: string;
}

/**
 * Draws the 478-point face tesselation over the captured still. Purely visual —
 * the "AI analysis" centrepiece. Falls back to nothing if no landmarks.
 */
export function FaceMeshOverlay({ landmarks, className }: FaceMeshOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !landmarks) return;
    let cancelled = false;

    (async () => {
      const { FaceLandmarker } = await import("@mediapipe/tasks-vision");
      if (cancelled) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      const W = rect.width;
      const H = rect.height;

      ctx.clearRect(0, 0, W, H);
      const px = (i: number) => landmarks[i].x * W;
      const py = (i: number) => landmarks[i].y * H;

      // tesselation lines
      const tess = FaceLandmarker.FACE_LANDMARKS_TESSELATION as {
        start: number;
        end: number;
      }[];
      ctx.strokeStyle = "rgba(255, 248, 238, 0.45)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (const { start, end } of tess) {
        if (!landmarks[start] || !landmarks[end]) continue;
        ctx.moveTo(px(start), py(start));
        ctx.lineTo(px(end), py(end));
      }
      ctx.stroke();

      // node dots
      ctx.fillStyle = "rgba(212, 175, 55, 0.95)";
      for (let i = 0; i < landmarks.length; i += 6) {
        ctx.beginPath();
        ctx.arc(px(i), py(i), 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [landmarks]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
