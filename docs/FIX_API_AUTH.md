# API Authentication Issues - Manual Fix

## Problem
The API keys stored in your environment variables don't match what's in the Frappe/ERPNext database, causing authentication errors.

## Solution: Fix Master Site API Keys First

### Step 1: Generate New Master Site API Keys

On your server where Frappe is running, execute:

```bash
cd /home/ubuntu/frappe_docker
bash ~/nexus_erp/scripts/fix-master-api-keys.sh
```

This will output new API keys. Example output:
```
API Key: 8f15d0e5c0f36a2
API Secret: f17f36e89dc2e0a
```

### Step 2: Update Your .env File

Update your `.env` or `.env.local` file with the new keys:

```env
ERP_API_KEY=8f15d0e5c0f36a2
ERP_API_SECRET=f17f36e89dc2e0a
```

### Step 3: Restart Next.js

```bash
# Stop the dev server (Ctrl+C) and restart
npm run dev
```

### Step 4: Fix Tenant API Keys

Once master site API keys are working, run:

```bash
cd /home/ubuntu/frappe_docker
bash ~/nexus_erp/scripts/fix-tenant-api-keys.sh testorganisation-sau YOUR_ADMIN_PASSWORD
```

Replace `YOUR_ADMIN_PASSWORD` with the password you used when provisioning the site.

### Step 5: Create User in Tenant Site

After fixing the API keys, you can create users either:

**Option A: Via UI**
- Go to http://localhost:3000/fix-tenant
- Use "Create User in Tenant Site" form

**Option B: Via Bench Command**
```bash
cd /home/ubuntu/frappe_docker
docker compose exec backend bench --site testorganisation-sau.localhost add-user \
  thakurvedant21@gmail.com \
  --first-name "Vedant Singh Thakur" \
  --user-type "System User"
```

You'll be prompted to set a password.

### Step 6: Login

Go to http://localhost:3000/login and login with:
- Email: thakurvedant21@gmail.com
- Password: (the one you just set)

## Alternative: Quick Fix via Docker Console

If scripts don't work, you can run commands directly:

```bash
cd /home/ubuntu/frappe_docker

# Fix master site API keys
docker compose exec backend bench --site MASTER_SITE_NAME console

# In the Python console:
import frappe
user = frappe.get_doc('User', 'Administrator')
api_key = frappe.generate_hash(length=15)
api_secret = frappe.generate_hash(length=15)
user.api_key = api_key
user.api_secret = api_secret
user.save(ignore_permissions=True)
frappe.db.commit()
print(f"API Key: {api_key}")
print(f"API Secret: {api_secret}")
exit()
```

Then update your .env file with those keys and restart.
