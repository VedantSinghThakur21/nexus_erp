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

# Generate API keys and warm up session using Python script
echo "🔑 Generating API keys and warming up session..."
cat > /tmp/generate_keys_${SUBDOMAIN}.py <<'PYSCRIPT'
import frappe
from frappe.core.doctype.user.user import generate_keys

frappe.init(site='SITE_NAME_PLACEHOLDER')
frappe.connect()

# Generate API keys
generate_keys('Administrator')
frappe.db.commit()

# Get credentials
user = frappe.get_doc('User', 'Administrator')
api_key = user.api_key
api_secret = frappe.utils.password.get_decrypted_password('User', 'Administrator', fieldname='api_secret')

print(f'API_KEY={api_key}')
print(f'API_SECRET={api_secret}')

frappe.destroy()
PYSCRIPT

# Replace placeholder with actual site name
sed -i "s/SITE_NAME_PLACEHOLDER/$SITE_NAME/g" /tmp/generate_keys_${SUBDOMAIN}.py

# Execute the Python script
CREDS=$(cd "$BENCH_PATH" && python3 /tmp/generate_keys_${SUBDOMAIN}.py 2>/dev/null | grep "^API_")

# Extract credentials
API_KEY=$(echo "$CREDS" | grep "^API_KEY=" | cut -d'=' -f2)
API_SECRET=$(echo "$CREDS" | grep "^API_SECRET=" | cut -d'=' -f2)

# Clean up temp file
rm -f /tmp/generate_keys_${SUBDOMAIN}.py

echo "✅ API credentials extracted successfully"

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
