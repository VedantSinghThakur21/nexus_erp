# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.setup.ts >> authenticate
- Location: e2e\auth.setup.ts:6:6

# Error details

```
Error: Login failed: <!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN"> <html><head> <title>404 Not Found</title> </head><body> <h1>Not Found</h1> <p>The requested URL was not found on this server.</p> </body></html>
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - button "Toggle theme" [ref=e4]:
      - img
    - generic [ref=e5]:
      - generic [ref=e7]: "N"
      - generic [ref=e8]: Nexus ERP
    - generic [ref=e9]:
      - generic [ref=e10]:
        - generic [ref=e11]:
          - heading "Welcome back" [level=1] [ref=e12]
          - paragraph [ref=e13]: Sign in to your workspace
        - generic [ref=e14]:
          - generic [ref=e15]:
            - img [ref=e16]
            - text: <!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN"> <html><head> <title>404 Not Found</title> </head><body> <h1>Not Found</h1> <p>The requested URL was not found on this server.</p> </body></html>
          - generic [ref=e18]:
            - generic [ref=e19]: Email or Username
            - textbox "Email or Username" [ref=e20]:
              - /placeholder: you@company.com
              - text: testuser@yourtenant.com
          - generic [ref=e21]:
            - generic [ref=e23]: Password
            - generic [ref=e24]:
              - textbox "Password" [ref=e25]:
                - /placeholder: ••••••••
                - text: your_test_password
              - button [ref=e26]:
                - img [ref=e27]
          - button "Sign in" [ref=e30]
        - paragraph [ref=e31]:
          - text: By signing in, you agree to our
          - link "Terms of Service" [ref=e32] [cursor=pointer]:
            - /url: "#"
      - generic [ref=e35]: AI-powered business operating system
  - button "Open chat" [ref=e36]:
    - img
    - generic [ref=e37]: AI
  - generic [ref=e42] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e43]:
      - img [ref=e44]
    - generic [ref=e47]:
      - button "Open issues overlay" [ref=e48]:
        - generic [ref=e49]:
          - generic [ref=e50]: "0"
          - generic [ref=e51]: "1"
        - generic [ref=e52]: Issue
      - button "Collapse issues badge" [ref=e53]:
        - img [ref=e54]
  - alert [ref=e56]
```

# Test source

```ts
  1  | import { expect, test as setup } from '@playwright/test';
  2  | import path from 'path';
  3  | 
  4  | const authFile = path.join(__dirname, '.auth/user.json');
  5  | 
  6  | setup('authenticate', async ({ page }) => {
  7  |   const email = process.env.TEST_USER_EMAIL;
  8  |   const password = process.env.TEST_USER_PASSWORD;
  9  | 
  10 |   if (!email || !password) {
  11 |     throw new Error(
  12 |       'TEST_USER_EMAIL and TEST_USER_PASSWORD must be set as environment variables.'
  13 |     );
  14 |   }
  15 | 
  16 |   await page.goto('/login');
  17 | 
  18 |   await page.fill('#email', email);
  19 |   await page.fill('#password', password);
  20 |   await page.click('button[type="submit"]');
  21 | 
  22 |   // If login fails, the UI renders an error panel. Grab it early so we don't
  23 |   // incorrectly fail on a URL wait when the real issue is auth/env.
  24 |   const errorPanel = page.locator('form >> div:has(svg)'); // matches the alert row in LoginForm
  25 |   await expect(errorPanel).toHaveCount(0, { timeout: 1000 }).catch(async () => {
  26 |     const msg = (await errorPanel.first().innerText().catch(() => '')).trim();
> 27 |     throw new Error(`Login failed: ${msg || 'Unknown error (see screenshot)'}`);
     |           ^ Error: Login failed: <!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN"> <html><head> <title>404 Not Found</title> </head><body> <h1>Not Found</h1> <p>The requested URL was not found on this server.</p> </body></html>
  28 |   });
  29 | 
  30 |   // The app may redirect to a tenant subdomain based on env; for E2E we only
  31 |   // need the auth cookies/storage. Wait for the session cookie instead of URL.
  32 |   await expect
  33 |     .poll(
  34 |       async () => {
  35 |         const cookies = await page.context().cookies();
  36 |         const hasSid = cookies.some((c) => c.name === 'sid' && Boolean(c.value));
  37 |         const hasUserType = cookies.some((c) => c.name === 'user_type' && Boolean(c.value));
  38 |         return hasSid && hasUserType;
  39 |       },
  40 |       { timeout: 30_000 }
  41 |     )
  42 |     .toBe(true);
  43 | 
  44 |   // Land on a stable authenticated route in the same origin.
  45 |   await page.goto('/dashboard');
  46 |   await page.waitForLoadState('domcontentloaded');
  47 | 
  48 |   // Persist the auth cookie/storage state to disk
  49 |   await page.context().storageState({ path: authFile });
  50 | });
  51 | 
```