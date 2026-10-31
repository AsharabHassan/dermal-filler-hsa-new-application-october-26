import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ADVERTISING_CONSENT_STORAGE_KEY,
  getAdvertisingConsent,
  getConfiguredProductionHostname,
  isExactProductionHost,
  setAdvertisingConsent,
  syncAdvertisingConsentFromStorage,
} from "@/lib/meta-consent";
import {
  getCanonicalPageUrl,
  getMetaAttribution,
  META_PIXEL_ID,
  revokeMetaPixel,
} from "@/lib/meta-pixel";

describe("Meta advertising consent", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete window.__sqAdvertisingConsent;
    document.cookie = "_fbp=; Max-Age=0; Path=/";
    document.cookie = "_fbc=; Max-Age=0; Path=/";
  });

  it("ships with no hard-coded pixel id", () => {
    expect(META_PIXEL_ID).toBe("");
  });

  it("starts unset and persists an explicit choice without creating Meta cookies", () => {
    expect(getAdvertisingConsent()).toBe("unset");

    setAdvertisingConsent("granted");

    expect(getAdvertisingConsent()).toBe("granted");
    expect(window.localStorage.getItem(ADVERTISING_CONSENT_STORAGE_KEY)).toBe(
      "granted",
    );
    expect(document.cookie).not.toContain("_fbp=");
    expect(document.cookie).not.toContain("_fbc=");
  });

  it("keeps an explicit choice in memory when localStorage is blocked", () => {
    const storageSpy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("blocked", "SecurityError");
      });

    setAdvertisingConsent("denied");

    expect(getAdvertisingConsent()).toBe("denied");
    storageSpy.mockRestore();
  });

  it("applies cross-tab storage changes to the in-memory choice", () => {
    setAdvertisingConsent("granted");

    syncAdvertisingConsentFromStorage({
      key: ADVERTISING_CONSENT_STORAGE_KEY,
      newValue: "denied",
      storageArea: window.localStorage,
    });

    expect(getAdvertisingConsent()).toBe("denied");
  });

  it("requires an exact hostname match", () => {
    const siteUrl = "https://undereye.harleystreetaesthetic.clinic/path";

    expect(getConfiguredProductionHostname(siteUrl)).toBe(
      "undereye.harleystreetaesthetic.clinic",
    );
    expect(isExactProductionHost("undereye.harleystreetaesthetic.clinic", siteUrl)).toBe(true);
    expect(isExactProductionHost("preview.harleystreetaesthetic.clinic", siteUrl)).toBe(false);
    expect(isExactProductionHost("localhost", siteUrl)).toBe(false);
  });

  it("removes query parameters and fragments from attribution URLs", () => {
    expect(
      getCanonicalPageUrl(
        "https://undereye.harleystreetaesthetic.clinic/london?utm_source=meta&fbclid=secret#result",
      ),
    ).toBe("https://undereye.harleystreetaesthetic.clinic/london");
  });

  it("returns no attribution when consent or production-host checks fail", () => {
    setAdvertisingConsent("granted");
    expect(getMetaAttribution()).toBeUndefined();
  });

  it("removes accessible Meta identifiers on revoke", () => {
    document.cookie = "_fbp=legacy-browser-id; Path=/";
    document.cookie = "_fbc=legacy-click-id; Path=/";

    revokeMetaPixel();

    expect(document.cookie).not.toContain("_fbp=");
    expect(document.cookie).not.toContain("_fbc=");
  });
});
