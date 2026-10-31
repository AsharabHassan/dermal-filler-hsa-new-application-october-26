import { deliverReportToGhl } from "@/lib/ghl-report";
import { baseTags } from "@/lib/ghl";
import {
  CLINIC,
  DEFAULT_CLINIC_LOCATION,
  getClinicLocation,
  isClinicLocationKey,
} from "@/lib/constants";
import type { ClinicLocationKey } from "@/lib/types";

export const runtime = "nodejs";

interface ReportRequest {
  lead?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  focusZones?: string[];
  pdfBase64?: string;
  clinicLocation?: ClinicLocationKey;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_PDF_BYTES / 3) * 4;

function cleanText(value: string | undefined, maxLength: number): string {
  // Strip control characters (including NUL and DEL) without embedding raw
  // control bytes in this source file.
  let out = "";
  for (const ch of value ?? "") {
    const code = ch.codePointAt(0) ?? 0;
    out += code < 0x20 || code === 0x7f ? " " : ch;
  }
  return out.trim().slice(0, maxLength);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function validPdfBase64(value: string): boolean {
  if (
    !value ||
    value.length > MAX_BASE64_LENGTH ||
    value.length % 4 !== 0 ||
    !BASE64_RE.test(value)
  ) {
    return false;
  }
  const bytes = Buffer.from(value, "base64");
  return (
    bytes.byteLength <= MAX_PDF_BYTES &&
    bytes.subarray(0, 5).toString("ascii") === "%PDF-"
  );
}

/**
 * Keep the endpoint from being driven cross-site as a mail relay: an attacker
 * could otherwise POST any address + PDF and have the clinic's own GHL account
 * send it. Compared against the request's OWN origin, never a hardcoded one, so
 * this holds on localhost, previews and production alike. The app always sends
 * an Origin header for this JSON POST, so callers without one are rejected.
 */
export function isSameOriginReportRequest(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site")?.trim().toLowerCase();
  if (fetchSite && fetchSite !== "same-origin") return false;

  const originHeader = request.headers.get("origin")?.trim().toLowerCase();
  if (!originHeader) return false;

  try {
    return originHeader === new URL(request.url).origin.toLowerCase();
  } catch {
    return false;
  }
}

// POST /api/report — the browser-generated report PDF arrives here as base64.
// We upload it into GoHighLevel, write the hosted URL onto the contact, pin a
// note, and email the patient their copy with the PDF attached. This is the
// automatic report delivery: it runs on every lead, with no feature flag and no
// separate opt-in. Always returns 200 with a status summary so it never blocks
// the lead flow, and no-ops cleanly when the GHL env isn't configured.
export async function POST(request: Request): Promise<Response> {
  let body: ReportRequest;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new TypeError("invalid report request");
    }
    body = parsed as ReportRequest;
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  if (!isSameOriginReportRequest(request)) {
    return Response.json(
      { ok: false, skipped: true, error: "forbidden-report-origin" },
      { status: 403 },
    );
  }

  const lead = body.lead;
  const email = cleanText(lead?.email, 254);
  if (!EMAIL_RE.test(email) || !body.pdfBase64 || !validPdfBase64(body.pdfBase64)) {
    return Response.json({ ok: false, skipped: true });
  }

  const first = cleanText(lead?.firstName, 80);
  const last = cleanText(lead?.lastName, 80);
  const phone = cleanText(lead?.phone, 40);
  const focus = Array.isArray(body.focusZones)
    ? body.focusZones.filter((z): z is string => typeof z === "string").map((z) => cleanText(z, 20)).slice(0, 8)
    : [];
  const emailFirst = escapeHtml(first || "there");
  const clinicLocation = isClinicLocationKey(body.clinicLocation)
    ? body.clinicLocation
    : DEFAULT_CLINIC_LOCATION;
  const clinic = getClinicLocation(clinicLocation);

  const safeName = (first || "client").replace(/[^\w-]/g, "") || "client";
  const fileName = `Facial-Volume-Scan-${safeName}.pdf`;
  const subject = `${first ? `${first}, your` : "Your"} Facial Volume Scan report`;

  const emailHtml = `
    <div style="font-family:Manrope,Helvetica,Arial,sans-serif;color:#1c1813;line-height:1.6">
      <p>Hi ${emailFirst},</p>
      <p>Thank you for taking the Facial Volume Scan with
      <strong>${CLINIC.name} ${clinic.city}</strong>. Your pre-consultation report is attached as a PDF.
      It shows where your face looks well supported, and where some volume has changed.</p>
      <p>It's step 2 of 4. Next is your free online consultation, where one of our
      GMC-registered doctors reviews your report with you and confirms what suits you.</p>
      <p><a href="${clinic.bookingUrl}" style="color:#b8902a">Book your free consultation →</a></p>
      <p style="color:#5c5852;font-size:12px">Not a diagnosis. Suitability confirmed at your consultation. Results vary.</p>
      <p style="color:#5c5852">— ${CLINIC.name}, ${clinic.city}</p>
    </div>`;

  const noteParts = [`📄 ${clinic.city} Facial Volume Scan report`];
  if (focus.length > 0) noteParts.push(`— focus: ${focus.join(", ")}`);
  const noteBody = `${noteParts.join(" ")}: {url}`;

  const result = await deliverReportToGhl({
    firstName: first,
    lastName: last,
    email,
    phone,
    pdfBase64: body.pdfBase64,
    fileName,
    subject,
    emailHtml,
    noteBody,
    source: `Facial Volume Scan · ${clinic.city}`,
    tags: baseTags(clinic.key),
  });

  // Surface the failure category in the server log without leaking the PDF or
  // the patient's contact details.
  if (!result.ok && !result.skipped) {
    console.error("[api/report] GHL delivery failed:", result.error);
  }
  return Response.json(result);
}
