"use client";

import { ExternalLink, Star } from "lucide-react";
import { useClinicLocation } from "@/components/clinic/ClinicLocationContext";
import { ratingLabel } from "@/lib/google-reviews";
import { useReviewFeed } from "@/lib/use-review-feed";

/** Google's four-colour "G". */
function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.4 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.5-5.8c-2.1 1.4-4.8 2.3-8.1 2.3-6.3 0-11.6-3.9-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * The clinic's Google rating and, when the live feed is configured, its
 * recent 4-5 star reviews. Never shows sample quotes: without a feed it is
 * the rating and a link to Google.
 */
export function GoogleReviews() {
  const clinic = useClinicLocation();
  const feed = useReviewFeed(clinic.key);
  const rating = ratingLabel(feed);
  if (!rating) return null;

  return (
    <section aria-labelledby="reviews-heading" className="scroll-mt-28">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-peach-deep">Patient reviews</p>
      <h3 id="reviews-heading" className="mt-2 font-serif text-[28px] leading-tight text-heading sm:text-[34px]">
        What our patients say
      </h3>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-body">
        <GoogleMark />
        <span className="flex gap-0.5 text-peach" aria-hidden>
          {Array.from({ length: 5 }).map((_, s) => (
            <Star key={s} size={14} fill="currentColor" strokeWidth={0} />
          ))}
        </span>
        <span>
          <span className="font-semibold text-heading">{rating.score}</span> on Google
          {rating.count ? ` from ${rating.count} reviews` : ""}
          {feed.live ? " · Verified Google reviews" : ""}
        </span>
      </p>

      {feed.reviews.length > 0 ? (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {feed.reviews.map((r, i) => (
            <li key={`${r.name}-${i}`} className="flex flex-col rounded-2xl border border-peach/20 bg-white/80 p-4 shadow-soft">
              <div className="flex gap-0.5 text-peach" aria-label={`${r.stars} out of 5 stars`}>
                {Array.from({ length: r.stars }).map((_, s) => (
                  <Star key={s} size={13} fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <blockquote className="mt-2 flex-1 text-[13.5px] leading-relaxed text-body line-clamp-6">“{r.text}”</blockquote>
              <figcaption className="mt-3 flex items-center gap-2.5">
                {r.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Google-hosted avatar
                  <img src={r.photo} alt="" width={32} height={32} loading="lazy" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-peach/10 text-[11px] font-semibold text-peach-deep">
                    {initials(r.name)}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-heading">{r.name}</span>
                  <span className="block text-[11px] text-body/60">
                    {r.when}
                    {r.when ? " · " : ""}Google
                  </span>
                </span>
              </figcaption>
            </li>
          ))}
        </ul>
      ) : null}

      <a
        href={feed.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-peach/40 bg-white/80 px-4 py-2 text-[13px] font-medium text-heading shadow-soft hover:border-peach"
      >
        <GoogleMark size={16} /> See all our reviews on Google <ExternalLink size={12} />
      </a>
    </section>
  );
}
