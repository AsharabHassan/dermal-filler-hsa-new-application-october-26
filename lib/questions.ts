import type { FillerHistory, Priority, Sex } from "./types";

/** "Which best describes you?" — asked before the scan; never inferred from the photo. */
export const SEX_OPTIONS: readonly { key: Sex; label: string }[] = [
  { key: "woman", label: "Woman" },
  { key: "man", label: "Man" },
  { key: "prefer_not", label: "Prefer not to say" },
];

/** "Had filler before?" — asked before the scan, sent to GHL + Claude. */
export const FILLER_HISTORY_OPTIONS: readonly { key: FillerHistory; label: string }[] = [
  { key: "no", label: "No, never" },
  { key: "yes_happy", label: "Yes, and I was happy with it" },
  { key: "yes_unhappy", label: "Yes, but I wasn't happy with it" },
  { key: "not_sure", label: "Not sure" },
];

/** "What matters most?" — asked before the scan, sent to GHL + Claude. */
export const PRIORITY_OPTIONS: readonly { key: Priority; label: string }[] = [
  { key: "less_tired", label: "Looking less tired" },
  { key: "subtle_definition", label: "Subtle definition" },
  { key: "fix_previous", label: "Fixing previous work" },
  { key: "not_sure", label: "Not sure yet" },
];
