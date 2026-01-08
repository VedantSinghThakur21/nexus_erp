#!/bin/bash

# Fix Tenant API Keys Manually
# Run this script on your server where Frappe/ERPNext is installed

SUBDOMAIN="$1"
ADMIN_PASSWORD="$2"
DOCKER_PATH="/home/ubuntu/frappe_docker"

if [ -z "$SUBDOMAIN" ] || [ -z "$ADMIN_PASSWORD" ]; then
    echo "Usage: $0 <subdomain> <admin-password>"
    echo "Example: $0 testorganisation-sau YourAdminPassword123"
    exit 1
fi

SITE_NAME="${SUBDOMAIN}.localhost"

echo "============================================================"
echo "🔧 Fixing API Keys for: $SITE_NAME"
echo "============================================================"

cd $DOCKER_PATH

# Step 1: Generate new API keys for the tenant site
echo ""
echo "Generating API keys for tenant site..."
API_KEYS=$(docker compose exec -T backend bench --site $SITE_NAME console <<EOF
import frappe
import json
user = frappe.get_doc('User', 'Administrator')
api_key = frappe.generate_hash(length=15)
api_secret = frappe.generate_hash(length=15)
user.api_key = api_key
user.api_secret = api_secret
user.save(ignore_permissions=True)
frappe.db.commit()
print(json.dumps({'api_key': api_key, 'api_secret': api_secret}))
EOF
)

API_KEY=$(echo "$API_KEYS" | grep -o '"api_key": *"[^"]*"' | sed 's/"api_key": *"\([^"]*\)"/\1/' | tail -1)
API_SECRET=$(echo "$API_KEYS" | grep -o '"api_secret": *"[^"]*"' | sed 's/"api_secret": *"\([^"]*\)"/\1/' | tail -1)

echo "New API Key: $API_KEY"
echo "New API Secret: $API_SECRET"

# Step 2: Update the Tenant record in master site
echo ""
echo "Updating Tenant record in master site..."

MASTER_SITE=$(docker compose exec -T backend bench --site current-site 2>/dev/null | tr -d '\r\n' || echo "103.224.243.242")

# Get DB name
DB_NAME=$(echo $SUBDOMAIN | tr '-' '_')

# Update site_config in Tenant doctype
SITE_CONFIG="{\"db_name\":\"${DB_NAME}\",\"api_key\":\"${API_KEY}\",\"api_secret\":\"${API_SECRET}\"}"

docker compose exec -T backend bench --site $MASTER_SITE console <<EOF
import frappe
import json
frappe.connect()
tenant = frappe.get_doc('Tenant', {'subdomain': '${SUBDOMAIN}'})
tenant.site_config = '${SITE_CONFIG}'
tenant.save(ignore_permissions=True)
frappe.db.commit()
print('Tenant updated successfully')
EOF

echo ""
echo "============================================================"
echo "✅ API Keys updated successfully!"
echo "============================================================"
echo ""
echo "Tenant: $SUBDOMAIN"
echo "API Key: $API_KEY"
echo "API Secret: $API_SECRET"
echo ""
echo "You can now create users in the tenant site."
echo ""
