import type { ClientMetaAttribution } from "./types";
import {
  getConfiguredProductionHostname,
  hasMetaTrackingConsent,
  isExactProductionHost,
} from "./meta-consent";

/**
 * Meta Pixel id. Deliberately NOT hard-coded: this app ships with no pixel
 * and only measures once the client's own id is configured at deploy time.
 */
export const META_PIXEL_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "").trim();

type FbqFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;
    __sqMetaPixelInitialized?: boolean;
    __sqMetaPageViewTracked?: boolean;
  }
}
function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/** Return a campaign-safe URL with no query parameters or fragment. */
export function getCanonicalPageUrl(url: string): string | null {
  try {
    const canonical = new URL(url);
    canonical.search = "";
    canonical.hash = "";
    return canonical.toString();
  } catch {
    return null;
  }
}

/**
 * Build the only browser-owned fields accepted by the lead endpoint.
 * No attribution leaves the browser without consent or from a preview host.
 */
export function getMetaAttribution(): ClientMetaAttribution | undefined {
  if (typeof window === "undefined" || !hasMetaTrackingConsent()) {
    return undefined;
  }

  const fbclid = new URLSearchParams(window.location.search).get("fbclid");
  const fbc =
    readCookie("_fbc") ??
    (fbclid ? `fb.1.${Date.now()}.${fbclid}` : null);

  return {
    fbp: readCookie("_fbp"),
    fbc,
    eventSourceUrl: getCanonicalPageUrl(window.location.href),
  };
}

/** Queue the one permitted browser event after consent and host checks pass. */
export function initializeMetaPixel(): void {
  if (
    typeof window === "undefined" ||
    typeof window.fbq !== "function" ||
    !META_PIXEL_ID ||
    !hasMetaTrackingConsent() ||
    !isExactProductionHost()
  ) {
    return;
  }

  // Re-grant on every accepted state transition. This is idempotent and is
  // required when a visitor rejects after accepting, then later opts back in.
  window.fbq("consent", "grant");

  if (!window.__sqMetaPixelInitialized) {
    window.fbq("init", META_PIXEL_ID);
    window.__sqMetaPixelInitialized = true;
  }

  if (!window.__sqMetaPageViewTracked) {
    window.fbq("track", "PageView");
    window.__sqMetaPageViewTracked = true;
  }
}

/** Revoke Meta consent and remove the first-party identifiers we can access. */
export function revokeMetaPixel(): void {
  if (typeof window === "undefined") return;

  if (typeof window.fbq === "function") {
    window.fbq("consent", "revoke");
  }

  if (typeof document !== "undefined") {
    const host = getConfiguredProductionHostname();
    const domains = host
      ? [host, `.${host}`, host.replace(/^[^.]+\./, ""), `.${host.replace(/^[^.]+\./, "")}`]
      : [];
    for (const cookie of ["_fbp", "_fbc"]) {
      document.cookie = `${cookie}=; Max-Age=0; Path=/; SameSite=Lax`;
      // Remove identifiers scoped to the configured production domain and its
      // parent. Deliberately explicit; never attempt broad public-suffix deletion.
      for (const domain of domains) {
        document.cookie = `${cookie}=; Max-Age=0; Path=/; Domain=${domain}; SameSite=Lax`;
      }
    }
  }
}
