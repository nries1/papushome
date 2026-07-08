import { chromium, type Page } from 'playwright';

export async function bookMindbodyClass(
  studioid: string,
  date: string,
  className: string,
  preferredTime?: string
): Promise<string> {
  const MAINCLASS = `https://clients.mindbodyonline.com/classic/mainclass?studioid=${studioid}`;

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  try {
    await login(page, MAINCLASS);
    await navigateToDate(page, MAINCLASS, date);
    return await findAndBook(page, className, preferredTime);
  } catch (err) {
    await page.screenshot({ path: '/app/dist/error.png' }).catch(() => {});
    throw new Error(err instanceof Error ? err.message : String(err));
  } finally {
    await context.close();
    await browser.close();
  }
}

async function login(page: Page, MAINCLASS: string): Promise<void> {
  await page.goto(MAINCLASS);
  await page.waitForLoadState('load');
  await page.waitForTimeout(1000);

  const url = page.url();
  const pageText = await page
    .locator('body')
    .innerText()
    .catch(() => '');
  const needsLogin =
    url.includes('extLink') ||
    /\bSign In\b/i.test(pageText) ||
    (await page
      .locator('#btnSignIn')
      .isVisible()
      .catch(() => false));
  if (!needsLogin) return;

  const signInBtn = page
    .locator('#btnSignIn, a:text("Sign In"), button:text("Sign In")')
    .first();
  await signInBtn.click({ force: true });

  // Mindbody has updated their auth flow — wait for any auth-related URL or input
  await page.waitForFunction(
    () => {
      const href = window.location.href;
      return (
        href.includes('signin.mindbodyonline.com') ||
        href.includes('identity.mindbodyonline.com') ||
        href.includes('auth.mindbodyonline.com') ||
        href.includes('/signin') ||
        href.includes('/login') ||
        !!document.querySelector('#username:not([style*="none"])') ||
        !!document.querySelector('input[type="email"]') ||
        !!document.querySelector('input[name="email"]')
      );
    },
    { timeout: 20000 }
  );
  await page.waitForLoadState('load');
  await page.screenshot({ path: '/app/dist/login-step1.png' }).catch(() => {});

  // Fill email/username — handles both old (#username) and new (type=email) forms
  const usernameField = page
    .locator('#username, input[type="email"], input[name="email"]')
    .first();
  await usernameField.fill(process.env.MINDBODY_USERNAME ?? '');
  await page.locator('button[type="submit"]').click();

  // Wait for password field to appear
  await page.waitForFunction(
    () =>
      !!document.querySelector('#password') ||
      !!document.querySelector('input[type="password"]'),
    { timeout: 15000 }
  );
  await page.waitForLoadState('load');
  await page.screenshot({ path: '/app/dist/login-step2.png' }).catch(() => {});

  const passwordField = page
    .locator('#password, input[type="password"]')
    .first();
  await passwordField.fill(process.env.MINDBODY_PASSWORD ?? '');
  await page.locator('button[type="submit"]').click();

  await page.waitForURL('**/clients.mindbodyonline.com/**', {
    timeout: 20000,
  });
  await page.waitForLoadState('load');

  if (!page.url().includes('clients.mindbodyonline.com')) {
    const msg = await page
      .locator('body')
      .innerText()
      .catch(() => '');
    throw new Error(`Login failed. Page: ${msg.slice(0, 200)}`);
  }
}

async function navigateToDate(page: Page, MAINCLASS: string, isoDate: string): Promise<void> {
  const [year, month, day] = isoDate.split('-');
  const mbDate = `${parseInt(month)}/${parseInt(day)}/${year}`;
  await page.goto(`${MAINCLASS}&stype=-7&view=day&date=${mbDate}`);
  await page.waitForLoadState('load');
  await page.waitForTimeout(1500);
}

async function findAndBook(
  page: Page,
  className: string,
  preferredTime?: string
): Promise<string> {
  const entries = await page.evaluate(() => {
    const btns = Array.from(
      document.querySelectorAll('input[type="button"][name^="but"]')
    );
    return btns
      .map((btn) => {
        const onclick = btn.getAttribute('onclick') || '';
        const urlMatch = onclick.match(/document\.location='([^']+)'/);
        const bookingPath = urlMatch ? urlMatch[1] : '';

        let ancestorText = '';
        let node: Element | null = btn;
        for (let i = 0; i < 20; i++) {
          node = node?.parentElement || null;
          if (!node) break;
          const txt = (node.textContent || '').trim();
          if (txt.length > 30 && txt.length < 500) {
            ancestorText = txt.replace(/\s+/g, ' ');
            break;
          }
        }
        return { bookingPath, ancestorText };
      })
      .filter((e) => e.bookingPath);
  });

  if (!entries.length) {
    const bodyText = await page.locator('body').innerText();
    const lines = bodyText
      .split('\n')
      .filter((l) => l.trim().length > 3)
      .slice(0, 20)
      .join(', ');
    throw new Error(`ERROR: No sign-up buttons found. Page content: ${lines}`);
  }

  const nameRe = new RegExp(className, 'i');
  const matching = entries.filter((e) => nameRe.test(e.ancestorText));

  if (!matching.length) {
    const available = entries
      .map((e) => e.ancestorText.trim().slice(0, 60))
      .join('\n');
    throw new Error(
      `ERROR: No class matching "${className}". Available:\n${available}`
    );
  }

  let target: (typeof matching)[0];
  if (preferredTime) {
    const m = preferredTime.match(/(\d{1,2})(?::\d{2})?\s*(am|pm)/i);
    if (m) {
      const timeRe = new RegExp(`\\b${m[1]}(?::\\d{2})?\\s*${m[2]}`, 'i');
      const byTime = matching.find((e) => timeRe.test(e.ancestorText));
      if (!byTime) {
        const available = matching
          .map((e) => e.ancestorText.trim().slice(0, 60))
          .join('\n');
        throw new Error(
          `ERROR: No "${className}" class at ${preferredTime}. Available times:\n${available}`
        );
      }
      target = byTime;
    } else {
      target = matching[0];
    }
  } else {
    target = matching[0];
  }

  await page.goto(`https://clients.mindbodyonline.com${target.bookingPath}`);
  await page.waitForLoadState('load');
  await page.waitForTimeout(1000);

  const resBody = await page.locator('body').innerText();

  if (/you are enrolled|already signed up|already enrolled/i.test(resBody)) {
    return `Already booked: ${target.ancestorText.trim().slice(0, 80)}`;
  }

  const singleBtn = page.locator(
    '#SubmitEnroll2, input[value*="single reservation" i]'
  );
  if (!(await singleBtn.isVisible().catch(() => false))) {
    throw new Error(
      `ERROR: Reservation button not found. Page: ${resBody.slice(0, 300)}`
    );
  }

  await singleBtn.click();
  await page.waitForLoadState('load');
  await page.waitForTimeout(1000);

  const confirmUrl = page.url();
  const confirmBody = await page.locator('body').innerText();

  if (
    confirmUrl.includes('my_sch.asp') ||
    /you'?ve booked|you are enrolled|successfully|confirmed|thank you|reservation has been made/i.test(
      confirmBody
    )
  ) {
    return `Booked: ${target.ancestorText.trim().slice(0, 80)}`;
  }

  return `Booked (unconfirmed): ${target.ancestorText.trim().slice(0, 80)}`;
}
