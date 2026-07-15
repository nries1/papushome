import type { Locator, Page } from 'playwright';

// Human-like input helpers. reCAPTCHA-style risk scoring weighs interaction
// patterns as a signal, not just navigator.webdriver/user-agent — an
// instant, pixel-perfect click with zero mouse travel and uniform
// millisecond-exact keystroke timing looks nothing like a real person.
// These add believable variance (curved mouse travel, per-keystroke jitter,
// idle scrolling) without changing what actually gets clicked or typed.

function jitter(base: number, spread: number): number {
  return Math.max(0, base + (Math.random() * 2 - 1) * spread);
}

async function wait(page: Page, ms: number): Promise<void> {
  await page.waitForTimeout(ms);
}

// Moves the mouse to (x, y) through a handful of intermediate waypoints from
// a random starting point, with small per-step delays and wobble — instead
// of Playwright's default instant teleport to the target.
export async function humanMouseMove(page: Page, x: number, y: number): Promise<void> {
  const viewport = page.viewportSize() ?? { width: 1280, height: 900 };
  const startX = Math.random() * viewport.width;
  const startY = Math.random() * viewport.height;
  const steps = 4 + Math.floor(Math.random() * 4);

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const wobbleX = (Math.random() - 0.5) * 12;
    const wobbleY = (Math.random() - 0.5) * 12;
    await page.mouse.move(startX + (x - startX) * t + wobbleX, startY + (y - startY) * t + wobbleY);
    await wait(page, jitter(20, 15));
  }
  await page.mouse.move(x, y);
}

// Clicks a locator by moving the mouse to a randomized point within it first
// (not dead-center every time), pausing briefly, then a real mouse down/up
// pair — rather than Playwright's default click, which doesn't move the
// mouse there incrementally at all.
export async function humanClick(page: Page, locator: Locator): Promise<void> {
  // Confirmed live: without this, a card further down a long list (outside
  // the current viewport) got a boundingBox() the raw page.mouse coordinates
  // couldn't actually reach, so the click silently landed nowhere and the
  // whole booking flow just stalled on the same page with no error at all.
  // Playwright's own .click() does this scroll implicitly; ours doesn't
  // unless asked.
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const box = await locator.boundingBox();
  if (!box) {
    await locator.click();
    return;
  }
  const targetX = box.x + box.width * (0.35 + Math.random() * 0.3);
  const targetY = box.y + box.height * (0.35 + Math.random() * 0.3);

  await humanMouseMove(page, targetX, targetY);
  await wait(page, jitter(150, 80));
  await page.mouse.down();
  await wait(page, jitter(60, 30));
  await page.mouse.up();
}

// Types into a locator one character at a time with a randomized delay
// between keystrokes, rather than `.fill()` (sets the value in one shot with
// no keyboard events at all).
export async function humanType(page: Page, locator: Locator, text: string): Promise<void> {
  await humanClick(page, locator);
  await wait(page, jitter(200, 100));
  for (const ch of text) {
    await locator.pressSequentially(ch);
    await wait(page, jitter(90, 50));
  }
  await wait(page, jitter(150, 60));
}

// A small scroll down-then-partly-back-up with pauses, mimicking someone
// glancing down the page before acting, rather than never scrolling at all.
export async function humanIdleScroll(page: Page): Promise<void> {
  const amount = 100 + Math.random() * 250;
  await page.mouse.wheel(0, amount);
  await wait(page, jitter(400, 200));
  await page.mouse.wheel(0, -amount * (0.3 + Math.random() * 0.4));
  await wait(page, jitter(300, 150));
}
