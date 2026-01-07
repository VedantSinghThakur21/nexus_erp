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
API_OUTPUT=$(docker compose exec -T backend bench --site $SITE_NAME execute "frappe.core.doctype.user.user.generate_keys" --args "['Administrator']" 2>&1)

API_KEY=$(echo "$API_OUTPUT" | grep -oP 'API Key: \K[^\s]+' || echo "")
API_SECRET=$(echo "$API_OUTPUT" | grep -oP 'API Secret: \K[^\s]+' || echo "")

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
