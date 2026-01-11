# Multi-Tenant Provisioning Setup Guide

## 📋 Prerequisites

Before using the provisioning system, ensure you have:

1. **Docker & Docker Compose** installed and running
2. **ERPNext/Frappe** running in Docker containers
3. **Node.js** v18+ installed
4. **Next.js** application configured

## 🚀 Quick Start

### 1. Environment Configuration

Create or update `.env.local`:

```bash
# Docker Configuration
DOCKER_SERVICE=backend
ADMIN_PASSWORD=admin

# ERPNext Master Site
ERP_NEXT_URL=http://localhost:8080
ERP_API_KEY=your_master_api_key_here
ERP_API_SECRET=your_master_api_secret_here
FRAPPE_SITE_NAME=master.localhost

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_here
```

### 2. Verify Docker Setup

```bash
# Check if containers are running
docker compose ps

# Expected output:
# NAME                         STATUS
# frappe_docker-backend-1      Up
# frappe_docker-db-1          Up
# frappe_docker-frontend-1    Up
```

### 3. Test Provisioning

```bash
# Navigate to scripts directory
cd scripts

# Run test script
node test-provisioning.js
```

**Expected Output:**
```
🧪 Starting Provisioning Test

Test Configuration:
{
  "subdomain": "test-1736611200000",
  "email": "test-1736611200000@example.com",
  ...
}

============================================================

[1/5] Creating site: test-1736611200000.localhost...
✓ Site created successfully
[2/5] Installing nexus_core app...
⚠ App installation skipped (app may not exist)
[3/5] Creating admin user: test-1736611200000@example.com...
✓ User created successfully
[4/5] Initializing subscription settings...
✓ Subscription settings initialized
[5/5] Generating API keys...
✓ API keys generated

✅ Provisioning completed in 12.34s

============================================================

✅ PROVISIONING TEST PASSED

Result:
{
  "success": true,
  "site": "test-1736611200000.localhost",
  ...
}
```

### 4. Cleanup Test Tenant

```bash
# Remove test tenants
node cleanup-test-tenants.js

# Or manually
docker compose exec backend bench drop-site test-1736611200000.localhost --force
```

## 📁 File Structure

```
scripts/
├── README.md                    # Detailed documentation
├── provision-tenant.js          # Main provisioning script
├── test-provisioning.js         # Test script
├── cleanup-test-tenants.js      # Cleanup utility
└── SETUP.md                     # This file

app/
└── actions/
    └── signup.ts                # Next.js server action
```

## 🔧 Configuration Details

### Docker Service Name

The `DOCKER_SERVICE` env var must match your docker-compose.yml:

```yaml
services:
  backend:  # <-- This name
    image: frappe/erpnext:latest
    ...
```

If your service is named differently (e.g., `erpnext`, `frappe-bench`), update:

```bash
DOCKER_SERVICE=erpnext
```

### Admin Password

The `ADMIN_PASSWORD` is used temporarily during site creation:

```bash
ADMIN_PASSWORD=admin  # Default Frappe admin password
```

This password is only used internally and is NOT the user's password.

### Master Site API Keys

Generate API keys from ERPNext Administrator user:

1. Login to master site: http://localhost:8080
2. Go to: **User Profile** → **Administrator**
3. Scroll to: **API Access** section
4. Click: **Generate Keys**
5. Copy: `api_key` and `api_secret`
6. Add to `.env.local`

## 🧪 Testing Workflow

### 1. Unit Test (Direct Script)

```bash
cd scripts
node provision-tenant.js test-demo demo@test.com "Demo User" "Demo123!" "Demo Org"
```

### 2. Integration Test (Via Next.js)

Create a test file: `scripts/test-signup.mjs`

```javascript
import { signup } from '../app/actions/signup.js'

const result = await signup({
  email: 'test@example.com',
  password: 'Test123!',
  fullName: 'Test User',
  organizationName: 'Test Organization'
})

console.log(result)
```

Run:
```bash
node scripts/test-signup.mjs
```

### 3. Manual Testing

1. Start development server:
   ```bash
   npm run dev
   ```

2. Open: http://localhost:3000/signup

3. Fill form and submit

4. Check logs for provisioning output

## 🐛 Troubleshooting

### Issue: "docker: command not found"

**Solution:**
Ensure Docker is installed and running:
```bash
docker --version
docker compose version
```

### Issue: "No such service: backend"

**Solution:**
Check your docker-compose.yml service name:
```bash
docker compose ps
# Update DOCKER_SERVICE env var to match
```

### Issue: "bench: command not found"

**Solution:**
Verify bench is installed in container:
```bash
docker compose exec backend which bench
# Should output: /home/frappe/.local/bin/bench
```

### Issue: "Site already exists"

**Solution:**
Drop existing site:
```bash
docker compose exec backend bench drop-site test-demo.localhost --force
```

Or use cleanup script:
```bash
node scripts/cleanup-test-tenants.js
```

### Issue: "API keys not generated"

**Solution:**
Check Python script syntax:
```bash
# Test Python code execution
docker compose exec backend bench --site test-demo.localhost runner "print('Hello')"
```

### Issue: "Timeout after 2 minutes"

**Solution:**
Increase timeout in signup.ts:
```typescript
const { stdout } = await execFileAsync('node', [...], {
  timeout: 300000, // 5 minutes
  ...
})
```

### Issue: "Cannot read property 'apiKey' of undefined"

**Solution:**
Check script output format:
```bash
# Run script directly and check output
node scripts/provision-tenant.js test-debug test@test.com "Test" "Test123!" "Test Org"
# Should end with valid JSON
```

## 📊 Performance Tuning

### Optimize Provisioning Speed

1. **Use SSD storage** for Docker volumes
2. **Allocate more RAM** to Docker (8GB+ recommended)
3. **Disable unnecessary steps** (app installation if not needed)
4. **Run in production mode** (NODE_ENV=production)

### Typical Benchmarks

| Operation | Time (Development) | Time (Production) |
|-----------|-------------------|-------------------|
| Site Creation | 8-12s | 5-8s |
| App Installation | 3-5s | 2-3s |
| User Creation | 2-3s | 1-2s |
| Settings Init | 1-2s | <1s |
| API Keys | 1-2s | <1s |
| **Total** | **15-24s** | **9-14s** |

## 🔐 Security Best Practices

### 1. Secure Environment Variables

Never commit `.env.local` to git:

```bash
# .gitignore
.env*.local
```

### 2. Strong Admin Password

Use a strong ADMIN_PASSWORD:

```bash
# Generate random password
openssl rand -base64 32
```

### 3. API Key Rotation

Rotate master site API keys regularly:
1. Generate new keys in ERPNext
2. Update `.env.local`
3. Restart Next.js app

### 4. Rate Limiting

Add rate limiting to signup endpoint:

```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 signups per hour
})
```

## 📈 Production Deployment

### 1. Update Environment Variables

```bash
# Production .env
DOCKER_SERVICE=backend
ADMIN_PASSWORD=<strong-random-password>

ERP_NEXT_URL=https://erp.yourdomain.com
ERP_API_KEY=<production-api-key>
ERP_API_SECRET=<production-api-secret>
FRAPPE_SITE_NAME=master.yourdomain.com

NEXTAUTH_URL=https://app.yourdomain.com
NEXTAUTH_SECRET=<production-secret>
```

### 2. Test in Staging

```bash
# Deploy to staging first
npm run build
npm start
```

### 3. Monitor Provisioning

Add logging/monitoring:

```typescript
// signup.ts
import * as Sentry from '@sentry/nextjs'

try {
  const result = await execFileAsync(...)
  
  // Log success
  Sentry.captureMessage('Tenant provisioned', {
    level: 'info',
    extra: { site: result.site, elapsed: result.elapsed }
  })
} catch (error) {
  // Log failure
  Sentry.captureException(error)
}
```

### 4. Scale Considerations

For high-volume signups:

1. **Queue System**: Use BullMQ/Redis for async provisioning
2. **Load Balancing**: Multiple ERPNext instances
3. **Database Sharding**: Separate DB per tenant group
4. **Caching**: Redis cache for tenant config
5. **CDN**: Serve static assets via CDN

## 🎯 Next Steps

1. **Test locally** with test-provisioning.js
2. **Verify all 5 steps** complete successfully
3. **Integrate with signup UI** (already done in signup.ts)
4. **Add error handling** in frontend
5. **Implement tenant dashboard** to display site URL
6. **Set up monitoring** for production
7. **Configure backup strategy** for tenant data

## 📚 Additional Resources

- [Frappe Documentation](https://frappeframework.com/docs)
- [ERPNext Documentation](https://docs.erpnext.com)
- [Bench Commands Reference](https://frappeframework.com/docs/user/en/bench)
- [Docker Compose Docs](https://docs.docker.com/compose/)

## ✅ Checklist

Before going to production:

- [ ] Environment variables configured
- [ ] Docker containers running
- [ ] Test provisioning successful
- [ ] Cleanup script tested
- [ ] API keys secured
- [ ] Rate limiting enabled
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Error handling tested
- [ ] Load testing completed

---

**Need Help?**

Check the [README.md](README.md) for detailed documentation or create an issue.
