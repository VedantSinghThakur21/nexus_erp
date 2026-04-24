import { expect, test as setup } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

// Deployed auth flows can be slower (tenant resolution, provisioning, redirects).
setup.setTimeout(90_000);

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

  const waitForAuthCookies = async () =>
    expect
      .poll(
        async () => {
          const cookies = await page.context().cookies();
          const byName = (name: string) => cookies.some((c) => c.name === name && Boolean(c.value));

          // Primary signals (server-action auth)
          const hasSid = byName('sid');
          const hasUserType = byName('user_type');

          // Secondary signals (tenant auth / role cookies)
          const hasTenantSubdomain = byName('tenant_subdomain');
          const hasUserEmail = byName('user_email');
          const hasTenantApiKey = byName('tenant_api_key');

          // Consider authenticated if we have a session plus at least one identity hint.
          return (hasSid || hasTenantApiKey) && (hasUserType || hasTenantSubdomain || hasUserEmail);
        },
        { timeout: 60_000 }
      )
      .toBe(true);

  // Wait for either success cookies, or a real error banner text.
  const outcome = await expect
    .poll(
      async () => {
        // 1) Success path: auth cookies present
        const cookies = await page.context().cookies();
        const cookieNames = new Set(cookies.filter((c) => c.value).map((c) => c.name));
        const hasAuthSignal =
          (cookieNames.has('sid') || cookieNames.has('tenant_api_key')) &&
          (cookieNames.has('user_type') || cookieNames.has('tenant_subdomain') || cookieNames.has('user_email'));
        if (hasAuthSignal) return 'auth';

        // 2) Failure path: error banner visible with message
        const count = await errorBanner.count();
        if (count > 0) {
          const visible = await errorBanner.isVisible().catch(() => false);
          if (visible) {
            const msg = (await errorBanner.innerText().catch(() => '')).trim();
            if (msg) return `error:${msg}`;
          }
        }

        return 'pending';
      },
      { timeout: 60_000 }
    )
    .not.toBe('pending');

  if (typeof outcome === 'string' && outcome.startsWith('error:')) {
    throw new Error(`Login failed: ${outcome.slice('error:'.length).trim()}`);
  }

  // Ensure cookies have been written before proceeding.
  await waitForAuthCookies();

  // Land on a stable authenticated route in the same origin.
  // Some accounts may be forced to change password on first login.
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');

  // Persist the auth cookie/storage state to disk
  await page.context().storageState({ path: authFile });
});
