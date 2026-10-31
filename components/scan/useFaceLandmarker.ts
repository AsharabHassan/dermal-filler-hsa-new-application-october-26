"use client";

import { useEffect, useRef, useState } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";

export interface NormalizedPoint {
  x: number;
  y: number;
  z: number;
}

// MediaPipe's WASM/TFLite runtime prints benign startup notices (e.g.
// "INFO: Created TensorFlow Lite XNNPACK delegate for CPU.") through the
// Emscripten stderr channel, which lands on console.error. Next.js's dev overlay
// treats any console.error as a fatal Console Error, so we drop just these known
// informational lines — everything else passes through untouched. Installed once.
let logFilterInstalled = false;
function installMediapipeLogFilter() {
  if (logFilterInstalled || typeof window === "undefined") return;
  logFilterInstalled = true;
  const isBenign = (args: unknown[]) =>
    typeof args[0] === "string" &&
    /^INFO:|XNNPACK delegate|Created TensorFlow Lite|GL version|TfLiteGpuDelegate/.test(
      args[0],
    );
  (["error", "warn", "info"] as const).forEach((level) => {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      if (isBenign(args)) return;
      original(...args);
    };
  });
}

/**
 * Lazily loads the on-device MediaPipe FaceLandmarker (self-hosted WASM + model)
 * and exposes a one-shot `detect` over a still image element. Everything runs in
 * the browser — no pixels ever leave the device for this step.
 */
export function useFaceLandmarker() {
  const ref = useRef<FaceLandmarker | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    installMediapipeLogFilter();
    (async () => {
      try {
        const vision = await import("@mediapipe/tasks-vision");
        const fileset = await vision.FilesetResolver.forVisionTasks(
          "/mediapipe/wasm",
        );
        const landmarker = await vision.FaceLandmarker.createFromOptions(
          fileset,
          {
            baseOptions: {
              modelAssetPath: "/mediapipe/face_landmarker.task",
              delegate: "GPU",
            },
            runningMode: "IMAGE",
            numFaces: 1,
          },
        );
        if (cancelled) {
          landmarker.close();
          return;
        }
        ref.current = landmarker;
        setReady(true);
      } catch {
        setError("landmarker-failed");
      }
    })();
    return () => {
      cancelled = true;
      ref.current?.close();
      ref.current = null;
    };
  }, []);

  function detect(image: HTMLImageElement): NormalizedPoint[] | null {
    if (!ref.current) return null;
    try {
      const res = ref.current.detect(image);
      return res.faceLandmarks?.[0] ?? null;
    } catch {
      return null;
    }
  }

  return { detect, ready, error };
}
