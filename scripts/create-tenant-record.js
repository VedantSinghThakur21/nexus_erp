#!/usr/bin/env node

/**
 * Create Tenant Record on Master Site
 * Run this to manually create a tenant record for an existing site
 */

const { execSync } = require('child_process');

// Configuration
const DOCKER_SERVICE = process.env.DOCKER_SERVICE || 'backend';
const DOCKER_COMPOSE_DIR = process.env.DOCKER_COMPOSE_DIR || '/home/ubuntu/frappe_docker';
const MASTER_SITE = process.env.FRAPPE_SITE_NAME || 'erp.localhost';

// Get parameters from command line
const subdomain = process.argv[2];
const email = process.argv[3];
const organizationName = process.argv[4];

if (!subdomain || !email || !organizationName) {
  console.error('Usage: node create-tenant-record.js <subdomain> <email> <organizationName>');
  console.error('Example: node create-tenant-record.js vfixit thakurvedant21@gmail.com "VFixit"');
  process.exit(1);
}

console.log(`\n🔧 Creating tenant record on master site...\n`);
console.log(`Subdomain: ${subdomain}`);
console.log(`Email: ${email}`);
console.log(`Organization: ${organizationName}\n`);

const createScript = `
import frappe
import json

frappe.init(site='${MASTER_SITE}')
frappe.connect()

if frappe.db.exists('DocType', 'Tenant'):
    # Check if tenant already exists
    if frappe.db.exists('Tenant', {'subdomain': '${subdomain}'}):
        print("⚠️  Tenant already exists, updating...")
        tenant = frappe.get_doc('Tenant', {'subdomain': '${subdomain}'})
    else:
        print("✨ Creating new tenant record...")
        tenant = frappe.get_doc({
            'doctype': 'Tenant',
            'subdomain': '${subdomain}',
            'organization_name': '${organizationName}',
            'email': '${email}'
        })
    
    tenant.status = 'active'
    tenant.site_url = 'https://${subdomain}.nexuserp.com'
    tenant.save(ignore_permissions=True)
    frappe.db.commit()
    print("✅ Tenant record created successfully!")
    print(f"   Subdomain: {tenant.subdomain}")
    print(f"   Status: {tenant.status}")
    print(f"   Site URL: {tenant.site_url}")
else:
    print("❌ Tenant DocType not found on master site")
`;

try {
  const tempFile = `/tmp/create_tenant_${Date.now()}.py`;
  
  // Create the file using heredoc
  const createFileCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} bash -c "cat > ${tempFile} << 'EOFPYTHON'
${createScript}
EOFPYTHON
"`;

  execSync(createFileCmd, { encoding: 'utf8', stdio: 'inherit' });
  
  // Run it through bench console
  const runCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} bash -c "cat ${tempFile} | bench --site ${MASTER_SITE} console && rm ${tempFile}"`;
  
  const output = execSync(runCmd, { encoding: 'utf8' });
  console.log(output);
  console.log('\n✨ Done! You can now try logging in.');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
