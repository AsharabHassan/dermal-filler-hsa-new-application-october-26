@AGENTS.md

# HSA Facial Volume Scan (dermal fillers) — working notes

- Prices, starting volumes, the offer, addresses and the disclaimer live ONLY in `lib/constants.ts`. `priceFrom: null` = not published → "Price confirmed at your consultation", never "£0".
- Zone rules live ONLY in `lib/zones.ts`; plan rules ONLY in `lib/plan.ts`. Both are tested.
- HSA SkinScan `/fillers` is REQUIRED: no report without it, no Claude-only fallback (owner decision, 31 Oct 2026).
- No beauty / age / attractiveness score. Never name product brands, never mention toxin / anti-wrinkle, never "perfect / flawless / painless / no risk / transform". `test/copy-rules.test.ts` enforces this.
- Call-back copy: "within minutes", AI voice call, never a phone number.
- London address: 1-5 Portpool Lane, London EC1N 7UU (never 10 Harley Street / Grosvenor Gardens).
- The Claude system prompt (`lib/prompts/system-fillers.ts`) must stay byte-stable for prompt caching.
- Bright beige + gold theme; never dark. Token names kept from the other HSA apps (`peach` = gold, `cream` = light surface).
- No Meta pixel id is hard-coded. Use `NEXT_PUBLIC_META_PIXEL_ID` / `META_DATASET_ID`.
- Before claiming done: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
