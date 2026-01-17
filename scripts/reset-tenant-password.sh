#!/bin/bash
# Reset password for existing tenant user
# Usage: ./reset-tenant-password.sh <site-name> <email> <new-password>

SITE_NAME=$1
EMAIL=$2
PASSWORD=$3

if [ -z "$SITE_NAME" ] || [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
    echo "Usage: ./reset-tenant-password.sh <site-name> <email> <new-password>"
    echo "Example: ./reset-tenant-password.sh vfixit.avariq.in thakurvedant21@gmail.com Vedant@21"
    exit 1
fi

echo "Resetting password for $EMAIL on site $SITE_NAME..."

# Run inside docker container
docker compose exec -T backend bash -c "cd /home/frappe/frappe-bench && bench --site $SITE_NAME set-password $EMAIL '$PASSWORD'"

if [ $? -eq 0 ]; then
    echo "✅ Password reset successfully!"
    echo "You can now login with: $EMAIL / $PASSWORD"
else
    echo "❌ Password reset failed!"
    exit 1
fi
