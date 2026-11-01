import type { ClinicLocationKey } from "./constants";

// ─────────────────────────────────────────────────────────────────────────────
// Google reviews for the result screen. Live data comes from the Google Places
// API (New) through /api/reviews when GOOGLE_PLACES_API_KEY and the clinic's
// GOOGLE_PLACE_ID_* are set; otherwise the section shows the recorded headline
// rating with a link to Google and no quotes (never sample reviews). Pure
// normalisation here; tested in test/google-reviews.test.ts.
// ─────────────────────────────────────────────────────────────────────────────

export interface FeedReview {
  name: string;
  /** "2 weeks ago" as Google phrases it. */
  when: string;
  stars: number;
  text: string;
  photo: string | null;
}

export interface ReviewFeed {
  clinic: ClinicLocationKey;
  rating: number | null;
  count: number | null;
  reviews: FeedReview[];
  /** Where "See all reviews on Google" goes. */
  url: string;
  /** True when the feed came from Google just now (or the daily cache). */
  live: boolean;
}

/**
 * Headline rating recorded from the London clinic's Google Business Profile
 * (4.6 from 219 reviews, checked 19 Sep 2026). Used until the live feed is
 * configured; the count is shown as "200+" so it never overstates.
 */
export const RECORDED_RATING = { score: 4.6, count: 219 } as const;

const SEARCH_URL: Record<ClinicLocationKey, string> = {
  london: "https://www.google.com/search?q=Harley+Street+Aesthetics+London+reviews",
  glasgow: "https://www.google.com/search?q=Harley+Street+Aesthetics+Glasgow+reviews",
};

export function fallbackFeed(clinic: ClinicLocationKey): ReviewFeed {
  return {
    clinic,
    rating: RECORDED_RATING.score,
    count: RECORDED_RATING.count,
    reviews: [],
    url: process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL || SEARCH_URL[clinic],
    live: false,
  };
}

/** Google Places API (New) `places/{id}` response, the fields we ask for. */
export interface PlaceResponse {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: {
    rating?: number;
    text?: { text?: string };
    relativePublishTimeDescription?: string;
    authorAttribution?: { displayName?: string; photoUri?: string };
  }[];
}

export const MAX_REVIEWS = 5;
export const MIN_STARS = 4;

/** Keeps 4- and 5-star reviews with real text, newest-first as Google ranks them, at most five. */
export function normalizePlace(clinic: ClinicLocationKey, place: PlaceResponse): ReviewFeed {
  const reviews: FeedReview[] = [];
  for (const r of place.reviews ?? []) {
    const text = (r.text?.text ?? "").trim();
    const stars = r.rating ?? 0;
    if (stars < MIN_STARS || text.length < 20) continue;
    reviews.push({
      name: r.authorAttribution?.displayName?.trim() || "Google user",
      when: r.relativePublishTimeDescription ?? "",
      stars,
      text,
      photo: r.authorAttribution?.photoUri ?? null,
    });
    if (reviews.length >= MAX_REVIEWS) break;
  }
  return {
    clinic,
    rating: typeof place.rating === "number" ? Math.round(place.rating * 10) / 10 : null,
    count: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    reviews,
    url: place.googleMapsUri || fallbackFeed(clinic).url,
    live: true,
  };
}

/** The Place ID for a clinic from the environment, or null when not configured. */
export function placeIdFor(
  clinic: ClinicLocationKey,
  env: Record<string, string | undefined> = process.env,
): string | null {
  const id = clinic === "glasgow" ? env.GOOGLE_PLACE_ID_GLASGOW : env.GOOGLE_PLACE_ID_LONDON;
  return id && id.trim() ? id.trim() : null;
}

/** "4.6" and "200+" style strings for the headline line. */
export function ratingLabel(feed: ReviewFeed): { score: string; count: string } | null {
  if (feed.rating === null) return null;
  const score = feed.rating.toFixed(1);
  if (feed.count === null) return { score, count: "" };
  const count = feed.live ? String(feed.count) : `${Math.floor(feed.count / 100) * 100}+`;
  return { score, count };
}
