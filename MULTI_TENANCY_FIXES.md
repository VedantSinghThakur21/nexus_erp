# Multi-Tenancy Fixes - Summary

## Date: 2026-01-08

### Issues Fixed

#### 1. Missing X-Frappe-Site-Name Header
**Problem**: Tenant API requests were failing with 401 errors because Frappe didn't know which site database to use.

**Solution**: Added `X-Frappe-Site-Name` header to all tenant requests in `app/lib/api.ts`:
- `userRequest()`: Adds header for tenant users based on `tenant_subdomain` cookie
- `frappeRequest()`: Adds header when `useTenantUrl=true`
- `tenantRequest()`: Adds header based on subdomain from middleware

**Files Changed**:
- `app/lib/api.ts`

#### 2. Error Handling in Dashboard
**Problem**: Dashboard was crashing when API calls failed, showing error pages instead of gracefully handling missing data.

**Solution**: Wrapped all data fetching in try-catch blocks with sensible defaults:
- Returns empty arrays for list data
- Returns zero/default values for stats
- Page renders without errors even when backend is unavailable

**Files Changed**:
- `app/(main)/dashboard/page.tsx`

#### 3. Error Handling in Settings
**Problem**: Settings page showed errors when user profile couldn't be loaded.

**Solution**: 
- Added error handling with `.catch()` for all data fetching
- Added null check for profile display
- Shows "Please log in" message when profile is unavailable

**Files Changed**:
- `app/(main)/settings/page.tsx`

#### 4. Improved Error Logging
**Problem**: Generic "API Error" messages didn't show actual Frappe error details.

**Solution**: Enhanced error logging in `frappeRequest()` to show:
- Full JSON response
- HTTP status codes
- Frappe exception details
- URL being called

**Files Changed**:
- `app/lib/api.ts`

### Authentication Flow (How It Works Now)

1. **User Signs Up**:
   - Creates Tenant record in master database
   - Provisions new tenant site via Docker
   - Tenant gets unique subdomain (e.g., `acme.localhost`)

2. **User Logs In**:
   - System checks if email is tenant owner
   - Authenticates against tenant's site
   - Sets cookies:
     - `sid`: Session ID from tenant site
     - `user_email`: User's email
     - `tenant_subdomain`: e.g., "acme"
     - `user_type`: "tenant"

3. **Middleware Routes Requests**:
   - Reads `tenant_subdomain` cookie
   - Fetches tenant config from master database
   - Sets headers:
     - `X-ERPNext-URL`: Tenant's site URL
     - `X-Tenant-Mode`: "tenant"
     - `X-Subdomain`: Tenant's subdomain

4. **API Requests Include Site Name**:
   - All requests to tenant site include `X-Frappe-Site-Name: <subdomain>.localhost`
   - Frappe uses this to select the correct database
   - Session `sid` cookie authenticates the user

### Testing Checklist

#### Before Testing
- [ ] Update `.env.local` on Ubuntu server with correct API keys
- [ ] Restart Next.js: `pm2 restart nexus-erp`
- [ ] Verify Frappe Docker containers running
- [ ] Verify master database API keys match `.env.local`

#### Signup & Provisioning
- [ ] Navigate to /signup
- [ ] Fill form with new email
- [ ] Submit and watch PM2 logs
- [ ] Verify tenant created in database
- [ ] Verify tenant status = "active"

#### Login
- [ ] Navigate to /login
- [ ] Enter tenant email and password
- [ ] Should redirect to /dashboard
- [ ] Check browser cookies (DevTools → Application → Cookies)
- [ ] Should see: sid, user_email, tenant_subdomain, user_type

#### Dashboard
- [ ] Dashboard loads without errors
- [ ] Stats show (even if zeros)
- [ ] Charts render (even if empty)
- [ ] No console errors about "API Error"

#### Settings
- [ ] Navigate to /settings
- [ ] Profile section shows OR displays "Please log in"
- [ ] No crashes or unhandled errors

### Known Limitations

1. **Site Name Format**: Currently hardcoded to `<subdomain>.localhost`
   - Works for local/dev environments
   - For production with custom domains, may need to adjust format

2. **Session Timeout**: Sessions expire after Frappe's default timeout
   - Need to implement session refresh or extend timeout
   - User will see "Not authenticated" errors when session expires

3. **Error Recovery**: If API keys change, requires manual sync
   - No automatic regeneration yet
   - Must update both database and `.env.local`

### Next Steps for Production

1. **SSL/HTTPS**: Install Let's Encrypt certificate
2. **Custom Domains**: Support full custom domains per tenant (optional)
3. **Session Management**: Implement session refresh/extension
4. **Error Tracking**: Integrate Sentry or similar
5. **Performance**: Add caching layer, optimize queries
6. **Monitoring**: Set up uptime monitoring and alerts
7. **Backup**: Automated daily backups of database and files

### Files Modified

- `app/lib/api.ts` - Added X-Frappe-Site-Name headers
- `app/(main)/dashboard/page.tsx` - Added error handling
- `app/(main)/settings/page.tsx` - Added error handling and null checks

### New Files Created

- `PRODUCTION_CHECKLIST.md` - Step-by-step deployment guide
- `deploy.sh` - Automated deployment script
- `MULTI_TENANCY_FIXES.md` - This file

### Deployment Commands

```bash
# On Ubuntu server

# 1. Pull latest code
cd ~/nexus_web
git pull origin main

# 2. Install and build
npm install
npm run build

# 3. Restart
pm2 restart nexus-erp

# 4. Check logs
pm2 logs nexus-erp --lines 50
```

Or use the automated script:
```bash
cd ~/nexus_web
chmod +x deploy.sh
./deploy.sh
```

---

## Troubleshooting Quick Reference

| Error | Cause | Fix |
|-------|-------|-----|
| 401 Authentication | API keys mismatch | Sync .env.local and database keys |
| "No logged-in user" | Missing/expired session | Clear cookies, log in again |
| "API Error" | Site name header missing | Update to latest code |
| Provisioning fails | Script path wrong | Check PROVISION_SCRIPT_PATH in .env |
| Empty dashboard | No data yet | Normal for new tenants |

---

**Status**: ✅ Ready for Testing
**Next Milestone**: Full end-to-end multi-tenant test with 2-3 different tenant accounts
