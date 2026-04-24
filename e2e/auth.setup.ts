import { test as setup } from '@playwright/test';
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

  // Wait for redirect to dashboard — adjust the URL pattern to match your app
  await page.waitForURL(/.*dashboard/, { timeout: 15000 });

  // Persist the auth cookie/storage state to disk
  await page.context().storageState({ path: authFile });
});
