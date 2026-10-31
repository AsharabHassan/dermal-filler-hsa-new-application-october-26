import { describe, it, expect } from "vitest";
import { buildReportPdf, type ReportInput } from "@/lib/report-pdf";
import { DISCLAIMER } from "@/lib/constants";

const SAMPLE: ReportInput = {
  clinicName: "Harley Street Aesthetics",
  byline: "London · Only GMC-registered doctors inject",
  addressLines: ["1-5 Portpool Lane", "London EC1N 7UU"],
  email: "hello@harleystreetaesthetic.co.uk",
  bookingUrl: "harleystreetaesthetic.co.uk/london/contact/",
  preparedFor: "Jane",
  dateStr: "31 October 2026",
  headline: "Your face is well supported, with two areas to discuss",
  narrative: "Your lips and chin look balanced. Your cheeks show some flattening.",
  finding: "Your scan found the most change in your cheeks and temples.",
  encouragement: "A GMC-registered doctor confirms what suits you at your free online consultation.",
  faceImageDataUrl: null,
  zones: Array.from({ length: 8 }, (_, i) => ({
    label: `Zone ${i + 1}`,
    status: i < 2 ? "Some change" : "Well supported",
    note: "A short note",
    leaveAlone: i >= 2,
    obscured: i === 7,
  })),
  leaveAlone: ["Your lips and chin are already in proportion — we wouldn't add volume here."],
  causeNotes: ["Lines beside your mouth often come from lost cheek support above."],
  firmnessLine: null,
  historyLine: null,
  plan: [
    { label: "Cheeks (mid-face)", volume: "often starts with 1–2 ml", price: "From £299 (1 ml)", why: "Support first.", stage: "start" },
    { label: "Nasolabial lines", volume: "often starts with 0.5–1 ml", price: "Price confirmed at your consultation", why: "Review later.", stage: "review" },
  ],
  startMl: "1–2 ml",
  offerLine: "Your starting plan could fit our 4 ml filler plan: £699 (usually £899).",
  journey: [
    { label: "Photo scan", detail: "Done" },
    { label: "Pre-consultation report", detail: "This report" },
    { label: "Free consultation", detail: "Online" },
    { label: "Your treatment plan", detail: "Confirmed" },
  ],
  priceNote: "Starting volumes are a guide.",
  disclaimer: DISCLAIMER,
};

async function textOf(blob: Blob) {
  const bytes = Buffer.from(await blob.arrayBuffer());
  return { bytes, text: bytes.toString("latin1") };
}

describe("buildReportPdf", () => {
  it("produces a multi-page PDF with the map, leave-alone and plan sections and no score", async () => {
    const { bytes, text } = await textOf(buildReportPdf(SAMPLE));
    expect(bytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect((text.match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(text).toContain("Volume & Structure Map");
    expect(text).toContain("What we'd leave alone");
    expect(text).toContain("conservative plan preview");
    expect(text).not.toMatch(/score/i);
  });

  it("renders the honest firmness note and a plan-less report", async () => {
    const { text } = await textOf(
      buildReportPdf({
        ...SAMPLE,
        plan: [],
        startMl: null,
        offerLine: null,
        firmnessLine: "Your main change looks like skin firmness rather than volume.",
      }),
    );
    expect(text).toContain("An honest note");
    expect(text).toContain("nothing we would rush to add");
  });
});
