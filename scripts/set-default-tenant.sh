#!/bin/bash
# Fix Frappe multi-tenant routing by setting up currentsite.txt properly

echo "=== Fixing Frappe Site Routing ==="

SITE_NAME="vfixit.avariq.in"

# Method 1: Set the site as current site (for single-tenant setups)
echo "Setting currentsite.txt..."
docker exec frappe_docker-backend-1 bash -c "echo '$SITE_NAME' > /home/frappe/frappe-bench/sites/currentsite.txt"

# Method 2: Update common_site_config to use the default site
echo "Updating common_site_config.json..."
docker exec frappe_docker-backend-1 bash -c 'cat > /home/frappe/frappe-bench/sites/common_site_config.json << EOF
{
  "db_host": "db",
  "redis_cache": "redis://redis-cache:6379",
  "redis_queue": "redis://redis-queue:6379",
  "redis_socketio": "redis://redis-queue:6379",
  "socketio_port": 9000,
  "webserver_port": 8000,
  "allow_tests": true,
  "default_site": "'"$SITE_NAME"'",
  "allow_cors": "*",
  "http_timeout": 120,
  "gunicorn_workers": 4
}
EOF'

echo "Restarting Frappe..."
docker restart frappe_docker-backend-1

echo ""
echo "=== Configuration Updated ==="
echo "Set default_site to: $SITE_NAME"
echo "Wait 30 seconds for restart, then test again"
