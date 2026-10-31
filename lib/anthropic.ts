import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type {
  FillerHistory,
  JowlGrade,
  PhotoAssessment,
  Priority,
  ZoneKey,
  ZoneRead,
} from "./types";
import { serverEnv } from "./env";
import { SYSTEM_FILLERS } from "./prompts/system-fillers";
import { RESULT_SCHEMA } from "./prompts/result-schema";
import { ZONE_ORDER, isZoneKey } from "./zones";
import { fillerSignalsNote, type FillerSignals } from "./skinscan";
import type { MediaType } from "@/store/wizard-store";

// ─────────────────────────────────────────────────────────────────────────────
// Server-only Claude Vision call. Same model / settings as the HSA under-eye and
// pigmentation apps (claude-sonnet-5-5, low effort, structured JSON output). The
// system prompt is a cached prefix; the photo, the pre-scan answers and the
// HSA SkinScan signals go in the user turn.
// ─────────────────────────────────────────────────────────────────────────────

const JOWL: JowlGrade[] = ["none", "mild", "moderate", "advanced", "unclear"];

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: serverEnv().ANTHROPIC_API_KEY });
  return client;
}

export interface RawAssessment {
  zones: { zone: string; change: number; appearsFull: boolean; note: string }[];
  zonesObscured: string[];
  skinLaxity: number;
  jowlGrade: string;
  makeupDetected: boolean;
  framingAdequate: boolean;
  previousWorkVisible: boolean;
  headline: string;
  narrative: string;
  encouragement: string;
}

function clamp(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 0;
}

/** Map Claude's raw JSON onto a PhotoAssessment. Pure; exported for tests. */
export function parseAssessment(raw: RawAssessment): PhotoAssessment {
  if (
    !raw ||
    !Array.isArray(raw.zones) ||
    typeof raw.headline !== "string" ||
    typeof raw.narrative !== "string" ||
    typeof raw.encouragement !== "string"
  ) {
    throw new Error("malformed assessment");
  }
  const zones = {} as Record<ZoneKey, ZoneRead>;
  for (const key of ZONE_ORDER) zones[key] = { change: 0, appearsFull: false, note: "" };
  let seen = 0;
  for (const z of raw.zones) {
    if (!isZoneKey(z?.zone)) continue;
    seen += 1;
    zones[z.zone] = {
      change: clamp(z.change),
      appearsFull: z.appearsFull === true,
      note: typeof z.note === "string" ? z.note.trim().slice(0, 240) : "",
    };
  }
  if (seen === 0) throw new Error("no zones in assessment");
  return {
    zones,
    zonesObscured: Array.from(new Set((raw.zonesObscured ?? []).filter(isZoneKey))),
    skinLaxity: clamp(raw.skinLaxity),
    jowlGrade: JOWL.includes(raw.jowlGrade as JowlGrade) ? (raw.jowlGrade as JowlGrade) : "unclear",
    makeupDetected: raw.makeupDetected === true,
    framingAdequate: raw.framingAdequate !== false,
    previousWorkVisible: raw.previousWorkVisible === true,
    narrative: {
      headline: raw.headline.trim(),
      narrative: raw.narrative.trim(),
      encouragement: raw.encouragement.trim(),
    },
  };
}

const HISTORY_TEXT: Record<FillerHistory, string> = {
  no: "No, never had filler",
  yes_happy: "Yes, and happy with it",
  yes_unhappy: "Yes, and unhappy with it",
  not_sure: "Not sure",
};
const PRIORITY_TEXT: Record<Priority, string> = {
  less_tired: "Look less tired",
  subtle_definition: "Subtle definition",
  fix_previous: "Fix previous work",
  not_sure: "Not sure",
};

/** The pre-scan answers as a note for the user turn. */
export function answersNote(history: FillerHistory | null, priority: Priority | null): string {
  return `The person's answers — Had filler before? ${history ? HISTORY_TEXT[history] : "not answered"}. What matters most? ${priority ? PRIORITY_TEXT[priority] : "not answered"}.`;
}

export async function assessPhoto(params: {
  imageBase64: string;
  imageMediaType: MediaType;
  signals: FillerSignals;
  fillerHistory: FillerHistory | null;
  priority: Priority | null;
}): Promise<PhotoAssessment> {
  const env = serverEnv();
  const message = await getClient().messages.create({
    model: env.ANTHROPIC_MODEL,
    // Thinking counts toward max_tokens; Sonnet 5.5 runs adaptive thinking and
    // effort controls how much (same settings as the other HSA apps).
    max_tokens: 8000,
    system: [{ type: "text", text: SYSTEM_FILLERS, cache_control: { type: "ephemeral" } }],
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: RESULT_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: params.imageMediaType, data: params.imageBase64 },
          },
          {
            type: "text",
            text: "Map volume and structure across the eight zones of this selfie and produce the pre-consultation report as the structured fields.",
          },
          { type: "text", text: answersNote(params.fillerHistory, params.priority) },
          { type: "text", text: fillerSignalsNote(params.signals) },
        ],
      },
    ],
  });

  if (message.stop_reason === "refusal") {
    throw new Error(`refusal: ${message.stop_details?.category ?? "unspecified"}`);
  }
  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("no text block");
  return parseAssessment(JSON.parse(block.text) as RawAssessment);
}
