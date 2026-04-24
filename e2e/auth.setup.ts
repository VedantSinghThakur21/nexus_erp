import { expect, test as setup } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'TEST_USER_EMAIL and TEST_USER_PASSWORD must be set as environment variables.'
    );
  }

  await page.goto('/login');

  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');

  // If login fails, the UI renders an error panel. Grab it early so we don't
  // incorrectly fail on a URL wait when the real issue is auth/env.
  const errorPanel = page.locator('form >> div:has(svg)'); // matches the alert row in LoginForm
  await expect(errorPanel).toHaveCount(0, { timeout: 1000 }).catch(async () => {
    const msg = (await errorPanel.first().innerText().catch(() => '')).trim();
    throw new Error(`Login failed: ${msg || 'Unknown error (see screenshot)'}`);
  });

  // The app may redirect to a tenant subdomain based on env; for E2E we only
  // need the auth cookies/storage. Wait for the session cookie instead of URL.
  await expect
    .poll(
      async () => {
        const cookies = await page.context().cookies();
        const hasSid = cookies.some((c) => c.name === 'sid' && Boolean(c.value));
        const hasUserType = cookies.some((c) => c.name === 'user_type' && Boolean(c.value));
        return hasSid && hasUserType;
      },
      { timeout: 30_000 }
    )
    .toBe(true);

  // Land on a stable authenticated route in the same origin.
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');

  // Persist the auth cookie/storage state to disk
  await page.context().storageState({ path: authFile });
});
