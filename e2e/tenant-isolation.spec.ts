import { test, expect } from '@playwright/test';

// NOTE: For subdomain-based tenancy in local dev, you may need to
// add entries to /etc/hosts (e.g., 127.0.0.1 tenant1.localhost)
// OR configure your app to use a path-based tenant prefix for testing.

test('tenant context is present after login', async ({ page }) => {
  await page.goto('/dashboard');

  // Check that the tenant name/logo appears somewhere in the UI.
  // Replace this selector with whatever shows the tenant identity in your sidebar/header.
  const tenantIndicator = page.locator(
    '[data-testid="tenant-name"], .tenant-name, header'
  );
  await expect(tenantIndicator).toBeVisible();
});
