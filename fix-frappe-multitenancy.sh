#!/bin/bash
# Fix Frappe multi-tenant configuration

echo "=== Fixing Frappe Multi-Tenant Configuration ==="

# Set the default site to the master site (erp.localhost)
# This allows X-Frappe-Site-Name header to override and route to tenant sites
echo "Setting default_site to master site..."
docker exec frappe_docker-backend-1 bash -c 'cat > /home/frappe/frappe-bench/sites/common_site_config.json << EOF
{
  "db_host": "db",
  "redis_cache": "redis://redis-cache:6379",
  "redis_queue": "redis://redis-queue:6379",
  "redis_socketio": "redis://redis-queue:6379",
  "socketio_port": 9000,
  "webserver_port": 8000,
  "allow_tests": true,
  "default_site": "erp.localhost",
  "allow_cors": "*",
  "http_timeout": 120,
  "gunicorn_workers": 4
}
EOF'

echo "Restarting Frappe backend..."
docker restart frappe_docker-backend-1

echo ""
echo "=== Configuration Complete ==="
echo "Frappe will now:"
echo "  1. Use erp.localhost as the default site"
echo "  2. Route to tenant sites when X-Frappe-Site-Name header is provided"
echo ""
echo "Wait 30 seconds for restart, then test login again"
