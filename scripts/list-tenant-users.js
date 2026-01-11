#!/usr/bin/env node

/**
 * List Users on Tenant Site
 * Shows all users on a specific tenant site with their details
 */

const { execSync } = require('child_process');

// Configuration
const DOCKER_SERVICE = process.env.DOCKER_SERVICE || 'backend';
const DOCKER_COMPOSE_DIR = process.env.DOCKER_COMPOSE_DIR || '/home/ubuntu/frappe_docker';

// Get site name from command line
const siteName = process.argv[2];

if (!siteName) {
  console.error('Usage: node list-tenant-users.js <siteName>');
  console.error('Example: node list-tenant-users.js vfixit.localhost');
  process.exit(1);
}

console.log(`\n👥 Listing users on tenant site: ${siteName}\n`);

const listScript = `
import frappe

frappe.init(site='${siteName}')
frappe.connect()

users = frappe.get_all('User', 
    filters={'user_type': 'System User'},
    fields=['name', 'email', 'full_name', 'enabled'],
    limit=20
)

print("=" * 80)
print(f"Found {len(users)} system users:")
print("=" * 80)

for user in users:
    print(f"Name: {user.name}")
    print(f"Email: {user.email}")
    print(f"Full Name: {user.full_name}")
    print(f"Enabled: {user.enabled}")
    print("-" * 80)
`;

try {
  const base64Script = Buffer.from(listScript).toString('base64');
  
  const tempFile = `/tmp/list_users_${Date.now()}.py`;
  const command = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} bash -c "echo '${base64Script}' | base64 -d > ${tempFile} && cat ${tempFile} | bench --site ${siteName} console; EXIT_CODE=\\$?; rm -f ${tempFile}; exit \\$EXIT_CODE"`;
  
  const output = execSync(command, { encoding: 'utf8' });
  console.log(output);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
