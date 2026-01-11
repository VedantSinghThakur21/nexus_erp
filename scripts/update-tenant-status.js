#!/usr/bin/env node

/**
 * Update Tenant Status to Active
 * Updates a specific tenant's status to 'active' on the master site
 */

const { execSync } = require('child_process');

// Configuration
const DOCKER_SERVICE = process.env.DOCKER_SERVICE || 'backend';
const DOCKER_COMPOSE_DIR = process.env.DOCKER_COMPOSE_DIR || '/home/ubuntu/frappe_docker';
const MASTER_SITE = process.env.FRAPPE_SITE_NAME || 'erp.localhost';

// Get subdomain from command line
const subdomain = process.argv[2];

if (!subdomain) {
  console.error('Usage: node update-tenant-status.js <subdomain>');
  console.error('Example: node update-tenant-status.js sushmaorganisation');
  process.exit(1);
}

console.log(`\n🔄 Updating tenant status for: ${subdomain}\n`);

const updateScript = `
import frappe

frappe.init(site='${MASTER_SITE}')
frappe.connect()

if frappe.db.exists('DocType', 'Tenant'):
    if frappe.db.exists('Tenant', {'subdomain': '${subdomain}'}):
        tenant = frappe.get_doc('Tenant', {'subdomain': '${subdomain}'})
        print(f"Current status: {tenant.status}")
        tenant.status = 'active'
        tenant.save(ignore_permissions=True)
        frappe.db.commit()
        print("✅ Status updated to: active")
    else:
        print("❌ Tenant not found with subdomain: ${subdomain}")
else:
    print("❌ Tenant DocType not found")
`;

try {
  const tempFile = `/tmp/update_tenant_${Date.now()}.py`;
  
  // First, create the Python file
  const createFileCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} bash -c "cat > ${tempFile} << 'EOFPYTHON'
import frappe

frappe.init(site='${MASTER_SITE}')
frappe.connect()

if frappe.db.exists('DocType', 'Tenant'):
    if frappe.db.exists('Tenant', {'subdomain': '${subdomain}'}):
        tenant = frappe.get_doc('Tenant', {'subdomain': '${subdomain}'})
        print(f\\\"Current status: {tenant.status}\\\")
        tenant.status = 'active'
        tenant.save(ignore_permissions=True)
        frappe.db.commit()
        print(\\\"✅ Status updated to: active\\\")
    else:
        print(\\\"❌ Tenant not found with subdomain: ${subdomain}\\\")
else:
    print(\\\"❌ Tenant DocType not found\\\")
EOFPYTHON
"`;

  execSync(createFileCmd, { encoding: 'utf8' });
  
  // Now run it through bench console
  const runCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} bash -c "cat ${tempFile} | bench --site ${MASTER_SITE} console && rm ${tempFile}"`;
  
  const output = execSync(runCmd, { encoding: 'utf8' });
  console.log(output);
  console.log('\n✨ Done!');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
