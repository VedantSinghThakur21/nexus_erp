#!/bin/bash

# Fix Master Site API Keys
# Run this script on your server where Frappe/ERPNext is installed

DOCKER_PATH="/home/ubuntu/frappe_docker"

echo "============================================================"
echo "🔧 Generating API Keys for Master Site"
echo "============================================================"

cd $DOCKER_PATH

# Get the master site name
MASTER_SITE=$(docker compose exec -T backend bench --site current-site 2>/dev/null | tr -d '\r\n')

if [ -z "$MASTER_SITE" ]; then
    echo "Error: Could not determine master site"
    exit 1
fi

echo "Master Site: $MASTER_SITE"
echo ""
echo "Generating API keys for Administrator..."

# Generate new API keys
API_KEYS=$(docker compose exec -T backend bench --site $MASTER_SITE console <<EOF
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

echo ""
echo "============================================================"
echo "✅ API Keys generated successfully!"
echo "============================================================"
echo ""
echo "Site: $MASTER_SITE"
echo "API Key: $API_KEY"
echo "API Secret: $API_SECRET"
echo ""
echo "⚠️  IMPORTANT: Update your .env file with these values:"
echo ""
echo "ERP_API_KEY=$API_KEY"
echo "ERP_API_SECRET=$API_SECRET"
echo ""
echo "Then restart your Next.js application."
echo ""
