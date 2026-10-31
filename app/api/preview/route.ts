import { buildPreviewPrompt } from "@/lib/prompts/preview-edit";
import { isZoneKey } from "@/lib/zones";
import type { Sex } from "@/lib/types";

export const runtime = "nodejs";
// Image edits take tens of seconds at high quality.
export const maxDuration = 120;

// /api/preview — the personal "See the possible difference" illustration.
// Sends the client's own selfie to OpenAI's image-edit endpoint with a strict,
// subtle, focus-zones-only instruction (lib/prompts/preview-edit.ts). Optional:
// with OPENAI_API_KEY unset the feature is hidden (GET → available:false,
// POST → 503) and the report is never blocked. Nothing is persisted or logged.

const MAX_BASE64 = 8_000_000;
const SEX: Sex[] = ["woman", "man", "prefer_not"];

export function GET(): Response {
  return Response.json({ available: Boolean(process.env.OPENAI_API_KEY) });
}

interface PreviewRequest {
  imageBase64?: string;
  imageMediaType?: string;
  imageConsent?: boolean;
  zones?: unknown;
  sex?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: "preview-unavailable" }, { status: 503 });

  let body: PreviewRequest;
  try {
    body = (await request.json()) as PreviewRequest;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const { imageBase64, imageMediaType = "image/jpeg", imageConsent } = body;
  if (!imageBase64 || imageConsent !== true) {
    return Response.json({ error: "photo consent required" }, { status: 400 });
  }
  if (imageBase64.length > MAX_BASE64) {
    return Response.json({ error: "image too large" }, { status: 413 });
  }
  const zones = Array.isArray(body.zones) ? body.zones.filter(isZoneKey).slice(0, 3) : [];
  if (zones.length === 0) return Response.json({ error: "no focus zones" }, { status: 400 });
  const sex = SEX.includes(body.sex as Sex) ? (body.sex as Sex) : null;

  const form = new FormData();
  form.append("model", process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-sunburst");
  form.append(
    "image",
    new Blob([Buffer.from(imageBase64, "base64")], { type: imageMediaType }),
    imageMediaType === "image/png" ? "selfie.png" : "selfie.jpg",
  );
  form.append("prompt", buildPreviewPrompt(zones, sex));
  form.append("size", "auto");
  form.append("quality", process.env.OPENAI_IMAGE_QUALITY || "high");
  form.append("n", "1");

  const started = Date.now();
  try {
    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(110_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[preview] openai", res.status, detail.slice(0, 300));
      return Response.json({ error: "preview-failed" }, { status: 502 });
    }
    const json = (await res.json()) as { data?: { b64_json?: string }[]; output_format?: string };
    const out = json.data?.[0]?.b64_json;
    if (!out) return Response.json({ error: "preview-empty" }, { status: 502 });
    console.info("[preview]", { event: "preview_ready", ms: Date.now() - started, zones });
    return Response.json({ imageBase64: out, imageMediaType: `image/${json.output_format ?? "png"}` });
  } catch (err) {
    console.error("[preview] request failed", err instanceof Error ? err.message : err);
    return Response.json({ error: "preview-failed" }, { status: 502 });
  }
}
