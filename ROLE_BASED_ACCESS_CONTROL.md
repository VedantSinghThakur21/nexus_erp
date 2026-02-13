# Role-Based Access Control (RBAC) - Nexus ERP

## Overview
Nexus ERP implements a **role-based access control system** that directly integrates with **Frappe ERPNext roles** to control module visibility and access permissions across the frontend.

---

## Architecture

### 1. **Backend Integration (Frappe/ERPNext)**
- **User Roles:** Stored in Frappe's `Has Role` table (linked to User DocType)
- **Role Permissions:** Managed via Frappe's Role Permissions Manager
- **API Endpoint:** `frappe.client.get` method to fetch user details including roles

### 2. **Frontend Integration (Next.js)**
- **User Context:** Fetched on login and stored in session/cookies
- **Sidebar Filtering:** Dynamically shows/hides modules based on roles
- **Page Guards:** Server-side checks before rendering pages
- **API Calls:** Automatically filtered by Frappe based on user permissions

---

## Standard ERPNext Roles & Module Mapping

| Role | Description | Accessible Modules |
|------|-------------|-------------------|
| **System Manager** | Full system access | All modules (Dashboard, Bookings, Catalogue, CRM, Invoices, Payments, Projects, Sales Orders, Quotations, Team, Operators, Agents, Inspections, Pricing Rules, Admin Tenants) |
| **Sales Manager** | Manage sales operations | Dashboard, Bookings, CRM, Quotations, Sales Orders, Invoices, Catalogue |
| **Sales User** | Sales team member | Dashboard, Bookings, CRM, Quotations, Catalogue (read-only) |
| **Accounts Manager** | Finance & accounting | Dashboard, Invoices, Payments, Sales Orders, Projects |
| **Accounts User** | Finance team member | Dashboard, Invoices (limited), Payments (read-only) |
| **Projects Manager** | Project management | Dashboard, Projects, Bookings, Inspections |
| **Projects User** | Project team member | Dashboard, Projects (limited), Inspections |
| **Stock Manager** | Inventory management | Dashboard, Catalogue, Operators, Agents, Inspections |
| **Stock User** | Warehouse team | Dashboard, Catalogue (read-only), Inspections |
| **Guest** | Limited access | Dashboard (minimal), Catalogue (public view) |

---

## Module Access Matrix

| Module | System Manager | Sales Manager | Sales User | Accounts Manager | Accounts User | Projects Manager | Projects User | Stock Manager | Stock User |
|--------|---------------|---------------|------------|------------------|---------------|------------------|---------------|---------------|------------|
| Dashboard | ✅ Full | ✅ Sales | ✅ Sales | ✅ Finance | ✅ Finance | ✅ Projects | ✅ Projects | ✅ Stock | ✅ Stock |
| Bookings | ✅ Full | ✅ Full | ✅ View | ✅ View | ❌ | ✅ Full | ✅ View | ✅ View | ❌ |
| Catalogue | ✅ Full | ✅ Full | ✅ View | ❌ | ❌ | ✅ View | ✅ View | ✅ Full | ✅ View |
| CRM | ✅ Full | ✅ Full | ✅ Full | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Quotations | ✅ Full | ✅ Full | ✅ Full | ✅ View | ❌ | ❌ | ❌ | ❌ | ❌ |
| Sales Orders | ✅ Full | ✅ Full | ✅ View | ✅ Full | ✅ View | ✅ View | ❌ | ❌ | ❌ |
| Invoices | ✅ Full | ✅ Full | ✅ View | ✅ Full | ✅ Full | ✅ View | ❌ | ❌ | ❌ |
| Payments | ✅ Full | ✅ View | ❌ | ✅ Full | ✅ Full | ✅ View | ❌ | ❌ | ❌ |
| Projects | ✅ Full | ✅ View | ❌ | ✅ View | ❌ | ✅ Full | ✅ Full | ❌ | ❌ |
| Operators | ✅ Full | ❌ | ❌ | ❌ | ❌ | ✅ View | ❌ | ✅ Full | ✅ View |
| Agents | ✅ Full | ❌ | ❌ | ❌ | ❌ | ✅ View | ❌ | ✅ Full | ✅ View |
| Inspections | ✅ Full | ❌ | ❌ | ❌ | ❌ | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| Pricing Rules | ✅ Full | ✅ Full | ❌ | ✅ Full | ❌ | ❌ | ❌ | ❌ | ❌ |
| Team | ✅ Full | ✅ View | ❌ | ❌ | ❌ | ✅ View | ❌ | ✅ View | ❌ |
| Admin Tenants | ✅ Full | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Legend:**  
✅ **Full** = Create, Read, Update, Delete  
✅ **View** = Read-only access  
❌ = No access (module hidden in sidebar)

---

## Implementation Guide

### Step 1: Fetch User Roles from Frappe

**API Call:**
```typescript
// app/actions/user-auth.ts
export async function getUserRoles(): Promise<string[]> {
  const api = await getApiClient()
  const user = await api.get('frappe.client.get', {
    doctype: 'User',
    name: 'frappe.session.user'
  })
  return user.roles.map((r: any) => r.role)
}
```

### Step 2: Store Roles in Context

**Context Provider:**
```typescript
// contexts/user-context.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface UserContextType {
  roles: string[]
  hasRole: (role: string) => boolean
  canAccess: (module: string) => boolean
}

const UserContext = createContext<UserContextType | null>(null)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [roles, setRoles] = useState<string[]>([])
  
  useEffect(() => {
    // Fetch roles from API or session
    fetch('/api/user/roles')
      .then(r => r.json())
      .then(data => setRoles(data.roles))
  }, [])
  
  const hasRole = (role: string) => roles.includes(role)
  const canAccess = (module: string) => checkModuleAccess(module, roles)
  
  return (
    <UserContext.Provider value={{ roles, hasRole, canAccess }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
```

### Step 3: Module Access Logic

**Module Permission Checker:**
```typescript
// lib/role-permissions.ts
export const MODULE_PERMISSIONS: Record<string, string[]> = {
  dashboard: ['System Manager', 'Sales Manager', 'Sales User', 'Accounts Manager', 'Accounts User', 'Projects Manager', 'Projects User', 'Stock Manager', 'Stock User'],
  bookings: ['System Manager', 'Sales Manager', 'Sales User', 'Accounts Manager', 'Projects Manager', 'Projects User', 'Stock Manager'],
  catalogue: ['System Manager', 'Sales Manager', 'Sales User', 'Projects Manager', 'Projects User', 'Stock Manager', 'Stock User'],
  crm: ['System Manager', 'Sales Manager', 'Sales User'],
  quotations: ['System Manager', 'Sales Manager', 'Sales User', 'Accounts Manager'],
  'sales-orders': ['System Manager', 'Sales Manager', 'Sales User', 'Accounts Manager', 'Accounts User', 'Projects Manager'],
  invoices: ['System Manager', 'Sales Manager', 'Sales User', 'Accounts Manager', 'Accounts User', 'Projects Manager'],
  payments: ['System Manager', 'Sales Manager', 'Accounts Manager', 'Accounts User', 'Projects Manager'],
  projects: ['System Manager', 'Sales Manager', 'Accounts Manager', 'Projects Manager', 'Projects User'],
  operators: ['System Manager', 'Projects Manager', 'Stock Manager', 'Stock User'],
  agents: ['System Manager', 'Projects Manager', 'Stock Manager', 'Stock User'],
  inspections: ['System Manager', 'Projects Manager', 'Projects User', 'Stock Manager', 'Stock User'],
  'pricing-rules': ['System Manager', 'Sales Manager', 'Accounts Manager'],
  team: ['System Manager', 'Sales Manager', 'Projects Manager', 'Stock Manager'],
  'admin-tenants': ['System Manager'],
}

export function canAccessModule(module: string, userRoles: string[]): boolean {
  const allowedRoles = MODULE_PERMISSIONS[module] || []
  return userRoles.some(role => allowedRoles.includes(role))
}
```

### Step 4: Dynamic Sidebar Filtering

**Filter Navigation Items:**
```typescript
// components/app-sidebar.tsx
const filteredNavItems = navItems.filter(item => 
  userRoles.includes('System Manager') || canAccessModule(item.href.replace('/', ''), userRoles)
)
```

### Step 5: Page-Level Guards

**Server-Side Check:**
```typescript
// app/tenant/(main)/payments/page.tsx
export default async function PaymentsPage() {
  const userRoles = await getUserRoles()
  
  if (!canAccessModule('payments', userRoles)) {
    redirect('/dashboard?error=access_denied')
  }
  
  // ... rest of page
}
```

---

## UI/UX Considerations

### 1. **Graceful Degradation**
- Hidden modules don't appear in sidebar
- Direct URL access shows "Access Denied" page
- Dashboard shows only cards for accessible modules

### 2. **User Feedback**
- Role badge in user profile dropdown
- Tooltip on disabled actions: "Requires [Role Name]"
- Empty state messages: "Contact admin for access"

### 3. **Admin Tools**
- System Managers see "Manage Roles" link
- Quick role toggle for testing (dev only)
- Role assignment notification emails

---

## Testing Checklist

- [ ] User with `Sales User` role sees only CRM, Quotations, Catalogue
- [ ] User with `Accounts Manager` role sees Invoices, Payments, Sales Orders
- [ ] User without `System Manager` role cannot access Admin Tenants
- [ ] Direct URL navigation to forbidden module redirects to dashboard
- [ ] API calls respect Frappe role permissions (403 on unauthorized)
- [ ] Sidebar dynamically updates on role change (without re-login)

---

## Troubleshooting

### Issue: User sees all modules despite limited roles
**Solution:** Clear session cookies and re-login. Check that roles are fetched from Frappe, not cached.

### Issue: 403 errors on API calls
**Solution:** Verify Role Permissions in Frappe's Role Permissions Manager. Ensure the user's roles have read access to the DocType.

### Issue: Sidebar shows module but page returns "Access Denied"
**Solution:** Check that `MODULE_PERMISSIONS` mapping matches server-side guards. Update both files.

---

## Future Enhancements

1. **Fine-Grained Permissions:** Read-only vs. full access within modules
2. **Custom Roles:** Allow admins to create custom roles with specific permissions
3. **Permission Caching:** Cache role permissions for faster page loads
4. **Audit Logging:** Track who accesses what and when
5. **Role-Based Dashboards:** Different dashboard layouts per role

---

## Related Files

- `lib/role-permissions.ts` - Permission mapping
- `contexts/user-context.tsx` - User role state management
- `components/app-sidebar.tsx` - Dynamic sidebar filtering
- `app/api/user/roles/route.ts` - API endpoint for fetching user roles
- `app/actions/user-auth.ts` - Server action for role checks

---

## Troubleshooting

### Issue: "User does not have doctype access via role permission"

**Symptoms:**
- 403 Permission errors when accessing CRM/Opportunity
- 404 Not Found on lead pages
- Empty dashboard widgets

**Cause:** User lacks required roles on the tenant site.

**Solution:**

1. **Check current roles:**
   ```bash
   bench --site <tenant>.avariq.in console
   >>> user = frappe.get_doc("User", "user@email.com")
   >>> print([r.role for r in user.roles])
   ```

2. **Add required roles:**
   ```python
   # In bench console
   user = frappe.get_doc("User", "user@email.com")
   required_roles = ["System Manager", "Sales Manager", "Sales User", "CRM Manager"]
   
   for role in required_roles:
       if role not in [r.role for r in user.roles]:
           user.append("roles", {"role": role})
   
   user.save(ignore_permissions=True)
   frappe.db.commit()
   ```

3. **Logout and login** to refresh session

**See Also:** [scripts/QUICK_FIX_VFIXIT_PERMISSIONS.md](../scripts/QUICK_FIX_VFIXIT_PERMISSIONS.md)

---

### Issue: Roles not syncing between Frappe and Next.js

**Symptoms:**
- Roles show correctly in Frappe UI
- But sidebar doesn't update in Next.js app

**Solution:**
1. Clear browser cookies
2. Logout completely: `/tenant/logout`
3. Login again: `/tenant/login`
4. If still not working, check `app/actions/profile.ts` fetches roles correctly

---

### Issue: New tenant users have no permissions

**Cause:** Provisioning script doesn't assign default roles.

**Solution:** Update `provisioning-service/apps/tenant_provisioner.py`:
```python
def create_tenant_admin_user(site_name, email, password):
    # After creating user
    user = frappe.get_doc("User", email)
    
    default_roles = [
        "System Manager",
        "Sales Manager", 
        "Sales User",
        "CRM Manager",
        "Accounts Manager"
    ]
    
    for role in default_roles:
        user.append("roles", {"role": role})
    
    user.save(ignore_permissions=True)
    frappe.db.commit()
```

---

## Related Documentation
- [scripts/fix-user-roles-vfixit.py](../scripts/fix-user-roles-vfixit.py) - Automated role fix script
- [scripts/QUICK_FIX_VFIXIT_PERMISSIONS.md](../scripts/QUICK_FIX_VFIXIT_PERMISSIONS.md) - Quick fix guide

---

**Last Updated:** February 13, 2026  
**Version:** 1.1.0
