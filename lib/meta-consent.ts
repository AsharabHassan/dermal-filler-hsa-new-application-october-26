export type AdvertisingConsent = "granted" | "denied" | "unset";

export const ADVERTISING_CONSENT_STORAGE_KEY =
  "hsa-dermal-fillers:advertising-consent:v1";

export const ADVERTISING_CONSENT_CHANGE_EVENT =
  "hsa-dermal-fillers:advertising-consent-change";

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

declare global {
  interface Window {
    __sqAdvertisingConsent?: AdvertisingConsent;
  }
}

/** Read the visitor's persisted advertising choice without creating a cookie. */
export function getAdvertisingConsent(): AdvertisingConsent {
  if (typeof window === "undefined") return "unset";

  // An explicit choice made in this page is authoritative. This matters when
  // localStorage is readable but a later write (especially withdrawal) is
  // blocked and the persisted value is therefore stale.
  if (window.__sqAdvertisingConsent !== undefined) {
    return window.__sqAdvertisingConsent;
  }

  try {
    const stored = window.localStorage.getItem(
      ADVERTISING_CONSENT_STORAGE_KEY,
    );
    if (stored === "granted" || stored === "denied") {
      window.__sqAdvertisingConsent = stored;
      return stored;
    }
  } catch {
    // Fall through to the in-memory choice below.
  }

  return window.__sqAdvertisingConsent ?? "unset";
}

/** Apply a genuine cross-tab storage update before notifying React. */
export function syncAdvertisingConsentFromStorage(
  event: Pick<StorageEvent, "key" | "newValue" | "storageArea">,
): void {
  if (typeof window === "undefined") return;
  if (event.key !== null && event.key !== ADVERTISING_CONSENT_STORAGE_KEY) {
    return;
  }
  if (event.storageArea && event.storageArea !== window.localStorage) return;

  window.__sqAdvertisingConsent =
    event.newValue === "granted" || event.newValue === "denied"
      ? event.newValue
      : "unset";
}

/** Persist an explicit choice in localStorage and notify the mounted manager. */
export function setAdvertisingConsent(
  consent: Exclude<AdvertisingConsent, "unset">,
): void {
  if (typeof window === "undefined") return;

  // Update memory first so the choice still takes effect when storage is
  // blocked (private browsing, hardened browsers or quota/security errors).
  window.__sqAdvertisingConsent = consent;

  try {
    window.localStorage.setItem(ADVERTISING_CONSENT_STORAGE_KEY, consent);
  } catch {
    // A blocked storage API must not stop the analysis journey.
  }

  window.dispatchEvent(
    new CustomEvent<Exclude<AdvertisingConsent, "unset">>(
      ADVERTISING_CONSENT_CHANGE_EVENT,
      { detail: consent },
    ),
  );
}

export function getConfiguredProductionHostname(
  siteUrl: string | undefined = configuredSiteUrl,
): string | null {
  if (!siteUrl) return null;

  try {
    return new URL(siteUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Meta measurement is deliberately disabled on localhost and preview hosts. */
export function isExactProductionHost(
  hostname: string | undefined =
    typeof window === "undefined" ? undefined : window.location.hostname,
  siteUrl: string | undefined = configuredSiteUrl,
): boolean {
  const productionHostname = getConfiguredProductionHostname(siteUrl);
  return Boolean(
    hostname &&
      productionHostname &&
      hostname.toLowerCase() === productionHostname,
  );
}

/** The single guard used by browser measurement and lead attribution. */
export function hasMetaTrackingConsent(): boolean {
  return (
    getAdvertisingConsent() === "granted" && isExactProductionHost()
  );
}
