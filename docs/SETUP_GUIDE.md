# Complete Setup & Integration Guide

## Overview: Account Creation Flow

```
User Signup
    ↓
Create Tenant (dedicated ERPNext site)
    ↓
Provision Site (2-3 minutes)
    ↓
Create Organization (within tenant site)
    ↓
Create Owner User
    ↓
Login to Tenant Site
    ↓
Invite Team Members (based on subscription limits)
```

## Step-by-Step Setup

### Phase 1: Master Site Setup (One-Time)

#### 1. Create Tenant DocType

Login to your master ERPNext site (103.224.243.242:8080) and create a new DocType:

**DocType Name**: `Tenant`

**Fields**:
```
Field Name          | Type      | Options/Description
--------------------|-----------|--------------------
customer_name       | Data      | Required
company_name        | Data      | Required
subdomain           | Data      | Required, Unique
site_url            | Data      | Full URL
erpnext_site        | Data      | Bench site name
plan                | Select    | Options: free, pro, enterprise
status              | Select    | Options: pending, provisioning, active, trial, suspended, cancelled, failed
owner_email         | Data      | Required
owner_name          | Data      | 
site_config         | Long Text | JSON with credentials
created_at          | Datetime  | 
updated_at          | Datetime  | 
provisioned_at      | Datetime  | 
trial_end           | Datetime  | 
subscription_start  | Datetime  | 
subscription_end    | Datetime  | 
stripe_customer_id  | Data      | 
stripe_subscription_id | Data   |
```

#### 2. Configure Environment Variables

Create/update `.env.local`:
```bash
# Master Site (for tenant management)
ERP_NEXT_URL=http://103.224.243.242:8080
ERP_API_KEY=your_master_api_key
ERP_API_SECRET=your_master_api_secret

# Provisioning Configuration (on production server)
BENCH_PATH=/home/frappe/frappe-bench
PROVISION_SCRIPT_PATH=/home/frappe/nexus_erp/scripts/provision-site.js
DOMAIN=nexuserp.com

# Database
MASTER_DB_HOST=localhost
MASTER_DB_USER=root
MASTER_DB_PASSWORD=your_db_password

# Next.js
NEXT_PUBLIC_APP_URL=https://nexuserp.com
```

#### 3. Setup DNS (Cloudflare/Your DNS Provider)

Add wildcard DNS record:
```
Type: A
Name: *
Content: YOUR_SERVER_IP
TTL: Auto
Proxy: No (Orange cloud off)
```

This allows `acme.nexuserp.com`, `xyz.nexuserp.com`, etc.

#### 4. Deploy Provisioning Script to Server

```bash
# On your production server
cd /home/frappe/nexus_erp
mkdir -p scripts

# Upload provision-site.js to scripts/
# Make it executable
chmod +x scripts/provision-site.js

# Test it manually
node scripts/provision-site.js \
  --subdomain=test \
  --admin-email=admin@test.com \
  --admin-password=Admin@123
```

### Phase 2: Update Signup Flow

The signup flow now needs to:
1. Create a tenant record
2. Provision ERPNext site (async, takes 2-3 minutes)
3. Create organization in tenant site
4. Create owner user
5. Auto-login to tenant site

Let me update the signup action:

## User Signup Flow

When a user signs up on your platform, here's what happens:

### Step 1: User Fills Signup Form
- Full Name
- Email
- Organization Name
- Password
- **Subscription Plan** (Free/Pro/Enterprise)

### Step 2: System Creates Tenant
1. Generates subdomain from organization name (e.g., "Acme Corp" → "acme-corp")
2. Creates Tenant record in master database:
   ```json
   {
     "customer_name": "John Doe",
     "company_name": "Acme Corp",
     "subdomain": "acme-corp",
     "owner_email": "john@acme.com",
     "plan": "pro",
     "status": "provisioning"
   }
   ```

### Step 3: Site Provisioning (2-3 minutes)
The `provision-site.js` script runs:
```bash
bench new-site acme-corp.nexuserp.com --admin-password=SecurePass123
bench --site acme-corp.nexuserp.com install-app erpnext
bench --site acme-corp.nexuserp.com set-config maintenance_mode 0
# Generate API keys
# Configure nginx
# Restart services
```

### Step 4: Organization Creation
In the newly created tenant site, the system creates:
- **Organization DocType**: With subscription details and limits
- **Owner User**: The person who signed up
- **Organization Member**: Links owner to organization

### Step 5: Auto-Login
User is automatically logged into their new tenant site (`acme-corp.nexuserp.com`)

---

## Organization & Team Management

### Organizations Within Tenants

Each tenant site can have **multiple organizations** if needed, but typically:
- **1 Tenant = 1 Organization**
- The organization is created during signup
- Team members join this organization

### Adding Team Members

Once logged in, the owner can invite team members:

**From UI** (Settings → Team):
1. Click "Invite User"
2. Enter email and full name
3. Select role (Admin/Manager/User)
4. System creates user account
5. Sends welcome email with login link

**Subscription Limits Apply**:
- Free Plan: Max 2 users
- Pro Plan: Max 10 users
- Enterprise: Unlimited users

### Example Team Structure

```
Acme Corp (acme-corp.nexuserp.com)
├── Organization: "Acme Corp"
│   ├── Owner: john@acme.com (Admin)
│   ├── Member: sarah@acme.com (Manager)
│   ├── Member: mike@acme.com (User)
│   └── Member: lisa@acme.com (User)
├── Subscription: Pro Plan (₹2,999/month)
├── Usage Limits:
│   ├── Users: 4/10
│   ├── Leads: 230/1000
│   ├── Projects: 12/50
│   └── Invoices: 89/500
```

---

## Complete Integration Steps

### Step 1: Setup Master Site

```bash
# SSH into your server
ssh user@103.224.243.242

# Navigate to Frappe bench
cd /home/frappe/frappe-bench

# Create Tenant DocType
# (Use ERPNext UI or run this script)
bench --site YOUR_MASTER_SITE console

# In the console:
```python
from frappe import get_doc

# Create Tenant DocType
doc = get_doc({
    "doctype": "DocType",
    "name": "Tenant",
    "module": "Core",
    "custom": 1,
    "fields": [
        {"fieldname": "customer_name", "fieldtype": "Data", "label": "Customer Name", "reqd": 1},
        {"fieldname": "company_name", "fieldtype": "Data", "label": "Company Name", "reqd": 1},
        {"fieldname": "subdomain", "fieldtype": "Data", "label": "Subdomain", "reqd": 1, "unique": 1},
        {"fieldname": "site_url", "fieldtype": "Data", "label": "Site URL"},
        {"fieldname": "erpnext_site", "fieldtype": "Data", "label": "ERPNext Site"},
        {"fieldname": "plan", "fieldtype": "Select", "label": "Plan", "options": "free\\npro\\nenterprise"},
        {"fieldname": "status", "fieldtype": "Select", "label": "Status", 
         "options": "pending\\nprovisioning\\nactive\\ntrial\\nsuspended\\ncancelled\\nfailed"},
        {"fieldname": "owner_email", "fieldtype": "Data", "label": "Owner Email", "reqd": 1},
        {"fieldname": "owner_name", "fieldtype": "Data", "label": "Owner Name"},
        {"fieldname": "site_config", "fieldtype": "Long Text", "label": "Site Config"},
        {"fieldname": "created_at", "fieldtype": "Datetime", "label": "Created At"},
        {"fieldname": "provisioned_at", "fieldtype": "Datetime", "label": "Provisioned At"},
        {"fieldname": "trial_end", "fieldtype": "Datetime", "label": "Trial End"},
    ],
    "permissions": [
        {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}
    ]
})
doc.insert()
```

### Step 2: Deploy Provisioning Script

```bash
# On your server
cd /home/frappe
git clone YOUR_REPO nexus_erp
# Or upload files manually

# Make script executable
chmod +x /home/frappe/nexus_erp/scripts/provision-site.js

# Test provisioning
node /home/frappe/nexus_erp/scripts/provision-site.js \
  --subdomain=test123 \
  --admin-email=admin@test.com \
  --admin-password=Test@12345

# If successful, you'll see:
# ✅ Site provisioning completed successfully!
# Site URL: https://test123.nexuserp.com
```

### Step 3: Configure DNS

**If using Cloudflare**:
1. Login to Cloudflare
2. Select your domain (nexuserp.com)
3. DNS → Add Record:
   - Type: `A`
   - Name: `*`
   - IPv4: `YOUR_SERVER_IP`
   - Proxy status: DNS only (grey cloud)
   - TTL: Auto

**Verify DNS**:
```bash
nslookup test.nexuserp.com
# Should return your server IP
```

### Step 4: Setup SSL (Let's Encrypt)

```bash
# Install certbot if not already
sudo apt install certbot python3-certbot-nginx

# Get wildcard certificate
sudo certbot certonly --manual --preferred-challenges=dns \
  -d nexuserp.com -d *.nexuserp.com

# Add TXT record in DNS when prompted
# Then continue certbot

# Configure bench to use SSL
bench setup lets-encrypt
```

### Step 5: Update Environment Variables

Create `.env.local` in your Next.js project:
```bash
# Master Site
ERP_NEXT_URL=http://103.224.243.242:8080
ERP_API_KEY=abc123...
ERP_API_SECRET=xyz789...

# Provisioning
BENCH_PATH=/home/frappe/frappe-bench
PROVISION_SCRIPT_PATH=/home/frappe/nexus_erp/scripts/provision-site.js
DOMAIN=nexuserp.com

# App URL
NEXT_PUBLIC_APP_URL=https://nexuserp.com
```

### Step 6: Deploy Next.js App

```bash
# Build production
npm run build

# Start production server
npm start

# Or use PM2 for process management
pm2 start npm --name "nexus-erp" -- start
pm2 save
pm2 startup
```

### Step 7: Test Complete Flow

1. **Open your app**: https://nexuserp.com/login
2. **Click "Sign Up"**
3. **Fill form**:
   - Full Name: Test User
   - Email: test@example.com
   - Organization: Test Company
   - Password: Test@12345
   - Plan: Free
4. **Submit** → Wait 2-3 minutes
5. **Success!** → Redirected to `https://test-company.nexuserp.com/dashboard`

---

## Organization Management Features

### Invite Team Members

**UI Component** ([components/settings/invite-user-dialog.tsx](components/settings/invite-user-dialog.tsx)):
```tsx
import { inviteTeamMember } from '@/app/actions/signup'

function InviteUserDialog() {
  const handleInvite = async (data) => {
    const result = await inviteTeamMember({
      email: data.email,
      fullName: data.fullName,
      role: data.role,
      organizationId: currentOrg.id
    })
    
    if (result.success) {
      toast.success('Team member invited!')
    }
  }
  
  return <Dialog>...</Dialog>
}
```

### Check Team Limits

**Before Inviting**:
```tsx
import { useSubscription } from '@/contexts/SubscriptionContext'

function TeamManagement() {
  const { checkLimit, features } = useSubscription()
  const currentUserCount = 4
  
  const canAddMore = checkLimit('users', currentUserCount)
  
  if (!canAddMore) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200">
        <p>You've reached your plan limit of {features.features.users} users.</p>
        <Button>Upgrade Plan</Button>
      </div>
    )
  }
  
  return <InviteUserDialog />
}
```

### Subscription-Based Features

**Feature Gating Example**:
```tsx
import { FeatureGate } from '@/contexts/SubscriptionContext'

function AdvancedReports() {
  return (
    <FeatureGate feature="advanced_reports">
      <ReportsComponent />
    </FeatureGate>
  )
}

// If user doesn't have access:
// Shows: "Upgrade your plan to use this feature"
```

**Module Access**:
```tsx
import { useSubscription } from '@/contexts/SubscriptionContext'

function Sidebar() {
  const { hasPermission } = useSubscription()
  
  return (
    <nav>
      <Link href="/crm">CRM</Link> {/* All plans */}
      
      {hasPermission('Projects') && (
        <Link href="/projects">Projects</Link> {/* Pro+ only */}
      )}
      
      {hasPermission('HR') && (
        <Link href="/hr">HR</Link> {/* Enterprise only */}
      )}
    </nav>
  )
}
```

---

## Subscription Plans & Limits

### Free Plan (₹0/month)
```json
{
  "users": 2,
  "leads": 50,
  "projects": 5,
  "invoices": 20,
  "storage": "1 GB",
  "support": "Email",
  "modules": ["CRM", "Contacts", "Leads"]
}
```

### Pro Plan (₹2,999/month)
```json
{
  "users": 10,
  "leads": 1000,
  "projects": 50,
  "invoices": 500,
  "storage": "10 GB",
  "support": "Priority",
  "custom_domain": true,
  "api_access": true,
  "modules": ["CRM", "Sales", "Buying", "Stock", "Accounts", "Projects"]
}
```

### Enterprise Plan (₹9,999/month)
```json
{
  "users": "Unlimited",
  "leads": "Unlimited",
  "projects": "Unlimited",
  "invoices": "Unlimited",
  "storage": "Unlimited",
  "support": "24/7",
  "custom_domain": true,
  "api_access": true,
  "modules": ["All ERPNext modules"]
}
```

---

## Troubleshooting

### Provisioning Takes Too Long
- Check server resources (CPU, RAM, disk)
- Review bench logs: `tail -f logs/bench.log`
- Verify database connection
- Check nginx status: `sudo systemctl status nginx`

### Subdomain Not Accessible
- Verify DNS propagation: `dig subdomain.nexuserp.com`
- Check nginx config: `sudo nginx -t`
- Restart nginx: `sudo systemctl restart nginx`
- Check SSL certificate

### User Can't Login to Tenant Site
- Verify user was created in tenant database
- Check session cookies
- Try password reset
- Check tenant site status (active/suspended)

### Organization Not Created
- Check site provisioning status
- Review API credentials in site_config
- Manually create Organization DocType if needed
- Check ERPNext error logs

---

## Next Steps

1. ✅ **Setup Complete** - You now have multi-tenant SaaS
2. 🎨 **Customize UI** - Brand your login/signup pages
3. 💳 **Add Payments** - Integrate Stripe for subscriptions
4. 📊 **Analytics** - Track usage per tenant
5. 📧 **Email** - Configure SMTP for notifications
6. 🔒 **Security** - Enable 2FA, IP whitelist
7. 📈 **Scale** - Add load balancer, multiple servers

Your multi-tenant ERPNext SaaS is ready to roll out in January 2026! 🚀

