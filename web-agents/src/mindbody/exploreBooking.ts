import type { Page } from 'playwright';
import { signInMindbody } from './auth';
import { humanClick, humanIdleScroll } from './humanInteraction';
import { selectClassEntry } from './matchClass';

// Fallback booking path for studios whose "classic" scheduler (clients.
// mindbodyonline.com/classic/mainclass?studioid=...) no longer reflects real
// classes — confirmed for Tabata Ultimate Fitness, whose classic studioid
// (275991) shows an empty schedule every day, while the live classes are only
// visible on MindBody's newer consumer "Explore" listing page. Drives that
// page directly instead: date carousel + class cards + a multi-step checkout
// (not the classic single "make a reservation" button).
export async function bookViaExploreListing(
  page: Page,
  exploreUrl: string,
  date: string,
  className: string,
  preferredTime?: string
): Promise<string> {
  await page.goto(exploreUrl, { waitUntil: 'load' });
  await waitForClassCards(page);
  await dismissCookieBanner(page);
  await humanIdleScroll(page);
  await selectDate(page, date);

  const entries = await extractEntries(page);
  if (!entries.length) {
    throw new Error(`ERROR: No bookable classes found on the Explore listing for ${date}.`);
  }
  const target = selectClassEntry(entries, className, preferredTime);

  await dismissCookieBanner(page);
  await clickBookNow(page, target.idx);
  await page.waitForTimeout(2000);

  // Booking always requires a login on this flow (unlike the classic scheduler,
  // which can carry an existing session) — clicking Book Now signed-out bounces
  // through signin.mindbodyonline.com and back to the listing, which resets
  // to *today's* date regardless of what was selected before. Confirmed live,
  // the hard way: for a non-today date, this silently re-matched and booked
  // the requested class/time on the WRONG day (today happened to have a class
  // of the same name and time too) with no error at all. Must re-select the
  // date after login, not just re-find the class.
  if (page.url().includes('signin.mindbodyonline.com')) {
    await signInMindbody(page);
    await waitForClassCards(page);
    await dismissCookieBanner(page);
    await selectDate(page, date);
    const entriesAfterLogin = await extractEntries(page);
    const targetAfterLogin = selectClassEntry(entriesAfterLogin, className, preferredTime);
    await clickBookNow(page, targetAfterLogin.idx);
    await page.waitForTimeout(2000);
  }

  if (!page.url().includes('/explore/checkout')) {
    const body = await page.locator('body').innerText();
    throw new Error(`ERROR: Did not reach checkout. Page: ${body.slice(0, 300)}`);
  }

  // Checkout shows a "Preparing Checkout..." placeholder before the real form
  // (with the Buy button) renders — same async-render gap as the class list.
  const buyBtn = page.locator('button:text("Buy")').first();
  await buyBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  if (!(await buyBtn.isVisible().catch(() => false))) {
    const body = await page.locator('body').innerText();
    throw new Error(`ERROR: Buy button not found. Page: ${body.slice(0, 300)}`);
  }
  await dismissCookieBanner(page);
  await humanClick(page, buyBtn);

  // MindBody can genuinely reject the order server-side — confirmed live,
  // reproducibly: "Error — We're unable to complete your order at this time.
  // Please try again." (most likely reCAPTCHA Enterprise, which is active on
  // this checkout, scoring headless automation as suspicious). The button
  // shows "PURCHASING..." while the payment call is in flight; wait for that
  // to resolve one way or the other instead of guessing a fixed delay — a
  // fixed 2s wait previously caught the page mid-flight and was misread as
  // an ambiguous, unconfirmed "success."
  const confirmBody = await waitForPurchaseResult(page);

  if (/unable to complete your order|please try again|payment (was |is )?declined/i.test(confirmBody)) {
    const errMatch = confirmBody.match(/error[\s\S]{0,150}/i);
    throw new Error(
      `ERROR: MindBody rejected the purchase — ${(errMatch ? errMatch[0] : confirmBody.slice(0, 200)).replace(/\s+/g, ' ')}`
    );
  }
  if (/thank you|confirmed|you.?re (all set|booked)|success/i.test(confirmBody)) {
    return `Booked: ${target.text.slice(0, 80)}`;
  }
  // Never guess. A false "booked" is worse than a false failure — the caller
  // can retry a failure, but a person who thinks they're booked when they
  // aren't finds out by not having a reservation when they show up.
  throw new Error(`ERROR: Could not confirm the purchase completed. Page: ${confirmBody.slice(0, 300)}`);
}

async function waitForPurchaseResult(page: Page): Promise<string> {
  let body = '';
  for (let i = 0; i < 10; i++) {
    body = await page.locator('body').innerText().catch(() => '');
    if (!/purchasing/i.test(body)) break;
    await page.waitForTimeout(2000);
  }
  return body;
}

// Both the initial page load and the post-login bounce-back render the class
// list asynchronously (React) at a variable delay — a fixed sleep here was
// flaky (confirmed live: the exact same code sometimes found 0 cards, sometimes
// 5, depending on timing). Wait for real content instead of guessing a delay.
async function waitForClassCards(page: Page): Promise<void> {
  await page
    .locator('[class*="ClassTimeScheduleItemDesktop_separator"]')
    .first()
    .waitFor({ state: 'visible', timeout: 15000 })
    .catch(() => {});
}

// The TrustArc cookie-consent banner (#consent_blackbar / a full-page
// #trustarc-banner-overlay) loads asynchronously via third-party script at an
// unpredictable delay, and its overlay intercepts pointer events on whatever's
// underneath — confirmed live: it caused a real "locator.click: Timeout
// exceeded" on the date tab because our one-shot check ran before the banner
// had rendered yet. Removing it outright (rather than trying to click its own
// "Ok" button, which has the same race) sidesteps the timing problem
// entirely, so this is called defensively before every click in this flow.
async function dismissCookieBanner(page: Page): Promise<void> {
  await page
    .evaluate(() => {
      document.getElementById('consent_blackbar')?.remove();
      document.getElementById('trustarc-banner-overlay')?.remove();
    })
    .catch(() => {});
}

// The date carousel only shows ~7 days starting today, with no query-param
// way to jump further out (unlike the classic scheduler's &date= param) — a
// request further out than that isn't supported here.
async function selectDate(page: Page, isoDate: string): Promise<void> {
  const day = new Date(`${isoDate}T00:00:00`).getDate();
  const dayItems = page.locator('[class*="Day_item__"]');
  const count = await dayItems.count();
  for (let i = 0; i < count; i++) {
    const item = dayItems.nth(i);
    const text = (await item.innerText()).replace(/\s+/g, '');
    if (!text.endsWith(String(day))) continue;

    const cls = (await item.getAttribute('class')) || '';
    if (cls.includes('Day_selected')) return;

    // Confirmed live: a single click + fixed wait isn't reliable — the
    // "Classes on <date>" heading (and the card list under it) can still show
    // the *previous* date for a beat after the click, and a booking actually
    // went through for the wrong day as a result. Verify the heading text
    // itself changed to the requested day, retrying the click a couple of
    // times, rather than trusting one click + a timeout.
    const heading = page.locator('h5', { hasText: 'Classes on' }).first();
    const dayLandedOn = new RegExp(`\\b${day}\\b\\s*$`);
    for (let attempt = 0; attempt < 3; attempt++) {
      await humanClick(page, item);
      await page.waitForTimeout(1500);
      const headingText = (await heading.innerText().catch(() => '')).trim();
      if (dayLandedOn.test(headingText)) return;
    }
    throw new Error(
      `ERROR: Clicked the ${isoDate} date tab but the class list never updated to match — still showing a different date.`
    );
  }
  throw new Error(
    `ERROR: ${isoDate} isn't in the visible date range on the Explore listing (only ~7 days ahead are shown).`
  );
}

async function extractEntries(
  page: Page
): Promise<{ idx: number; ancestorText: string; text: string }[]> {
  const raw = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[class*="ClassTimeScheduleItemDesktop_separator"]'));
    return cards.map((card) => (card.textContent || '').replace(/\s+/g, ' ').trim());
  });
  return raw
    .map((text, idx) => ({ idx, ancestorText: text, text }))
    .filter((e) => /book now/i.test(e.ancestorText));
}

async function clickBookNow(page: Page, idx: number): Promise<void> {
  const card = page.locator('[class*="ClassTimeScheduleItemDesktop_separator"]').nth(idx);
  await humanClick(page, card.locator('button:text("Book Now")').first());
}
