import type {
  JowlGrade,
  MappedZone,
  PhotoAssessment,
  ZoneKey,
  ZoneRead,
  ZoneStatus,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// The Volume & Structure Map. Pure, no network — the single place the zone
// rules live, so the clinic can sign them off (tested in test/zones.test.ts):
//   · change (0–100) → Well supported / Some change / Noticeable change
//   · which zones the report explicitly says to LEAVE ALONE
//   · the cause notes ("lines beside your mouth often come from lost cheek
//     support above")
//   · when skin firmness, not volume, is the main change (honest non-filler line)
// No beauty score, no age, no attractiveness language — ever.
// ─────────────────────────────────────────────────────────────────────────────

/** Face order, top → bottom. */
export const ZONE_ORDER: ZoneKey[] = [
  "temples",
  "teartrough",
  "cheeks",
  "nasolabial",
  "lips",
  "marionette",
  "chin",
  "jawline",
];

export function isZoneKey(v: unknown): v is ZoneKey {
  return typeof v === "string" && (ZONE_ORDER as string[]).includes(v);
}

/** Change below this reads "Well supported". */
export const SOME_CHANGE_AT = 30;
/** Change at or above this reads "Noticeable change". */
export const NOTICEABLE_AT = 60;

export const STATUS_LABEL: Record<ZoneStatus, string> = {
  well_supported: "Well supported",
  some_change: "Some change",
  noticeable_change: "Noticeable change",
};

export interface ZoneMeta {
  key: ZoneKey;
  label: string;
  /** Lower-case name for running copy ("your cheeks"). */
  name: string;
  /** True when "is/are" agreement needs the plural. */
  plural: boolean;
  /** Neutral area name for leave-alone sentences ("your under-eye area looks well supported"). */
  area: string;
  areaPlural: boolean;
  /** What change in this zone usually looks like. */
  looksLike: string;
  /** Why it happens — explains the cause, not just the area. */
  cause: string;
  /** How a doctor might support it, in cosmetic terms. */
  support: string;
}

export const ZONES: Record<ZoneKey, ZoneMeta> = {
  temples: {
    key: "temples",
    area: "temples",
    areaPlural: true,
    label: "Temples",
    name: "temples",
    plural: true,
    looksLike: "A soft hollow at the side of the forehead, beside the outer brow.",
    cause:
      "The temples lose a little fat and bone support over time, which can make the brow and eye area look more tired.",
    support:
      "A small amount of filler can restore the curve at the temple and soften the frame around the eyes.",
  },
  teartrough: {
    key: "teartrough",
    area: "under-eye area",
    areaPlural: false,
    label: "Tear trough",
    name: "under-eye hollows",
    plural: true,
    looksLike: "A groove or shadow between the lower eyelid and the cheek.",
    cause:
      "Under-eye hollows often deepen when the cheek below loses support, so the area catches shadow.",
    support:
      "A doctor places a very small amount with a gentle cannula technique to soften the shadow.",
  },
  cheeks: {
    key: "cheeks",
    area: "cheeks",
    areaPlural: true,
    label: "Cheeks (mid-face)",
    name: "cheeks",
    plural: true,
    looksLike: "Flatter cheeks, or less fullness high on the cheekbone than before.",
    cause:
      "The mid-face is where volume loss often starts. As the cheek flattens, the areas below it can look heavier.",
    support:
      "Restoring cheek support is often the first step. It can lift the look of the lower face too, so less is needed elsewhere.",
  },
  nasolabial: {
    key: "nasolabial",
    area: "area beside your nose and mouth",
    areaPlural: false,
    label: "Nasolabial lines",
    name: "lines beside your mouth",
    plural: true,
    looksLike: "Lines running from the side of the nose to the corners of the mouth.",
    cause:
      "These lines often come from lost cheek support above rather than from the line itself.",
    support:
      "Treating the cheek first can soften them more naturally. A little filler in the line can follow if it is still needed.",
  },
  lips: {
    key: "lips",
    area: "lips",
    areaPlural: true,
    label: "Lips",
    name: "lips",
    plural: true,
    looksLike: "Thinner lips, a less defined lip border, or fine lines around the mouth.",
    cause: "Lips gradually lose volume and definition over the years.",
    support:
      "A conservative amount can restore hydration, shape and balance, while keeping them looking like your own.",
  },
  marionette: {
    key: "marionette",
    area: "mouth corners",
    areaPlural: true,
    label: "Marionette lines",
    name: "lines at the corners of your mouth",
    plural: true,
    looksLike: "Lines or shadows running down from the corners of the mouth.",
    cause:
      "Shadows at the corners of the mouth often come with softening along the jaw and chin.",
    support:
      "Supporting the chin and jaw first can soften these lines. A small amount here can follow if needed.",
  },
  chin: {
    key: "chin",
    area: "chin",
    areaPlural: false,
    label: "Chin",
    name: "chin",
    plural: false,
    looksLike: "A chin that looks small or set back next to the rest of the lower face.",
    cause:
      "The chin can lose some projection over time, which affects the balance of the lower face and the jawline.",
    support:
      "Filler can add subtle projection and balance. This is often planned together with the jawline.",
  },
  jawline: {
    key: "jawline",
    area: "jawline",
    areaPlural: false,
    label: "Jawline",
    name: "jawline",
    plural: false,
    looksLike: "A softer jaw edge running from the chin back towards the ear.",
    cause:
      "Jaw definition softens with volume loss, but also with skin firmness. The two need different treatments.",
    support:
      "Where volume is the cause, filler along the jaw can restore a clearer line. Where firmness is the cause, a skin-tightening treatment may suit better.",
  },
};

function clamp(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

/** change (0–100) → the client-facing status. */
export function zoneStatus(change: number): ZoneStatus {
  const c = clamp(change);
  if (c >= NOTICEABLE_AT) return "noticeable_change";
  if (c >= SOME_CHANGE_AT) return "some_change";
  return "well_supported";
}

/**
 * Map Claude's per-zone read onto the eight report zones (face order).
 * A zone that "appears full" (often previous filler) always reads well
 * supported and is left alone. An obscured zone is never left alone and never
 * a focus — it is checked at the consultation.
 */
export function mapZones(
  zones: Partial<Record<ZoneKey, ZoneRead>>,
  obscured: ZoneKey[] = [],
): MappedZone[] {
  const hidden = new Set(obscured);
  return ZONE_ORDER.map((key) => {
    const read = zones[key];
    const appearsFull = read?.appearsFull === true;
    const change = appearsFull ? Math.min(clamp(read?.change), SOME_CHANGE_AT - 1) : clamp(read?.change);
    const status = zoneStatus(change);
    const isHidden = hidden.has(key);
    return {
      key,
      status,
      change,
      appearsFull,
      obscured: isHidden,
      leaveAlone: !isHidden && (appearsFull || status === "well_supported"),
      note: typeof read?.note === "string" ? read.note.trim() : "",
    };
  });
}

/** Zones with change worth discussing, most-affected first. */
export function focusZones(mapped: MappedZone[]): ZoneKey[] {
  return mapped
    .filter((z) => !z.obscured && !z.leaveAlone && z.status !== "well_supported")
    .sort((a, b) => b.change - a.change || ZONE_ORDER.indexOf(a.key) - ZONE_ORDER.indexOf(b.key))
    .map((z) => z.key);
}

/** Every zone in the order the face map shows them: most-affected first, covered last. */
export function mapOrder(mapped: MappedZone[]): MappedZone[] {
  const rank = (z: MappedZone) => (z.obscured ? -1000 : 0) + (z.leaveAlone ? -100 : 0) + z.change;
  return [...mapped].sort(
    (a, b) => rank(b) - rank(a) || ZONE_ORDER.indexOf(a.key) - ZONE_ORDER.indexOf(b.key),
  );
}

export function leaveAloneZones(mapped: MappedZone[]): ZoneKey[] {
  return mapped.filter((z) => z.leaveAlone).map((z) => z.key);
}

/** "a", "a and b", "a, b and c". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const PROPORTION_ZONES: ZoneKey[] = ["lips", "chin"];

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * The explicit "leave alone" sentences — the report's trust-builder.
 *  · lips / chin in proportion → "Your lips and chin are already in proportion — we wouldn't add volume here."
 *  · any other supported zone  → "Your temples and jawline look well supported — we'd leave them as they are."
 *  · a zone that already looks full → "Your lips already look full — we wouldn't add more here. …"
 */
export function leaveAloneLines(mapped: MappedZone[]): string[] {
  const alone = mapped.filter((z) => z.leaveAlone);
  const full = alone.filter((z) => z.appearsFull);
  const supported = alone.filter((z) => !z.appearsFull);
  const lines: string[] = [];

  const proportion = supported.filter((z) => PROPORTION_ZONES.includes(z.key));
  if (proportion.length > 0) {
    const names = proportion.map((z) => ZONES[z.key].name);
    const plural = proportion.length > 1 || ZONES[proportion[0].key].plural;
    lines.push(
      `Your ${joinNames(names)} ${plural ? "are" : "is"} already in proportion — we wouldn't add volume here.`,
    );
  }

  const others = supported.filter((z) => !PROPORTION_ZONES.includes(z.key));
  if (others.length > 0) {
    const names = others.map((z) => ZONES[z.key].area);
    const plural = others.length > 1 || ZONES[others[0].key].areaPlural;
    lines.push(
      `Your ${joinNames(names)} ${plural ? "look" : "looks"} well supported — we'd leave ${plural ? "them" : "it"} as ${plural ? "they are" : "it is"}.`,
    );
  }

  if (full.length > 0) {
    const names = full.map((z) => ZONES[z.key].name);
    const plural = full.length > 1 || ZONES[full[0].key].plural;
    lines.push(
      `${capitalise(`your ${joinNames(names)}`)} already ${plural ? "look" : "looks"} full — we wouldn't add more here. Your doctor can review any previous treatment with you.`,
    );
  }
  return lines;
}

/**
 * Cause notes: explain where a change usually comes from, so the plan treats
 * the cause first. At most three, in plan order.
 */
export function causeNotes(mapped: MappedZone[]): string[] {
  const by = Object.fromEntries(mapped.map((z) => [z.key, z])) as Record<ZoneKey, MappedZone>;
  const changed = (k: ZoneKey) => {
    const z = by[k];
    return Boolean(z) && !z.obscured && !z.leaveAlone && z.status !== "well_supported";
  };
  const notes: string[] = [];
  if (changed("nasolabial") && changed("cheeks")) {
    notes.push(
      "Lines beside your mouth often come from lost cheek support above. Treating the cheek first can soften them more naturally.",
    );
  }
  if (changed("teartrough") && changed("cheeks")) {
    notes.push(
      "Under-eye hollows can deepen when the cheek below loses support. Restoring the cheek first often means less is needed under the eye.",
    );
  }
  if (changed("marionette") && (changed("chin") || changed("jawline"))) {
    notes.push(
      "Shadows at the corners of your mouth often come with softening along the chin and jaw. Supporting those first can soften the area more naturally.",
    );
  }
  if (changed("temples") && notes.length < 3) {
    notes.push(
      "Temple hollowing is easy to miss, but it can make the whole eye area look more tired. A little support there can soften the frame of the face.",
    );
  }
  return notes.slice(0, 3);
}

/** Laxity at or above this can make firmness the main story. */
export const FIRMNESS_LAXITY_AT = 55;
/** …when it also exceeds the largest volume change by this margin. */
export const FIRMNESS_MARGIN = 10;

/**
 * True when skin firmness, not volume, is the main visible change, so the report
 * says honestly that filler may not be the answer (Nu Sculpt / skin quality).
 */
export function isFirmnessDominant(params: {
  skinLaxity: number;
  jowlGrade: JowlGrade;
  mapped: MappedZone[];
}): boolean {
  const laxity = clamp(params.skinLaxity);
  const maxChange = Math.max(
    0,
    ...params.mapped.filter((z) => !z.obscured).map((z) => z.change),
  );
  if (laxity >= FIRMNESS_LAXITY_AT && laxity >= maxChange + FIRMNESS_MARGIN) return true;
  if (params.jowlGrade === "advanced" && laxity >= 45 && laxity >= maxChange) return true;
  return false;
}

/** Everything zone-derived for the result envelope. */
export function deriveZones(assessment: Pick<
  PhotoAssessment,
  "zones" | "zonesObscured" | "skinLaxity" | "jowlGrade"
>) {
  const mapped = mapZones(assessment.zones, assessment.zonesObscured);
  return {
    zones: mapped,
    focusZones: focusZones(mapped),
    leaveAloneZones: leaveAloneZones(mapped),
    causeNotes: causeNotes(mapped),
    firmnessDominant: isFirmnessDominant({
      skinLaxity: assessment.skinLaxity,
      jowlGrade: assessment.jowlGrade,
      mapped,
    }),
  };
}
