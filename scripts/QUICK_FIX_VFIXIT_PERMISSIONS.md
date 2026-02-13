# Quick Fix: vfixit.avariq.in User Permissions

## Problem
User `vedantthakur2108@gmail.com` on `vfixit.avariq.in` cannot access:
- ❌ Opportunity DocType (403 Permission Error)
- ❌ Lead pages (404 Not Found)
- ❌ CRM Dashboard features

**Error Message:**
```
User vedantthakur2108@gmail.com does not have doctype access via role permission for document Opportunity
```

---

## Root Cause
The user lacks CRM-related roles (Sales Manager, CRM Manager, etc.) on the vfixit tenant.

---

## Solution: Run These Commands

### Option 1: Using Frappe Console (Recommended)

```bash
# SSH into your Frappe server, then:
cd /path/to/frappe-bench

# Run console for vfixit site
bench --site vfixit.avariq.in console
```

Then paste this into the console:

```python
import frappe

# Get user
user = frappe.get_doc("User", "vedantthakur2108@gmail.com")

# Add required roles
required_roles = ["System Manager", "Sales Manager", "Sales User", "CRM Manager"]

for role in required_roles:
    # Check if role already exists
    existing = [r.role for r in user.roles]
    if role not in existing:
        user.append("roles", {"role": role})
        print(f"✅ Added role: {role}")
    else:
        print(f"⏭️  Already has role: {role}")

# Save user
user.save(ignore_permissions=True)
frappe.db.commit()

print("\n✅ User roles updated successfully!")

# Verify
print("\n📋 Current roles:")
for r in user.roles:
    print(f"   - {r.role}")
```

Press `Ctrl+D` to exit console.

---

### Option 2: Using Python Script

```bash
cd /path/to/frappe-bench
bench --site vfixit.avariq.in console < /path/to/nexus_erp/scripts/fix-user-roles-vfixit.py
```

---

### Option 3: Using Frappe UI (Manual)

1. Login to Frappe/ERPNext backend: `http://vfixit.avariq.in:8080/app/user`
2. Search for user: `vedantthakur2108@gmail.com`
3. Open the user record
4. Scroll to "Roles" table
5. Click "Add Row" and add these roles:
   - ✅ System Manager
   - ✅ Sales Manager
   - ✅ Sales User
   - ✅ CRM Manager
6. Click "Save"

---

## Verify the Fix

After adding roles, test in the Next.js app:

1. **Logout and Login Again** (important for session refresh):
   ```
   https://vfixit.avariq.in/tenant/logout
   https://vfixit.avariq.in/tenant/login
   ```

2. **Test CRM Access:**
   - Navigate to: `https://vfixit.avariq.in/crm`
   - Should see opportunities without errors

3. **Test New Lead:**
   - Navigate to: `https://vfixit.avariq.in/crm/new`
   - Should load without 404

---

## Why This Happened

Each Frappe/ERPNext site (tenant) has **independent user roles**. When a new tenant is provisioned:

1. ✅ User is created
2. ❌ Roles are NOT automatically assigned
3. 🐛 Result: User exists but has no permissions

**Solution:** Always assign roles during user provisioning or after tenant creation.

---

## Prevent This in Future

Update your provisioning script to auto-assign roles:

**File:** `provisioning-service/apps/tenant_provisioner.py`

```python
def create_tenant_admin_user(site_name, email, password):
    """Create admin user with all necessary roles"""
    
    # After creating user...
    user = frappe.get_doc("User", email)
    
    # Auto-assign standard roles
    default_roles = [
        "System Manager",
        "Sales Manager", 
        "Sales User",
        "CRM Manager",
        "Accounts Manager",
        "Stock Manager",
        "Projects Manager"
    ]
    
    for role in default_roles:
        if not any(r.role == role for r in user.roles):
            user.append("roles", {"role": role})
    
    user.save(ignore_permissions=True)
    frappe.db.commit()
```

---

## Next Steps

1. ✅ Run the fix command above
2. ✅ Logout and login to refresh session
3. ✅ Test CRM access
4. ✅ Update provisioning script to prevent future issues
5. ✅ Document role requirements in onboarding

---

## Related Files
- [ROLE_BASED_ACCESS_CONTROL.md](../ROLE_BASED_ACCESS_CONTROL.md) - Full RBAC documentation
- [fix-user-roles-vfixit.py](./fix-user-roles-vfixit.py) - Automated fix script
- [provisioning-service/apps/tenant_provisioner.py](../provisioning-service/apps/tenant_provisioner.py) - Provisioning logic

---

## Quick Command Reference

```bash
# Check user roles
bench --site vfixit.avariq.in console
>>> user = frappe.get_doc("User", "vedantthakur2108@gmail.com")
>>> print([r.role for r in user.roles])

# Add single role
>>> user.append("roles", {"role": "Sales Manager"})
>>> user.save(ignore_permissions=True)
>>> frappe.db.commit()

# List all available roles
>>> frappe.get_all("Role", pluck="name")
```
