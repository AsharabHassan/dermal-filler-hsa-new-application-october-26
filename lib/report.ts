"use client";

import type { AnalyzeResult, ClinicLocationKey, Lead } from "./types";
import type { NormalizedPoint } from "@/components/scan/useFaceLandmarker";
import { visibleMarkers } from "./face-regions";
import { CLINIC, DISCLAIMER, TREATMENT_NOTE, getClinicLocation } from "./constants";
import { STATUS_LABEL, ZONES, causeNotes, leaveAloneLines, mapOrder } from "./zones";
import { FIRMNESS_LINE, historyLine, offerLine } from "./plan";
import { findingLine } from "./finding";
import { JOURNEY } from "./consultation-journey";
import { buildReportPdf } from "./report-pdf";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image-load-failed"));
    img.src = src;
  });
}

/** The full selfie with each zone ringed (gold = change, sage = leave alone). */
async function renderAnnotatedFace(
  imageBase64: string,
  mediaType: string,
  landmarks: NormalizedPoint[],
  result: AnalyzeResult,
): Promise<{ url: string; aspect: number } | null> {
  try {
    const img = await loadImage(`data:${mediaType};base64,${imageBase64}`);
    const W = 700;
    const H = Math.max(1, Math.round((W * img.naturalHeight) / img.naturalWidth));
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, W, H);
    for (const z of result.zones) {
      for (const e of visibleMarkers(z.key, landmarks)) {
        ctx.beginPath();
        ctx.ellipse(e.cx * W, e.cy * H, e.rx * W, e.ry * H, 0, 0, Math.PI * 2);
        ctx.strokeStyle = z.leaveAlone ? "rgba(97,118,108,0.95)" : "rgba(194,154,58,0.95)";
        ctx.lineWidth = 3;
        ctx.setLineDash(z.obscured || z.leaveAlone ? [8, 6] : []);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    return { url: canvas.toDataURL("image/jpeg", 0.88), aspect: W / H };
  } catch {
    return null;
  }
}

/** Build the branded Facial Volume Scan PDF in the browser. */
export async function generateReportPdf(opts: {
  result: AnalyzeResult;
  imageBase64: string | null;
  imageMediaType: string;
  landmarks: NormalizedPoint[] | null;
  lead: Lead | null;
  clinicLocation: ClinicLocationKey;
}): Promise<Blob> {
  const { result, imageBase64, imageMediaType, landmarks, lead, clinicLocation } = opts;
  const clinic = getClinicLocation(clinicLocation);
  const face =
    imageBase64 && landmarks ? await renderAnnotatedFace(imageBase64, imageMediaType, landmarks, result) : null;
  const plan = result.plan;
  const start = plan.items.filter((i) => i.stage === "start");

  return buildReportPdf({
    clinicName: CLINIC.name,
    byline: `${clinic.city} · Only GMC-registered doctors inject`,
    addressLines: [...clinic.lines],
    email: CLINIC.email,
    bookingUrl: clinic.bookingUrl.replace(/^https?:\/\//, ""),
    preparedFor: lead?.firstName?.trim() || undefined,
    dateStr: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    headline: result.narrative.headline,
    narrative: result.narrative.narrative,
    finding: findingLine(result),
    encouragement: result.narrative.encouragement,
    faceImageDataUrl: face?.url ?? null,
    faceImageAspect: face?.aspect,
    zones: mapOrder(result.zones).map((z) => ({
      label: ZONES[z.key].label,
      status: STATUS_LABEL[z.status],
      note: z.obscured ? "Hidden in your photo, checked at your consultation." : z.note || ZONES[z.key].looksLike,
      leaveAlone: z.leaveAlone,
      obscured: z.obscured,
    })),
    leaveAlone: leaveAloneLines(result.zones),
    causeNotes: result.causeNotes.length ? result.causeNotes : causeNotes(result.zones),
    firmnessLine: result.firmnessDominant ? FIRMNESS_LINE : null,
    historyLine: historyLine(result.fillerHistory, result.priority),
    plan: plan.items.map((i) => ({
      label: ZONES[i.zone].label,
      volume: i.volumeText,
      price: i.priceText,
      why: i.why,
      stage: i.stage,
    })),
    startMl: start.length
      ? plan.startMlMin === plan.startMlMax
        ? `${plan.startMlMin} ml`
        : `${plan.startMlMin}–${plan.startMlMax} ml`
      : null,
    offerLine: offerLine(plan),
    journey: JOURNEY.map((s) => ({ label: s.label, detail: s.detail })),
    priceNote: TREATMENT_NOTE,
    disclaimer: DISCLAIMER,
  });
}
