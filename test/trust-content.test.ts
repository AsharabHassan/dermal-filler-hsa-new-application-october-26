import { afterEach, describe, expect, it, vi } from "vitest";
import { DOCTORS, GMC_REGISTER_URL, TRUST_STATS, doctorsFor, teamPageUrl } from "@/lib/doctors";
import { FINANCE_OPTIONS, FINANCE_SMALL_PRINT, financeExample, formatPounds, instalment } from "@/lib/finance";
import { fallbackFeed, normalizePlace, placeIdFor, ratingLabel } from "@/lib/google-reviews";
import { OFFER } from "@/lib/constants";
import { GET } from "@/app/api/reviews/route";
import { sampleResult } from "./fixtures";

describe("doctors", () => {
  it("lists the published team with photos, roles and GMC-registered badges, never invented numbers", () => {
    expect(DOCTORS.length).toBe(5);
    for (const d of DOCTORS) {
      expect(d.photo).toMatch(/^\/team\/.+\.webp$/);
      expect(d.role.length).toBeGreaterThan(0);
      expect(d.gmc === null || /^\d{7}$/.test(d.gmc)).toBe(true);
    }
    expect(doctorsFor("london").map((d) => d.name)).toContain("Dr Ayda Soltanzadeh");
    expect(doctorsFor("glasgow").map((d) => d.name)).toEqual(["Dr Ayda Soltanzadeh", "Mr Khalil Al-Nakib"]);
    expect(teamPageUrl("glasgow")).toBe("https://www.harleystreetaesthetic.co.uk/glasgow/team");
    expect(GMC_REGISTER_URL).toMatch(/gmc-uk\.org/);
    expect(TRUST_STATS.map((s) => s.value)).toEqual(["GMC", "20+", "10,000+"]);
  });
});

describe("finance", () => {
  it("publishes the three options with the provider terms and small print", () => {
    expect(FINANCE_OPTIONS.map((o) => o.provider)).toEqual(["Klarna", "Clearpay", "Ideal 4 Finance"]);
    expect(FINANCE_OPTIONS.find((o) => o.key === "ideal")?.minimum).toBe(1000);
    expect(FINANCE_SMALL_PRINT).toMatch(/subject to status/);
  });

  it("works the example from the client's own plan", () => {
    expect(formatPounds(instalment(699, 3))).toBe("£233");
    expect(formatPounds(instalment(699, 4))).toBe("£175");
    const fits = financeExample({ ...sampleResult.plan, offerFits: true });
    expect(fits).toEqual({ label: `Your ${OFFER.name}`, amount: OFFER.price });
    const priced = financeExample({
      ...sampleResult.plan,
      offerFits: false,
      items: [
        { ...sampleResult.plan.items[0], stage: "start", priceFrom: 299 },
        { ...sampleResult.plan.items[0], stage: "start", priceFrom: 249 },
        { ...sampleResult.plan.items[0], stage: "review", priceFrom: null },
      ],
    });
    expect(priced.amount).toBe(548);
    const unpriced = financeExample({
      ...sampleResult.plan,
      offerFits: false,
      items: [{ ...sampleResult.plan.items[0], stage: "start", priceFrom: null }],
    });
    expect(unpriced.amount).toBe(OFFER.price);
  });
});

describe("google reviews", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("normalises a Places response, keeping only 4-5 star reviews with text, at most five", () => {
    const feed = normalizePlace("london", {
      rating: 4.64,
      userRatingCount: 231,
      googleMapsUri: "https://maps.google.com/?cid=1",
      reviews: [
        { rating: 5, text: { text: "Natural results, I just look rested. Lovely team." }, relativePublishTimeDescription: "a week ago", authorAttribution: { displayName: "A B" } },
        { rating: 2, text: { text: "Not for me, waited a long time for the appointment." }, authorAttribution: { displayName: "C D" } },
        { rating: 5, text: { text: "Great" } },
        ...Array.from({ length: 6 }, (_, i) => ({ rating: 4, text: { text: `Really pleased with the consultation and the plan ${i}.` } })),
      ],
    });
    expect(feed.live).toBe(true);
    expect(feed.rating).toBe(4.6);
    expect(feed.count).toBe(231);
    expect(feed.url).toBe("https://maps.google.com/?cid=1");
    expect(feed.reviews).toHaveLength(5);
    expect(feed.reviews[0].name).toBe("A B");
    expect(feed.reviews[1].name).toBe("Google user");
    expect(ratingLabel(feed)).toEqual({ score: "4.6", count: "231" });
  });

  it("falls back to the recorded rating with no quotes, never overstating the count", () => {
    const feed = fallbackFeed("glasgow");
    expect(feed.live).toBe(false);
    expect(feed.reviews).toEqual([]);
    expect(ratingLabel(feed)).toEqual({ score: "4.6", count: "200+" });
    expect(placeIdFor("london", {})).toBeNull();
    expect(placeIdFor("glasgow", { GOOGLE_PLACE_ID_GLASGOW: " ChIJx " })).toBe("ChIJx");
  });

  it("serves the live feed through /api/reviews when configured and the fallback otherwise", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const unconfigured = await (await GET(new Request("http://localhost/api/reviews?clinic=london"))).json();
    expect(unconfigured.live).toBe(false);

    vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-key");
    vi.stubEnv("GOOGLE_PLACE_ID_LONDON", "ChIJtest");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ rating: 4.7, userRatingCount: 240, reviews: [] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const live = await (await GET(new Request("http://localhost/api/reviews?clinic=london"))).json();
    expect(live).toMatchObject({ live: true, rating: 4.7, count: 240, reviews: [] });
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/places\/ChIJtest/);
    expect(fetchMock.mock.calls[0][1].headers["X-Goog-FieldMask"]).toMatch(/reviews/);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 403 })));
    const failed = await (await GET(new Request("http://localhost/api/reviews?clinic=london"))).json();
    expect(failed.live).toBe(false);
  });
});
