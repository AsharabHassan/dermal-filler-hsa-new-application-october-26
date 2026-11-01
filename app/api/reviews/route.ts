import { fallbackFeed, normalizePlace, placeIdFor, type PlaceResponse } from "@/lib/google-reviews";
import type { ClinicLocationKey } from "@/lib/constants";

export const runtime = "nodejs";

// /api/reviews?clinic=london — the clinic's Google reviews for the result
// screen. Fetched from the Google Places API (New) and cached for a day; when
// the key or Place ID is missing, or Google fails, the recorded headline rating
// is returned with no quotes, so the page never shows made-up reviews.

const PLACES = "https://places.googleapis.com/v1/places";
const FIELDS = "rating,userRatingCount,reviews,googleMapsUri";
const DAY = 60 * 60 * 24;

export async function GET(request: Request): Promise<Response> {
  const clinic: ClinicLocationKey = new URL(request.url).searchParams.get("clinic") === "glasgow" ? "glasgow" : "london";
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = placeIdFor(clinic);
  const cacheHeaders = { "cache-control": `public, max-age=0, s-maxage=${DAY}, stale-while-revalidate=${DAY}` };
  if (!key || !placeId) return Response.json(fallbackFeed(clinic), { headers: cacheHeaders });

  try {
    const res = await fetch(`${PLACES}/${encodeURIComponent(placeId)}?languageCode=en-GB`, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS },
      next: { revalidate: DAY },
    });
    if (!res.ok) {
      console.error("[reviews] places", res.status, (await res.text().catch(() => "")).slice(0, 200));
      return Response.json(fallbackFeed(clinic), { headers: cacheHeaders });
    }
    const place = (await res.json()) as PlaceResponse;
    return Response.json(normalizePlace(clinic, place), { headers: cacheHeaders });
  } catch (err) {
    console.error("[reviews] request failed", err instanceof Error ? err.message : err);
    return Response.json(fallbackFeed(clinic), { headers: cacheHeaders });
  }
}
