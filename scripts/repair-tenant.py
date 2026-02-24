#!/usr/bin/env python3
"""
Repair Existing Tenant Sites
==============================
Run this script for tenant sites that were provisioned before the
provisioning service fix. It will initialize ERPNext defaults,
create the Company, seed CRM data, and set Global Defaults.

Usage:
  python3 repair-tenant.py vfixit.avariq.in "VFixit"
  python3 repair-tenant.py --all   # runs for all known tenants
"""

import sys
import subprocess
import base64

BACKEND_CONTAINER = "frappe_docker-backend-1"
BENCH_PATH = "/home/frappe/frappe-bench"


def docker_exec(args: list, timeout: int = 180):
    cmd = ["docker", "exec", BACKEND_CONTAINER] + args
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    print(f"STDOUT:\n{result.stdout}")
    if result.stderr:
        print(f"STDERR:\n{result.stderr}")
    return result


def run_frappe_code(site_name: str, python_code: str):
    """Execute a Python snippet in the context of a specific Frappe site."""
    full_script = f"""import frappe
frappe.init(site="{site_name}", sites_path="{BENCH_PATH}/sites")
frappe.connect()
try:
{chr(10).join("    " + line for line in python_code.splitlines())}
finally:
    frappe.destroy()
"""
    encoded = base64.b64encode(full_script.encode()).decode()
    tmp_file = f"/tmp/_repair_tenant.py"
    docker_exec(["bash", "-c", f"echo '{encoded}' | base64 -d > {tmp_file}"])
    result = docker_exec(
        ["bash", "-c", f"cd {BENCH_PATH}/sites && {BENCH_PATH}/env/bin/python {tmp_file}"]
    )
    docker_exec(["rm", "-f", tmp_file])
    return result.stdout


def repair_tenant(site_name: str, company_name: str):
    print(f"\n{'='*60}")
    print(f"Repairing: {site_name} with company '{company_name}'")
    print('='*60)

    abbr = ''.join(c for c in company_name if c.isalnum())[:5].upper() or "COMP"

    repair_code = f"""
import json

# 1. Create Default Warehouse Types
warehouse_types = ["Transit", "Store", "WIP", "Finished Goods"]
for wt in warehouse_types:
    if not frappe.db.exists("Warehouse Type", wt):
        frappe.get_doc({{"doctype": "Warehouse Type", "name": wt}}).insert(ignore_permissions=True)
        print(f"Created Warehouse Type: {{wt}}")

# 2. Create Company
company_name = "{company_name}"
abbr = "{abbr}"
if not frappe.db.exists("Company", company_name):
    company = frappe.new_doc("Company")
    company.company_name = company_name
    company.abbr = abbr
    company.default_currency = "INR"
    company.country = "India"
    company.insert(ignore_permissions=True)
    print(f"Created Company: {{company_name}}")

# 3. Set Global Defaults
frappe.db.set_single_value("Global Defaults", "default_company", company_name)
frappe.db.set_single_value("Global Defaults", "default_currency", "INR")
frappe.db.set_single_value("Global Defaults", "country", "India")
print(f"Set Global Defaults: company={{company_name}}")

# 4. Create Active Fiscal Year
from datetime import datetime, date
today = date.today()
# Indian fiscal year: April 1 to March 31
# If today is before April 1, we're still in the previous fiscal year
if today.month < 4:
    fy_start_year = today.year - 1
else:
    fy_start_year = today.year

fy_name = f"{{fy_start_year}}-{{fy_start_year+1}}"
start_date = f"{{fy_start_year}}-04-01"
end_date = f"{{fy_start_year+1}}-03-31"

if not frappe.db.exists("Fiscal Year", fy_name):
    fy = frappe.new_doc("Fiscal Year")
    fy.year = fy_name
    fy.year_start_date = start_date
    fy.year_end_date = end_date
    fy.insert(ignore_permissions=True)
    print(f"Created Fiscal Year {{fy_name}}")
    
    # Assign current fiscal year globally
    frappe.db.set_single_value("Global Defaults", "current_fiscal_year", fy_name)

# 4. Seed Salutations
for s in ["Mr", "Ms", "Mrs", "Dr", "Prof"]:
    if not frappe.db.exists("Salutation", s):
        frappe.get_doc({{"doctype": "Salutation", "salutation": s}}).insert(ignore_permissions=True)

# 5. Seed Lead Sources
for src in ["Cold Calling", "Advertisement", "Reference", "Walk In", "Website", "Campaign", "Existing Customer"]:
    if not frappe.db.exists("Lead Source", src):
        frappe.get_doc({{"doctype": "Lead Source", "source_name": src}}).insert(ignore_permissions=True)

# 6. Seed Industry Types
for ind in ["Manufacturing", "Service", "Distribution", "Retail", "Technology", "Logistics", "Healthcare", "Insurance"]:
    if not frappe.db.exists("Industry Type", ind):
        frappe.get_doc({{"doctype": "Industry Type", "industry": ind}}).insert(ignore_permissions=True)

# 7. Seed Opportunity Types  
for ot in ["Sales", "Rental", "Maintenance", "Service"]:
    if not frappe.db.exists("Opportunity Type", ot):
        doc = frappe.new_doc("Opportunity Type")
        doc.name = ot
        doc.insert(ignore_permissions=True)

# 8. Seed Sales Stages (use ERPNext exact default names)
for stage in ["Prospecting", "Qualification", "Needs Analysis", "Value Proposition", "Identifying Decision Makers", "Perception Analysis", "Proposal/Price Quote", "Negotiation/Review", "Won", "Lost"]:
    if not frappe.db.exists("Sales Stage", stage):
        doc = frappe.new_doc("Sales Stage")
        doc.stage_name = stage
        doc.insert(ignore_permissions=True)

# 9. Ensure Admin User has Item Manager role
admin_emails = frappe.get_all("User", filters={{"email": ["like", "%%"]}}, pluck="name")
for admin in admin_emails:
    if admin == "Administrator":
        continue
    user = frappe.get_doc("User", admin)
    if "System Manager" in [r.role for r in user.roles]:
        roles_to_add = ["Item Manager", "Purchase Manager", "Stock Manager", "Stock User"]
        changed = False
        current_roles = [r.role for r in user.roles]
        
        for role in roles_to_add:
            if role not in current_roles and frappe.db.exists("Role", role):
                user.append("roles", {{"role": role, "doctype": "Has Role"}})
                changed = True
                print(f"Added {{role}} role to {{admin}}")
        if changed:
            user.save(ignore_permissions=True)
# 10. Seed Item Groups
all_groups = frappe.get_all("Item Group", fields=["name", "parent_item_group"])
root_group = None
for g in all_groups:
    if not g.get("parent_item_group"):
        root_group = g.get("name")
        break

if not root_group:
    root_group = "All Item Groups"
    if not frappe.db.exists("Item Group", root_group):
        frappe.get_doc({{
            "doctype": "Item Group", 
            "item_group_name": root_group, 
            "is_group": 1
        }}).insert(ignore_permissions=True)
        print(f"Created Root Item Group: {{root_group}}")

for ig in ["Heavy Equipment Rental", "Construction Services", "Consulting"]:
    if not frappe.db.exists("Item Group", ig):
        frappe.get_doc({{"doctype": "Item Group", "item_group_name": ig, "parent_item_group": root_group, "is_group": 0}}).insert(ignore_permissions=True)
        print(f"Created Item Group: {{ig}} (parent: {{root_group}})")

# 11. Seed UOMs
for u in ["Unit", "Nos", "Hr", "Day", "Month", "Year"]:
    if not frappe.db.exists("UOM", u):
        frappe.get_doc({{"doctype": "UOM", "uom_name": u}}).insert(ignore_permissions=True)
        print(f"Created UOM: {{u}}")

# 12. Seed Stock Entry Types
stock_entry_types = [
    {{"name": "Material Receipt", "purpose": "Material Receipt"}},
    {{"name": "Material Issue", "purpose": "Material Issue"}},
    {{"name": "Material Transfer", "purpose": "Material Transfer"}},
]
for setype in stock_entry_types:
    if not frappe.db.exists("Stock Entry Type", setype["name"]):
        frappe.get_doc({{
            "doctype": "Stock Entry Type",
            "name": setype["name"],
            "purpose": setype["purpose"]
        }}).insert(ignore_permissions=True)
        print(f"Created Stock Entry Type: {{setype['name']}}")

frappe.db.commit()
print("REPAIR COMPLETE!")
"""

    result = run_frappe_code(site_name, repair_code)
    print(result)
    print(f"\n✅ Done repairing: {site_name}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 repair-tenant.py <site_name> [<company_name>]")
        print("Example: python3 repair-tenant.py vfixit.avariq.in VFixit")
        sys.exit(1)

    site = sys.argv[1]
    org = sys.argv[2] if len(sys.argv) > 2 else site.split(".")[0].title()
    repair_tenant(site, org)
