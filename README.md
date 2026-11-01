# HSA Facial Volume Scan · Harley Street Aesthetics

Dermal-fillers analyzer for **Harley Street Aesthetics** (London: 2 Grosvenor Gardens, SW1W 0DH and 10 Harley Street, W1G 9PF · Glasgow: Ingram House). Big idea: **"Still you."** Restore what time took, nothing it didn't.

A visitor answers three questions ("Which best describes you?" Woman / Man / Prefer not to say, "Had filler before?", "What matters most?"), confirms they are 18+, ticks the required "I'm requesting a free consultation" box, and takes a selfie. **HSA SkinScan** (the clinic's own model server) plus Claude Sonnet map eight zones — temples, tear trough, cheeks, nasolabial, lips, marionette, chin, jawline — as *Well supported / Some change / Noticeable change*. The report (step 2 of 4) shows explicit **leave-alone** zones, explains causes, gives an honest non-filler line when skin firmness dominates (Nu Sculpt / skin quality), and previews a conservative plan with "from" prices and the current 4 ml offer. No beauty, age or attractiveness score anywhere.

Cloned from the HSA Under-Eye app (journey, consent tickbox, lead gate, GHL calendar, StickyBookingBar, webhook, London/Glasgow routes); report layout follows the Pigmentation app.

### Report order (owner-specified, Nov 2026)

NextStepCard (finding + offer) → **What's happening to your face** (3–5 structural bullets for this face) beside the photo with the 8-zone pins → **focus zone cards** (What we see / Why it happens / What could help, "What filler could do here", real HSA before/after for lips and tear trough) → **See the possible difference** (personal AI illustration) → zones holding up well → **Your scan measurements** (HSA SkinScan, plain language) → plan + 4 ml £699 offer → calendar.

- "What could help" headings come from `zoneHelp()` in `lib/plan.ts` (rules, not Claude), so a card can never contradict the map or the plan. Claude's tailored sentence sits underneath.
- **Sex-aware:** for men, jaw / chin / temples / tear troughs lead, and lips or cheeks are only planned when the change is clearly noticeable. Sex is never inferred from the photo. GHL tag `fillers-sex-{woman|man|prefer_not}`.
- **Measurements** (`lib/measurements.ts`) are readings of the photo, never scores of the person. Uncalibrated hints read as low / moderate / higher.
- **Personal preview** (`app/api/preview`, `lib/ai-preview.ts`, `lib/prompts/preview-edit.ts`): an OpenAI image edit limited to up to 3 start-stage focus zones, sex-aware, with the pigmentation app's luma-drift guard. It is hidden when `OPENAI_API_KEY` is unset or the edit drifts, and it never blocks the report.

## Run / test

```bash
npm install --ignore-scripts   # npm ci fails: the cloned lock file was out of sync
npm run dev                    # http://localhost:3000  (/, /london, /glasgow)
npm test                       # vitest (unit + route + copy-rules tests)
npx tsc --noEmit && npm run lint && npm run build
```

Local SkinScan (required for any report):

```bash
cd "D:/June Project/hsm endolift/pigmentation-model"
.venv/Scripts/python -m uvicorn serve:app --host 127.0.0.1 --port 8008
# app .env.local: SKINSCAN_URL=http://127.0.0.1:8008   (no key needed locally)
```

## Environment variables

| Var | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude Vision (required) |
| `ANTHROPIC_MODEL` | defaults to `claude-sonnet-5-5` (same as the under-eye / pigmentation apps) |
| `SKINSCAN_URL` | HSA SkinScan base URL — **required**; prod: `https://skinscan.harleystreetaesthetic.co.uk` |
| `SKINSCAN_API_KEY` | sent as `x-skinscan-key` |
| `GHL_WEBHOOK_URL` | GHL inbound webhook for leads — **placeholder, new workflow not built yet** |
| `GHL_API_TOKEN`, `GHL_LOCATION_ID`, `GHL_REPORT_FIELD_KEY` | PDF upload / contact tagging (no-op when blank) |
| `OPENAI_API_KEY` | personal "See the possible difference" preview — optional; hidden when unset |
| `OPENAI_IMAGE_MODEL`, `OPENAI_IMAGE_QUALITY` | defaults `gpt-image-2.5-sunburst` / `high` (same as the pigmentation app) |
| `NEXT_PUBLIC_META_PIXEL_ID`, `META_DATASET_ID` | Meta pixel / CAPI — **leave blank** until the new dataset exists |
| `NEXT_PUBLIC_SITE_URL` | defaults to `https://fillers.harleystreetaesthetic.co.uk` (TODO(HSA): confirm domain) |
| `NEXT_PUBLIC_BOOKING_CALENDAR_URL`, `NEXT_PUBLIC_GLASGOW_BOOKING_CALENDAR_URL` | GHL calendar (defaults to the shared HSA consultation calendar) |
| `NEXT_PUBLIC_BOOKING_URL`, `NEXT_PUBLIC_GLASGOW_BOOKING_URL` | fallback contact links |

The local `.env.local` was copied from the under-eye app with every live GHL / Meta / Vercel value blanked.

## SkinScan is required (owner decision)

`/api/analyze` calls SkinScan `/fillers` first (35 s timeout, one retry, `maxDuration` 90). If it is unreachable, times out or errors — or Claude fails — **no report is produced**: the client sees "We couldn't complete your scan" with *Try again* (same photo) / *Retake photo*; answers, consents and lead details are kept, and the failure is logged (`skinscan_failed` / `assessment_failed`). No Claude-only or generic fallback report exists.

`/fillers` returns labelled signals, passed to Claude as "HSA SkinScan signals":

| Key | Source |
|---|---|
| `endolift_model` | DINOv2 + per-area heads trained on 1,588 HSA Endomax reports (cheeks/chin/neck focus, jaw/chin enhancement) |
| `undereye_measure` | the `/undereye` Lab measurement (structural = hollowing) |
| `geometry` | MediaPipe mesh: upper:lower lip ratio, lip fullness, lower-face ratio, chin-height proxy, per-zone shadow depth vs the malar highlight |
| `derm_foundation` | Google Derm Foundation (+DINOv2) through the existing skinscan head: photodamage / clear on cheek + jaw (skin-quality proxy; the head is pigmentation-trained) |
| `skin_measure` / `combined` | measured texture index; blended laxity proxy |
| `zone_hints` | low / moderate / high per zone — **uncalibrated heuristics**, never shown to clients |

## Where the rules live

- `lib/zones.ts` — change → status thresholds (30 / 60), leave-alone logic + sentences, cause notes, firmness-dominant rule.
- `lib/plan.ts` — support-first plan order, staging (nasolabial / tear trough wait for cheeks, marionette for chin/jaw), max 3 starting areas, offer fit, previous-filler lines.
- `lib/constants.ts` — **only** place for prices, starting volumes, the offer, addresses, disclaimer.
- `lib/copy-guard.ts` + `test/copy-rules.test.ts` — banned words (perfect, flawless, painless, no risk, transform, toxin/anti-wrinkle, brand names, Portpool Lane (old address), beauty/age score…) scanned across all UI source; Claude's text is also checked at runtime and swapped for safe copy.
- `lib/prompts/system-fillers.ts` — byte-stable cached system prompt.

GHL tags: `dermal-fillers-analyzer`, `hsa-dermal-fillers-app`, `hsa-clinic-{london|glasgow}`, `hsa-consultation-call-requested`, `hsa-call-{morning|afternoon|evening}`, `hsa-meta-consent-{accepted|declined}`, plus `fillers-history-*`, `fillers-priority-*`, `fillers-focus-{zone}`, `fillers-firmness-first`, `fillers-review-previous-work`, `fillers-offer-4ml`. Payload includes `zoneMap`, `planSummary`, `fillerHistoryLabel`, `priorityLabel`, `ageConfirmed`.

## Deployment status

- SkinScan `/fillers`: deployed on the droplet.
- Vercel project `hsa-dermal-fillers-app`: live, deployed with `vercel --prod` from this folder.
- Still to do: the GHL workflow for the new webhook (then set `GHL_WEBHOOK_URL`), the Meta dataset / pixel, and the custom domain.

## TODO(HSA)

- Publish prices for chin, nasolabial, marionette and temples (currently "Price confirmed at your consultation").
- Clinician sign-off on starting volumes (`ZONE_PRICING`), plan staging rules, zone thresholds and the system prompt.
- Confirm the 4 ml £699 (was £899) offer wording and end date (no countdown is shown).
- Confirm patient consent covers the before/after images in `public/results` (caption: "Real HSA patients. Image quality enhanced. Results vary.").
- Calibrate SkinScan `zone_hints` against clinician-labelled filler consultations.
- Confirm production domain.
