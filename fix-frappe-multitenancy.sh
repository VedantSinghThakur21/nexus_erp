#!/bin/bash
# Enable Frappe multi-tenant (per-Host) routing on frappe_docker.
#
# The Nexus app already sends Host + X-Frappe-Site-Name = <tenant>.avariq.in on
# every server-side ERP call (see lib/frappe-site-headers.ts). For those headers
# to actually select the tenant site, the frappe_docker FRONTEND nginx must
# resolve the upstream site from the request Host ($host) — NOT a pinned value
# such as erp.localhost. A pinned FRAPPE_SITE_NAME_HEADER forces ALL tenants
# onto the master site and produces 403 PermissionErrors + API-key "rotate"
# storms even though each tenant has its own provisioned site.
set -euo pipefail

FRONTEND_CONTAINER="${FRONTEND_CONTAINER:-frappe_docker-frontend-1}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-frappe_docker-backend-1}"

echo "=== Enabling per-Host multi-tenant routing ==="

# 1. Live unblock: rewrite any pinned `proxy_set_header Host ...;` to use $host
#    and reload nginx in-place. This takes effect immediately, without waiting
#    for a container recreate.
echo "Patching frontend nginx to route by request Host ($FRONTEND_CONTAINER)..."
docker exec "$FRONTEND_CONTAINER" sh -c '
  conf=$(grep -rl "proxy_set_header Host" /etc/nginx/conf.d/ 2>/dev/null || true)
  if [ -z "$conf" ]; then
    echo "  WARNING: no proxy_set_header Host directive found under /etc/nginx/conf.d/"
  fi
  for f in $conf; do
    sed -i "s/proxy_set_header Host [^;]*;/proxy_set_header Host \$host;/g" "$f"
    echo "  patched: $f"
  done
  nginx -t && nginx -s reload
'

# 2. dns_multitenant must be enabled so Frappe maps the incoming Host to the
#    correct site DB (idempotent safety check).
echo "Ensuring dns_multitenant is enabled ($BACKEND_CONTAINER)..."
docker exec "$BACKEND_CONTAINER" bash -c \
  'cd /home/frappe/frappe-bench && bench set-config -g dns_multitenant true' || \
  echo "  WARNING: could not set dns_multitenant (check backend container name)"

echo ""
echo "=== Live routing patched ==="
echo "Frappe will now resolve the tenant site from the request Host header,"
echo "so <tenant>.avariq.in calls hit the tenant DB (not erp.localhost)."
echo ""
echo "IMPORTANT — make the fix PERMANENT (survives container recreate)."
echo "The frontend container regenerates its nginx config from FRAPPE_SITE_NAME_HEADER"
echo "on every start, so set this in frappe_docker/.env:"
echo ""
echo "    FRAPPE_SITE_NAME_HEADER=\$\$host"
echo ""
echo "then recreate the frontend container:"
echo ""
echo "    docker compose -f frappe_docker/compose.yaml up -d frontend"
echo ""
echo "(The \$\$ is docker-compose escaping so the literal \$host reaches nginx.)"
echo ""
echo "=== Server-side Next.js calls (PM2 / nexus_web) ==="
echo "Node fetch sets Host from the URL hostname — Host header overrides are ignored."
echo "When ERP_NEXT_URL is http://127.0.0.1:8080, the app rewrites requests to"
echo "http://<tenant>.avariq.in:8080 (see lib/frappe-site-headers.ts)."
echo "Add loopback aliases on THIS server (/etc/hosts):"
echo ""
echo "    127.0.0.1 erp.localhost testorg.avariq.in dabed.avariq.in"
echo ""
echo "Add one line per tenant FQDN. Without this, Frappe returns:"
echo '    404 "127.0.0.1 does not exist"'
