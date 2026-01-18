#!/bin/bash
# Add the tenant domain to Frappe's site configuration

echo "=== Configuring Frappe Site Domain Routing ==="

# For each tenant site, we need to tell Frappe which domains map to it
SITE_NAME="vfixit.avariq.in"

echo "Checking if site exists..."
docker exec frappe_docker-backend-1 bench --site "$SITE_NAME" list-apps

echo ""
echo "Adding site domain to Frappe configuration..."
docker exec frappe_docker-backend-1 bench --site "$SITE_NAME" console <<'EOF'
import frappe
frappe.connect()

# Get or create Site Domain record
if not frappe.db.exists('Site Domain', {'domain': 'vfixit.avariq.in'}):
    doc = frappe.get_doc({
        'doctype': 'Site Domain',
        'domain': 'vfixit.avariq.in',
        'site': frappe.local.site
    })
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    print(f"✓ Added domain: vfixit.avariq.in -> {frappe.local.site}")
else:
    print(f"✓ Domain already configured: vfixit.avariq.in")

# List all configured domains
domains = frappe.get_all('Site Domain', fields=['domain', 'site'])
print("\nConfigured domains:")
for d in domains:
    print(f"  {d.domain} -> {d.site}")
EOF

echo ""
echo "=== Configuration Complete ==="
echo "The tenant site should now respond to requests with Host: vfixit.avariq.in"
