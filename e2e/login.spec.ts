import { test, expect } from '@playwright/test';

// This test runs WITHOUT saved auth state to test the login page itself
test.use({ storageState: { cookies: [], origins: [] } });

test('login page renders and rejects bad credentials', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveTitle(/Nexus|Login/i);

  await page.fill('#email', 'wrong@example.com');
  await page.fill('#password', 'wrongpassword');
  await page.click('button[type="submit"]');

  // Should show an error message, NOT redirect
  await expect(page.locator('.text-destructive')).toBeVisible({ timeout: 8000 });
  await expect(page).not.toHaveURL(/dashboard/);
});

test('valid login redirects to dashboard', async ({ page }) => {
  // Deployed login can be slow (provisioning + role normalization + redirects).
  test.setTimeout(3 * 60_000);
  await page.goto('/login');

  await page.fill('#email', process.env.TEST_USER_EMAIL!);
  await page.fill('#password', process.env.TEST_USER_PASSWORD!);
  await page.click('button[type="submit"]');

  // Production login may redirect through tenant subdomains or /change-password,
  // so don't hard-require a /dashboard URL. Treat "leaving /login" or having
  // auth cookies as success, then verify dashboard is reachable.
  const errorBanner = page.locator('.text-destructive').first();

  const startedAt = Date.now();
  const timeoutMs = 150_000;
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

  if (outcome === 'pending') {
    throw new Error('Login timed out waiting for auth or an error message');
  }
  if (outcome.startsWith('error:')) {
    throw new Error(`Login failed: ${outcome.slice('error:'.length).trim()}`);
  }

  // Assert the app completed its post-login redirect.
  // Some users may be routed to /change-password on first login.
  await expect(page).toHaveURL(/\/(dashboard|change-password)(\b|\/|\?)/, { timeout: 150_000 });
});
