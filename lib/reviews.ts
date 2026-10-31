// ─────────────────────────────────────────────────────────────────────────────
// Patient reviews shown on the result screen.
//
// EMPTY BY DESIGN: the Harley Street Aesthetics reference app (pigmentation
// analyzer) only ships labelled sample copy ("Sample Review — replace before
// go-live"), not real testimonials, so nothing is reused here. Add HSA's own
// verified reviews (e.g. exported from Google) below, verbatim, with the
// reviewer name and date as published. While REVIEWS is empty the
// testimonials section renders nothing.
// ─────────────────────────────────────────────────────────────────────────────

export type ReviewSource = "google" | "website";

export interface Review {
  /** Reviewer name as published, or a neutral label when the source is anonymous. */
  name: string;
  /** Relative or absolute date as published. */
  date: string;
  source: ReviewSource;
  stars: 5;
  quote: string;
}

/**
 * Google Business Profile headline rating for the London clinic, as recorded
 * in the reference app's landing content (checked 2026-09-19).
 */
export const GOOGLE_RATING = { score: "4.6", count: 219 } as const;

// TODO(HSA): add verified patient reviews.
export const REVIEWS: Review[] = [];
