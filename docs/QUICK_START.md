# Quick Start Guide - Multi-Tenancy Setup

## Step-by-Step Setup Instructions

### Prerequisites
1. ERPNext instance running at `http://103.224.243.242:8080`
2. Admin access to ERPNext
3. API credentials (API Key & Secret)

---

## Step 1: Configure Environment Variables

Create or update `.env.local` in your project root:

```env
# ERPNext Master Site
ERP_NEXT_URL=http://103.224.243.242:8080
ERP_API_KEY=your_api_key_here
ERP_API_SECRET=your_api_secret_here

# Optional: For production provisioning
PROVISION_SCRIPT_PATH=/home/frappe/nexus_erp/scripts/provision-site.js
NODE_ENV=development
```

### How to get API credentials from ERPNext:

1. Login to ERPNext as Administrator
2. Go to: **User Menu** (top right) → **My Settings**
3. Scroll to **API Access** section
4. Click **Generate Keys**
5. Copy the **API Key** and **API Secret**
6. Paste them in `.env.local`

---

## Step 2: Run the Tenant Setup

1. **Start your development server** (if not running):
   ```bash
   npm run dev
   ```

2. **Open the setup page in your browser**:
   ```
   http://localhost:3000/setup-tenant
   ```

3. **Follow the 3-step process on the page**:
   - **Step 1**: Click "Create Tenant DocType" - Creates the custom DocType in ERPNext
   - **Step 2**: Click "Verify Setup" - Confirms everything was created correctly
   - **Step 3**: Click "Create Test Tenant" (optional) - Creates a test tenant for testing

4. **Check for success messages**:
   - ✅ Green cards = Success
   - ❌ Red cards = Error (check the details)

---

## Step 3: Verify in ERPNext

1. Login to ERPNext at `http://103.224.243.242:8080`
2. Go to: **Customization** → **DocType**
3. Search for "Tenant"
4. You should see the **Tenant** DocType with all fields

---

## Step 4: Test the Multi-Tenancy Features

### Option A: Test Usage Limits (Easiest)

1. Navigate to: `http://localhost:3000/dashboard`
2. Try creating leads/projects/invoices
3. When you reach the limit for Free plan:
   - 50 leads → Should show upgrade prompt
   - 5 projects → Should show upgrade prompt
   - 20 invoices → Should show upgrade prompt

### Option B: Test Team Management

1. Navigate to: `http://localhost:3000/team`
2. Click "Invite Team Member"
3. Try inviting when at 2 users (Free plan limit)
4. Should see upgrade prompt

---

## Troubleshooting

### ❌ Error: "Cannot find module 'next/headers'"
**Solution**: These are TypeScript errors - the code will still run fine. Ignore them.

### ❌ Error: "Failed to create Tenant DocType"
**Solution**: 
- Check your API credentials in `.env.local`
- Verify ERPNext is accessible at the URL
- Make sure you have System Manager role in ERPNext

### ❌ Error: "Tenant DocType already exists"
**Solution**: This is fine! It means it's already set up. Click "Verify Setup" to confirm.

### ❌ Error: Cannot access setup page
**Solution**: 
- Make sure dev server is running (`npm run dev`)
- Check the URL: `http://localhost:3000/setup-tenant`

---

## What's Next?

Once setup is complete, you can:

1. **Test existing features** with the test tenant
2. **Create actual users** via signup (without provisioning for now)
3. **Test usage tracking** by creating leads/projects/invoices
4. **Test team management** by inviting members

### For Production Deployment:

When ready to deploy with full tenant provisioning:

1. Set up wildcard DNS: `*.nexuserp.com → Your server IP`
2. Create provisioning script for creating actual ERPNext sites
3. Update environment variables for production
4. Test signup flow with real provisioning

---

## Quick Commands Reference

```bash
# Start development server
npm run dev

# Access setup page
# http://localhost:3000/setup-tenant

# Access application
# http://localhost:3000/login
# http://localhost:3000/dashboard
```

---

## Testing Checklist

After setup, verify these work:

- [ ] Setup page accessible
- [ ] Tenant DocType created in ERPNext
- [ ] Verification passes
- [ ] Can view Tenant DocType in ERPNext
- [ ] Dashboard loads without errors
- [ ] Team page loads without errors
- [ ] Can navigate all pages
- [ ] Usage limits show correctly (if configured)

---

## Need Help?

Check these files for reference:
- [MULTI_TENANCY_COMPLETE.md](MULTI_TENANCY_COMPLETE.md) - Complete architecture documentation
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Original setup guide
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical architecture

---

**🎉 Once you complete these steps, your multi-tenancy structure will be fully operational!**
