import { test, expect } from '@playwright/test';

// This test runs WITHOUT saved auth state to test the login page itself
test.use({ storageState: { cookies: [], origins: [] } });

test('login page renders and rejects bad credentials', async ({ page }) => {
  test.setTimeout(2 * 60_000);
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await expect(page).toHaveTitle(/Nexus|Login/i);

  await page.fill('#email', 'wrong@example.com');
  await page.fill('#password', 'wrongpassword');
  await page.click('button[type="submit"]');

  // Should NOT authenticate (either an error appears, or we stay on /login without auth cookies)
  const startedAt = Date.now();
  const timeoutMs = 60_000;
  while (Date.now() - startedAt < timeoutMs) {
    if (await page.locator('.text-destructive').first().isVisible().catch(() => false)) break;
    const cookies = await page.context().cookies();
    const hasSid = cookies.some((c) => c.name === 'sid' && c.value);
    if (!hasSid && page.url().includes('/login')) {
      const btn = page.locator('button[type="submit"]').first();
      const enabled = await btn.isEnabled().catch(() => true);
      if (enabled) break;
    }
    await page.waitForTimeout(250);
  }
  await expect(page).toHaveURL(/\/login(\b|\/|\?)/);
  const cookies = await page.context().cookies();
  expect(cookies.some((c) => c.name === 'sid' && c.value)).toBe(false);
});

test('valid login redirects to dashboard', async ({ page }) => {
  test.skip(process.env.RUN_LOGIN_E2E !== '1', 'Set RUN_LOGIN_E2E=1 to run the full login redirect smoke (can be flaky on deployed envs)')
  // Deployed login can be slow (provisioning + role normalization + redirects).
  test.setTimeout(8 * 60_000);
  const email = process.env.TEST_USER_EMAIL!;
  const password = process.env.TEST_USER_PASSWORD!;

  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.getByLabel(/email or username/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByRole('button', { name: /^sign in$/i }).click();

    // Production login may redirect through tenant subdomains or /change-password,
    // so don't hard-require a /dashboard URL. Treat "leaving /login" or having
    // auth cookies as success, then verify dashboard is reachable.
    const errorBanner = page.locator('.text-destructive').first();

    const startedAt = Date.now();
    const timeoutMs = 6 * 60_000;
    let outcome: 'auth' | `error:${string}` | 'pending' = 'pending';

    while (Date.now() - startedAt < timeoutMs) {
      const url = page.url();
      if (/\/(dashboard|change-password)(\b|\/|\?)/.test(url) || !url.includes('/login')) {
        outcome = 'auth';
        break;
      }

      const cookies = await page.context().cookies();
      const cookieNames = new Set(cookies.filter((c) => c.value).map((c) => c.name));
      const hasAuthSignal =
        (cookieNames.has('sid') || cookieNames.has('tenant_api_key')) &&
        (cookieNames.has('user_type') ||
          cookieNames.has('tenant_subdomain') ||
          cookieNames.has('user_email'));
      if (hasAuthSignal) {
        outcome = 'auth';
        break;
      }

      if (await errorBanner.count()) {
        const visible = await errorBanner.isVisible().catch(() => false);
        if (visible) {
          const msg = (await errorBanner.innerText().catch(() => '')).trim();
          if (msg) {
            outcome = `error:${msg}`;
            break;
          }
        }
      }

      await page.waitForTimeout(250);
    }

    if (outcome === 'auth') break;
    if (outcome === 'pending') throw new Error('Login timed out waiting for auth or an error message');
    const msg = outcome.slice('error:'.length).trim();
    if (attempt < 3 && /unexpected response/i.test(msg)) {
      // transient backend / reverse-proxy hiccup; retry once
      continue;
    }
    throw new Error(`Login failed: ${msg}`);
  }

  // Assert the app completed its post-login redirect.
  // Some users may be routed to /change-password on first login.
  await expect(page).toHaveURL(/\/(dashboard|change-password)(\b|\/|\?)/, { timeout: 150_000 });
});
