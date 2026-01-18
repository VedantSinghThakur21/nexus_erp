#!/bin/bash
# Fix Frappe multi-tenant routing to respect X-Frappe-Site-Name header

echo "=== Fixing Frappe Multi-Tenant Routing ==="

# 1. Update common_site_config.json to enable header-based routing
echo "Updating common_site_config.json..."
docker exec -it frappe_docker-backend-1 bash -c "cd /home/frappe/frappe-bench/sites && cat > common_site_config.json << 'EOF'
{
  \"db_host\": \"db\",
  \"redis_cache\": \"redis://redis-cache:6379\",
  \"redis_queue\": \"redis://redis-queue:6379\",
  \"redis_socketio\": \"redis://redis-queue:6379\",
  \"socketio_port\": 9000,
  \"webserver_port\": 8000,
  \"allow_tests\": true,
  \"serve_default_site\": false,
  \"allow_cors\": \"*\",
  \"http_timeout\": 120,
  \"gunicorn_workers\": 4
}
EOF
"

# 2. Restart Frappe backend to apply changes
echo "Restarting Frappe backend..."
docker restart frappe_docker-backend-1

echo "=== Configuration Updated ==="
echo "Key changes:"
echo "  - serve_default_site: false (forces site selection via header)"
echo "  - allow_cors: * (allows API access from subdomains)"
echo ""
echo "Please wait 30 seconds for Frappe to restart, then test again."
