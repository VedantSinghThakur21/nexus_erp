# Provisioning Quick Reference

## 🚀 Commands

### Test Provisioning
```bash
cd scripts
node test-provisioning.js
```

### Manual Provisioning
```bash
node provision-tenant.js <subdomain> <email> <fullName> <password> <orgName>
```

### Cleanup Test Tenants
```bash
node cleanup-test-tenants.js              # Remove all test-* sites
node cleanup-test-tenants.js "demo-*"     # Remove all demo-* sites
```

### Drop Single Site
```bash
docker compose exec backend bench drop-site <site-name>.localhost --force
```

## 📋 Environment Variables

```bash
DOCKER_SERVICE=backend                    # Docker service name
ADMIN_PASSWORD=admin                      # Temp admin password
ERP_NEXT_URL=http://localhost:8080       # ERPNext URL
ERP_API_KEY=xxx                          # Master site API key
ERP_API_SECRET=xxx                       # Master site API secret
FRAPPE_SITE_NAME=master.localhost        # Master site name
```

## 🔍 Debugging

### Check Docker Status
```bash
docker compose ps
docker compose logs backend --tail=50
```

### Test Bench Commands
```bash
docker compose exec backend bench --help
docker compose exec backend bench --site all list-sites
docker compose exec backend bench version
```

### List All Sites
```bash
docker compose exec backend bench --site all list-sites
```

### Check Site Status
```bash
docker compose exec backend bench --site <site>.localhost runner "print(frappe.db.get_value('User', 'email@example.com', 'enabled'))"
```

### Verify API Keys
```bash
docker compose exec backend bench --site <site>.localhost runner "print(frappe.db.get_value('User', 'email@example.com', ['api_key', 'api_secret']))"
```

## ⚠️ Common Issues

| Issue | Solution |
|-------|----------|
| "docker: command not found" | Install Docker |
| "No such service: backend" | Check DOCKER_SERVICE name |
| "Site already exists" | Run cleanup script or drop-site |
| "bench: command not found" | Verify Frappe installation |
| "Timeout" | Increase timeout in signup.ts |
| "API keys empty" | Check Python script syntax |

## 📊 Output Format

### Success Response
```json
{
  "success": true,
  "site": "acme-corp.localhost",
  "url": "http://acme-corp.localhost:8080",
  "email": "john@acme.com",
  "apiKey": "a1b2c3...",
  "apiSecret": "x1y2z3...",
  "organizationName": "Acme Corp",
  "elapsed": 12.34
}
```

### Error Response
```json
{
  "success": false,
  "error": "Site already exists",
  "site": "acme-corp.localhost"
}
```

## 🎯 Quick Test

```bash
# 1. Check Docker
docker compose ps

# 2. Test provisioning
node scripts/test-provisioning.js

# 3. Verify site created
docker compose exec backend bench --site all list-sites

# 4. Cleanup
node scripts/cleanup-test-tenants.js
```

## 📖 Documentation

- **Full Docs**: [README.md](README.md)
- **Setup Guide**: [SETUP.md](SETUP.md)
- **Frappe Docs**: https://frappeframework.com/docs
