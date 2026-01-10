# Security Measures - Production Deployment

## ✅ Implemented Security Features

### 1. Input Validation & Sanitization

#### Email Validation
- RFC-compliant email format validation
- Maximum length: 254 characters
- Prevents SQL injection through parameterized queries

#### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- Enforced at signup: `isValidPassword()`

#### Subdomain Sanitization
- Only alphanumeric and hyphens allowed
- Reserved names blocked: `admin`, `api`, `www`, `mail`, `ftp`, `localhost`, `root`, `administrator`
- Maximum 63 characters (DNS limit)
- Minimum 3 characters
- Prevents header injection attacks
- Function: `sanitizeSubdomain()`

#### Name Input Sanitization
- Removes HTML/script characters: `<>\"'&`
- Maximum 140 characters
- Prevents XSS attacks
- Function: `sanitizeName()`

### 2. Authentication & Session Security

#### Secure Cookies
- `httpOnly: true` - Prevents JavaScript access
- `secure: true` - HTTPS only in production
- `sameSite: 'lax'` - CSRF protection
- 7-day expiration
- Applied to: `sid`, `user_email`, `user_type`, `tenant_subdomain`

#### Session Management
- Administrator credentials used ONLY for initial tenant setup
- Separate user sessions for tenant access
- Automatic cleanup of admin sessions after provisioning
- Session validation in middleware

### 3. Error Handling

#### Secure Error Messages
- Internal errors logged server-side only
- User-facing messages are generic:
  - ✅ "Failed to set up user account. Please try again or contact support."
  - ❌ NOT: "Database connection failed at mysql://..."
- Stack traces never exposed to clients
- Detailed logging in server console for debugging

### 4. Multi-Tenant Isolation

#### Tenant Separation
- Each organization gets dedicated Frappe site
- Database isolation per tenant
- API requests routed via `X-Frappe-Site-Name` header
- Subdomain-based routing prevents cross-tenant access

#### Access Control
- User type markers: `tenant` vs `admin`
- Organization membership validation
- Role-based permissions in ERPNext

### 5. API Security

#### Endpoint Validation
- Site name format validation: `/^[a-z0-9.-]+$/i`
- Prevents header injection attacks
- Method whitelisting (GET, POST only where needed)

#### Administrator Credential Usage
- Used ONLY during tenant provisioning
- Immediately switches to user credentials
- Admin password stored securely in site_config
- Not exposed in client responses

### 6. Production Environment Settings

#### HTTPS Enforcement
```typescript
if (process.env.NODE_ENV === 'production' && !erpnextUrl.startsWith('https://')) {
  console.warn('⚠️ WARNING: Using HTTP in production environment')
}
```

#### Environment Variables Required
```env
NODE_ENV=production
ERP_NEXT_URL=https://your-domain.com
API_KEY=<secure_key>
API_SECRET=<secure_secret>
```

## 🔒 Additional Recommendations for Production

### 1. Rate Limiting (TO IMPLEMENT)

Add rate limiting middleware to prevent brute force attacks:

```typescript
// middleware.ts
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
})

// Apply to login/signup routes
const { success } = await ratelimit.limit(ip)
if (!success) {
  return new Response("Too Many Requests", { status: 429 })
}
```

**Recommended limits:**
- Signup: 3 attempts per hour per IP
- Login: 10 attempts per 10 minutes per IP
- API calls: 100 requests per minute per user

### 2. Additional Headers (TO IMPLEMENT)

Add security headers in `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff'
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY'
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block'
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin'
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()'
        }
      ]
    }
  ]
}
```

### 3. CSRF Protection (TO IMPLEMENT)

Implement CSRF tokens for state-changing operations:
- Use Next.js built-in CSRF protection
- Validate tokens on all POST/PUT/DELETE requests
- Tokens should be unique per session

### 4. Logging & Monitoring

#### What to Log
✅ Authentication attempts (success/failure)
✅ Account creation events
✅ Permission changes
✅ API authentication failures
✅ Unusual activity patterns

#### What NOT to Log
❌ Passwords or password hashes
❌ Session tokens
❌ API secrets
❌ Credit card information
❌ Personal identifiable information (PII)

### 5. Database Security

#### ERPNext/Frappe Built-in
- Parameterized queries (prevents SQL injection)
- ORM-based data access
- Field-level permissions
- DocType-level access control

#### Additional Measures
- Regular backups (automated)
- Encrypted backups
- Backup retention policy (30 days)
- Disaster recovery plan

### 6. Infrastructure Security

#### Production Checklist
- [ ] HTTPS/TLS 1.3 enforced
- [ ] Valid SSL certificate (not self-signed)
- [ ] Firewall configured (only 80, 443 open)
- [ ] SSH access restricted (key-based only)
- [ ] Regular security updates
- [ ] Intrusion detection system (IDS)
- [ ] DDoS protection (Cloudflare/AWS Shield)
- [ ] Regular security audits

#### Environment Variables
- Never commit to version control
- Use secrets management (AWS Secrets Manager, Azure Key Vault)
- Rotate credentials quarterly
- Different credentials per environment (dev/staging/prod)

### 7. Compliance

#### GDPR Compliance
- User data deletion capability
- Data export functionality
- Clear privacy policy
- Consent management
- Data processing agreements

#### Data Protection
- Encryption at rest
- Encryption in transit
- Regular security assessments
- Incident response plan
- Data breach notification procedures

## 🚨 Security Incident Response

### If Breach Detected

1. **Immediate Actions**
   - Isolate affected systems
   - Revoke compromised credentials
   - Enable maintenance mode
   - Notify security team

2. **Investigation**
   - Review access logs
   - Identify scope of breach
   - Document timeline
   - Preserve evidence

3. **Notification**
   - Notify affected users (within 72 hours - GDPR)
   - Contact authorities if required
   - Public disclosure if necessary

4. **Recovery**
   - Patch vulnerabilities
   - Restore from clean backups
   - Reset all credentials
   - Enhanced monitoring

## 📋 Pre-Production Security Audit Checklist

- [x] Input validation on all user inputs
- [x] Password strength requirements
- [x] Secure session management
- [x] HTTPS enforcement check
- [x] Error messages sanitized
- [x] SQL injection prevention (ORM)
- [x] XSS prevention (input sanitization)
- [x] CSRF protection (SameSite cookies)
- [ ] Rate limiting implemented
- [ ] Security headers configured
- [ ] Logging system operational
- [ ] Backup system tested
- [ ] Incident response plan documented
- [ ] Security audit completed
- [ ] Penetration testing performed
- [ ] Dependency vulnerability scan
- [ ] SSL certificate valid
- [ ] Firewall configured
- [ ] Monitoring alerts configured

## 🛠️ Development Guidelines

### Secure Coding Practices

1. **Never Trust User Input**
   - Always validate and sanitize
   - Use allowlists, not denylists
   - Validate on server-side (client-side is bonus)

2. **Principle of Least Privilege**
   - Grant minimum necessary permissions
   - Regular permission audits
   - Temporary elevated access only when needed

3. **Defense in Depth**
   - Multiple security layers
   - Assume each layer can fail
   - Monitor all layers

4. **Keep Dependencies Updated**
   ```bash
   npm audit
   npm update
   ```
   - Review security advisories weekly
   - Test updates in staging first

5. **Code Review Requirements**
   - All security-related code reviewed
   - Two-person rule for production deployments
   - Security-focused review checklist

## 📞 Security Contacts

**Report Security Vulnerabilities:**
- Email: security@your-domain.com
- Response time: 24 hours
- Encryption: PGP key available

**Security Team:**
- Lead: [Name]
- Developers: [Names]
- External Auditor: [Company]

---

**Last Updated:** January 10, 2026
**Next Review:** April 10, 2026 (Quarterly)
**Version:** 1.0.0
