# Frappe Whitelisted API Methods

Create these Python files in your Frappe app to whitelist the necessary methods.

## File: `frappe-bench/apps/frappe/frappe/custom_api.py`

```python
import frappe
from frappe import _

@frappe.whitelist()
def get_current_user_profile():
    """Get current logged-in user's profile details"""
    if frappe.session.user == "Guest":
        frappe.throw(_("Not authenticated"), frappe.PermissionError)
    
    user = frappe.get_doc("User", frappe.session.user)
    
    return {
        "name": user.name,
        "email": user.email,
        "full_name": user.full_name,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role_profile_name": user.role_profile_name,
        "enabled": user.enabled,
        "user_type": user.user_type,
        "user_image": user.user_image
    }

@frappe.whitelist()
def get_user_organization():
    """Get the organization associated with current user"""
    if frappe.session.user == "Guest":
        frappe.throw(_("Not authenticated"), frappe.PermissionError)
    
    # Get organization link from User document
    user = frappe.get_doc("User", frappe.session.user)
    
    # Assuming you have a custom field 'organization' on User
    if hasattr(user, 'organization') and user.organization:
        org = frappe.get_doc("Organization", user.organization)
        return {
            "name": org.name,
            "organization_name": org.organization_name,
            "subdomain": org.subdomain if hasattr(org, 'subdomain') else None
        }
    
    return None

@frappe.whitelist()
def get_team_members_for_org():
    """Get all team members for the current user's organization"""
    if frappe.session.user == "Guest":
        frappe.throw(_("Not authenticated"), frappe.PermissionError)
    
    user = frappe.get_doc("User", frappe.session.user)
    
    # Get user's organization
    if not hasattr(user, 'organization') or not user.organization:
        return []
    
    # Get all users with same organization
    users = frappe.get_all(
        "User",
        filters={"organization": user.organization, "enabled": 1},
        fields=["name", "email", "full_name", "first_name", "last_name", "user_type", "enabled", "last_login", "creation"]
    )
    
    return users
```

## Installation Steps

1. **SSH into Ubuntu VM**:
```bash
ssh vedantsinghthakur7@20.235.155.29
```

2. **Create the custom API file**:
```bash
cd ~/frappe-bench/apps/frappe/frappe
nano custom_api.py
# Paste the Python code above, then Ctrl+X, Y, Enter
```

3. **Restart Frappe**:
```bash
cd ~/frappe-bench
bench restart
```

4. **Test the API**:
```bash
# From your VM or Windows, test if it works
curl -X POST http://127.0.0.1:8080/api/method/frappe.custom_api.get_current_user_profile \
  -H "Cookie: sid=YOUR_SESSION_ID"
```

## Alternative: Use hooks.py

If the above doesn't work, add to `frappe-bench/sites/hooks.py`:

```python
doc_events = {
    "*": {
        "on_update": "frappe.custom_api.on_doc_update"
    }
}

# Whitelist custom methods
boot_session = "frappe.custom_api.boot_session"
```
