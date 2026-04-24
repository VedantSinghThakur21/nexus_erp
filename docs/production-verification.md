# Production Deployment Verification (Nexus ERP)

This runbook is tailored for the current production topology:

- Single VM
- Nginx in front
- Next.js app managed by PM2
- ERPNext/Frappe backend reachable from the VM
- Manual SSH deployments

## Required environment inputs

- `PLAYWRIGHT_BASE_URL`: Public app URL, e.g. `https://testorg.avariq.in`
- `TEST_USER_EMAIL` / `TEST_USER_PASSWORD`: A real user for login smoke tests
- `ERP_NEXT_URL`: Frappe base URL reachable from the app server (if verifying backend directly)
- `NEXT_PUBLIC_ROOT_DOMAIN`: e.g. `avariq.in`

Optional (recommended for E2E stability in prod environments):

- `NEXUS_FAST_LOGIN=1`: skips slow provisioning/role-normalization side effects during login.

## Pre-deploy checklist (VM)

### Code/release
- Confirm the release commit/tag you are deploying.
- Ensure the repo is clean or the exact changes are intentional.

### Runtime
- Confirm Node/NPM versions:
  - `node -v`
  - `npm -v`
- Confirm disk/memory headroom:
  - `df -h`
  - `free -h`

### Nginx/TLS
- Confirm Nginx config is valid:
  - `sudo nginx -t`
- Confirm cert status (if using LetsEncrypt):
  - `sudo certbot certificates` (or provider equivalent)

### Dependencies/build
- Install deps cleanly:
  - `npm ci`
- Build succeeds:
  - `npm run build`

### Backend reachability (ERPNext/Frappe)
- From the VM, ensure ERPNext responds:
  - `curl -sS -o /dev/null -w "%{http_code}\n" "$ERP_NEXT_URL/api/method/ping"`
  - If `ping` isn’t enabled, check any known public method you allow.

### Backups
- Ensure a recent DB backup exists (ERPNext MariaDB + site configs).
- Ensure `.env` and PM2 configs are backed up.

## Deploy steps (manual SSH)

1. Pull the intended release:
   - `git fetch --all --tags`
   - `git checkout <tag-or-sha>`

2. Install deps and build:
   - `npm ci`
   - `npm run build`

3. Restart app (PM2):
   - `pm2 status`
   - `pm2 reload <app-name>` (preferred) or `pm2 restart <app-name>`
   - `pm2 logs <app-name> --lines 50`

4. Reload Nginx (only if config changed):
   - `sudo nginx -t && sudo systemctl reload nginx`

## Post-deploy verification (automated)

Run the automated verification suite from the repo root:

- Pre/post style:
  - `npm run verify:prod:pre`
  - `npm run verify:prod:post`

- Or Playwright smoke only:
  - `npm run test:e2e -- --project=prod-smoke`

## Post-deploy verification (manual)

### Web smoke
- Open `/login` and confirm page loads.
- Log in with a real user; ensure redirect completes.
- Open `/dashboard` and confirm sidebar renders and core widgets load.

### Multi-tenant sanity
- Confirm you’re on the intended tenant host (subdomain).
- Confirm tenant-specific data (e.g. tenant name) matches expectation.

### Logs (watch for common issues)
- Next.js/PM2 logs: look for spikes of:
  - `401` retries / session fallback loops
  - provisioning service timeouts
  - Frappe `OperationalError (1020)` during login bursts

## Rollback (fast)

If verification fails and the issue is release-related:

1. Switch back to last known good tag/sha:
   - `git checkout <previous-tag-or-sha>`
2. Reinstall/build:
   - `npm ci && npm run build`
3. Restart:
   - `pm2 reload <app-name>`
4. Re-run:
   - `npm run verify:prod:post`

