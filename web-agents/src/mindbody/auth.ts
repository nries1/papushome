import type { Page } from 'playwright'
import { humanClick, humanType } from './humanInteraction'

// Fills and submits MindBody's email/password sign-in form. Shared because
// both the classic scheduler and the Explore consumer listing route through
// the same signin.mindbodyonline.com identity provider (different OAuth
// client_id, same form) once a login is actually required. Callers are
// responsible for detecting when a login is needed and for verifying where
// they land afterward — the two flows redirect to different places on success.
//
// Uses humanClick/humanType (mouse travel + per-keystroke delay) rather than
// Playwright's default .click()/.fill() — this form sits behind reCAPTCHA
// Enterprise, and interaction pattern is one of the signals its risk scoring
// weighs alongside device/session history.
export async function signInMindbody(page: Page): Promise<void> {
  await page.waitForLoadState('load')

  const usernameField = page
    .locator('#username, input[type="email"], input[name="email"]')
    .first()
  await usernameField.waitFor({ state: 'visible', timeout: 15000 })
  await humanType(page, usernameField, process.env.MINDBODY_USERNAME ?? '')
  await humanClick(page, page.locator('button[type="submit"]').first())

  await page.waitForFunction(
    () =>
      !!document.querySelector('#password') ||
      !!document.querySelector('input[type="password"]'),
    { timeout: 15000 }
  )
  await page.waitForLoadState('load')

  const passwordField = page
    .locator('#password, input[type="password"]')
    .first()
  await humanType(page, passwordField, process.env.MINDBODY_PASSWORD ?? '')
  await humanClick(page, page.locator('button[type="submit"]').first())
  await page.waitForLoadState('load')
}
