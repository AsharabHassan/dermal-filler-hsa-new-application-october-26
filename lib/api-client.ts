import type {
  AnalyzeRequest,
  AnalyzeResult,
  ClinicLocationKey,
  Lead,
  LeadRequest,
} from "./types";
import type { NormalizedPoint } from "@/components/scan/useFaceLandmarker";
import type { AnalyzeResponse } from "./assessment";

/**
 * Request the Facial Volume Scan. Never throws. There is NO fallback report:
 * HSA SkinScan is required, so any failure comes back as { ok:false } and the
 * client shows "We couldn't complete your scan" with try-again / retake.
 */
export async function requestAnalysis(body: AnalyzeRequest): Promise<AnalyzeResponse> {
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as AnalyzeResponse | null;
    if (data && data.ok === true && data.result) return data;
    if (data && data.ok === false && (data.error === "no_face" || data.error === "scan_unavailable" || data.error === "analysis_failed")) {
      return data;
    }
    return { ok: false, error: "scan_unavailable" };
  } catch {
    return { ok: false, error: "scan_unavailable" };
  }
}

/** Fire the lead to GoHighLevel. Never throws — lead delivery must not block. */
export async function submitLead(body: LeadRequest): Promise<void> {
  try {
    await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    /* swallowed: server-side retry + logging owns reliability */
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result);
      resolve(s.slice(s.indexOf(",") + 1)); // strip the data: prefix
    };
    reader.onerror = () => reject(new Error("blob-read-failed"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Generate the report PDF in the browser and send it to /api/report, which
 * uploads it to GoHighLevel, attaches it to the contact and emails the patient
 * their copy. This runs automatically for every lead — there is no feature flag
 * and no separate opt-in. Fire-and-forget: never throws, never blocks the
 * result reveal, and no-ops server-side if the GHL integration isn't configured.
 */
export async function submitReportToGhl(opts: {
  result: AnalyzeResult;
  lead: Lead;
  clinicLocation: ClinicLocationKey;
  imageBase64: string | null;
  imageMediaType: string;
  landmarks: NormalizedPoint[] | null;
}): Promise<void> {
  try {
    const { generateReportPdf } = await import("./report");
    const blob = await generateReportPdf({
      result: opts.result,
      imageBase64: opts.imageBase64,
      imageMediaType: opts.imageMediaType,
      landmarks: opts.landmarks,
      lead: opts.lead,
      clinicLocation: opts.clinicLocation,
    });
    const pdfBase64 = await blobToBase64(blob);
    await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lead: opts.lead,
        clinicLocation: opts.clinicLocation,
        focusZones: opts.result.focusZones,
        pdfBase64,
      }),
    });
  } catch {
    /* swallowed — report delivery is best-effort and must not block */
  }
}
