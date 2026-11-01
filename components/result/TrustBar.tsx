"use client";

import { ShieldCheck, Star } from "lucide-react";
import { TRUST_STATS } from "@/lib/doctors";
import { ratingLabel } from "@/lib/google-reviews";
import { useReviewFeed } from "@/lib/use-review-feed";
import { useClinicLocation } from "@/components/clinic/ClinicLocationContext";

/** Four proof points under the report headline: doctors, experience, volume, Google rating. */
export function TrustBar() {
  const clinic = useClinicLocation();
  const feed = useReviewFeed(clinic.key);
  const rating = ratingLabel(feed);

  return (
    <ul
      aria-label="Why patients trust Harley Street Aesthetics"
      className="mx-auto grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3"
    >
      {TRUST_STATS.map((s, i) => (
        <li
          key={s.value}
          className="flex items-center gap-2.5 rounded-2xl border border-peach/25 bg-white/70 px-3.5 py-3 shadow-soft"
        >
          {i === 0 && <ShieldCheck size={20} className="shrink-0 text-peach-deep" />}
          <span className="min-w-0">
            <span className="block font-serif text-[20px] leading-none text-heading">{s.value}</span>
            <span className="mt-1 block text-[11.5px] leading-tight text-body/80">{s.label}</span>
          </span>
        </li>
      ))}
      {rating && (
        <li className="flex items-center gap-2.5 rounded-2xl border border-peach/25 bg-white/70 px-3.5 py-3 shadow-soft">
          <Star size={20} className="shrink-0 fill-peach text-peach" />
          <span className="min-w-0">
            <span className="block font-serif text-[20px] leading-none text-heading">{rating.score}</span>
            <span className="mt-1 block text-[11.5px] leading-tight text-body/80">
              on Google{rating.count ? ` · ${rating.count} reviews` : ""}
            </span>
          </span>
        </li>
      )}
    </ul>
  );
}
