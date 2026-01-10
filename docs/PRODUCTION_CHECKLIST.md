# Production Deployment Checklist

## Pre-Deployment Security Audit

### ✅ Code Security
- [x] Input validation implemented (email, password, subdomain, names)
- [x] Password strength requirements enforced (8+ chars, uppercase, lowercase, number)
- [x] Subdomain sanitization prevents injection attacks
- [x] XSS prevention through input sanitization
- [x] SQL injection prevented via ORM (Frappe)
- [x] Error messages sanitized (no internal details exposed)
- [x] Session management secure (httpOnly, secure, sameSite cookies)
- [x] HTTPS enforcement warnings in place
- [x] Administrator credentials used only for provisioning
- [x] Security headers configured in next.config.ts

### 🔄 To Be Implemented Before Production
- [ ] **Rate limiting** - Implement Upstash Redis or similar
  - Signup: 3 attempts/hour per IP
  - Login: 10 attempts/10 min per IP
  - API: 100 requests/min per user
- [ ] **CSRF token validation** - Enable Next.js CSRF protection
- [ ] **Email verification** - Verify email addresses before account activation
- [ ] **2FA/MFA** - Two-factor authentication for admin accounts
- [ ] **API key rotation** - Automated quarterly rotation
- [ ] **Session timeout** - Implement idle session timeout (30 min)
- [ ] **Password reset** - Secure password reset flow with time-limited tokens
- [ ] **Account lockout** - Lock account after 5 failed login attempts
- [ ] **Audit logging** - Log all authentication and permission changes
- [ ] **Dependency scanning** - Set up automated vulnerability scanning

## Environment Configuration

### Required Environment Variables
```bash
# Check these are set correctly
NODE_ENV=production
ERP_NEXT_URL=https://your-domain.com  # MUST be HTTPS
ERP_API_KEY=<strong_key>
ERP_API_SECRET=<strong_secret>
SESSION_SECRET=<32+_char_random>
CSRF_SECRET=<32+_char_random>
```

### Generate Secrets
```bash
# Session Secret
openssl rand -base64 32

# CSRF Secret
openssl rand -base64 32

# Verify length
echo -n "your_secret" | wc -c  # Should be 32+
```

### Environment Files Checklist
- [ ] `.env.local` created with production values
- [ ] `.env.local` is in `.gitignore`
- [ ] Production secrets stored in vault (AWS Secrets Manager/Azure Key Vault)
- [ ] Different credentials for dev/staging/production
- [ ] Backup of environment variables secured offline
- [ ] Team access to secrets documented

## Infrastructure Security

### DNS & Domain
- [ ] Domain registered and configured
- [ ] DNS records properly set (A, AAAA, CNAME)
- [ ] SPF, DKIM, DMARC records configured (if using email)
- [ ] CAA records configured to restrict certificate issuance

### SSL/TLS
- [ ] Valid SSL certificate installed (Let's Encrypt, DigiCert, etc.)
- [ ] Certificate auto-renewal configured
- [ ] TLS 1.3 enforced (minimum TLS 1.2)
- [ ] SSL Labs test: https://www.ssllabs.com/ssltest/ → A or A+ rating
- [ ] HSTS enabled (configured in next.config.ts)

### Firewall & Network
- [ ] Firewall configured (only ports 80, 443 open to public)
- [ ] SSH access restricted to specific IPs
- [ ] SSH key-based authentication only (no passwords)
- [ ] VPN/bastion host for database access
- [ ] DDoS protection enabled (Cloudflare, AWS Shield)
- [ ] Intrusion detection system (IDS) configured

### Server Hardening
- [ ] OS security updates enabled (automatic)
- [ ] Unnecessary services disabled
- [ ] Non-root user for application
- [ ] File permissions properly set (read-only where possible)
- [ ] Logs rotation configured
- [ ] Disk space monitoring enabled

## Database Security

### ERPNext/Frappe Database
- [ ] Database access restricted to localhost only
- [ ] Strong database password (32+ characters)
- [ ] Database backups automated (daily)
- [ ] Backup encryption enabled
- [ ] Backup retention policy set (30 days)
- [ ] Backup restoration tested
- [ ] Point-in-time recovery configured

### Backup Strategy
```bash
# Test backup restoration
# 1. Create test backup
bench --site <site> backup --with-files

# 2. Restore to staging
bench --site <staging-site> restore <backup-file>

# 3. Verify data integrity
# 4. Document restoration time
```

## Application Security

### Authentication & Authorization
- [ ] Password complexity enforced in UI
- [ ] Session timeout configured
- [ ] Remember me option secure (if enabled)
- [ ] Logout clears all sessions
- [ ] Multi-tenant isolation verified
- [ ] Role-based access control configured
- [ ] Principle of least privilege applied

### API Security
- [ ] API keys secured and not exposed
- [ ] API rate limiting enabled
- [ ] API endpoints properly authenticated
- [ ] API responses don't leak sensitive data
- [ ] CORS properly configured
- [ ] API versioning strategy documented

### Frontend Security
- [ ] Content Security Policy (CSP) configured
- [ ] Subresource Integrity (SRI) for CDN assets
- [ ] No inline scripts (where possible)
- [ ] Dependencies vulnerability scan passed
- [ ] Third-party scripts reviewed

## Testing

### Security Testing
- [ ] Penetration testing completed
  - Recommended: OWASP ZAP, Burp Suite
- [ ] Vulnerability scanning completed
  - Run: `npm audit`
  - Run: `npm audit fix`
- [ ] SQL injection testing (automated)
- [ ] XSS testing (automated)
- [ ] CSRF testing
- [ ] Authentication bypass testing
- [ ] Authorization testing
- [ ] Session management testing

### Load Testing
- [ ] Load testing completed
  - Recommended: Apache JMeter, k6
- [ ] Stress testing completed
- [ ] Maximum concurrent users identified
- [ ] Database query performance optimized
- [ ] CDN configured for static assets
- [ ] Caching strategy implemented

### Monitoring Setup
- [ ] Error tracking (Sentry, LogRocket)
- [ ] Performance monitoring (New Relic, Datadog)
- [ ] Uptime monitoring (UptimeRobot, Pingdom)
- [ ] Log aggregation (ELK Stack, CloudWatch)
- [ ] Alert rules configured
- [ ] On-call rotation established

## Compliance & Legal

### Data Protection
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie consent banner (if EU users)
- [ ] Data processing agreement (DPA)
- [ ] Data retention policy documented
- [ ] Data deletion procedures implemented

### GDPR Compliance (if applicable)
- [ ] User data export functionality
- [ ] User data deletion functionality
- [ ] Consent management system
- [ ] Data breach notification process
- [ ] Data Protection Officer (DPO) designated
- [ ] GDPR compliance audit completed

### Other Regulations
- [ ] SOC 2 requirements reviewed (if enterprise)
- [ ] HIPAA compliance (if healthcare data)
- [ ] PCI DSS compliance (if processing payments)
- [ ] Industry-specific regulations reviewed

## Deployment Process

### Pre-Deployment
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review completed
- [ ] Security review completed
- [ ] Staging environment tested
- [ ] Rollback plan documented
- [ ] Deployment window scheduled
- [ ] Stakeholders notified

### Deployment Steps
```bash
# 1. Backup production database
bench --site production.site backup --with-files

# 2. Deploy to staging first
git checkout main
git pull origin main
npm run build
# Test on staging

# 3. Deploy to production
# Use your CI/CD pipeline or:
pm2 stop nexus-erp
git pull origin main
npm install --production
npm run build
pm2 start nexus-erp

# 4. Verify deployment
curl https://your-domain.com/api/health
# Check logs
pm2 logs nexus-erp
```

### Post-Deployment
- [ ] Health check endpoint responding
- [ ] Login flow tested
- [ ] Signup flow tested
- [ ] Critical features tested
- [ ] Error logs reviewed
- [ ] Performance metrics checked
- [ ] Monitoring alerts configured
- [ ] Team notified of successful deployment

## Incident Response

### Preparation
- [ ] Incident response plan documented
- [ ] Emergency contacts list maintained
- [ ] Rollback procedures tested
- [ ] Communication templates prepared
- [ ] Post-mortem template ready

### Detection & Response
- [ ] Monitoring alerts configured
- [ ] Alert escalation rules defined
- [ ] 24/7 on-call rotation (if required)
- [ ] Security incident contact: security@your-domain.com
- [ ] Response time SLA: 24 hours

### Recovery Procedures
```bash
# If need to rollback
pm2 stop nexus-erp
git checkout <previous-commit>
npm install --production
npm run build
pm2 start nexus-erp

# Restore database if needed
bench --site production.site restore <backup-file>
```

## Ongoing Maintenance

### Daily
- [ ] Monitor error logs
- [ ] Check uptime status
- [ ] Review security alerts

### Weekly
- [ ] Review access logs
- [ ] Check backup success
- [ ] Update dependencies (dev environment first)

### Monthly
- [ ] Security patch review
- [ ] Performance optimization review
- [ ] User feedback review
- [ ] Cost optimization review

### Quarterly
- [ ] Rotate API credentials
- [ ] Security audit
- [ ] Disaster recovery drill
- [ ] Review and update documentation
- [ ] Penetration testing (external)

### Annually
- [ ] Full security assessment
- [ ] Compliance audit
- [ ] Insurance policy review
- [ ] Technology stack review
- [ ] Business continuity plan update

## Sign-Off

### Development Team
- [ ] Code complete and tested
- [ ] Security review passed
- [ ] Documentation updated
- Signed: _________________ Date: _______

### DevOps Team
- [ ] Infrastructure provisioned
- [ ] Monitoring configured
- [ ] Backups verified
- Signed: _________________ Date: _______

### Security Team
- [ ] Security audit completed
- [ ] Vulnerabilities addressed
- [ ] Compliance requirements met
- Signed: _________________ Date: _______

### Management
- [ ] Business requirements met
- [ ] Risk assessment reviewed
- [ ] Budget approved
- Signed: _________________ Date: _______

---

**Deployment Date:** _______________
**Version:** _______________
**Environment:** Production
**Status:** □ Ready □ Not Ready

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________
