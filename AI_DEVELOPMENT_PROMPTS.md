# NEXUS ERP - AI-ASSISTED DEVELOPMENT PROMPTS

## Architecture Context
**Project:** Nexus - Headless ERP for Heavy Equipment Rental  
**Frontend:** Next.js 15 (App Router), TypeScript, Tailwind, Shadcn UI  
**Backend:** ERPNext v15 (Frappe Framework) in Docker  
**Pattern:** Server Actions → frappeRequest → ERPNext API  

---

## Phase 1: Master Database Schema

### Current Implementation
✅ Already exists: `Tenant` DocType with fields:
- subdomain (unique)
- email
- organization_name
- status (Select: pending, trial, active, suspended, cancelled)
- site_url
- site_config (JSON with api_key, api_secret, db_name)
- provisioned_at
- subscription_plan
- subscription_status

### Next: Subscription Plans DocType

**Prompt:**
```
I need to create a "Subscription Plan" Custom DocType in Frappe for Nexus ERP. Generate the JSON schema with these fields:

- plan_name (Data, Required)
- plan_slug (Data, Unique) - e.g., "free", "pro", "enterprise"
- monthly_price (Currency, Default: 0)
- yearly_price (Currency)
- max_users (Int, Default: 5)
- max_storage_gb (Float, Default: 10)
- max_bookings_per_month (Int, Default: 50)
- max_invoices_per_month (Int, Default: 100)
- enabled_features (Table MultiSelect) - Child table with:
  - feature_name (Select: crm, bookings, fleet, inspections, invoices, pricing_rules, analytics)
  - enabled (Check)

Ensure the JSON is in standard Frappe format for import via "Import DocType" in ERPNext.
```

---

## Phase 2: Enhanced Provisioning Script

### Current Implementation
✅ `scripts/provision-site-simple.sh` - creates sites with bench commands  
✅ `app/actions/provision.ts` - calls the script and updates Tenant record

### Next: Robust Error Handling & User Creation

**Prompt:**
```
Improve the existing provision.ts Server Action in Nexus ERP:

Current flow:
1. Spawn bash script to create site
2. Parse JSON output for api_key/api_secret
3. Update Tenant record with site_config

Add these improvements:
- Timeout after 5 minutes with clear error message
- Retry logic (max 3 attempts) if site creation fails
- Validate that api_key and api_secret are not empty before updating Tenant
- After provisioning, automatically create the first tenant user via frappe.client.insert
- Set the user's password using frappe.core.doctype.user.user.update_password
- Add System Manager role to the user
- Log all steps to console with timestamps

Return type should be:
interface ProvisionResult {
  success: boolean
  site_url?: string
  admin_url?: string
  error?: string
}
```

---

## Phase 3: Subscription Gate (Feature Limits)

### Implementation Strategy

**Prompt:**
```
Create a Subscription Context for Nexus ERP in app/contexts/SubscriptionContext.tsx:

Requirements:
- Fetch current tenant's plan from Server Action getTenantPlan() on mount
- Expose checkFeatureAccess(feature: string): boolean
- Expose checkUsageLimit(metric: 'users' | 'bookings' | 'invoices', current: number): { allowed: boolean, limit: number, remaining: number }
- Store plan data in React Context

Create a FeatureGate component in components/subscription/feature-gate.tsx:
- Props: feature (string), fallback (ReactNode), children (ReactNode)
- If feature is disabled, render fallback UI with "Upgrade to Pro" button
- Use Shadcn Alert component for the fallback

Create Server Action app/actions/subscription.ts:
- getTenantPlan(): Get current tenant's Subscription Plan from ERPNext
- getCurrentUsage(): Return current usage counts (user_count, booking_count, invoice_count)
- Both should use frappeRequest helper
```

---

## Phase 4: Billing Integration (Stripe)

### Implementation Strategy

**Prompt:**
```
Create Stripe Checkout integration for Nexus ERP:

1. Server Action app/actions/billing.ts:
   - createCheckoutSession(planSlug: string)
   - Get current tenant subdomain from cookies
   - Create Stripe Session with:
     - mode: 'subscription'
     - success_url: pointing to /dashboard?success=true
     - cancel_url: pointing to /settings?cancelled=true
     - metadata: { tenant_id, plan_slug }
   - Return checkout URL

2. Webhook Handler app/api/subscription/webhook/route.ts:
   - Listen for checkout.session.completed and customer.subscription.deleted
   - Extract tenant_id from metadata
   - Update Tenant record:
     - Set subscription_status to 'active' or 'cancelled'
     - Set subscription_plan to plan_slug
     - Store stripe_customer_id and stripe_subscription_id
   - Use frappeRequest to update ERPNext
   - Verify webhook signature using Stripe's SDK

3. Settings Page Component:
   - Show current plan and usage
   - Button to upgrade/downgrade using createCheckoutSession
   - Use Shadcn Card, Badge, and Progress components
```

---

## Phase 5: Code Refactoring & Type Safety

### Areas to Improve

**Prompt:**
```
Refactor Nexus ERP codebase for better type safety and reusability:

1. Extract ERPNext Types to types/erpnext.ts:
   - Move all interfaces (Invoice, SalesOrder, Lead, Opportunity, etc.) from app/actions/*.ts
   - Group by doctype (e.g., export namespace Invoice { interface Document, interface Item })
   - Add JSDoc comments with field descriptions

2. Create lib/erpnext-helpers.ts:
   - parseDate(dateString: string): Date
   - formatCurrency(amount: number): string (with INR locale)
   - buildFilters(obj: Record<string, any>): string (JSON.stringify helper)
   - handleApiError(error: unknown): string (extract user-friendly message)

3. Refactor app/actions/invoices.ts:
   - Replace repeated error handling with handleApiError
   - Replace repeated JSON.stringify with buildFilters
   - Add return type annotations to all functions
   - Use types from types/erpnext.ts

4. Add Zod validation to forms:
   - Create schemas in lib/validations.ts
   - Validate createInvoice, createBooking, createLead inputs
   - Return proper error messages
```

---

## Phase 6: Testing Strategy

**Prompt:**
```
Set up testing for Nexus ERP Server Actions:

1. Install Vitest: npm install -D vitest @vitejs/plugin-react

2. Create vitest.config.ts:
   - Configure path aliases (@/)
   - Set test environment to 'node'

3. Create __tests__/actions/invoices.test.ts:
   - Mock frappeRequest using vi.mock
   - Test createInvoice with valid data
   - Test error handling when API fails
   - Test getInvoices with empty results
   - Use vi.fn() for mocks

4. Create __tests__/lib/erpnext-helpers.test.ts:
   - Test parseDate with various date formats
   - Test formatCurrency with different amounts
   - Test buildFilters with nested objects
   - Test handleApiError with different error types

Example test structure:
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createInvoice } from '@/app/actions/invoices'
import * as api from '@/app/lib/api'

vi.mock('@/app/lib/api')
// ... rest of test
```

---

## Current Priority: Fix Authentication Flow

**Issues to address:**
1. ✅ Cookie-based user identification (already fixed)
2. ✅ Whitelisted API methods (already fixed)
3. ✅ User creation with proper password setting (already fixed)
4. ⚠️ Need to test full signup → provision → login flow

**Next immediate steps:**
1. Run cleanup at `/cleanup?confirm=yes` to delete all test users/tenants
2. Test fresh signup with new user
3. Verify login works with created user
4. Verify dashboard loads without authentication errors

---

## Production Deployment Checklist

Before going live:
- [ ] All environment variables set in .env.local on server
- [ ] API keys in master ERPNext match .env.local
- [ ] Nginx configured for subdomain routing
- [ ] SSL certificates set up (Let's Encrypt)
- [ ] PM2 configured with ecosystem.config.js
- [ ] Database backups scheduled
- [ ] Error monitoring (Sentry) configured
- [ ] Stripe webhook endpoint set up with correct URL
- [ ] Email service (SendGrid/SES) configured for transactional emails
