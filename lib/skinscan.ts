import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// HSA SkinScan — the clinic's own analysis server (pigmentation-model/serve.py),
// `/fillers` endpoint. REQUIRED for this app (owner decision): when it is
// unreachable, times out or errors, NO report is produced — the client sees a
// "please try again" state. Signals, each labelled by source:
//   · endolift_model   — DINOv2 + per-area heads trained on 1,588 HSA reports
//   · undereye_measure — Lab measurement of the infraorbital band vs the cheek
//   · geometry         — MediaPipe face-mesh proportions + zone shadow depth
//   · derm_foundation  — Google Derm Foundation skin-quality proxy (cheek, jaw)
//   · skin_measure     — measured fine-texture energy; combined — laxity proxy
// The image goes only to the clinic's own service and is never stored.
// ─────────────────────────────────────────────────────────────────────────────

export type ZoneHint = "low" | "moderate" | "high";

export interface FillerSignals {
  ok: true;
  version: string;
  endolift_model: {
    version: string;
    cheeks_focus: number;
    chin_focus: number;
    neck_focus: number;
    strong_candidate: number;
    jawline_enhancement: number;
    chin_enhancement: number;
  } | null;
  undereye_measure: {
    darkness_index: number;
    character: "minimal" | "pigmented" | "vascular" | "structural";
  } | null;
  geometry: {
    lip_ratio_upper_lower: number | null;
    lip_fullness: number | null;
    lower_face_ratio: number | null;
    chin_height_ratio: number | null;
    shadow_depth: Partial<Record<"temples" | "teartrough" | "cheeks" | "nasolabial" | "marionette", number>>;
  };
  derm_foundation: {
    model: string;
    skin_quality: Partial<Record<"cheeks" | "jawline", { photodamage: number; clear: number }>>;
  } | null;
  skin_measure: { texture_index: Partial<Record<"cheeks" | "jawline", number>> } | null;
  combined: { laxity_proxy: number | null };
  zone_hints: Partial<Record<string, ZoneHint>>;
  /** Zones whose landmarks fall outside the photo (cropped out) — never read. */
  zones_not_visible?: string[];
  ms?: number;
}

export class SkinScanError extends Error {
  constructor(public reason: "not_configured" | "timeout" | "http" | "no_face" | "network", detail?: string) {
    super(`skinscan ${reason}${detail ? `: ${detail}` : ""}`);
    this.name = "SkinScanError";
  }
}

/** Per-attempt timeout. Derm Foundation on CPU takes ~19 s. */
export const SKINSCAN_TIMEOUT_MS = 35_000;
export const SKINSCAN_ATTEMPTS = 2;
/** Total time budget so a retry never pushes past the route's maxDuration. */
const BUDGET_MS = 60_000;

/** Call /fillers with a generous timeout and one retry. Throws SkinScanError. */
export async function skinScanFillers(
  imageBase64: string,
  opts: { fetchImpl?: typeof fetch; timeoutMs?: number; attempts?: number } = {},
): Promise<FillerSignals> {
  const url = process.env.SKINSCAN_URL;
  if (!url) throw new SkinScanError("not_configured");
  const fetchImpl = opts.fetchImpl ?? fetch;
  const attempts = opts.attempts ?? SKINSCAN_ATTEMPTS;
  const started = Date.now();
  let last: SkinScanError = new SkinScanError("network");

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const remaining = BUDGET_MS - (Date.now() - started);
    if (attempt > 1 && remaining < 10_000) break;
    const timeout = Math.min(opts.timeoutMs ?? SKINSCAN_TIMEOUT_MS, Math.max(1, remaining));
    try {
      const res = await fetchImpl(`${url.replace(/\/$/, "")}/fillers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.SKINSCAN_API_KEY ? { "x-skinscan-key": process.env.SKINSCAN_API_KEY } : {}),
        },
        body: JSON.stringify({ image_base64: imageBase64 }),
        signal: AbortSignal.timeout(timeout),
      });
      if (!res.ok) {
        last = new SkinScanError("http", String(res.status));
        // 4xx other than 408/429 will not get better on retry.
        if (res.status < 500 && res.status !== 408 && res.status !== 429) break;
        continue;
      }
      const data = (await res.json()) as FillerSignals | { ok: false; error?: string };
      if (!data.ok) {
        // "no face found" etc. — a retake problem, not a server problem.
        throw new SkinScanError("no_face", (data as { error?: string }).error);
      }
      return data;
    } catch (err) {
      if (err instanceof SkinScanError) throw err;
      const name = err instanceof Error ? err.name : "";
      last = new SkinScanError(name === "TimeoutError" || name === "AbortError" ? "timeout" : "network", name);
    }
  }
  throw last;
}

const fmt = (n: number | null | undefined, d = 2) =>
  typeof n === "number" && Number.isFinite(n) ? n.toFixed(d) : "n/a";

/** The signals as a short note for Claude's user turn ("HSA SkinScan signals"). */
export function fillerSignalsNote(s: FillerSignals): string {
  const parts: string[] = [];
  const hints = Object.entries(s.zone_hints)
    .map(([z, h]) => `${z}: ${h}`)
    .join(", ");
  if (hints) parts.push(`Per-zone change hints (low/moderate/high, uncalibrated) — ${hints}.`);
  if (s.zones_not_visible?.length) {
    parts.push(
      `Zones NOT in the photo frame (cropped out) — list them in zonesObscured and do not rate them confidently: ${s.zones_not_visible.join(", ")}.`,
    );
  }
  if (s.endolift_model) {
    const e = s.endolift_model;
    parts.push(
      `endolift_model (trained on 1,588 HSA face reports): cheeks focus ${fmt(e.cheeks_focus)}, chin focus ${fmt(e.chin_focus)}, neck focus ${fmt(e.neck_focus)}, lower-face lift candidate ${fmt(e.strong_candidate)}, predicted jawline enhancement ${e.jawline_enhancement}%, chin ${e.chin_enhancement}%. High lift-candidate / neck focus points to skin firmness, not volume.`,
    );
  }
  if (s.undereye_measure) {
    parts.push(
      `undereye_measure: darkness index ${s.undereye_measure.darkness_index}/100, character "${s.undereye_measure.character}" ("structural" = a colourless shadow consistent with hollowing; "pigmented"/"vascular" = colour, which filler does not treat).`,
    );
  }
  const g = s.geometry;
  const shadows = Object.entries(g.shadow_depth)
    .map(([z, v]) => `${z} ${fmt(v, 1)}`)
    .join(", ");
  parts.push(
    `geometry (face mesh): upper:lower lip ratio ${fmt(g.lip_ratio_upper_lower)} (a common balanced range is ~0.5–0.8), lip fullness ${fmt(g.lip_fullness)}, lower-face ratio (nose-to-mouth : mouth-to-chin) ${fmt(g.lower_face_ratio)} (~0.45–0.6 typical), chin height ratio ${fmt(g.chin_height_ratio)}. Shadow depth (L* darker than the person's own cheek highlight; larger = deeper shadow): ${shadows || "n/a"}.`,
  );
  if (s.derm_foundation) {
    const q = Object.entries(s.derm_foundation.skin_quality)
      .map(([z, v]) => `${z} photodamage ${fmt(v?.photodamage)} / clear ${fmt(v?.clear)}`)
      .join("; ");
    parts.push(`derm_foundation (skin-quality proxy): ${q || "n/a"}.`);
  }
  if (s.skin_measure) {
    const t = Object.entries(s.skin_measure.texture_index)
      .map(([z, v]) => `${z} ${fmt(v, 1)}`)
      .join(", ");
    parts.push(`skin_measure: fine-texture index ${t || "n/a"} (higher = more visible texture).`);
  }
  if (s.combined?.laxity_proxy != null) {
    parts.push(`combined laxity proxy ${fmt(s.combined.laxity_proxy)} (0–1; higher points to skin firmness rather than volume).`);
  }
  return (
    "HSA SkinScan signals (the clinic's own analysis server — supporting measurements; trust what you clearly see in the photo when they disagree, and never quote these numbers to the person): " +
    parts.join(" ")
  );
}
