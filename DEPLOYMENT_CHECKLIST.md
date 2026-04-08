# 🚀 Workspace Ready Email - Deployment Checklist

## Pre-Deployment

### 1. Code Review
- [x] Email template added to `lib/email.ts`
- [x] `sendWorkspaceReadyEmail()` function exported
- [x] Email sending integrated in `app/api/provision/start/route.ts`
- [x] Error handling implemented (email failure doesn't fail provisioning)
- [x] Logging added for debugging

### 2. Environment Setup
- [ ] **SMTP_HOST** configured
- [ ] **SMTP_PORT** configured (587 or 465)
- [ ] **SMTP_EMAIL** configured (e.g., no-reply@avariq.in)
- [ ] **SMTP_PASSWORD** configured (API key or password)
- [ ] **SMTP_DISPLAY_NAME** configured (optional)

### 3. SMTP Provider Setup
- [ ] SMTP account created (SendGrid, Mailgun, SES, etc.)
- [ ] API key or password generated
- [ ] Sender email verified with provider
- [ ] (Production) SPF/DKIM records added to DNS
- [ ] (Production) Domain verified with email provider

---

## Testing Phase

### 1. Local Development Test
- [ ] Start Next.js dev server: `npm run dev`
- [ ] Start provisioning service (if separate)
- [ ] Navigate to http://localhost:3000/signup
- [ ] Fill form with **real email you can access**
- [ ] Submit form
- [ ] Check terminal logs for:
  ```
  [ProvisionStart] Starting background job...
  [ProvisionStart] ✉️  Workspace ready email sent to your@email.com
  [ProvisionStart] Job xyz123 completed ✓
  ```
- [ ] Wait ~8-12 minutes
- [ ] Check email inbox (and spam folder)
- [ ] Verify email looks professional
- [ ] Click "Access Your Workspace" button
- [ ] Confirm login works

### 2. SMTP Connection Test (Optional)
```javascript
// Create test file: test-smtp.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP Error:', error);
  } else {
    console.log('✅ SMTP is ready to send emails');
  }
});
```

Run: `node test-smtp.js`

### 3. Email Template Preview (Optional)
Create test route at `app/api/test-email/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { sendWorkspaceReadyEmail } from '@/lib/email'

export async function GET() {
  try {
    await sendWorkspaceReadyEmail({
      userName: 'Test User',
      userEmail: 'your-test-email@example.com',
      workspaceName: 'Test Workspace',
      subdomain: 'test-workspace.localhost:3000',
      loginUrl: 'http://test-workspace.localhost:3000/login',
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
```

Visit: http://localhost:3000/api/test-email

---

## Production Deployment

### 1. Environment Variables
Update production environment (Vercel, Railway, AWS, etc.):
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_EMAIL=no-reply@avariq.in
SMTP_PASSWORD=SG.xxxxxxxxxxxxx
SMTP_DISPLAY_NAME=Nexus ERP
```

### 2. DNS Configuration (for better deliverability)
Add to your domain DNS:

**SPF Record:**
```
TXT @ "v=spf1 include:sendgrid.net ~all"
```

**DKIM Record:**
(Provided by your email service)

**DMARC Record:**
```
TXT _dmarc "v=DMARC1; p=none; rua=mailto:dmarc@avariq.in"
```

### 3. Deploy Code
```bash
git add .
git commit -m "feat: Add workspace ready email notification"
git push origin main
```

### 4. Verify Deployment
- [ ] Check production logs for no errors
- [ ] Test signup with real email
- [ ] Verify email arrives in ~8-12 minutes
- [ ] Confirm email not in spam
- [ ] Test login link works

---

## Post-Deployment

### 1. Monitor First Week
- [ ] Check email delivery rate (target: >95%)
- [ ] Monitor error logs for email failures
- [ ] Track average time from signup to email (should be 8-12 min)
- [ ] Collect user feedback on email clarity
- [ ] Check spam complaint rate (target: <0.1%)

### 2. Analytics Setup (Optional)
- [ ] Track email open rates
- [ ] Track click-through rates on login button
- [ ] Monitor bounce rates
- [ ] Set up alerts for email delivery failures

### 3. User Communication
- [ ] Update FAQ/docs with "What happens after signup?"
- [ ] Add email support article
- [ ] Update onboarding materials

---

## Troubleshooting Reference

### Issue: Email Not Sending

**Checklist:**
- [ ] SMTP credentials are correct
- [ ] SMTP port is correct (587 for STARTTLS, 465 for SSL)
- [ ] Firewall allows outbound SMTP connections
- [ ] Email provider account is active
- [ ] Rate limits not exceeded

**Debug Steps:**
1. Check server logs for `✉️  Workspace ready email sent`
2. Check for `Failed to send workspace ready email:` warnings
3. Test SMTP connection with `node test-smtp.js`
4. Try sending test email via API route
5. Check email provider dashboard for errors

### Issue: Email Goes to Spam

**Solutions:**
- [ ] Add SPF/DKIM/DMARC DNS records
- [ ] Verify sender domain with email provider
- [ ] Warm up new IP address gradually
- [ ] Ensure "From" domain matches sending domain
- [ ] Check content for spam trigger words
- [ ] Request users whitelist sender

### Issue: Email Delayed

**Expected:** 8-12 minutes from signup
**If longer:**
- [ ] Check provisioning service logs
- [ ] Verify Python service is running
- [ ] Check database performance
- [ ] Review provisioning job queue
- [ ] Check server resources (CPU, memory)

### Issue: Wrong Email Content

**Debug:**
- [ ] Check template in `lib/email.ts`
- [ ] Verify data passed to `sendWorkspaceReadyEmail()`
- [ ] Test with API route to preview
- [ ] Check for HTML rendering issues in email clients

---

## Rollback Plan

If email feature causes issues:

### Quick Disable (Keep Code)
Comment out email sending in `app/api/provision/start/route.ts`:
```typescript
// try {
//   await sendWorkspaceReadyEmail({...})
//   console.log(`[ProvisionStart] ✉️  Email sent`)
// } catch (emailErr) {
//   console.warn(`[ProvisionStart] Failed to send email:`, emailErr)
// }
```

### Full Rollback (Remove Code)
```bash
git revert <commit-hash>
git push origin main
```

---

## Success Metrics

Track these after deployment:

| Metric | Target | Current |
|--------|--------|---------|
| Email delivery rate | >95% | ___ |
| Average delivery time | 8-12 min | ___ |
| Email open rate | >40% | ___ |
| Click-through rate | >60% | ___ |
| Spam complaint rate | <0.1% | ___ |
| Provisioning success rate | >98% | ___ |
| Support tickets (provisioning) | Decrease 50% | ___ |

---

## Next Steps After Successful Deployment

### Phase 2 Enhancements
- [ ] Add email queue with retries (Bull/BullMQ)
- [ ] Implement password reset email
- [ ] Add invoice/receipt emails
- [ ] Create email preference center
- [ ] Add SMS notifications (Twilio)
- [ ] Implement webhook notifications (Slack/Discord)
- [ ] Track email analytics

### Infrastructure
- [ ] Set up dedicated IP for email (if high volume)
- [ ] Configure email bounce handling
- [ ] Implement complaint feedback loop
- [ ] Add email rate limiting
- [ ] Set up monitoring/alerting

---

## Team Communication

### Who Needs to Know
- [ ] Development team (implementation details)
- [ ] DevOps team (environment variables)
- [ ] Support team (what users should expect)
- [ ] Marketing team (email branding)
- [ ] Product team (user flow changes)

### Key Messages
**To Users:**
"You'll now receive an email when your workspace is ready (8-12 minutes). No need to keep the page open!"

**To Support:**
"Users should receive workspace ready email within 15 minutes. If not, check provisioning status and SMTP logs."

**To Team:**
"Email notification implemented. Users can close provisioning page. Monitor delivery rates and logs."

---

## Sign-Off

### Pre-Production
- [ ] Code reviewed by: _______________
- [ ] Tested by: _______________
- [ ] Environment variables verified by: _______________

### Post-Production
- [ ] Deployed by: _______________
- [ ] Verified by: _______________
- [ ] Monitoring set up by: _______________

**Deployment Date:** _______________
**Status:** _______________

---

## Emergency Contacts

- **SMTP Provider Support:** _______________
- **DevOps On-Call:** _______________
- **Engineering Lead:** _______________

---

✅ **CHECKLIST COMPLETE - READY FOR DEPLOYMENT**
