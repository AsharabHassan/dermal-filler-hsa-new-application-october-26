"use client";

import { useEffect, useState } from "react";
import type { ClinicLocationKey } from "./constants";
import { fallbackFeed, type ReviewFeed } from "./google-reviews";

// One fetch of /api/reviews per clinic per page load, shared by every section
// that shows the Google rating. Starts with the recorded rating so nothing
// jumps while Google answers.
const cache = new Map<ClinicLocationKey, Promise<ReviewFeed>>();

function load(clinic: ClinicLocationKey): Promise<ReviewFeed> {
  let p = cache.get(clinic);
  if (!p) {
    p = fetch(`/api/reviews?clinic=${clinic}`)
      .then(async (res) => (res.ok ? ((await res.json()) as ReviewFeed) : fallbackFeed(clinic)))
      .catch(() => fallbackFeed(clinic));
    cache.set(clinic, p);
  }
  return p;
}

export function useReviewFeed(clinic: ClinicLocationKey): ReviewFeed {
  const [feed, setFeed] = useState<ReviewFeed>(() => fallbackFeed(clinic));
  useEffect(() => {
    let cancelled = false;
    load(clinic).then((f) => {
      if (!cancelled) setFeed(f);
    });
    return () => {
      cancelled = true;
    };
  }, [clinic]);
  return feed;
}
