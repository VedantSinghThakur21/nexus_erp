# Multi-Tenancy Architecture - Complete Implementation

## Overview

Nexus ERP implements a **subdomain-based multi-tenancy** architecture where each customer organization gets their own dedicated ERPNext site. This provides complete data isolation, independent customization, and scalable infrastructure.

## Architecture Type: Subdomain Multi-Tenancy

### How It Works
- **Master Site**: `nexuserp.com` - Manages tenant metadata, subscriptions, and provisioning
- **Tenant Sites**: `acme.nexuserp.com`, `company-b.nexuserp.com` - Each customer's dedicated ERPNext instance

### Key Benefits
1. **Complete Data Isolation**: Each tenant has a separate database
2. **Independent Customization**: Tenants can customize their ERPNext without affecting others
3. **Scalability**: Easy to distribute tenants across multiple servers
4. **Security**: Natural isolation prevents data leaks between tenants
5. **Performance**: No shared resource contention

## Implementation Components

### 1. Tenant DocType (Master Site)
Stores tenant metadata in the master ERPNext site:

```javascript
{
  doctype: 'Tenant',
  fields: [
    'subdomain',           // URL slug (e.g., 'acme')
    'company_name',        // Organization name
    'owner_email',         // Primary admin email
    'plan',               // 'free' | 'pro' | 'enterprise'
    'status',             // 'active' | 'trial' | 'suspended' | 'cancelled'
    'site_url',           // Full URL to tenant site
    'erpnext_site',       // Internal bench site name
    'site_config',        // API keys and configuration (JSON)
    'usage_users',        // Current user count
    'usage_leads',        // Current lead count
    'usage_projects',     // Current project count
    'usage_invoices',     // Current invoice count
    'usage_storage'       // Storage used in GB
  ]
}
```

### 2. Subscription Plans

#### Free Plan (₹0/month)
- 2 users
- 50 leads
- 5 projects
- 20 invoices
- 1 GB storage
- Email support

#### Pro Plan (₹2,999/month)
- 10 users
- 1,000 leads
- 50 projects
- 500 invoices
- 10 GB storage
- Priority support
- Custom domain
- API access
- Advanced reports

#### Enterprise Plan (₹9,999/month)
- Unlimited everything
- 24/7 support
- Custom domain
- API access
- Advanced reports
- All integrations
- Dedicated support

## Core Features Implemented

### ✅ 1. Tenant Provisioning
**Files**: 
- [app/actions/signup.ts](app/actions/signup.ts)
- [app/actions/tenants.ts](app/actions/tenants.ts)
- [app/actions/provision.ts](app/actions/provision.ts)

**Flow**:
1. User signs up at nexuserp.com
2. System creates Tenant record in master DB
3. Provision script creates new ERPNext site
4. User is auto-logged into their new site

```typescript
// Signup creates tenant + provisions site
const result = await signupWithTenant({
  email: 'john@acme.com',
  password: 'secure123',
  organizationName: 'Acme Corp',
  plan: 'pro'
})
// Creates site at acme.nexuserp.com
```

### ✅ 2. Usage Limit Enforcement
**File**: [app/actions/usage-limits.ts](app/actions/usage-limits.ts)

**Features**:
- Pre-creation checks for leads, projects, invoices, users
- Automatic usage counter increments
- Upgrade prompts when limits reached
- Real-time usage tracking

```typescript
// Before creating a lead
const usageCheck = await canCreateLead(subdomain)
if (!usageCheck.allowed) {
  return { 
    error: usageCheck.message,
    limitReached: true,
    currentUsage: usageCheck.current,
    limit: usageCheck.limit
  }
}

// After successful creation
await incrementUsage(subdomain, 'usage_leads')
```

**Enforced In**:
- [app/actions/crm.ts](app/actions/crm.ts) - `createLead()`
- [app/actions/projects.ts](app/actions/projects.ts) - `createProject()`
- [app/actions/invoices.ts](app/actions/invoices.ts) - `createInvoice()`
- [app/actions/team.ts](app/actions/team.ts) - `inviteTeamMember()`

### ✅ 3. Team Member Management
**Files**:
- [app/actions/team.ts](app/actions/team.ts)
- [components/team/invite-team-member-dialog.tsx](components/team/invite-team-member-dialog.tsx)
- [app/(main)/team/page.tsx](app/(main)/team/page.tsx)

**Features**:
- Invite team members with role assignment
- Automatic user limit checks
- Email invitations
- Remove/disable team members
- Role-based access control

**Roles**:
- Admin: Full system access
- Member: Standard user
- Sales: Sales module access
- Projects: Project management access
- Accounts: Accounting access

### ✅ 4. Usage Dashboard
**File**: [components/dashboard/usage-widget.tsx](components/dashboard/usage-widget.tsx)

**Features**:
- Real-time usage visualization
- Progress bars for each limit
- Warning indicators at 80% usage
- Upgrade prompts
- Current plan display

### ✅ 5. Upgrade Prompts
**File**: [components/upgrade-prompt.tsx](components/upgrade-prompt.tsx)

**Features**:
- Contextual upgrade suggestions
- Plan comparison
- Feature highlights
- Direct upgrade link
- Dismissible dialog

## Middleware & Routing

### Subdomain Detection
**File**: [middleware.ts](middleware.ts)

```typescript
function getSubdomain(hostname: string): string | null {
  // acme.nexuserp.com → 'acme'
  // localhost → null
  // nexuserp.com → null
}
```

### Tenant Routing Flow
1. Request comes in for `acme.nexuserp.com/dashboard`
2. Middleware extracts subdomain: `acme`
3. Fetches tenant config from master DB
4. Sets headers: `X-ERPNext-URL`, `X-Subdomain`, `X-Tenant-Mode`
5. All API calls route to tenant's ERPNext site

### Headers Used
- `X-ERPNext-URL`: Tenant's ERPNext site URL
- `X-Subdomain`: Tenant subdomain
- `X-Tenant-Mode`: 'tenant' or 'master'

## Data Isolation

### How It Works
✅ **Database Level**: Each tenant has a separate MySQL/PostgreSQL database
✅ **File Storage**: Separate file storage per tenant
✅ **API Isolation**: Requests are routed to tenant-specific ERPNext instance
✅ **No Shared Resources**: Complete separation

### Why No organization_slug Filtering?
Since each tenant has their own ERPNext site with their own database, there's NO NEED to filter by `organization_slug` in queries. All data in the tenant's database already belongs to that tenant.

```typescript
// This is correct - no organization filter needed
export async function getLeads() {
  const response = await frappeRequest('frappe.client.get_list', 'GET', {
    doctype: 'Lead',
    fields: '["name", "lead_name", "email_id", ...]'
  })
  // Returns only leads from THIS tenant's database
  return response
}
```

## Setup & Configuration

### 1. Master Site Setup
Run on the master ERPNext site (103.224.243.242:8080):

```bash
# Create Tenant DocType
# Run this in the ERPNext console or via API
```

### 2. Add Usage Fields
Run the setup script to add usage tracking fields:

```typescript
import { setupTenantUsageFields } from '@/app/actions/setup-tenant-fields'

const result = await setupTenantUsageFields()
// Adds usage_users, usage_leads, usage_projects, usage_invoices, usage_storage
```

### 3. Environment Variables
```env
# Master Site
ERP_NEXT_URL=http://103.224.243.242:8080
ERP_API_KEY=your_api_key
ERP_API_SECRET=your_api_secret

# Provisioning
PROVISION_SCRIPT_PATH=/home/frappe/nexus_erp/scripts/provision-site.js
```

### 4. DNS Configuration
Wildcard DNS record:
```
*.nexuserp.com → Your server IP
```

## Usage Examples

### Creating a Lead with Limit Check
```typescript
const result = await createLead({
  first_name: 'John',
  email_id: 'john@example.com',
  mobile_no: '1234567890',
  company_name: 'Example Corp'
})

if (result.limitReached) {
  // Show upgrade prompt
  showUpgradeDialog({
    limitType: 'leads',
    currentUsage: result.currentUsage,
    limit: result.limit
  })
} else if (result.success) {
  // Lead created successfully
  // Usage counter automatically incremented
}
```

### Inviting a Team Member
```typescript
const result = await inviteTeamMember({
  email: 'jane@example.com',
  fullName: 'Jane Smith',
  role: 'sales'
})

if (result.limitReached) {
  alert('User limit reached. Upgrade to add more team members.')
} else if (result.success) {
  alert('Invitation sent!')
}
```

### Checking Usage
```typescript
const usage = await getUsageSummary(subdomain)

console.log(`Users: ${usage.usage.users.current} / ${usage.usage.users.limit}`)
console.log(`Leads: ${usage.usage.leads.current} / ${usage.usage.leads.limit}`)
console.log(`Plan: ${usage.planName}`)
```

## File Structure

```
app/
├── actions/
│   ├── signup.ts               # Tenant signup & provisioning
│   ├── tenants.ts              # Tenant CRUD operations
│   ├── provision.ts            # Site provisioning logic
│   ├── usage-limits.ts         # ✅ Usage enforcement
│   ├── team.ts                 # ✅ Team management
│   └── setup-tenant-fields.ts  # ✅ Setup script
├── (main)/
│   └── team/
│       └── page.tsx            # ✅ Team management UI
components/
├── team/
│   └── invite-team-member-dialog.tsx  # ✅ Invite dialog
├── dashboard/
│   └── usage-widget.tsx        # ✅ Usage visualization
└── upgrade-prompt.tsx          # ✅ Upgrade dialogs
middleware.ts                   # Subdomain routing
types/
└── tenant.ts                   # Type definitions
```

## Testing

### Test Data Isolation
1. Create two test tenants:
   - `test-a.nexuserp.com`
   - `test-b.nexuserp.com`
2. Create leads in tenant A
3. Verify leads don't appear in tenant B
4. Check separate databases
5. Verify separate file storage

### Test Usage Limits
1. Sign up with Free plan (50 lead limit)
2. Create 50 leads
3. Try creating 51st lead → Should be blocked
4. Verify upgrade prompt appears
5. Upgrade to Pro plan
6. Verify can now create more leads

### Test Team Management
1. Invite team member
2. Verify email sent
3. Team member logs in
4. Verify correct permissions
5. Remove team member
6. Verify access revoked

## Troubleshooting

### Issue: Usage limits not enforcing
**Solution**: Ensure `X-Subdomain` header is set correctly in middleware

### Issue: Team member can't be invited
**Solution**: Check user limit hasn't been reached. Check ERPNext role profiles exist.

### Issue: Subdomain not routing correctly
**Solution**: Verify DNS wildcard record. Check middleware subdomain extraction logic.

### Issue: Usage counters not incrementing
**Solution**: Check that `incrementUsage()` is called after successful creation. Verify Tenant DocType has usage fields.

## Future Enhancements

- [ ] Billing integration (Stripe/Razorpay)
- [ ] Usage-based billing (pay per resource)
- [ ] Organization switching for multi-org users
- [ ] Tenant migration tools
- [ ] Backup and restore per tenant
- [ ] Custom domain support
- [ ] SSO integration
- [ ] Advanced analytics per tenant
- [ ] Resource usage monitoring
- [ ] Automated scaling

## Summary

The multi-tenancy structure is now **COMPLETE** with:

✅ Subdomain-based tenant provisioning
✅ Complete data isolation (separate databases)
✅ Usage limit enforcement on leads, projects, invoices, users
✅ Team member management with invitations
✅ Usage dashboard and visualization
✅ Upgrade prompts when limits reached
✅ Subscription plan tiers (Free, Pro, Enterprise)
✅ Automatic usage tracking

Each tenant gets their own ERPNext site, ensuring complete isolation and independent scalability.
