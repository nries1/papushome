# Stagehand + Browserbase investigation (in progress)

**Goal:** the hand-rolled Playwright booking automation (`bookClass.ts`, `exploreBooking.ts`,
`matchClass.ts`) is fragile and needed a lot of iteration to get working (see Issues #7 and #9
in `../production_ready.md`), and the underlying reCAPTCHA-driven purchase rejection from #7 is
still unresolved. Investigating whether replacing it with Stagehand (natural-language
act/extract/observe instead of hand-rolled CSS selectors) on Browserbase (hosted browser with
built-in anti-detection/stealth + persistent session Contexts) fixes either problem, before
committing to a real rewrite.

**Status as of 2026-07-16: "extract" phase run for real, looks correct.** Real Browserbase
session, real navigation to the Tabata Explore listing, `extract()` (Claude Haiku 4.5) returned
`[{"name": "Weighted HITT", "time": "6:30pm EDT", "instructor": "Nicole Ryan"}]` — exactly the one
remaining bookable class for today (4:00pm/Steve Moreira and 5:15pm/Mike Montanez slots from the
same class had already passed relative to the ~5:37pm EDT run time; matches the real class list
pulled from tool-call logs in Issue #9). Cost was trivial: ~8,172 input + 119 output tokens on
Haiku 4.5. **"Book" phase run twice, real login completed.**
- **Run 1:** `observe()` correctly found the exact right Book Now button, but `act()`'s click
  never navigated — the "page text" captured right after was the cookie-consent banner itself.
  Root cause: the same TrustArc cookie-banner click-interception issue from Issue #7's
  `dismissCookieBanner()` — our prototype hadn't ported that fix yet. **This is the key finding
  so far: natural-language matching doesn't make MindBody's site-specific quirks go away** — it
  replaces the fragile CSS-selector matching, not the surrounding scaffolding.
- **Fix:** ported `dismissCookieBanner()` verbatim into `stagehandPrototype.ts`, called before
  `observe()` and before `act()`.
- **Run 2 (post-fix):** click navigated for real this time, triggering MindBody's login redirect.
  `signInMindbodyNative()` (native `.locator()/.fill()/.click()`, not `act()` — credentials never
  touch the LLM) completed a real login against the real account. One nuance: right after login,
  `page.url()` still reported the `signin.mindbodyonline.com` URL, but the extracted page content
  (title, cookie banner) showed we were actually back on the real Explore listing — **Stagehand's
  `page.url()` is a cached value** (per its own type comments: "Cached current URL for synchronous
  page.url()") that lags behind real navigation; don't trust it as a live check post-navigation.
  This reproduces a second already-documented MindBody quirk from Issue #7: **clicking Book Now
  while signed out bounces through login and back to the listing — it does not proceed to
  checkout automatically.** The hand-rolled code has a second step for this (re-select date,
  re-click Book Now); ported that into the prototype (re-`observe()` + re-`act()` + re-dismiss the
  cookie banner after login).
- **Run 3 (post re-click-after-login fix), real login reused from the saved Context:** `observe()`
  found **zero** elements for the exact same class/time it found successfully in Run 1 — `"the
  'Book Now' button for the 6:30pm Weighted HITT class"` returned `elements: []`. Ran the
  read-only `extract` mode again immediately after (separate, unauthenticated context) to check
  whether the class had simply disappeared from the listing — **it hadn't**: `extract()` still
  returned the same `Weighted HITT, 6:30pm EDT, Nicole Ryan` entry. So the class is still really
  there; something about the **authenticated** session's rendering of the page differs from the
  unauthenticated one in a way `observe()` couldn't match against. **Not yet root-caused** — could
  be a different button label/state once logged in, a "preparing checkout"-style async render gap
  (same pattern documented in `exploreBooking.ts`'s `waitForClassCards`), or something else. Left
  unresolved rather than guessing further — see Next steps.
- **Decision: stopped here for today rather than continuing to iterate against the live site.**
  Same lesson already documented in Issue #7: repeated live hits in one session make it hard to
  tell a real regression apart from the site's own rate-limiting/reputation response. Three real,
  concrete quirks found and either fixed or characterized in about half an hour of live testing is
  good signal on its own; the 4th (auth-render mismatch) is worth a fresh session rather than more
  same-session iteration.

## Decisions made so far

- **LLM backend: Claude (cloud), not local Ollama.** Stagehand does support Ollama now (docs
  recommend `ollama/qwen3`, with a documented `CustomOpenAIClient` workaround for the v3
  `/v1/responses` endpoint issue), but the real constraint is local-model reliability at strict
  JSON/Zod-schema output — the same failure mode that caused the chat hallucination in Issue #9.
  User chose a cloud model to sidestep that risk; cost should be negligible at this call volume.
  **Tried Gemini 2.5 Flash first** — hit a real "prepayment credits depleted" billing error on the
  user's Google AI Studio account (unrelated to our code; confirmed via a direct API call outside
  Stagehand). Switched to **`anthropic/claude-haiku-4-5`** instead, since the user already has a
  paid Anthropic account (for the chat feature) and just created a fresh API-specific account —
  verified working with a direct `curl` call before wiring in. Per Anthropic's own model guidance,
  the default recommendation for new work is `claude-opus-4-8`; the user explicitly chose Haiku
  4.5 (cheapest/fastest) instead, judging this task (page extraction + simple class-matching) as
  not intelligence-sensitive enough to need Opus-tier reasoning.
- **Browser execution: Browserbase (hosted), not self-hosted Xvfb/noVNC.** Two reasons:
  1. Stagehand doesn't support attaching to an existing Playwright BrowserContext/Page — it
     launches its own browser (you'd connect Playwright *to* it via CDP, not the reverse). That
     conflicts with the current `WebAgentSession`-table-backed `storageState` persistence, which
     has no documented import path into a Stagehand-launched local browser.
  2. Browserbase's own **Contexts** feature (persistent cookies/localStorage/IndexedDB across
     sessions, tied to a Context ID) is a purpose-built replacement for that homegrown session
     table — simpler than what we built.
  3. Browserbase's stealth fingerprinting + optional residential proxies might actually fix the
     reCAPTCHA rejection itself (~92% reCAPTCHA v2 solve rate per their own claims) — the actual
     open caveat from Issue #7, not just the matching fragility this investigation started from.
  - Trade-off accepted: external paid dependency (free tier likely sufficient for this volume;
    $20/mo Developer tier and $8/GB residential proxies if needed), losing the "confirmed
    residential home IP" property unless paying for residential proxies, and losing the noVNC
    live-view (replaced by Browserbase's own live-view + session recording).

## Credentials already configured (in `.env`, gitignored — see `.env.example` for the documented slots)

- `GEMINI_API_KEY` — verified working, but the Google account it's tied to has depleted prepayment
  credits; not currently used by the prototype (left in `.env` in case Gemini is revisited later).
- `ANTHROPIC_API_KEY` — verified working with `claude-haiku-4-5` (real `curl` call, billing active).
  This is what the prototype actually uses now.
- `BROWSERBASE_API_KEY` — verified working.
- `BROWSERBASE_PROJECT_ID` — `4d37185d-cba4-4547-ac9a-bcb1640d5180` (project "Papushome",
  resolved automatically from the API key, only one project on the account).

## Browserbase Context created for MindBody session persistence

- **Context ID: `1a2ce95b-f3c5-4cf6-b483-d69f3b43219d`** — created via
  `POST https://api.browserbase.com/v1/contexts`. Not yet used in any session — first real
  Stagehand session against it should pass `persist: true` (to actually save the login), every
  session after that `persist: false` (just reusing what's already saved).

## Implementation notes (learned while building the prototype)

- **`@browserbasehq/stagehand@3.7.0` + `zod@4.4.3`** added to `web-agents/package.json`,
  `npm install`ed — both resolve/typecheck cleanly (`npx tsc --noEmit` clean).
- **Stagehand's own `Page`/`Locator` classes (`understudy/*`) are NOT structurally compatible
  with Playwright's `Page` type** — confirmed via `tsc`, missing 86+ Playwright `Page` members.
  So the existing `signInMindbody()` from `auth.ts` (Playwright-typed) can't be reused directly.
  Reimplemented natively in `stagehandPrototype.ts` as `signInMindbodyNative()` against
  Stagehand's own `.locator()/.fill()/.click()/.waitForSelector()` — deliberately NOT using
  `act()` with the password embedded in the instruction text, so credentials never get sent to
  the Gemini API. This is a real cost of adopting Stagehand: any code that touched Playwright's
  `Page` type directly (not just `matchClass.ts`) needs reworking, not just the fragile bits.
- `model: "google/gemini-2.5-flash"` auto-loads `GEMINI_API_KEY` from env (confirmed via
  Stagehand's own `providerEnvVarMap` in its compiled source — checks `GEMINI_API_KEY` first for
  the `google` provider, no explicit `apiKey`/`modelClientOptions` needed).
- **Tried `advancedStealth: true` in `browserSettings` — real finding: it's Enterprise-plan only.**
  First `stagehand.init()` call failed with `StagehandHttpError: Unknown error: 403` /
  `"403 Verified mode is only available on the Enterprise plan"`. This directly undercuts part of
  the earlier optimism that Browserbase's premium anti-detection mode would help with the Issue #7
  reCAPTCHA rejection — that specific feature isn't available on the free tier the user signed up
  for. Removed it; the prototype now runs on Browserbase's default (non-"Verified") stealth only.
  Whether the reCAPTCHA rejection is actually improved at all is **still untested** — that needs an
  actual real-purchase attempt, a separate confirmation beyond anything done in this session.

## Prototype script: `web-agents/src/mindbody/stagehandPrototype.ts`

Two phases, **not wired into `index.ts`'s `/book-tabata` endpoint** — standalone investigation
only so far:

- **`node dist/mindbody/stagehandPrototype.js extract`** — read-only, safe, no login: navigates
  to the Tabata Explore listing and uses `extract()` with a Zod schema to pull the class list
  (name/time/instructor). Compare this against what `exploreBooking.ts`'s hand-rolled
  `extractEntries()` gets from the same live page. **Safe to run anytime, no confirmation needed.**
- **`node dist/mindbody/stagehandPrototype.js book [time] [className]`** — uses `observe()` +
  `act()` to find and click "Book Now" for a target class (defaults: `12:30pm`,
  `Bootcamp HITT Xpress`), signs in if redirected (via `signInMindbodyNative`, saving the login to
  the Context this time via `persist: true`), and extracts the page text at whatever it lands on.
  **Deliberately stops before clicking "Buy"** — no real purchase attempted. Still touches the
  real MindBody login/session, so **confirm with the user before the first real run.**

Run inside the `web-agents` container (`docker compose exec web-agents node
dist/mindbody/stagehandPrototype.js <mode>`) after `docker compose build web-agents` — no local
`dotenv` loader, relies on `env_file: .env` via docker-compose, same as production.

## Next steps (resume here)

1. **Root-cause the auth-render mismatch** (Run 3 above) — likely needs watching the live
   Browserbase session view (`browserbaseSessionURL`, printed by the script) in real time during a
   `book` run to see what the page actually shows post-login for that class/time, rather than
   guessing blind.
2. Once `observe()` reliably finds the button in the authenticated state, re-run `book` to see
   whether it reaches `/explore/checkout` at all (still stop before "Buy").
3. **The core open question from Issue #7 is still untested**: does Browserbase's stealth actually
   reduce the reCAPTCHA rejection rate? `advancedStealth` (the strongest option) turned out to be
   Enterprise-only and was removed — only default Browserbase stealth is in play now. This needs
   an actual real-purchase attempt (a further, separate confirmation) to know either way.
4. Decide: replace the production booking flow, or fall back to hardening the existing
   Playwright code. If replacing, budget for reworking anything else that touches Playwright's
   `Page` type directly (not just the two files in the table below) given the type-incompatibility
   found above.

## Reference: files this would touch/replace if adopted

| Current (hand-rolled Playwright) | Would be replaced by |
|---|---|
| `web-agents/src/mindbody/matchClass.ts` (`selectClassEntry`) | Stagehand `act()`/`observe()` natural-language matching |
| `web-agents/src/mindbody/exploreBooking.ts`'s `extractEntries()` | Stagehand `extract()` with a Zod schema |
| `WebAgentSession` table + `sessionStore.ts` (Postgres-backed `storageState`) | Browserbase Context `1a2ce95b-f3c5-4cf6-b483-d69f3b43219d` |
| Xvfb + x11vnc + noVNC (`web-agents/Dockerfile`, `start.sh`) | Browserbase's own live-view + session recording |
| `humanInteraction.ts` (humanized mouse/keyboard) | Possibly redundant — Browserbase's own stealth/fingerprinting may cover this |
