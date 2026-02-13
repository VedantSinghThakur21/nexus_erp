#!/usr/bin/env python3
"""
One-command fix for user role permissions on vfixit.avariq.in

Run from frappe-bench directory:
    bench --site vfixit.avariq.in execute nexus_erp.scripts.fix_vfixit_user_roles
"""

import frappe

def execute():
    """Add required roles to vedantthakur2108@gmail.com on vfixit site"""
    
    user_email = "vedantthakur2108@gmail.com"
    
    print(f"\n🔧 Fixing roles for {user_email} on {frappe.local.site}\n")
    
    try:
        # Get user
        if not frappe.db.exists("User", user_email):
            print(f"❌ User {user_email} not found!")
            return {"success": False, "error": "User not found"}
        
        user = frappe.get_doc("User", user_email)
        current_roles = [r.role for r in user.roles]
        
        print("📋 Current roles:")
        for role in current_roles:
            print(f"   - {role}")
        
        # Required roles for full ERP access
        required_roles = [
            "System Manager",
            "Sales Manager",
            "Sales User", 
            "CRM Manager",
            "Accounts Manager",
            "Stock Manager",
            "Projects Manager"
        ]
        
        added_roles = []
        for role in required_roles:
            if role not in current_roles:
                user.append("roles", {"role": role})
                added_roles.append(role)
        
        if added_roles:
            print(f"\n➕ Adding roles:")
            for role in added_roles:
                print(f"   - {role}")
            
            user.save(ignore_permissions=True)
            frappe.db.commit()
            
            print(f"\n✅ Successfully added {len(added_roles)} roles!")
        else:
            print("\n✅ User already has all required roles!")
        
        # Verify Opportunity access
        if frappe.db.exists("DocType", "Opportunity"):
            has_access = frappe.has_permission("Opportunity", "read", user=user_email)
            if has_access:
                print("\n✅ User can now access Opportunity DocType!")
            else:
                print("\n⚠️  User still cannot access Opportunity - may need additional setup")
        else:
            print("\n⚠️  ERPNext not installed - run: bench --site vfixit.avariq.in install-app erpnext")
        
        print("\n📝 Next steps:")
        print("   1. User should logout: https://vfixit.avariq.in/tenant/logout")
        print("   2. Login again: https://vfixit.avariq.in/tenant/login")
        print("   3. Test CRM access: https://vfixit.avariq.in/crm")
        
        return {
            "success": True, 
            "added_roles": added_roles,
            "current_roles": [r.role for r in user.roles]
        }
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        frappe.db.rollback()
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    execute()
