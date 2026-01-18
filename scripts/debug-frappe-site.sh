#!/bin/bash
# Debug script to check Frappe site status and configuration

SITE_NAME="vfixit.avariq.in"
FRAPPE_BENCH="/home/frappe/frappe-bench"

echo "=== Checking Frappe Site Configuration ==="
echo ""

# 1. Check if site folder exists
echo "1. Checking if site folder exists..."
docker exec frappe_docker-backend-1 ls -la "$FRAPPE_BENCH/sites/$SITE_NAME/"

echo ""
echo "2. Checking if site-config.json exists..."
docker exec frappe_docker-backend-1 cat "$FRAPPE_BENCH/sites/$SITE_NAME/site_config.json"

echo ""
echo "3. Checking databases..."
docker exec frappe_docker-backend-1 mysql -u frappe -h db -e "SHOW DATABASES LIKE '%vfixit%';"

echo ""
echo "4. Checking if user exists on tenant site..."
docker exec frappe_docker-backend-1 bench --site "$SITE_NAME" console <<'PYTHON'
import frappe
frappe.connect()

# Check if user exists
user_name = 'thakurvedant21@gmail.com'
user_exists = frappe.db.exists('User', user_name)
print(f"User '{user_name}' exists on {frappe.local.site}: {user_exists}")

if user_exists:
    user = frappe.get_doc('User', user_name)
    print(f"  Full Name: {user.full_name}")
    print(f"  Enabled: {user.enabled}")
    print(f"  New password: {user.new_password if hasattr(user, 'new_password') else 'N/A'}")
PYTHON

echo ""
echo "=== Configuration Check Complete ==="
