#!/bin/bash

# Simple ERPNext Site Provisioning for Docker
# Usage: ./provision-site-simple.sh subdomain admin-email admin-password

set -e

SUBDOMAIN=$1
ADMIN_EMAIL=$2
ADMIN_PASSWORD=$3
DOCKER_PATH="/home/ubuntu/frappe_docker"
DOMAIN="localhost"
SITE_NAME="${SUBDOMAIN}.${DOMAIN}"
DB_NAME=$(echo $SUBDOMAIN | tr '-' '_')

if [ -z "$SUBDOMAIN" ] || [ -z "$ADMIN_EMAIL" ] || [ -z "$ADMIN_PASSWORD" ]; then
    echo "Usage: $0 <subdomain> <admin-email> <admin-password>"
    echo "Example: $0 demo789 admin@demo.com Demo@123456"
    exit 1
fi

echo "============================================================"
echo "🚀 Provisioning ERPNext Site: $SITE_NAME"
echo "============================================================"

cd $DOCKER_PATH

# Create new site
echo ""
echo "🔧 Creating new site..."
docker compose exec -T backend bench new-site $SITE_NAME \
    --admin-password "$ADMIN_PASSWORD" \
    --db-name $DB_NAME \
    --mariadb-root-password "vedant@21" \
    --install-app erpnext \
    --set-default

if [ $? -ne 0 ]; then
    echo "❌ Failed to create site"
    exit 1
fi

echo "✅ Site created successfully"

# Enable scheduler
echo ""
echo "🔧 Enabling scheduler..."
docker compose exec -T backend bench --site $SITE_NAME scheduler enable

# Set config
echo ""
echo "🔧 Configuring site..."
docker compose exec -T backend bench --site $SITE_NAME set-config maintenance_mode 0
docker compose exec -T backend bench --site $SITE_NAME set-config developer_mode 0

# Generate API keys for Administrator
echo ""
echo "🔧 Generating API keys..."
docker compose exec -T backend bench --site $SITE_NAME execute "
import frappe
import json

frappe.connect()
user = frappe.get_doc('User', 'Administrator')

# Generate new keys
api_key = frappe.generate_hash(length=15)
api_secret = frappe.generate_hash(length=15)

user.api_key = api_key
user.api_secret = api_secret
user.save(ignore_permissions=True)
frappe.db.commit()

print(json.dumps({'api_key': api_key, 'api_secret': api_secret}))
" > /tmp/api_keys_$SUBDOMAIN.json 2>&1

# Extract API keys from output
API_KEY=$(cat /tmp/api_keys_$SUBDOMAIN.json | grep -o '"api_key": "[^"]*"' | cut -d'"' -f4)
API_SECRET=$(cat /tmp/api_keys_$SUBDOMAIN.json | grep -o '"api_secret": "[^"]*"' | cut -d'"' -f4)
rm -f /tmp/api_keys_$SUBDOMAIN.json

# Output results
echo ""
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

# Output JSON for programmatic use
cat << EOF
{
  "success": true,
  "site_name": "$SITE_NAME",
  "site_url": "http://localhost:8080",
  "admin_url": "http://localhost:8080/app",
  "db_name": "$DB_NAME",
  "admin_email": "$ADMIN_EMAIL",
  "api_key": "$API_KEY",
  "api_secret": "$API_SECRET",
  "provisioned_at": "$(date -Iseconds)"
}
EOF
