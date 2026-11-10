import "server-only";
import { after } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// SkinScan agreement log. After Claude decides, record whether its call agrees
// with the HSA SkinScan reading. Customers see nothing: the record (labels and
// scores only, never the photo or personal details) goes to SkinScan /agreement,
// whose /agreement/summary gives real accuracy numbers over time.
// ─────────────────────────────────────────────────────────────────────────────

export type AgreementChecks = Record<string, boolean>;

const APP = "hsa-fillers-app";

/** Schedules the POST after the response is sent. Never throws, never delays the customer. */
export function reportAgreement(
  concern: string,
  skinscan: Record<string, unknown>,
  claude: Record<string, unknown>,
  agree: AgreementChecks,
): void {
  console.info(`[skinscan-agreement] ${concern}`, JSON.stringify({ skinscan, claude, agree }));
  const url = process.env.SKINSCAN_URL?.trim();
  if (!url) return;
  const key = process.env.SKINSCAN_API_KEY?.trim();
  const send = async () => {
    try {
      await fetch(`${url.replace(/\/$/, "")}/agreement`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(key ? { "x-skinscan-key": key } : {}) },
        body: JSON.stringify({ app: APP, concern, skinscan, claude, agree }),
        signal: AbortSignal.timeout(3_000),
      });
    } catch {
      // Logging only: never affects the result.
    }
  };
  try {
    after(send);
  } catch {
    void send(); // outside a request scope (e.g. tests)
  }
}
