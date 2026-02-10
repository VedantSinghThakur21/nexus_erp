# Migration Checklist: Nexus ERP Provisioning v2

This document guides you through migrating from the old `docker exec + bench console` approach to the production-grade Python FastAPI provisioning service.

## Pre-Migration: Backup & Snapshot

- [ ] Backup your database
- [ ] Tag current code in git: `git tag pre-provisioning-v2`
- [ ] Create a test environment for dry-run

## Step 1: Deploy the Provisioning Service

### 1.1. Build the Docker Image
```bash
cd provisioning-service
docker build -t nexus-provisioning:latest .
```

**Verify:**
```bash
docker images | grep nexus-provisioning
# Should show: nexus-provisioning  latest  abc123...
```

### 1.2. Add Service to Docker Compose

**Option A: Standalone Sidecar (Recommended)**
```bash
# Copy the provisioning-service/docker-compose.yml content and add it to your main compose file
# Adjust volume and network names to match your existing setup
docker-compose up -d provisioning
docker-compose logs provisioning
# Should show: "Starting Provisioning Service on port 8001"
```

**Option B: Run as Separate Container**
```bash
docker run -d \
  --name nexus-provisioning \
  --restart unless-stopped \
  -p 127.0.0.1:8001:8001 \
  -e BENCH_PATH=/home/frappe/frappe-bench \
  -e MASTER_SITE_NAME=erp.localhost \
  -e PARENT_DOMAIN=avariq.in \
  -e DB_ROOT_PASSWORD=123 \
  -e PROVISIONING_API_SECRET="$(openssl rand -hex 32)" \
  -v frappe-bench:/home/frappe/frappe-bench \
  --network frappe-network \
  nexus-provisioning:latest
```

### 1.3. Verify Service Health
```bash
curl -s http://localhost:8001/health | jq .
# Should return:
# {
#   "status": "healthy",
#   "bench_path": "/home/frappe/frappe-bench",
#   "master_site": "erp.localhost",
#   "timestamp": "2026-02-10T..."
# }
```

- [ ] Provisioning service is running and healthy
- [ ] Health endpoint responds with status="healthy"

## Step 2: Update Environment Variables

### 2.1. Generate Secrets
```bash
# Generate NEXTAUTH_SECRET (if not already set)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET"

# Generate PROVISIONING_API_SECRET
PROVISIONING_API_SECRET=$(openssl rand -hex 32)
echo "PROVISIONING_API_SECRET=$PROVISIONING_API_SECRET"
```

### 2.2. Update .env.local
```bash
# Copy .env.example to .env.local if you haven't already
cp .env.example .env.local

# Edit .env.local and set:
PROVISIONING_SERVICE_URL=http://localhost:8001
PROVISIONING_API_SECRET=<paste the value from 2.1>
NEXTAUTH_SECRET=<paste if updating>
NEXTAUTH_URL=https://avariq.in  # (or http://localhost:3000 for dev)
```

- [ ] `.env.local` updated with provisioning service URL and secret
- [ ] `PROVISIONING_API_SECRET` matches between Next.js and Python service
- [ ] All other variables (ERP_API_KEY, ERP_API_SECRET, etc.) are set

## Step 3: Update Next.js Code

### 3.1. Replace Core Files
The following replacements have already been completed:
- [x] `auth.ts` — Updated to include Master DB tenant lookup on sign-in
- [x] `middleware.ts` — Updated with proper tenant route protection
- [x] `app/actions/signup.ts` — Updated to use provisioning service
- [x] `app/actions/provision.ts` — Updated to call HTTP provisioning endpoint
- [x] `lib/provisioning-client.ts` — New HTTP client library
- [x] `app/actions/social-onboarding.ts` — New Google OAuth → provisioning flow
- [x] `app/onboarding/page.tsx` — Import updated to use new social-onboarding action

**Verify all files are in place:**
```bash
ls -la auth.ts middleware.ts
ls -la app/actions/{signup,provision,social-onboarding}.ts
ls -la lib/provisioning-client.ts
ls -la app/onboarding/page.tsx
```

- [ ] All core files have been replaced/created

### 3.2. Install Dependencies
No new npm dependencies are required. The provisioning client uses only native `fetch` API.

```bash
npm install  # Just to be safe
```

## Step 4: Test the Provisioning Flow

### 4.1. Test Subdomain Check (Quick)
```bash
curl -X GET "http://localhost:3000/api/check-subdomain?subdomain=test-org" \
  -H "X-Provisioning-Secret: $(echo $PROVISIONING_API_SECRET)"
```

**Expected response:**
```json
{
  "available": true,
  "subdomain": "test-org"
}
```

- [ ] Subdomain check endpoint works

### 4.2. Test Full Provisioning Flow (Manual)

**Step A: Navigate to signup page**
```
http://localhost:3000/signup
```

**Step B: Fill in form**
- Organization Name: `Test Org`
- Admin Email: `admin@test.com`
- Password: `TestPass123!`
- Full Name: `Test Admin`

**Step C: Watch provisioning page**
- Should show "Creating Isolated Database", "Deploying ERPNext Instance", etc.
- This takes 30-90 seconds
- Check logs: `docker-compose logs provisioning`

**Step D: Verify result**
- Should see "Workspace Ready! Redirecting..."
- Should be redirected to `http://test-org.localhost:3000/dashboard`
- Login should work

**If it fails:**
1. Check provisioning service logs: `docker-compose logs provisioning`
2. Check Next.js logs: `npm run dev` output
3. Verify `.env.local` settings
4. Verify provisioning service is healthy: `curl http://localhost:8001/health`

- [ ] Full provisioning flow works end-to-end (staging/dev)
- [ ] User is redirected to new subdomain
- [ ] New site is created in Frappe
- [ ] Admin user can log in

### 4.3. Test Google OAuth Flow

**Prerequisites:**
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` must be set in `.env.local`
- Google OAuth redirect URI must include `http://localhost:3000/api/auth/callback/google`

**Test steps:**
1. Navigate to `http://localhost:3000/login`
2. Click "Sign in with Google"
3. Complete Google OAuth flow
4. Should redirect to `/onboarding` (since no org name yet)
5. Enter organization name "My Test Workspace"
6. Should provision and redirect to `my-test-workspace.localhost:3000/dashboard`

- [ ] Google OAuth sign-in works
- [ ] New users are redirected to `/onboarding`
- [ ] Workspace creation from Google OAuth works
- [ ] Returning users skip onboarding

## Step 5: Cleanup Old Code

### 5.1. Mark old provisioning script as deprecated
```bash
# Option 1: Delete (if fully confident)
rm scripts/provision-tenant.ts

# Option 2: Archive for reference
mv scripts/provision-tenant.ts scripts/provision-tenant.OLD.ts
git add scripts/provision-tenant.OLD.ts
git commit -m "Archive: old docker exec provisioning approach"
```

### 5.2. Remove old imports (if any reference remains)
Search for any remaining imports from `scripts/provision-tenant`:
```bash
grep -r "provision-tenant" app/
# Should return nothing
```

- [ ] Old provisioning script removed or archived
- [ ] No references to old approach remain in codebase

## Step 6: Production Deployment

### 6.1. Update Docker Compose for Production

**In your main `docker-compose.yml`:**
```yaml
services:
  provisioning:
    build:
      context: ./provisioning-service
    restart: unless-stopped
    environment:
      - PROVISIONING_API_SECRET=${PROVISIONING_API_SECRET}
      - ENVIRONMENT=production
    volumes:
      - frappe-bench:/home/frappe/frappe-bench
    networks:
      - frappe-network
    # Expose only internally (port 8001 not accessible from internet)
    expose:
      - "8001"
```

### 6.2. Update .env for Production

```bash
# Production values
PROVISIONING_SERVICE_URL=http://provisioning:8001  # Docker network name
NODE_ENV=production
NEXTAUTH_URL=https://avariq.in
```

### 6.3. Security Checklist

- [ ] `PROVISIONING_API_SECRET` is a strong random value (32 hex chars minimum)
- [ ] `NEXTAUTH_SECRET` is set and strong
- [ ] Provisioning service is NOT exposed to the internet (only via Docker network)
- [ ] ERP_API_KEY and ERP_API_SECRET are from a limited-permission API token (not master)
- [ ] Google OAuth secrets are environment variables, not hardcoded
- [ ] HTTPS is enforced in production (`NODE_ENV=production`)

### 6.4. Monitoring & Logs

**Setup log aggregation:**
```bash
# View provisioning service logs
docker-compose logs -f provisioning

# Or use your log aggregation system (CloudWatch, ELK, Datadog, etc.)
```

- [ ] Logs are being collected and retained
- [ ] Alerts are configured for service failures

## Step 7: Validation & Testing

### 7.1. Staging Dry-Run

Before going live:
1. Deploy new code to staging environment
2. Run 5-10 test provisioning flows
3. Verify all sites are created correctly
4. Test Google OAuth sign-ups
5. Check for duplicate subdomain handling

```bash
# Test script idea (pseudocode):
for i in {1..5}; do
  curl -X POST http://staging.provisioning/api/v1/provision \
    -H "X-Provisioning-Secret: $SECRET" \
    -d '{"organization_name": "TestOrg'$i'", "admin_email": "test'$i'@example.com", ...}'
  echo "Test $i provision completed"
done
```

- [ ] Staging tests pass
- [ ] No data loss or corruption
- [ ] Performance is acceptable (< 90s per site)

### 7.2. Rollback Plan

If something goes wrong in production:

```bash
# Option A: Use git to revert
git revert <commit-hash-of-v2-migration>
docker-compose rebuild
docker-compose up -d

# Option B: Quick rollback (keep provisioning service, revert actions)
git checkout HEAD~1 -- app/actions/signup.ts app/actions/provision.ts auth.ts middleware.ts
npm run build
```

- [ ] Rollback procedure documented
- [ ] Team is trained on rollback steps
- [ ] Backup is current and tested

## Post-Migration

### 8.1. Document the Change
- [ ] Add note to DEPLOYMENT_NOTES.md
- [ ] Update team wiki/docs
- [ ] Notify team of new architecture

### 8.2. Monitor Metrics
Track these metrics for 1-2 weeks:
- Provisioning success rate (target: >99%)
- Average provisioning time (target: <60s)
- Error rates (target: <0.1%)
- Google OAuth conversion rate

### 8.3. Cleanup Tasks
- [ ] Delete old `provision-tenant.ts` completely (after 1 week of validation)
- [ ] Remove old imports from `user-auth.ts` if any
- [ ] Update CI/CD pipelines if they referenced old provisioning script
- [ ] Update deployment documentation

## Success Criteria

✅ Migration is complete when:
1. At least 10 successful provisioning flows (manual testing)
2. Google OAuth sign-up works end-to-end
3. New tenants are isolated (separate databases)
4. Admin users can log in immediately after provisioning
5. All sites appear in Master DB SaaS Tenant table
6. Zero broken signups in production (24 hours)
7. Provisioning times are consistent (<90s)
8. No critical errors in logs

## Troubleshooting

### Issue: "Provisioning service unreachable"
**Cause:** Service not running or wrong URL
**Fix:**
```bash
curl http://localhost:8001/health
docker-compose logs provisioning
# Check PROVISIONING_SERVICE_URL in .env.local
```

### Issue: "Subdomain already exists" on first signup
**Cause:** Duplicate subdomain in Master DB
**Fix:**
```bash
# Go to Frappe Master DB and check:
# List > SaaS Tenant > find the duplicate subdomain
# Either use existing site or delete duplicate
```

### Issue: "Admin user configuration failed" during provisioning
**Cause:** Password too weak or user creation failed
**Fix:**
```bash
docker-compose logs provisioning
# Check password requirements in provisioning-service/app.py
# Re-run signup (idempotent if subdomain already exists)
```

### Issue: Site created but API keys not in cookies
**Cause:** Cookie domain misconfiguration
**Fix:**
```bash
# Check .env.local:
# NEXT_PUBLIC_ROOT_DOMAIN=avariq.in
# Cookie domain should be .avariq.in (with dot prefix for prod)
```

---

**Questions?** Check the [ARCHITECTURE.md](./ARCHITECTURE.md) for deep dive into the design.
