#!/usr/bin/env python3
"""
Script to check and fix user roles for accessing Opportunity DocType on vfixit tenant.
Run this script on the Frappe backend (bench console or as a custom command).

Usage (from frappe-bench directory):
    bench --site vfixit.avariq.in console < /path/to/fix-user-roles-vfixit.py

Or copy-paste the content into:
    bench --site vfixit.avariq.in console
"""

import frappe

def check_and_fix_user_roles():
    """Check current roles and add necessary CRM roles for the user."""
    
    user_email = "vedantthakur2108@gmail.com"
    
    print(f"\n{'='*60}")
    print(f"Checking roles for user: {user_email}")
    print(f"Site: {frappe.local.site}")
    print(f"{'='*60}\n")
    
    # Check if user exists
    if not frappe.db.exists("User", user_email):
        print(f"❌ Error: User {user_email} does not exist on this site!")
        return
    
    # Get user document
    user = frappe.get_doc("User", user_email)
    
    # Get current roles
    current_roles = [role.role for role in user.roles]
    
    print("📋 Current roles:")
    for role in current_roles:
        print(f"   - {role}")
    
    # Required roles for Opportunity access
    required_roles = [
        "System Manager",  # Full access
        "Sales Manager",   # Full sales access
        "Sales User",      # Basic sales access
        "CRM Manager",     # Full CRM access
    ]
    
    # Check which roles are missing
    missing_roles = [role for role in required_roles if role not in current_roles]
    
    if not missing_roles:
        print("\n✅ User already has all required roles!")
    else:
        print(f"\n⚠️  Missing roles:")
        for role in missing_roles:
            print(f"   - {role}")
        
        print(f"\n🔧 Adding missing roles...")
        for role in missing_roles:
            try:
                user.append("roles", {"role": role})
                print(f"   ✅ Added: {role}")
            except Exception as e:
                print(f"   ❌ Failed to add {role}: {str(e)}")
        
        # Save the user document
        try:
            user.save(ignore_permissions=True)
            frappe.db.commit()
            print("\n✅ User roles updated successfully!")
        except Exception as e:
            print(f"\n❌ Error saving user: {str(e)}")
            frappe.db.rollback()
            return
    
    # Verify Opportunity access
    print(f"\n{'='*60}")
    print("🔍 Verifying Opportunity DocType access...")
    print(f"{'='*60}\n")
    
    try:
        # Check if Opportunity DocType exists
        if not frappe.db.exists("DocType", "Opportunity"):
            print("❌ Opportunity DocType does not exist!")
            print("   This means ERPNext is not installed on this site.")
            print("\n💡 Solution: Run the ERPNext installation script:")
            print("   bench --site vfixit.avariq.in install-app erpnext")
            return
        
        # Test read permission
        has_permission = frappe.has_permission("Opportunity", "read", user=user_email)
        
        if has_permission:
            print("✅ User can now access Opportunity DocType!")
            
            # Try to get list of opportunities
            opportunities = frappe.get_list("Opportunity", limit=5)
            print(f"\n📊 Found {len(opportunities)} opportunities")
            
        else:
            print("❌ User still cannot access Opportunity DocType!")
            print("\n🔍 Checking Role Permissions for Opportunity...")
            
            # Get role permissions for Opportunity
            role_perms = frappe.get_all(
                "Custom DocPerm",
                filters={"parent": "Opportunity"},
                fields=["role", "read", "write", "create", "delete"]
            )
            
            if not role_perms:
                role_perms = frappe.get_all(
                    "DocPerm",
                    filters={"parent": "Opportunity"},
                    fields=["role", "read", "write", "create", "delete"]
                )
            
            print("\n📋 Roles with Opportunity permissions:")
            for perm in role_perms:
                if perm.get("read"):
                    print(f"   - {perm.role}")
            
            print("\n💡 The user's current roles don't have access.")
            print("   Additional roles with Opportunity access:")
            allowed_roles = [p.role for p in role_perms if p.get("read")]
            user_missing = [r for r in allowed_roles if r not in current_roles]
            for role in user_missing[:3]:  # Show top 3
                print(f"   - {role}")
                
    except Exception as e:
        print(f"❌ Error checking permissions: {str(e)}")
    
    print(f"\n{'='*60}")
    print("✅ Script completed!")
    print(f"{'='*60}\n")

# Run the function
if __name__ == "__main__":
    check_and_fix_user_roles()
