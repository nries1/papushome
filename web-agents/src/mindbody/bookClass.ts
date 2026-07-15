import { chromium, type Page } from 'playwright'

import { signInMindbody } from './auth'
import { bookViaExploreListing } from './exploreBooking'
import { humanClick } from './humanInteraction'
import { selectClassEntry } from './matchClass'
import { loadSessionState, saveSessionState } from './sessionStore'

// One MindBody account (one set of MINDBODY_USERNAME/PASSWORD) covers every
// studio this books, so a single persisted profile is shared across all of
// them — it's the same real login session either way.
const SESSION_PROFILE = 'mindbody'

export async function bookMindbodyClass(
  studioid: string,
  date: string,
  className: string,
  preferredTime?: string,
  overrideUrl?: string
): Promise<string> {
  const MAINCLASS = `https://clients.mindbodyonline.com/classic/mainclass?studioid=${studioid}`

  const browser = await chromium.launch({
    // Non-headless by default — renders into the container's Xvfb display
    // (see Dockerfile/start.sh), viewable live via noVNC. Escape hatch via
    // env var in case a lighter/headless environment ever needs this instead.
    headless: process.env.WEB_AGENT_HEADLESS === 'true',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-position=0,0',
      '--window-size=1280,900',
    ],
  })

  // Reuse a previously-logged-in profile if we have one, instead of a fresh,
  // historyless session every run — see sessionStore.ts for why that matters
  // beyond just convenience (it's a real fraud/risk-scoring signal).
  const savedState = await loadSessionState(SESSION_PROFILE).catch(() => null)

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
    storageState: savedState ?? undefined,
  })

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })

  const page = await context.newPage()
  page.setDefaultTimeout(20000)

  try {
    // Some studios' classic scheduler is stale/dead (confirmed for Tabata
    // Ultimate Fitness — real classes only show up on MindBody's newer
    // Explore listing). Try the classic flow first since it's the common
    // case and the one most studios still use; fall back to the override
    // only if it's configured and the classic flow actually fails.
    try {
      await login(page, MAINCLASS)
      await navigateToDate(page, MAINCLASS, date)
      return await findAndBook(page, className, preferredTime)
    } catch (classicErr) {
      if (!overrideUrl) throw classicErr
      return await bookViaExploreListing(
        page,
        overrideUrl,
        date,
        className,
        preferredTime
      )
    }
  } catch (err) {
    await page.screenshot({ path: '/app/dist/error.png' }).catch(() => {})
    throw new Error(err instanceof Error ? err.message : String(err))
  } finally {
    // Persist whatever the session looks like now regardless of outcome —
    // even a failed attempt still accumulated real cookies/history that are
    // worth keeping for next time.
    await context
      .storageState()
      .then((state) => saveSessionState(SESSION_PROFILE, state))
      .catch(() => {})
    await context.close()
    await browser.close()
  }
}

async function login(page: Page, MAINCLASS: string): Promise<void> {
  await page.goto(MAINCLASS)
  await page.waitForLoadState('load')
  await page.waitForTimeout(1000)

  const url = page.url()
  const pageText = await page
    .locator('body')
    .innerText()
    .catch(() => '')
  const needsLogin =
    url.includes('extLink') ||
    /\bSign In\b/i.test(pageText) ||
    (await page
      .locator('#btnSignIn')
      .isVisible()
      .catch(() => false))
  if (!needsLogin) return

  const signInBtn = page
    .locator('#btnSignIn, a:text("Sign In"), button:text("Sign In")')
    .first()
  await signInBtn.click({ force: true })

  // Mindbody has updated their auth flow — wait for any auth-related URL or input
  await page.waitForFunction(
    () => {
      const href = window.location.href
      return (
        href.includes('signin.mindbodyonline.com') ||
        href.includes('identity.mindbodyonline.com') ||
        href.includes('auth.mindbodyonline.com') ||
        href.includes('/signin') ||
        href.includes('/login') ||
        !!document.querySelector('#username:not([style*="none"])') ||
        !!document.querySelector('input[type="email"]') ||
        !!document.querySelector('input[name="email"]')
      )
    },
    { timeout: 20000 }
  )
  await page.waitForLoadState('load')
  await page.screenshot({ path: '/app/dist/login-step1.png' }).catch(() => {})

  await signInMindbody(page)

  await page.waitForURL('**/clients.mindbodyonline.com/**', {
    timeout: 20000,
  })
  await page.waitForLoadState('load')

  if (!page.url().includes('clients.mindbodyonline.com')) {
    const msg = await page
      .locator('body')
      .innerText()
      .catch(() => '')
    throw new Error(`Login failed. Page: ${msg.slice(0, 200)}`)
  }
}

async function navigateToDate(
  page: Page,
  MAINCLASS: string,
  isoDate: string
): Promise<void> {
  const [year, month, day] = isoDate.split('-')
  const mbDate = `${parseInt(month)}/${parseInt(day)}/${year}`
  await page.goto(`${MAINCLASS}&stype=-7&view=day&date=${mbDate}`)
  await page.waitForLoadState('load')
  await page.waitForTimeout(1500)
}

async function findAndBook(
  page: Page,
  className: string,
  preferredTime?: string
): Promise<string> {
  const entries = await page.evaluate(() => {
    const btns = Array.from(
      document.querySelectorAll('input[type="button"][name^="but"]')
    )
    return btns
      .map((btn) => {
        const onclick = btn.getAttribute('onclick') || ''
        const urlMatch = onclick.match(/document\.location='([^']+)'/)
        const bookingPath = urlMatch ? urlMatch[1] : ''

        let ancestorText = ''
        let node: Element | null = btn
        for (let i = 0; i < 20; i++) {
          node = node?.parentElement || null
          if (!node) break
          const txt = (node.textContent || '').trim()
          if (txt.length > 30 && txt.length < 500) {
            ancestorText = txt.replace(/\s+/g, ' ')
            break
          }
        }
        return { bookingPath, ancestorText }
      })
      .filter((e) => e.bookingPath)
  })

  if (!entries.length) {
    const bodyText = await page.locator('body').innerText()
    const lines = bodyText
      .split('\n')
      .filter((l) => l.trim().length > 3)
      .slice(0, 20)
      .join(', ')
    throw new Error(`ERROR: No sign-up buttons found. Page content: ${lines}`)
  }

  const target = selectClassEntry(entries, className, preferredTime)

  await page.goto(`https://clients.mindbodyonline.com${target.bookingPath}`)
  await page.waitForLoadState('load')
  await page.waitForTimeout(1000)

  const resBody = await page.locator('body').innerText()

  if (/you are enrolled|already signed up|already enrolled/i.test(resBody)) {
    return `Already booked: ${target.ancestorText.trim().slice(0, 80)}`
  }

  const singleBtn = page.locator(
    '#SubmitEnroll2, input[value*="single reservation" i]'
  )
  if (!(await singleBtn.isVisible().catch(() => false))) {
    throw new Error(
      `ERROR: Reservation button not found. Page: ${resBody.slice(0, 300)}`
    )
  }

  await humanClick(page, singleBtn)
  await page.waitForLoadState('load')
  await page.waitForTimeout(1000)

  const confirmUrl = page.url()
  const confirmBody = await page.locator('body').innerText()

  if (
    confirmUrl.includes('my_sch.asp') ||
    /you'?ve booked|you are enrolled|successfully|confirmed|thank you|reservation has been made/i.test(
      confirmBody
    )
  ) {
    return `Booked: ${target.ancestorText.trim().slice(0, 80)}`
  }

  // Never guess. Confirmed live on the Explore-listing flow (see
  // exploreBooking.ts) that MindBody can genuinely reject an order server-side
  // with its own error text this regex doesn't recognize — reporting that as
  // an ambiguous "success" is worse than surfacing the failure, since a
  // person who thinks they're booked when they aren't finds out by not having
  // a reservation when they show up.
  throw new Error(`ERROR: Could not confirm the reservation succeeded. Page: ${confirmBody.slice(0, 300)}`)
}
