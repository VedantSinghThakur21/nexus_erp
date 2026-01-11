#!/bin/bash

# Production-grade tenant provisioning script for Frappe/ERPNext
# This script is called by the Next.js backend after tenant signup

set -e  # Exit on error

SUBDOMAIN=$1
ADMIN_EMAIL=$2
TEMP_ADMIN_PASSWORD=$3

if [ -z "$SUBDOMAIN" ] || [ -z "$ADMIN_EMAIL" ] || [ -z "$TEMP_ADMIN_PASSWORD" ]; then
    echo "Usage: $0 <subdomain> <admin-email> <admin-password>"
    echo "Example: $0 demo789 admin@demo.com Demo@123456"
    exit 1
fi

SITE_NAME="${SUBDOMAIN}.localhost"
BENCH_PATH="/home/frappe/frappe-bench"

cd "$BENCH_PATH"

echo "============================================================"
echo "🚀 Starting provisioning for: $SITE_NAME"
echo "============================================================"

# Create new site with ERPNext
echo "📦 Creating new site..."
bench new-site "$SITE_NAME" \
    --admin-password "$TEMP_ADMIN_PASSWORD" \
    --install-app erpnext \
    --no-mariadb-socket

echo "✅ Site created successfully"

# Important: Generate API keys for Administrator user
echo "🔑 Generating API keys for Administrator..."
bench --site "$SITE_NAME" execute frappe.core.doctype.user.user.generate_keys \
    --args '["Administrator"]'

# CRITICAL: Initialize Administrator session to activate API keys
echo "🔥 Warming up Administrator session to activate API keys..."
bench --site "$SITE_NAME" execute "
import frappe
from frappe.auth import LoginManager

# Initialize session for Administrator
frappe.set_user('Administrator')
frappe.local.login_manager = LoginManager()

# Commit to ensure session is persisted
frappe.db.commit()

print('Session initialized successfully')
"

# Extract API credentials
API_KEY=$(bench --site "$SITE_NAME" execute "
import frappe
user = frappe.get_doc('User', 'Administrator')
if not user.api_key:
    from frappe.core.doctype.user.user import generate_keys
    generate_keys('Administrator')
    frappe.db.commit()
    user.reload()
print(user.api_key)
" 2>/dev/null | tail -1)

API_SECRET=$(bench --site "$SITE_NAME" execute "
import frappe
user = frappe.get_doc('User', 'Administrator')
if user.api_key:
    print(frappe.utils.password.get_decrypted_password('User', 'Administrator', fieldname='api_secret'))
" 2>/dev/null | tail -1)

# Verify API keys are working immediately
echo "✅ Verifying API keys are active..."
bench --site "$SITE_NAME" execute "
import frappe
import requests

api_key = frappe.get_value('User', 'Administrator', 'api_key')
api_secret = frappe.utils.password.get_decrypted_password('User', 'Administrator', fieldname='api_secret')

# Test API key authentication
response = requests.get(
    'http://localhost:8080/api/method/frappe.auth.get_logged_user',
    headers={
        'Authorization': f'token {api_key}:{api_secret}',
        'X-Frappe-Site-Name': '$SITE_NAME'
    }
)

if response.status_code == 200:
    print('✅ API keys verified and active')
else:
    print(f'⚠️ API verification returned status {response.status_code}')
"

# Get database name
DB_NAME=$(echo "$SITE_NAME" | sed 's/\./_/g' | sed 's/-/_/g')

echo "============================================================"
echo "✅ Site provisioning completed successfully!"
echo "============================================================"
echo ""
echo "📋 Site Details:"
echo "  Site Name: $SITE_NAME"
echo "  Site URL: http://localhost:8080"
echo "  Admin URL: http://localhost:8080/app"
echo "  DB Name: $DB_NAME"
echo "  Admin Email: $ADMIN_EMAIL"
echo "  API Key: $API_KEY"
echo "  API Secret: $API_SECRET"
echo ""

# Output JSON for programmatic parsing
cat <<EOF

{
  "success": true,
  "site_name": "$SITE_NAME",
  "site_url": "http://localhost:8080",
  "admin_url": "http://localhost:8080/app",
  "db_name": "$DB_NAME",
  "admin_email": "$ADMIN_EMAIL",
  "api_key": "$API_KEY",
  "api_secret": "$API_SECRET",
  "provisioned_at": "$(date -u +"%Y-%m-%dT%H:%M:%S+00:00")"
}
EOF

echo ""
echo "============================================================"
