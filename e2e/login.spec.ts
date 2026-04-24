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
  await page.goto('/login');

  await page.fill('#email', process.env.TEST_USER_EMAIL!);
  await page.fill('#password', process.env.TEST_USER_PASSWORD!);
  await page.click('button[type="submit"]');

  await page.waitForURL(/.*dashboard/, { timeout: 15000 });
  await expect(page).toHaveURL(/.*dashboard/);
});
