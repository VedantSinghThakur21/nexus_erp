# 🔐 Multi-Tenant SaaS Security Audit Checklist

## Pre-Production Security Validation

Use this checklist before launching your multi-tenant SaaS platform.

---

## ✅ Authentication & Authorization

### API Key Security
- [ ] API keys generated using cryptographically secure random
- [ ] API secrets stored hashed (if possible) or encrypted at rest
- [ ] API keys scoped to single tenant (cannot access other tenants)
- [ ] API key rotation mechanism exists
- [ ] Rate limiting on API endpoints (prevent brute force)

### Session Security
- [ ] Session cookies: `httpOnly=true, secure=true, sameSite='lax'`
- [ ] Session timeout configured (max 7 days)
- [ ] Session invalidation on password change
- [ ] No session fixation vulnerabilities
- [ ] CSRF tokens on state-changing requests

### Password Security
- [ ] Min 8 chars, requires uppercase, lowercase, number
- [ ] Passwords never logged
- [ ] Temp provision passwords discarded after use
- [ ] Admin passwords NEVER stored in database
- [ ] Password reset tokens expire in 1 hour

---

## ✅ Tenant Isolation

### Database Isolation
- [ ] Each tenant has separate database
- [ ] No shared tables across tenants
- [ ] Connection pooling respects tenant boundaries
- [ ] Query logs reviewed for cross-tenant leaks

### Data Access
- [ ] All queries include tenant filter
- [ ] `frappe.local.site` always set before DB access
- [ ] Middleware validates tenant from subdomain/header
- [ ] No global search across tenants

### API Isolation
- [ ] `X-Frappe-Site-Name` header required for tenant requests
- [ ] API responses never include data from other tenants
- [ ] Error messages don't leak tenant existence
- [ ] GraphQL/REST endpoints scoped per tenant

**Test:** Try to access Tenant A data while logged into Tenant B → Must fail

---

## ✅ Input Validation & Sanitization

### Signup Flow
- [ ] Email validated with regex + DNS check
- [ ] Subdomain sanitized (alphanumeric + hyphen only)
- [ ] Reserved subdomains blocked (admin, api, www, etc.)
- [ ] Name fields XSS-safe (no `<script>` tags)
- [ ] Rate limiting on signup endpoint (prevent abuse)

### SQL Injection
- [ ] All queries use parameterized statements
- [ ] No `frappe.db.sql(f"SELECT * FROM {user_input}")`
- [ ] ORM used instead of raw SQL where possible

### Shell Injection
- [ ] NEVER `os.system(f"bench {user_input}")`
- [ ] Provisioning runs in background queue, not HTTP handler
- [ ] Shell commands use `subprocess` with array args (not string)

---

## ✅ Provisioning Security

### Bench Command Exposure
- [ ] `bench new-site` NEVER callable from client
- [ ] Provisioning script runs server-side only
- [ ] No SSH access from web application
- [ ] Provisioning logs don't expose credentials

### Resource Limits
- [ ] Disk quota per tenant (prevent DoS)
- [ ] Database size limits enforced
- [ ] CPU/memory limits (via Docker/cgroups)
- [ ] Max users per tenant (based on plan)

### Credential Management
- [ ] Temp passwords generated cryptographically
- [ ] Passwords never stored in Tenant DocType
- [ ] API keys stored separately from business data
- [ ] Secrets manager used (AWS Secrets Manager, Vault, etc.)

---

## ✅ Network Security

### HTTPS/TLS
- [ ] Production uses HTTPS only
- [ ] TLS 1.2+ enforced
- [ ] Valid SSL certificates (Let's Encrypt, etc.)
- [ ] HTTP redirects to HTTPS

### Headers
```http
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'self'
X-XSS-Protection: 1; mode=block
```
- [ ] All security headers configured
- [ ] CORS restricted to known origins
- [ ] Referrer-Policy set

### Firewall
- [ ] Master site accessible only via authenticated requests
- [ ] Tenant sites accessible only via proper routing
- [ ] Database port (3306) not exposed publicly
- [ ] Redis/Memcached not publicly accessible

---

## ✅ Monitoring & Auditing

### Logging
- [ ] All authentication attempts logged
- [ ] Failed login attempts trigger alerts
- [ ] API key usage tracked per tenant
- [ ] Provisioning events logged with timestamps
- [ ] Errors logged with request IDs (no sensitive data)

### Audit Trail
- [ ] User creation/deletion logged
- [ ] Permission changes tracked
- [ ] Data exports recorded
- [ ] Admin actions require justification

### Alerting
- [ ] Alerts on repeated failed auth (10+ in 5 min)
- [ ] Alerts on unusual API usage spikes
- [ ] Disk space monitoring per tenant
- [ ] Database connection pool exhaustion
- [ ] Provisioning failures

**Tools:** Sentry, DataDog, CloudWatch, ELK Stack

---

## ✅ Disaster Recovery

### Backups
- [ ] Daily automated backups per tenant
- [ ] Backup retention: 30 days
- [ ] Backups encrypted at rest
- [ ] Restore tested quarterly
- [ ] Point-in-time recovery available

### Incident Response
- [ ] Security incident playbook documented
- [ ] Contact list for security team
- [ ] Breach notification process (GDPR compliance)
- [ ] Rollback procedure for bad deployments

---

## ✅ Compliance & Legal

### Data Privacy (GDPR, CCPA)
- [ ] User consent recorded for data processing
- [ ] Data export API available (right to data portability)
- [ ] Account deletion removes all data (right to be forgotten)
- [ ] Privacy policy and terms of service published

### Data Residency
- [ ] Tenant data location documented
- [ ] No cross-border data transfer (if required)
- [ ] Encryption at rest and in transit

### Penetration Testing
- [ ] Annual penetration test conducted
- [ ] Vulnerabilities remediated within 30 days
- [ ] Bug bounty program (optional)

---

## ✅ Scalability & Performance

### Load Testing
- [ ] 1000+ concurrent tenants simulated
- [ ] Signup flow completes in < 3 minutes
- [ ] API latency < 200ms (p99)
- [ ] Database queries optimized (no N+1)

### Caching
- [ ] Redis cache per tenant
- [ ] Cache keys include tenant ID
- [ ] Cache invalidation on data changes
- [ ] CDN for static assets

### Database
- [ ] Indexes on foreign keys
- [ ] Query execution plans reviewed
- [ ] Connection pooling configured
- [ ] Read replicas for reporting (optional)

---

## ✅ Code Quality

### Static Analysis
- [ ] ESLint / Pylint warnings = 0
- [ ] Security linters enabled (Bandit, Semgrep)
- [ ] Dependency vulnerability scans (Snyk, Dependabot)
- [ ] No secrets in git history

### Testing
- [ ] Unit tests: > 80% coverage
- [ ] Integration tests for signup flow
- [ ] E2E tests for critical paths
- [ ] Security regression tests

### Documentation
- [ ] Architecture diagram up-to-date
- [ ] API documentation published
- [ ] Runbooks for common incidents
- [ ] Onboarding guide for new developers

---

## 🚨 Critical Security Tests

### Test 1: Cross-Tenant Data Access
```bash
# Login to Tenant A
curl -X POST http://localhost:8080/api/method/login \
  -H "X-Frappe-Site-Name: tenantA.localhost" \
  -d "usr=userA@tenantA.com&pwd=password"

# Try to access Tenant B data using Tenant A session
curl http://localhost:8080/api/resource/Lead \
  -H "X-Frappe-Site-Name: tenantB.localhost" \
  -H "Cookie: sid=<tenantA_session>"

# EXPECTED: 403 Forbidden or empty results
```

### Test 2: SQL Injection
```bash
# Try to inject SQL in signup subdomain
curl -X POST /api/signup \
  -d "subdomain=test'; DROP TABLE User; --"

# EXPECTED: Sanitized to "test-drop-table-user"
```

### Test 3: Provisioning Script Exposure
```bash
# Try to call provisioning directly
curl -X POST /api/provision \
  -d "subdomain=attacker&cmd=rm -rf /"

# EXPECTED: 403 Forbidden or endpoint doesn't exist
```

### Test 4: API Key Scope
```python
# Use Tenant A API key to access Tenant B
import requests

headers = {
    'Authorization': 'token <tenantA_api_key>:<secret>',
    'X-Frappe-Site-Name': 'tenantB.localhost'
}

response = requests.get('http://localhost:8080/api/resource/Lead', headers=headers)

# EXPECTED: 401 Unauthorized
```

---

## 📝 Sign-Off

| Check | Auditor | Date | Notes |
|-------|---------|------|-------|
| Authentication | | | |
| Tenant Isolation | | | |
| Input Validation | | | |
| Provisioning Security | | | |
| Network Security | | | |
| Monitoring | | | |
| Compliance | | | |
| Load Testing | | | |
| Security Tests | | | |

**Security Lead Approval:** ___________________  
**Date:** ___________________  
**Production Release Approved:** [ ] Yes [ ] No

---

## 🔄 Quarterly Review

This checklist must be reviewed every 3 months or:
- After major feature releases
- After security incidents
- When adding new integrations
- When scaling to new regions

**Next Review Date:** ___________________

---

## 📞 Security Contacts

- **Security Team Email:** security@nexuserp.com
- **On-Call Engineer:** +1-XXX-XXX-XXXX
- **Incident Response Lead:** [Name]
- **Compliance Officer:** [Name]

---

**Remember: Security is not a one-time effort. Stay vigilant!** 🛡️
