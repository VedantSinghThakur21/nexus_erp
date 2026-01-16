#!/bin/bash

# Provision a new Frappe site for a tenant with separate database
# Usage: ./provision-tenant-site.sh <site_name> <admin_password> <admin_email>

set -e

SITE_NAME=$1
ADMIN_PASSWORD=$2
ADMIN_EMAIL=$3

if [ -z "$SITE_NAME" ] || [ -z "$ADMIN_PASSWORD" ] || [ -z "$ADMIN_EMAIL" ]; then
    echo "Usage: $0 <site_name> <admin_password> <admin_email>"
    exit 1
fi

# Sanitize site name for database (replace dots/hyphens with underscores)
DB_NAME=$(echo "$SITE_NAME" | sed 's/[.-]/_/g')

echo "🚀 Provisioning new tenant site: $SITE_NAME"
echo "📦 Database: ${DB_NAME}"

# Check if site already exists
if [ -d "/home/frappe/frappe-bench/sites/$SITE_NAME" ]; then
    echo "✅ Site already exists: $SITE_NAME"
    exit 0
fi

# Create new site with separate database
cd /home/frappe/frappe-bench

echo "📝 Creating new site..."
bench new-site "$SITE_NAME" \
    --admin-password "$ADMIN_PASSWORD" \
    --db-name "$DB_NAME" \
    --mariadb-root-password "${DB_ROOT_PASSWORD:-admin}" \
    --no-mariadb-socket

echo "🔧 Installing ERPNext app..."
bench --site "$SITE_NAME" install-app erpnext

echo "👤 Setting administrator email..."
bench --site "$SITE_NAME" set-admin-password "$ADMIN_PASSWORD"

# Create System Manager user for tenant admin
echo "👥 Creating tenant admin user..."
bench --site "$SITE_NAME" add-system-manager "$ADMIN_EMAIL" "$ADMIN_PASSWORD" || true

echo "✅ Site provisioned successfully: $SITE_NAME"
echo "🌐 Access URL: https://$SITE_NAME"
echo "📧 Admin Email: $ADMIN_EMAIL"
echo "🔑 Admin Password: [hidden]"
