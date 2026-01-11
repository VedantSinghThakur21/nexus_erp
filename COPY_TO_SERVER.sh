#!/bin/bash
# Quick deployment script - Run this on your server (ubuntu@erpdemo1)

echo "🔧 Setting up provisioning scripts..."

# Create the main provisioning script
cat > ~/provision-site-production.sh << 'SCRIPT_END'
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

# Important: Generate API keys for Administrator user using console
echo "🔑 Generating API keys for Administrator..."
bench --site "$SITE_NAME" console <<PYTHON_EOF
from frappe.core.doctype.user.user import generate_keys
from frappe.auth import LoginManager
import frappe

# Generate API keys
generate_keys('Administrator')
frappe.db.commit()

# Initialize Administrator session to activate API keys
frappe.set_user('Administrator')
frappe.local.login_manager = LoginManager()
frappe.db.commit()

print('✅ API keys generated and session initialized')
exit()
PYTHON_EOF

echo "✅ Session warmup completed"

# Extract API credentials using console
API_KEY=$(bench --site "$SITE_NAME" console <<PYTHON_EOF
import frappe
user = frappe.get_doc('User', 'Administrator')
print(user.api_key)
exit()
PYTHON_EOF
)

API_SECRET=$(bench --site "$SITE_NAME" console <<PYTHON_EOF
import frappe
user = frappe.get_doc('User', 'Administrator')
print(frappe.utils.password.get_decrypted_password('User', 'Administrator', fieldname='api_secret'))
exit()
PYTHON_EOF
)

# Clean up output (remove extra lines)
API_KEY=$(echo "$API_KEY" | grep -v "^In" | grep -v "^>>>" | grep -v "^IPython" | tail -1 | tr -d '\r\n')
API_SECRET=$(echo "$API_SECRET" | grep -v "^In" | grep -v "^>>>" | grep -v "^IPython" | tail -1 | tr -d '\r\n')

echo "✅ API credentials extracted"

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
SCRIPT_END

# Make it executable
chmod +x ~/provision-site-production.sh

echo "✅ Main script created: ~/provision-site-production.sh"

# Create the Docker wrapper script
cat > ~/provision-tenant-docker.sh << 'WRAPPER_END'
#!/bin/bash
SUBDOMAIN=$1
ADMIN_EMAIL=$2
TEMP_PASSWORD=$3

if [ -z "$SUBDOMAIN" ] || [ -z "$ADMIN_EMAIL" ] || [ -z "$TEMP_PASSWORD" ]; then
    echo "Usage: $0 <subdomain> <admin-email> <password>"
    exit 1
fi

echo "🚀 Starting Docker provisioning for: $SUBDOMAIN"

# Copy provisioning script into container
docker cp ~/provision-site-production.sh frappe_docker-backend-1:/home/frappe/provision-tenant.sh

# Execute provisioning inside backend container
docker exec -i frappe_docker-backend-1 bash -c "
    cd /home/frappe/frappe-bench
    chmod +x /home/frappe/provision-tenant.sh
    /home/frappe/provision-tenant.sh '$SUBDOMAIN' '$ADMIN_EMAIL' '$TEMP_PASSWORD'
"

exit $?
WRAPPER_END

# Make it executable
chmod +x ~/provision-tenant-docker.sh

echo "✅ Docker wrapper created: ~/provision-tenant-docker.sh"
echo ""
echo "🎉 Setup complete! Test with:"
echo "   ~/provision-tenant-docker.sh test888 admin@test.com Pass@123"
