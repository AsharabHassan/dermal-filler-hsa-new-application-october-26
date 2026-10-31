import { jsPDF } from "jspdf";

// ─────────────────────────────────────────────────────────────────────────────
// HSA Facial Volume Scan report — bright beige + gold, never dark. Pure jsPDF
// (no browser canvas) so it is unit-testable; lib/report.ts renders the
// annotated face image in the browser. No score, no age, no attractiveness.
// ─────────────────────────────────────────────────────────────────────────────

type RGB = [number, number, number];

const P = {
  bg: [251, 247, 240] as RGB,
  panel: [255, 253, 248] as RGB,
  accent: [194, 154, 58] as RGB,
  accentDeep: [154, 116, 38] as RGB,
  sage: [97, 118, 108] as RGB,
  heading: [43, 34, 24] as RGB,
  body: [93, 82, 68] as RGB,
  faint: [140, 128, 112] as RGB,
  line: [226, 212, 186] as RGB,
};

export interface ReportZone {
  label: string;
  status: string;
  /** What we see. */
  see: string;
  /** Why it happens (focus zones). */
  why: string;
  /** What could help — the rule-based heading plus detail. */
  help: string;
  /** What filler could do here (focus zones only). */
  benefit: string;
  leaveAlone: boolean;
  obscured: boolean;
}

export interface ReportMeasurement {
  label: string;
  value: string;
  detail?: string;
}

export interface ReportPlanItem {
  label: string;
  volume: string;
  price: string;
  why: string;
  stage: "start" | "review";
}

export interface ReportInput {
  clinicName: string;
  byline: string;
  addressLines: string[];
  email: string;
  bookingUrl: string;
  preparedFor?: string;
  dateStr: string;
  headline: string;
  narrative: string;
  finding: string;
  encouragement: string;
  /** "What's happening to your face" bullets. */
  summary: string[];
  measurements: ReportMeasurement[];
  faceImageDataUrl?: string | null;
  faceImageAspect?: number;
  zones: ReportZone[];
  leaveAlone: string[];
  causeNotes: string[];
  firmnessLine: string | null;
  historyLine: string | null;
  plan: ReportPlanItem[];
  startMl: string | null;
  offerLine: string | null;
  journey: { label: string; detail: string }[];
  priceNote: string;
  disclaimer: string;
}

const PW = 210;
const PH = 297;
const M = 17;
const CW = PW - M * 2;

export function buildReportPdf(input: ReportInput): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let page = 1;
  let y = 0;

  const bg = () => {
    doc.setFillColor(...P.bg);
    doc.rect(0, 0, PW, PH, "F");
  };
  const footer = () => {
    doc.setDrawColor(...P.line);
    doc.setLineWidth(0.2);
    doc.line(M, PH - 14, PW - M, PH - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...P.faint);
    doc.text(input.disclaimer, M, PH - 10, { maxWidth: CW - 12 });
    doc.text(String(page), PW - M, PH - 10, { align: "right" });
  };
  const header = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...P.accentDeep);
    doc.text(input.clinicName.toUpperCase(), M, 14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...P.faint);
    doc.text("Facial Volume Scan · Pre-consultation report", PW - M, 14, { align: "right" });
    doc.setDrawColor(...P.line);
    doc.line(M, 18, PW - M, 18);
  };
  const ensure = (need: number) => {
    if (y + need > PH - 20) {
      footer();
      doc.addPage();
      page += 1;
      bg();
      header();
      y = 28;
    }
  };
  const para = (text: string, size = 9.5, color: RGB = P.body, width = CW, gap = 2) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, width) as string[];
    const h = lines.length * size * 0.42;
    ensure(h + gap);
    doc.text(lines, M, y);
    y += h + gap;
  };
  const section = (title: string) => {
    ensure(16);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(...P.heading);
    doc.text(title, M, y);
    doc.setDrawColor(...P.accent);
    doc.setLineWidth(0.6);
    doc.line(M, y + 2.5, M + 16, y + 2.5);
    y += 9;
  };

  // ── Cover ────────────────────────────────────────────────────────────
  bg();
  doc.setDrawColor(...P.line);
  doc.setLineWidth(0.3);
  doc.rect(8, 8, PW - 16, PH - 16, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.setTextColor(...P.heading);
  doc.text(input.clinicName, PW / 2, 30, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...P.accentDeep);
  doc.text(input.byline.toUpperCase(), PW / 2, 36, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...P.faint);
  doc.text("FACIAL VOLUME SCAN · STEP 2 OF 4", PW / 2, 45, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...P.body);
  doc.text(
    [input.preparedFor ? `Prepared for ${input.preparedFor}` : "", input.dateStr].filter(Boolean).join("   ·   "),
    PW / 2,
    51,
    { align: "center" },
  );
  y = 62;

  if (input.faceImageDataUrl) {
    const aspect = input.faceImageAspect && input.faceImageAspect > 0 ? input.faceImageAspect : 0.8;
    const h = 92;
    const w = Math.min(CW, h * aspect);
    try {
      doc.addImage(input.faceImageDataUrl, "JPEG", (PW - w) / 2, y, w, h);
      y += h + 6;
    } catch {
      /* image is optional */
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...P.heading);
  const hl = doc.splitTextToSize(input.headline, CW) as string[];
  doc.text(hl, PW / 2, y, { align: "center" });
  y += hl.length * 6.5 + 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...P.accentDeep);
  const fl = doc.splitTextToSize(input.finding, CW - 10) as string[];
  doc.text(fl, PW / 2, y, { align: "center" });
  y += fl.length * 4.6 + 4;
  para(input.narrative, 9.5);

  // ── What's happening to your face ────────────────────────────────────
  if (input.summary.length > 0) {
    section("What's happening to your face");
    for (const line of input.summary) para(`•  ${line}`, 10, P.heading, CW, 2.5);
  }

  // ── Volume & Structure Map, zone by zone ─────────────────────────────
  section("Your Volume & Structure Map");
  const labelled = (label: string, text: string) => {
    if (!text) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...P.accentDeep);
    ensure(8);
    doc.text(label, M + 3, y);
    y += 3.6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...P.body);
    const lines = doc.splitTextToSize(text, CW - 6) as string[];
    ensure(lines.length * 3.6 + 1);
    doc.text(lines, M + 3, y);
    y += lines.length * 3.6 + 1.6;
  };
  for (const z of input.zones) {
    ensure(18);
    doc.setDrawColor(...P.line);
    doc.setLineWidth(0.2);
    doc.line(M, y - 4, PW - M, y - 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...P.heading);
    doc.text(z.label, M + 3, y + 0.5);
    doc.setFontSize(7.5);
    const statusText = z.obscured ? "CHECKED AT CONSULTATION" : z.status.toUpperCase();
    doc.setTextColor(...(z.leaveAlone ? P.sage : P.accentDeep));
    doc.text(statusText + (z.leaveAlone ? " · LEAVE ALONE" : ""), PW - M - 3, y + 0.5, { align: "right" });
    y += 6;
    labelled("What we see", z.see);
    if (!z.leaveAlone && !z.obscured) {
      labelled("Why it happens", z.why);
      labelled("What could help", z.help);
      labelled("What filler could do here", z.benefit);
    }
    y += 3;
  }

  // ── Scan measurements ────────────────────────────────────────────────
  if (input.measurements.length > 0) {
    section("Your scan measurements");
    para("Measured from your photo by HSA SkinScan, the clinic's own analysis model. Readings of the photo, not scores of you.", 8, P.faint);
    for (const m of input.measurements) {
      ensure(6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...P.body);
      doc.text(m.label, M + 3, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...P.heading);
      doc.text(`${m.value}${m.detail ? `  (${m.detail})` : ""}`, PW - M - 3, y, { align: "right" });
      y += 5.2;
    }
  }

  if (input.firmnessLine) {
    section("An honest note");
    para(input.firmnessLine, 9.5, P.heading);
  }
  if (input.leaveAlone.length > 0) {
    section("What we'd leave alone");
    for (const l of input.leaveAlone) para(l, 10, P.heading);
  }
  if (input.causeNotes.length > 0) {
    section("Why these changes happen");
    for (const n of input.causeNotes) para(n);
  }
  if (input.historyLine) para(input.historyLine, 9, P.body);

  // ── Plan preview ─────────────────────────────────────────────────────
  section("Your conservative plan preview");
  if (input.plan.length === 0) {
    para("Your face looks well supported. There is nothing we would rush to add.");
  }
  for (const item of input.plan) {
    ensure(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...P.heading);
    doc.text(`${item.label}${item.stage === "review" ? "  (review later, only if needed)" : ""}`, M, y);
    doc.setFontSize(8.5);
    doc.setTextColor(...P.accentDeep);
    doc.text(item.price, PW - M, y, { align: "right" });
    y += 4.5;
    para(`${item.volume.charAt(0).toUpperCase()}${item.volume.slice(1)}. ${item.why}`, 8.5);
  }
  if (input.startMl) para(`Suggested starting volume: ${input.startMl} in total, built up gradually.`, 9, P.heading);
  if (input.offerLine) para(input.offerLine, 9.5, P.accentDeep);
  para(input.priceNote, 7.5, P.faint);

  // ── Next steps ───────────────────────────────────────────────────────
  section("Your next steps");
  input.journey.forEach((s, i) => para(`${i + 1}. ${s.label}: ${s.detail}`, 9));
  para(input.encouragement, 9.5, P.heading);
  para(`Book: ${input.bookingUrl}   ·   ${input.email}`, 8.5, P.accentDeep);
  para(input.addressLines.join(", "), 8, P.faint);

  footer();
  return doc.output("blob");
}
