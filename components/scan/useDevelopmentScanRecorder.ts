"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { NormalizedPoint } from "./useFaceLandmarker";

const CAPTURE_WIDTH = 720;
const CAPTURE_HEIGHT = 900;
const CAPTURE_FPS = 30;
const CAPTURE_DURATION_MS = 10_000;
const SWEEP_DURATION_MS = 2_100;
const OUTPUT_FILENAME = "hsa-real-scan-capture.webm";
const CAPTURE_EVENT = "hsa:scan-capture";

type TessellationConnection = { start: number; end: number };

type CapturePhase =
  | "recording-start"
  | "recording-stop"
  | "download"
  | "error";

interface CaptureEventDetail {
  phase: CapturePhase;
  elapsedMs: number;
  durationMs: number;
  fps: number;
  width: number;
  height: number;
  filename: string;
  bytes?: number;
  mimeType?: string;
  reason?: string;
}

interface UseDevelopmentScanRecorderOptions {
  imageRef: RefObject<HTMLImageElement | null>;
  imageLoaded: boolean;
  landmarks: NormalizedPoint[] | null;
}

/**
 * Development-only recording helper for the paid-social capture workflow.
 *
 * It is inert unless both `demoCapture=1` and `recordScan=1` are present while
 * running `next dev`. The recorder draws the uploaded image and the exact
 * MediaPipe points already produced by ScanScreen onto a 4:5 canvas, records
 * ten seconds at 30fps, and downloads the resulting WebM. It never writes to
 * the wizard store and never touches the lead or reporting APIs.
 */
export function useDevelopmentScanRecorder({
  imageRef,
  imageLoaded,
  landmarks,
}: UseDevelopmentScanRecorderOptions) {
  const [captureRequested] = useState(isCaptureRequested);
  const [captureComplete, setCaptureComplete] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    const image = imageRef.current;
    if (
      !captureRequested ||
      captureComplete ||
      startedRef.current ||
      !imageLoaded ||
      !image ||
      !landmarks
    ) {
      return;
    }

    startedRef.current = true;
    let disposed = false;
    let animationFrame = 0;
    let stopTimer = 0;
    let recorder: MediaRecorder | null = null;
    let stream: MediaStream | null = null;

    const finish = () => {
      if (!disposed) setCaptureComplete(true);
    };

    void (async () => {
      try {
        if (
          typeof MediaRecorder === "undefined" ||
          typeof HTMLCanvasElement.prototype.captureStream !== "function"
        ) {
          throw new Error("canvas-recording-not-supported");
        }

        const { FaceLandmarker } = await import("@mediapipe/tasks-vision");
        if (disposed) return;

        const tessellation =
          FaceLandmarker.FACE_LANDMARKS_TESSELATION as TessellationConnection[];
        const canvas = document.createElement("canvas");
        canvas.width = CAPTURE_WIDTH;
        canvas.height = CAPTURE_HEIGHT;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("capture-canvas-unavailable");

        const mimeType = selectWebmMimeType();
        stream = canvas.captureStream(CAPTURE_FPS);
        recorder = new MediaRecorder(stream, {
          ...(mimeType ? { mimeType } : {}),
          videoBitsPerSecond: 8_000_000,
        });

        const chunks: Blob[] = [];
        recorder.addEventListener("dataavailable", (event) => {
          if (event.data.size > 0) chunks.push(event.data);
        });

        const startedAt = performance.now();

        recorder.addEventListener("stop", () => {
          if (disposed) return;

          const blob = new Blob(chunks, {
            type: recorder?.mimeType || mimeType || "video/webm",
          });
          downloadBlob(blob, OUTPUT_FILENAME);
          emitCaptureEvent({
            phase: "download",
            elapsedMs: performance.now() - startedAt,
            bytes: blob.size,
            mimeType: blob.type,
          });
          stream?.getTracks().forEach((track) => track.stop());
          finish();
        });

        // Paint a complete first frame before starting so the WebM never opens
        // on a blank canvas while the first animation frame is scheduled.
        drawScanFrame(context, image, landmarks, tessellation, 0);
        recorder.start(1_000);
        emitCaptureEvent({ phase: "recording-start", elapsedMs: 0 });

        const render = () => {
          if (disposed) return;
          const elapsedMs = performance.now() - startedAt;
          drawScanFrame(
            context,
            image,
            landmarks,
            tessellation,
            elapsedMs,
          );
          if (elapsedMs < CAPTURE_DURATION_MS) {
            animationFrame = requestAnimationFrame(render);
          }
        };
        animationFrame = requestAnimationFrame(render);

        stopTimer = window.setTimeout(() => {
          if (!recorder || recorder.state === "inactive") return;
          drawScanFrame(
            context,
            image,
            landmarks,
            tessellation,
            CAPTURE_DURATION_MS,
          );
          emitCaptureEvent({
            phase: "recording-stop",
            elapsedMs: performance.now() - startedAt,
          });
          recorder.stop();
        }, CAPTURE_DURATION_MS);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown-error";
        emitCaptureEvent({
          phase: "error",
          elapsedMs: 0,
          reason,
        });
        stream?.getTracks().forEach((track) => track.stop());
        finish();
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      window.clearTimeout(stopTimer);
      if (recorder?.state === "recording") recorder.stop();
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [
    captureRequested,
    captureComplete,
    imageLoaded,
    imageRef,
    landmarks,
  ]);

  return { captureRequested, captureComplete };
}

function isCaptureRequested() {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return (
    params.get("demoCapture") === "1" && params.get("recordScan") === "1"
  );
}

function selectWebmMimeType() {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
}

function drawScanFrame(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  landmarks: NormalizedPoint[],
  tessellation: TessellationConnection[],
  elapsedMs: number,
) {
  const width = context.canvas.width;
  const height = context.canvas.height;
  const transform = coverTransform(image, width, height);

  context.clearRect(0, 0, width, height);
  context.save();
  roundedRect(context, 0, 0, width, height, 42);
  context.clip();

  context.drawImage(
    image,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight,
    transform.offsetX,
    transform.offsetY,
    transform.drawWidth,
    transform.drawHeight,
  );

  context.fillStyle = "rgba(15, 24, 27, 0.35)";
  context.fillRect(0, 0, width, height);

  const pointX = (index: number) =>
    transform.offsetX + landmarks[index].x * transform.drawWidth;
  const pointY = (index: number) =>
    transform.offsetY + landmarks[index].y * transform.drawHeight;

  context.beginPath();
  for (const { start, end } of tessellation) {
    if (!landmarks[start] || !landmarks[end]) continue;
    context.moveTo(pointX(start), pointY(start));
    context.lineTo(pointX(end), pointY(end));
  }
  context.strokeStyle = "rgba(255, 248, 238, 0.48)";
  context.lineWidth = 1.15;
  context.stroke();

  context.fillStyle = "rgba(212, 175, 55, 0.96)";
  for (let index = 0; index < landmarks.length; index += 6) {
    context.beginPath();
    context.arc(pointX(index), pointY(index), 2.15, 0, Math.PI * 2);
    context.fill();
  }

  drawSweep(context, elapsedMs);
  drawReticle(context);
  drawVignette(context);
  context.restore();
}

function coverTransform(
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.max(
    width / image.naturalWidth,
    height / image.naturalHeight,
  );
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  return {
    drawWidth,
    drawHeight,
    offsetX: (width - drawWidth) / 2,
    offsetY: (height - drawHeight) / 2,
  };
}

function drawSweep(context: CanvasRenderingContext2D, elapsedMs: number) {
  const width = context.canvas.width;
  const height = context.canvas.height;
  const progress = (elapsedMs % SWEEP_DURATION_MS) / SWEEP_DURATION_MS;
  const eased = 0.5 - Math.cos(progress * Math.PI) / 2;
  const sweepHeight = 210;
  const centreY = -sweepHeight + eased * (height + sweepHeight * 2);
  const gradient = context.createLinearGradient(
    0,
    centreY - sweepHeight / 2,
    0,
    centreY + sweepHeight / 2,
  );
  gradient.addColorStop(0, "rgba(234, 169, 137, 0)");
  gradient.addColorStop(0.5, "rgba(234, 169, 137, 0.38)");
  gradient.addColorStop(1, "rgba(234, 169, 137, 0)");

  context.save();
  context.globalCompositeOperation = "screen";
  context.fillStyle = gradient;
  context.fillRect(0, centreY - sweepHeight / 2, width, sweepHeight);
  context.restore();
}

function drawReticle(context: CanvasRenderingContext2D) {
  const width = context.canvas.width;
  const height = context.canvas.height;
  const inset = 30;
  const length = 48;

  context.save();
  context.strokeStyle = "rgba(255, 255, 255, 0.74)";
  context.lineWidth = 4;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(inset, inset + length);
  context.lineTo(inset, inset);
  context.lineTo(inset + length, inset);
  context.moveTo(width - inset - length, inset);
  context.lineTo(width - inset, inset);
  context.lineTo(width - inset, inset + length);
  context.moveTo(inset, height - inset - length);
  context.lineTo(inset, height - inset);
  context.lineTo(inset + length, height - inset);
  context.moveTo(width - inset - length, height - inset);
  context.lineTo(width - inset, height - inset);
  context.lineTo(width - inset, height - inset - length);
  context.stroke();
  context.restore();
}

function drawVignette(context: CanvasRenderingContext2D) {
  const width = context.canvas.width;
  const height = context.canvas.height;
  const gradient = context.createRadialGradient(
    width / 2,
    height / 2,
    width * 0.24,
    width / 2,
    height / 2,
    height * 0.7,
  );
  gradient.addColorStop(0, "rgba(8, 15, 17, 0)");
  gradient.addColorStop(1, "rgba(8, 15, 17, 0.32)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function emitCaptureEvent(
  detail: Pick<CaptureEventDetail, "phase" | "elapsedMs"> &
    Partial<
      Pick<CaptureEventDetail, "bytes" | "mimeType" | "reason">
    >,
) {
  const eventDetail: CaptureEventDetail = {
    ...detail,
    durationMs: CAPTURE_DURATION_MS,
    fps: CAPTURE_FPS,
    width: CAPTURE_WIDTH,
    height: CAPTURE_HEIGHT,
    filename: OUTPUT_FILENAME,
  };
  window.dispatchEvent(
    new CustomEvent<CaptureEventDetail>(CAPTURE_EVENT, {
      detail: eventDetail,
    }),
  );
  console.info(`[hsa-scan-capture] ${detail.phase}`, eventDetail);
}
