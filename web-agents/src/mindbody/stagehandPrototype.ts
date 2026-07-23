// Investigation prototype — NOT wired into index.ts's booking endpoints yet.
// See ../../STAGEHAND_INVESTIGATION.md for the why/decisions/next-steps.
//
// Two phases, run via CLI arg:
//   node dist/mindbody/stagehandPrototype.js extract   — read-only, safe, no login
//   node dist/mindbody/stagehandPrototype.js book       — attempts login + Book Now click,
//                                                          stops before the real "Buy" click
//
// Compares Stagehand's natural-language extract()/observe()/act() against the hand-rolled
// CSS-selector logic in exploreBooking.ts/matchClass.ts for the same real page.

import { Stagehand } from '@browserbasehq/stagehand'
import { z } from 'zod'

// Stagehand's own Page/Locator classes (understudy/*) are a separate
// implementation from Playwright's — superficially similar (locator/click/
// fill) but not structurally compatible (confirmed: missing 86+ Playwright
// Page members), so the existing Playwright-typed signInMindbody() from
// ./auth can't be reused directly here. Reimplemented natively against
// Stagehand's Page instead — deliberately using .locator()/.fill() (direct
// DOM interaction), not act() with the credential embedded in the
// instruction text, so the password never gets sent to the LLM.
type StagehandPage = ReturnType<InstanceType<typeof Stagehand>['context']['pages']>[number]

async function signInMindbodyNative(page: StagehandPage): Promise<void> {
  await page.waitForLoadState('load')
  await page.waitForSelector('#username, input[type="email"], input[name="email"]', {
    state: 'visible',
    timeout: 15000,
  })
  await page.locator('#username, input[type="email"], input[name="email"]').first().fill(process.env.MINDBODY_USERNAME ?? '')
  await page.locator('button[type="submit"]').first().click()

  await page.waitForSelector('#password, input[type="password"]', {
    state: 'visible',
    timeout: 15000,
  })
  await page.waitForLoadState('load')
  await page.locator('#password, input[type="password"]').first().fill(process.env.MINDBODY_PASSWORD ?? '')
  await page.locator('button[type="submit"]').first().click()
  await page.waitForLoadState('load')
}

// Same fix as exploreBooking.ts's dismissCookieBanner(): the TrustArc cookie-consent
// overlay loads asynchronously and intercepts clicks on whatever's underneath it.
// Confirmed live in this prototype too (2026-07-16 book-phase run): act() clicked the
// correctly-identified Book Now button, but the page never navigated — the "page text"
// captured right after was the cookie banner itself, meaning the click almost certainly
// landed on the overlay, not the button. Natural-language matching doesn't make
// site-specific quirks like this go away.
async function dismissCookieBanner(page: StagehandPage): Promise<void> {
  await page
    .evaluate(() => {
      document.getElementById('consent_blackbar')?.remove()
      document.getElementById('trustarc-banner-overlay')?.remove()
    })
    .catch(() => {})
}

// Stagehand's page.url() is a cached value (its own type comment: "Cached current URL
// for synchronous page.url()") — confirmed live: right after signInMindbodyNative()'s
// final navigation, page.url() still reported the pre-redirect signin URL even though
// the page had actually already landed back on the explore listing. Read the real DOM
// value instead when a check needs to be accurate immediately after a navigation.
async function liveUrl(page: StagehandPage): Promise<string> {
  return page.evaluate(() => window.location.href)
}

const CONTEXT_ID = '1a2ce95b-f3c5-4cf6-b483-d69f3b43219d'
const TABATA_EXPLORE_URL =
  'https://www.mindbodyonline.com/explore/locations/mike-montanez-tabata-ultimate-fitness-prospect-heights'

const ClassEntrySchema = z.object({
  name: z.string().describe('the class name, e.g. "Bootcamp HITT Xpress" or "Tabata"'),
  time: z.string().describe('the start time as shown, e.g. "12:30pm"'),
  instructor: z.string().optional(),
})
const ClassListSchema = z.array(ClassEntrySchema)

function makeStagehand() {
  return new Stagehand({
    env: 'BROWSERBASE',
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
    model: 'anthropic/claude-haiku-4-5', // reads ANTHROPIC_API_KEY automatically
    browserbaseSessionCreateParams: {
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      browserSettings: {
        // Not persisting cookies during the read-only extract phase — no login
        // happens there, nothing to save. The book phase overrides this to true.
        context: { id: CONTEXT_ID, persist: false },
      },
    },
  })
}

async function runExtractOnly(): Promise<void> {
  const stagehand = makeStagehand()
  await stagehand.init()
  console.log('Live view:', stagehand.browserbaseSessionURL)

  try {
    const page = stagehand.context.pages()[0] ?? (await stagehand.context.newPage())
    await page.goto(TABATA_EXPLORE_URL)

    const classes = await stagehand.extract(
      'Extract every bookable class shown on this page, with its name, start time, and instructor.',
      ClassListSchema
    )
    console.log(`Found ${classes.length} classes via Stagehand extract():`)
    console.log(JSON.stringify(classes, null, 2))
  } finally {
    await stagehand.close()
  }
}

async function runBookAttempt(targetTime: string, className: string): Promise<void> {
  const stagehand = new Stagehand({
    env: 'BROWSERBASE',
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
    model: 'anthropic/claude-haiku-4-5',
    browserbaseSessionCreateParams: {
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      browserSettings: {
        context: { id: CONTEXT_ID, persist: true }, // save the login this time
      },
    },
  })
  await stagehand.init()
  console.log('Live view:', stagehand.browserbaseSessionURL)

  try {
    const page = stagehand.context.pages()[0] ?? (await stagehand.context.newPage())
    await page.goto(TABATA_EXPLORE_URL)
    await dismissCookieBanner(page)

    const [bookAction] = await stagehand.observe(
      `the "Book Now" button for the ${targetTime} ${className} class`
    )
    if (!bookAction) {
      console.log(`Could not find a Book Now button for ${targetTime} ${className}.`)
      return
    }
    console.log('Observed action:', bookAction)
    await dismissCookieBanner(page)
    await stagehand.act(bookAction)
    await page.waitForLoadState('load')

    // Same login-detection as exploreBooking.ts: Book Now bounces through
    // signin.mindbodyonline.com when the Context has no saved session yet.
    const urlAfterFirstClick = await liveUrl(page)
    if (urlAfterFirstClick.includes('signin.mindbodyonline.com')) {
      console.log('Login required — signing in (credentials never touch the LLM).')
      await signInMindbodyNative(page)

      // Same quirk as exploreBooking.ts: Book Now while signed out bounces through
      // login and back to the *listing*, not straight to checkout — re-find and
      // re-click the same class now that we're authenticated.
      console.log('Back at the listing post-login — re-finding and re-clicking Book Now.')
      await dismissCookieBanner(page)
      const [bookActionAgain] = await stagehand.observe(
        `the "Book Now" button for the ${targetTime} ${className} class`
      )
      if (!bookActionAgain) {
        console.log(`Could not re-find the Book Now button for ${targetTime} ${className} after login.`)
        return
      }
      console.log('Observed action (post-login):', bookActionAgain)
      await dismissCookieBanner(page)
      await stagehand.act(bookActionAgain)
      await page.waitForLoadState('load')
    }

    const finalUrl = await liveUrl(page)
    console.log('Landed at:', finalUrl)
    console.log('Reached checkout:', finalUrl.includes('/explore/checkout'))
    const pageText = await stagehand.extract()
    console.log('Page text at this point:')
    console.log(pageText.pageText.slice(0, 1500))

    // STOP HERE — deliberately not clicking Buy / completing a real purchase.
    // Same real-money caution as Issues #7/#9: confirm with the user before
    // ever letting a run go all the way through a real checkout.
    console.log('\nStopped before Buy — no real purchase attempted this run.')
  } finally {
    await stagehand.close()
  }
}

const mode = process.argv[2]
if (mode === 'extract') {
  runExtractOnly().catch((err) => {
    console.error(err)
    process.exit(1)
  })
} else if (mode === 'book') {
  const targetTime = process.argv[3] ?? '12:30pm'
  const className = process.argv[4] ?? 'Bootcamp HITT Xpress'
  runBookAttempt(targetTime, className).catch((err) => {
    console.error(err)
    process.exit(1)
  })
} else {
  console.error('Usage: node stagehandPrototype.js <extract|book> [time] [className]')
  process.exit(1)
}
