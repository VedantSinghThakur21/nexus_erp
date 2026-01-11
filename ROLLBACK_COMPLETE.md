# Nexus ERP - Single-Tenant Configuration

## ✅ Rollback Complete

The application has been rolled back to a **clean, single-tenant architecture**.

All multi-tenant complexity has been removed:
- ❌ Subdomain routing
- ❌ Dynamic tenant switching  
- ❌ Tenant provisioning scripts
- ❌ Site-based multi-tenancy

## Architecture

**Simple Single-Tenant Setup:**
```
Next.js App (localhost:3000)
     ↓
ERPNext Site (localhost:8080)
     ↓
One Database
```

## Environment Variables Required

Copy `.env.example` to `.env.local` and configure:

```bash
# ERPNext Server URL
ERP_NEXT_URL=http://localhost:8080

# API Credentials (from ERPNext: User > Administrator > API Access)
ERP_API_KEY=your_api_key_here
ERP_API_SECRET=your_api_secret_here

# Frappe Site Name
FRAPPE_SITE_NAME=erp.localhost

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_minimum_32_chars
```

## Files Removed

### Folders:
- `scripts/` - All provisioning scripts
- `app/fix-tenant/` - Debug pages
- `app/setup-tenant/` - Tenant setup pages
- `docs/` - Multi-tenant documentation
- `custom-doctypes/` - Tenant DocType

### Action Files:
- `app/actions/fix-tenant.ts`
- `app/actions/create-tenant-user.ts`
- `app/actions/provision.ts`
- `app/actions/tenants.ts`
- `app/actions/setup-tenant.ts`
- `app/actions/setup-tenant-fields.ts`
- `app/actions/cleanup-tenants.ts`

### Documentation:
- `DOCKER_SETUP.md`
- `DEPLOYMENT_STEPS.md`
- `PRODUCTION-SETUP.md`
- `COPY_TO_SERVER.sh`
- `deploy.sh`

## Simplified Components

### 1. Middleware (`middleware.ts`)
- ✅ Simple authentication check
- ✅ Redirect to `/login` if not authenticated
- ❌ No subdomain detection
- ❌ No tenant routing

### 2. API Layer (`app/lib/api.ts`)
- ✅ `userRequest()` - For logged-in user operations
- ✅ `frappeRequest()` - For admin/system operations
- ❌ Removed `tenantRequest()`
- ❌ Removed `tenantAuthRequest()`
- ❌ Removed `tenantAdminRequest()`
- ✅ Hardcoded `X-Frappe-Site-Name` header

### 3. Signup (`app/actions/signup.ts`)
- ✅ Simple user creation in default ERPNext site
- ✅ Basic validation
- ❌ No provisioning
- ❌ No polling/retries
- ❌ No tenant creation

## Backup Files Created

If you need to restore multi-tenant functionality:
- `app/lib/api-multi-tenant-backup.ts` - Full multi-tenant API layer
- `app/actions/signup-multi-tenant-backup.ts` - Complete signup with provisioning

## How to Use

### 1. Start ERPNext
```bash
# Docker setup
docker-compose up -d

# Or bench
bench start
```

### 2. Configure .env.local
```bash
cp .env.example .env.local
# Edit .env.local with your ERPNext credentials
```

### 3. Start Next.js
```bash
npm install
npm run dev
```

### 4. Test
- Visit: http://localhost:3000
- Login with ERPNext credentials
- All operations now go to single ERPNext site

## Next Steps

When you're ready to implement multi-tenancy properly:
1. Design the architecture first
2. Choose approach: Site-based vs Schema-based
3. Document the plan
4. Implement incrementally with tests
5. Restore from backup files as reference

## Benefits of Clean Slate

✅ **Simplicity** - No complex routing/switching logic  
✅ **Stability** - Fewer moving parts = fewer bugs  
✅ **Performance** - No middleware overhead  
✅ **Debugging** - Easy to trace requests  
✅ **Testing** - Straightforward to test  

## Support

For issues or questions about single-tenant setup, check:
1. ERPNext docs: https://frappeframework.com/docs
2. Environment variables in `.env.local`
3. ERPNext server logs
4. Browser console for API errors
