import { notFound } from "next/navigation";
import { DevResult } from "./DevResult";

// Development only: renders the result screen with the test fixture so the
// report layout can be checked on a phone without running a scan.
export const dynamic = "force-dynamic";

export default function DevResultPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DevResult />;
}
