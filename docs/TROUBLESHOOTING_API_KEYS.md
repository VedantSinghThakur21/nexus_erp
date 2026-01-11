# 🔧 Troubleshooting: API Keys Not Activating

## Problem

After tenant provisioning completes successfully, API keys fail to activate even after 2+ minutes of polling:

```
❌ API keys failed to activate after 12 attempts (143750ms)
```

## Root Cause

Newly created Frappe sites generate API keys for the Administrator user, but these keys may not be immediately usable because:

1. **Cache Not Warmed:** Site caches need to be initialized
2. **Permission Tables Not Built:** API key permissions not in `tabHas Role`
3. **Session State:** Administrator user never logged in (triggers initialization)
4. **Bench Worker Delay:** Background workers haven't processed the site yet

## Solution Options

### Option 1: Manual Site Access (Recommended for Testing)

When you see the API activation failure message, your site IS actually provisioned successfully! You just need to access it manually:

```bash
# 1. Go to the tenant site URL
http://localhost:8080

# 2. Login as Administrator
Username: Administrator
Password: <the temp password from provisioning>

# 3. Create your user manually
- Go to User List
- Click New
- Fill in details
- Set role: System Manager
- Save

# 4. Logout and login as the new user
```

### Option 2: Use Bench Console to Create User

```bash
# SSH to your Frappe server
cd ~/frappe-bench

# Open console for the tenant site
bench --site <subdomain>.localhost console

# In the Frappe console:
>>> from frappe.core.doctype.user.user import update_password
>>> 
>>> # Create user
>>> user = frappe.get_doc({
...     "doctype": "User",
...     "email": "john@acme.com",
...     "first_name": "John",
...     "last_name": "Doe",
...     "user_type": "System User",
...     "send_welcome_email": 0
... }).insert()
>>> 
>>> # Set password
>>> update_password(user='john@acme.com', new_password='SecurePass123')
>>> 
>>> # Add System Manager role
>>> user.add_roles("System Manager")
>>> 
>>> # Commit
>>> frappe.db.commit()
>>> 
>>> print(f"✅ User created: {user.name}")
```

### Option 3: Fix API Keys (For Production)

The issue is that API keys are generated but not activated. To fix:

```bash
cd ~/frappe-bench

# Method 1: Trigger first login for Administrator
bench --site <subdomain>.localhost console

>>> import frappe
>>> frappe.set_user('Administrator')
>>> frappe.db.commit()
>>> print("✅ Administrator session initialized")

# Method 2: Regenerate and save keys properly
>>> from frappe.core.doctype.user.user import generate_keys
>>> generate_keys('Administrator')
>>> frappe.db.commit()
>>> 
>>> # Verify keys exist
>>> user = frappe.get_doc('User', 'Administrator')
>>> print(f"API Key: {user.api_key}")
>>> print("✅ Keys regenerated")

# Method 3: Test API keys work
exit()

# Test from command line
API_KEY="<your_api_key>"
API_SECRET="<your_api_secret>"
SITE="<subdomain>.localhost"

curl -X GET "http://localhost:8080/api/method/frappe.client.get_list" \
  -H "Authorization: token $API_KEY:$API_SECRET" \
  -H "X-Frappe-Site-Name: $SITE" \
  -H "Accept: application/json"

# Should return 200 or 417 (missing params), not 401
```

### Option 4: Automated Fix in Provisioning Script

Update your provisioning script to trigger Administrator login after site creation:

```bash
# In provision-site-production.sh, add after site creation:

# Warm up the site by simulating Administrator login
bench execute "
import frappe
frappe.set_user('Administrator')
frappe.db.commit()
" --site "$SITE_NAME"

# Then generate API keys
bench execute "frappe.core.doctype.user.user.generate_keys" \
    --args '["Administrator"]' \
    --site "$SITE_NAME"
```

## Prevention

### For Development

Add to your `.env.local`:
```bash
# Skip API key validation in dev
DEV_MODE=true
MOCK_PROVISIONING=true
```

### For Production

1. **Pre-warm sites:** Create a "warmup" script that runs after provisioning
2. **Async user creation:** Queue user creation as a background job that retries
3. **Email verification:** Send email link, create user when clicked (gives time for keys to activate)
4. **Manual approval:** Admin approves signups, creates users manually

## Quick Test Script

Create `test-api-keys.sh`:

```bash
#!/bin/bash

SITE=$1
API_KEY=$2
API_SECRET=$3

if [ -z "$SITE" ] || [ -z "$API_KEY" ] || [ -z "$API_SECRET" ]; then
    echo "Usage: $0 <site> <api_key> <api_secret>"
    exit 1
fi

echo "Testing API keys for site: $SITE"

# Test 1: Simple GET
echo "Test 1: GET request..."
curl -s -X GET "http://localhost:8080/api/method/ping" \
  -H "Authorization: token $API_KEY:$API_SECRET" \
  -H "X-Frappe-Site-Name: $SITE" | jq .

# Test 2: Get user
echo -e "\nTest 2: Get logged user..."
curl -s -X GET "http://localhost:8080/api/method/frappe.auth.get_logged_user" \
  -H "Authorization: token $API_KEY:$API_SECRET" \
  -H "X-Frappe-Site-Name: $SITE" | jq .

# Test 3: List DocTypes
echo -e "\nTest 3: List DocTypes..."
curl -s -X GET "http://localhost:8080/api/method/frappe.client.get_list" \
  -H "Authorization: token $API_KEY:$API_SECRET" \
  -H "X-Frappe-Site-Name: $SITE" \
  -H "Content-Type: application/json" | jq .

echo -e "\n✅ Test complete"
```

## Expected Behavior

**Success case:**
```
✅ API keys active after 2 attempts (12500ms)
✅ User created and password set successfully
✅ Organization created successfully
```

**Failure case (but site is OK):**
```
⚠️ API keys failed to activate: {...}
⚠️ FALLBACK: Site provisioned successfully but API keys inactive
⚠️ User will need to access site directly: http://localhost:8080
```

## Long-term Fix

The proper solution is to modify the signup flow to:

1. **Provision site** → ✅ Done
2. **Return success immediately** → Don't wait for API keys
3. **Queue background job** → Create user asynchronously
4. **Send email** → "Your site is ready! Click here to set up your account"
5. **User clicks link** → By then, API keys are active (5-10 min later)

This is how Frappe Cloud handles it - they don't try to create the user immediately.

## Still Having Issues?

Check:
1. Frappe bench is running: `bench start`
2. MariaDB is running: `sudo systemctl status mariadb`
3. Redis is running: `sudo systemctl status redis`
4. Bench workers are running: `bench worker` processes exist
5. Site exists: `bench --site <site>.localhost migrate`
6. Logs: `tail -f ~/frappe-bench/logs/*.log`

## Contact

If none of the above works, provide these details:
- Frappe version: `bench version`
- Site creation logs
- API test output from `test-api-keys.sh`
- `bench doctor` output
