# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.setup.ts >> authenticate
- Location: e2e\auth.setup.ts:6:6

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
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
  1  | import { test as setup } from '@playwright/test';
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
  22 |   // Wait for redirect to dashboard — adjust the URL pattern to match your app
> 23 |   await page.waitForURL(/.*dashboard/, { timeout: 15000 });
     |              ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  24 | 
  25 |   // Persist the auth cookie/storage state to disk
  26 |   await page.context().storageState({ path: authFile });
  27 | });
  28 | 
```