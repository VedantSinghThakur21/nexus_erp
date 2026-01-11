# 🎯 Quick Start - Multi-Tenant Signup Testing

See `/docs/PRODUCTION_ARCHITECTURE.md` for complete documentation.

## Test Signup Locally

1. Start services: `bench start` + `npm run dev`
2. Go to: `http://localhost:3000/login` → "Create Account"
3. Fill form → Submit
4. Wait 2-3 minutes for provisioning
5. Should auto-login to tenant dashboard

## What Just Happened?

```
Signup → Validate → Create Tenant → Provision Site (bench new-site)
→ Generate API Keys → Poll Until Active → Create User → Set Password
→ Create Organization → Auto-Login → Redirect to Dashboard
```

## Verify Success

```bash
# Check tenant record
bench --site master.localhost mariadb
> SELECT subdomain, status FROM `tabTenant`;

# Check user created in tenant site
bench --site <subdomain>.localhost mariadb
> SELECT email FROM `tabUser`;
```

## Troubleshooting

**Signup hangs?** Check provisioning logs:
```bash
tail -f ~/frappe-bench/logs/bench.log
```

**API keys not active?** Regenerate:
```bash
bench execute "frappe.core.doctype.user.user.generate_keys" \
  --args '["Administrator"]' --site <subdomain>.localhost
```

**Complete guides in `/docs/` folder!** 📚
