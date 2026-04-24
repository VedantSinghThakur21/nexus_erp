import { test, expect } from '@playwright/test';

test('dashboard loads and sidebar is visible', async ({ page }) => {
  await page.goto('/dashboard');

  // Confirm the sidebar nav renders (adjust selector to match your actual sidebar)
  await expect(
    page.locator('nav[aria-label="sidebar"], aside, [data-testid="sidebar"]')
  ).toBeVisible();

  // Confirm no error boundaries or crash pages are visible
  await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  await expect(page.locator('text=500')).not.toBeVisible();
});

test('unauthenticated access to dashboard redirects to login', async ({
  page,
  context,
}) => {
  // Clear cookies to simulate a logged-out user
  await context.clearCookies();
  await page.goto('/dashboard');

  await page.waitForURL(/.*login/, { timeout: 8000 });
  await expect(page).toHaveURL(/.*login/);
});
