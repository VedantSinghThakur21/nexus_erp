# Security Quick Reference for Developers

## ✅ What We've Implemented

### Input Validation Functions
```typescript
// Use these in all server actions
import { isValidEmail, isValidPassword, sanitizeSubdomain, sanitizeName } from '@/app/actions/signup'

// Email validation
if (!isValidEmail(email)) {
  return { success: false, error: 'Invalid email format' }
}

// Password validation (8+ chars, uppercase, lowercase, number)
if (!isValidPassword(password)) {
  return { success: false, error: 'Password too weak' }
}

// Subdomain sanitization (alphanumeric + hyphens only)
const cleanSubdomain = sanitizeSubdomain(userInput)

// Name sanitization (removes HTML/script chars)
const cleanName = sanitizeName(userInput)
```

### Secure Cookie Settings
```typescript
cookieStore.set('cookie_name', value, {
  httpOnly: true,                              // ✅ Prevents JS access
  secure: process.env.NODE_ENV === 'production', // ✅ HTTPS only in prod
  sameSite: 'lax',                             // ✅ CSRF protection
  maxAge: 60 * 60 * 24 * 7                     // ✅ 7 days
})
```

### Error Handling Best Practices
```typescript
// ❌ BAD - Exposes internals
return { error: `Database error: ${err.message}` }

// ✅ GOOD - Generic message, detailed logs
console.error('Database error:', err)
return { error: 'Unable to process request. Please try again.' }
```

## 🚨 Common Security Pitfalls to Avoid

### 1. Never Trust User Input
```typescript
// ❌ BAD - Direct use of user input
const subdomain = req.body.subdomain
const query = `SELECT * FROM sites WHERE subdomain = '${subdomain}'`

// ✅ GOOD - Validate and sanitize
const subdomain = sanitizeSubdomain(req.body.subdomain)
const result = await frappe.client.get_list({
  doctype: 'Tenant',
  filters: { subdomain }  // Parameterized query
})
```

### 2. Protect Sensitive Data
```typescript
// ❌ BAD - Exposing credentials
console.log('API Key:', apiKey)
res.json({ apiKey, apiSecret })

// ✅ GOOD - Log securely, never expose
console.log('API Key:', apiKey.substring(0, 8) + '...')
// Never send credentials to client
```

### 3. Validate on Server-Side
```typescript
// ❌ BAD - Only client-side validation
<input type="email" required />

// ✅ GOOD - Server-side validation
'use server'
export async function handleForm(data) {
  if (!isValidEmail(data.email)) {
    return { error: 'Invalid email' }
  }
  // Process...
}
```

### 4. Use Environment Variables
```typescript
// ❌ BAD - Hardcoded secrets
const apiKey = 'sk_live_12345abcde'

// ✅ GOOD - Environment variable
const apiKey = process.env.ERP_API_KEY
if (!apiKey) {
  throw new Error('API key not configured')
}
```

### 5. Secure Headers
```typescript
// ❌ BAD - Missing site name validation
headers: {
  'X-Frappe-Site-Name': userInput  // Injection risk!
}

// ✅ GOOD - Validate format first
if (!/^[a-z0-9.-]+$/i.test(siteName)) {
  throw new Error('Invalid site name')
}
headers: {
  'X-Frappe-Site-Name': siteName
}
```

## 📋 Security Checklist for New Features

Before merging any PR:

- [ ] All user inputs validated
- [ ] SQL injection prevented (use ORM)
- [ ] XSS prevented (sanitize HTML)
- [ ] CSRF tokens present (forms)
- [ ] Authentication required (protected routes)
- [ ] Authorization checked (user permissions)
- [ ] Error messages generic (no internal details)
- [ ] Sensitive data not logged
- [ ] HTTPS enforced (production)
- [ ] Rate limiting considered
- [ ] Security headers present
- [ ] Dependencies vulnerability-free (`npm audit`)

## 🔐 Authentication Patterns

### Protecting Server Actions
```typescript
'use server'
export async function protectedAction() {
  // Always check authentication
  const cookieStore = await cookies()
  const sid = cookieStore.get('sid')
  
  if (!sid) {
    return { success: false, error: 'Not authenticated' }
  }
  
  // Verify user permissions
  const user = await getCurrentUser()
  if (!user.has_permission('Doctype', 'write')) {
    return { success: false, error: 'Insufficient permissions' }
  }
  
  // Safe to proceed
}
```

### Middleware for Route Protection
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const sid = request.cookies.get('sid')
  
  if (!sid && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}
```

## 🧪 Testing Security

### Manual Testing
```bash
# Test with invalid inputs
curl -X POST /api/signup -d 'email=not-an-email'
curl -X POST /api/signup -d 'subdomain=<script>alert(1)</script>'
curl -X POST /api/login -d 'password=short'

# Test without authentication
curl /api/protected-endpoint

# Test with SQL injection attempts
curl -X POST /api/search -d "query=' OR '1'='1"
```

### Automated Testing
```typescript
// test/security.test.ts
describe('Security', () => {
  it('rejects invalid emails', async () => {
    const result = await signup({
      email: 'not-an-email',
      password: 'Test123!',
      fullName: 'Test User',
      organizationName: 'Test Org'
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid email')
  })
  
  it('rejects weak passwords', async () => {
    const result = await signup({
      email: 'test@example.com',
      password: 'weak',
      fullName: 'Test User',
      organizationName: 'Test Org'
    })
    expect(result.success).toBe(false)
  })
  
  it('sanitizes subdomain input', () => {
    expect(sanitizeSubdomain('<script>')).not.toContain('<')
    expect(sanitizeSubdomain('admin')).not.toBe('admin')
  })
})
```

## 📚 Resources

### Documentation
- [SECURITY.md](../SECURITY.md) - Complete security documentation
- [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) - Deployment checklist
- [.env.example](../.env.example) - Environment variables template

### Tools
- **npm audit** - Check for vulnerable dependencies
- **OWASP ZAP** - Penetration testing
- **SSL Labs** - Test SSL/TLS configuration
- **Security Headers** - https://securityheaders.com

### Learning
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Next.js Security: https://nextjs.org/docs/app/building-your-application/security
- Node.js Security Checklist: https://blog.risingstack.com/node-js-security-checklist/

## 🚀 Quick Commands

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Test build
npm run build

# Run in production mode
NODE_ENV=production npm start

# Generate strong secrets
openssl rand -base64 32

# Test HTTPS locally
mkcert localhost 127.0.0.1
```

## ⚠️ Red Flags During Code Review

Watch for these patterns:

1. **Direct string concatenation in queries**
   - `WHERE name = '${userInput}'`
   
2. **Unvalidated redirects**
   - `redirect(req.query.returnUrl)`
   
3. **Eval or dangerous functions**
   - `eval()`, `Function()`, `innerHTML`
   
4. **Hardcoded credentials**
   - `password = 'admin123'`
   
5. **Missing error handling**
   - No try-catch blocks
   
6. **Exposed sensitive data**
   - Sending API keys to client
   
7. **Disabled security features**
   - `httpOnly: false`, `sameSite: 'none'`

## 📞 Security Contacts

**Found a vulnerability?**
- Email: security@your-domain.com (24-hour response)
- DO NOT create public GitHub issues for security bugs
- Use private vulnerability reporting

**Questions about security?**
- Ask in #security Slack channel
- Review docs/SECURITY.md
- Contact security team lead

---

**Remember:** Security is everyone's responsibility. When in doubt, ask!
