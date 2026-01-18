#!/usr/bin/env python3
"""
Test script to check if tenant database has data vs master database
Run this in the Frappe console:
docker exec -it frappe_docker-backend-1 bench --site vfixit.avariq.in console < test-tenant-db.py
"""

import frappe

# Check current site
print(f"Current site: {frappe.local.site}")
print(f"Database name: {frappe.conf.db_name}")

# Count leads in current database
lead_count = frappe.db.count('Lead')
print(f"Leads in {frappe.local.site}: {lead_count}")

# Count opportunities
opp_count = frappe.db.count('Opportunity')
print(f"Opportunities in {frappe.local.site}: {opp_count}")

# Count users
user_count = frappe.db.count('User')
print(f"Users in {frappe.local.site}: {user_count}")

# List some users
users = frappe.get_all('User', fields=['name', 'email', 'full_name'], limit=5)
print(f"\nSample users:")
for user in users:
    print(f"  - {user.full_name} ({user.email})")
