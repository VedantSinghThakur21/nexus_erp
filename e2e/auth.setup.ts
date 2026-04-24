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

  // The app may redirect to a tenant subdomain based on env; for E2E we only
  // need the auth cookies/storage. Wait for cookies, but fail fast if the UI
  // shows an actual login error.
  const errorBanner = page.locator('form .text-destructive').first();

  const waitForAuthCookies = expect.poll(async () => {
    const cookies = await page.context().cookies();
    const hasSid = cookies.some((c) => c.name === 'sid' && Boolean(c.value));
    const hasUserType = cookies.some((c) => c.name === 'user_type' && Boolean(c.value));
    return hasSid && hasUserType;
  }, { timeout: 30_000 }).toBe(true);

  const waitForLoginError = (async () => {
    // Only treat it as an error if the banner is visible and has non-trivial text.
    await expect(errorBanner).toBeVisible({ timeout: 30_000 });
    const msg = (await errorBanner.innerText().catch(() => '')).trim();
    if (msg && msg.toLowerCase() !== 'password' && msg.toLowerCase() !== 'email or username') {
      throw new Error(`Login failed: ${msg}`);
    }
    // If we matched a false-positive node, keep waiting for cookies instead.
    await waitForAuthCookies;
  })();

  await Promise.race([waitForAuthCookies, waitForLoginError]);

  // Land on a stable authenticated route in the same origin.
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');

  // Persist the auth cookie/storage state to disk
  await page.context().storageState({ path: authFile });
});
