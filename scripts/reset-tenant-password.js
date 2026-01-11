#!/usr/bin/env node

/**
 * Reset Password for Tenant User
 * Resets the password for a user on a specific tenant site
 */

const { execSync } = require('child_process');

// Configuration
const DOCKER_SERVICE = process.env.DOCKER_SERVICE || 'backend';
const DOCKER_COMPOSE_DIR = process.env.DOCKER_COMPOSE_DIR || '/home/ubuntu/frappe_docker';

// Get parameters from command line
const siteName = process.argv[2];
const email = process.argv[3];
const newPassword = process.argv[4];

if (!siteName || !email || !newPassword) {
  console.error('Usage: node reset-tenant-password.js <siteName> <email> <newPassword>');
  console.error('Example: node reset-tenant-password.js vfixit.localhost thakurvedant21@gmail.com Vedant@21');
  process.exit(1);
}

console.log(`\n🔐 Resetting password for user on tenant site...\n`);
console.log(`Site: ${siteName}`);
console.log(`Email: ${email}\n`);

const resetScript = `
import frappe

frappe.init(site='${siteName}')
frappe.connect()

# Check if user exists
if frappe.db.exists('User', '${email}'):
    print(f"✓ User found: ${email}")
    
    # Update password
    from frappe.utils.password import update_password
    update_password('${email}', '${newPassword}')
    frappe.db.commit()
    
    print("✅ Password reset successfully!")
else:
    print("❌ User not found: ${email}")
`;

try {
  // Use base64 encoding to avoid quote escaping issues
  const base64Script = Buffer.from(resetScript).toString('base64');
  
  const tempFile = `/tmp/reset_password_${Date.now()}.py`;
  const command = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T ${DOCKER_SERVICE} bash -c "echo '${base64Script}' | base64 -d > ${tempFile} && cat ${tempFile} | bench --site ${siteName} console; EXIT_CODE=\\$?; rm -f ${tempFile}; exit \\$EXIT_CODE"`;
  
  const output = execSync(command, { encoding: 'utf8' });
  console.log(output);
  console.log('\n✨ Done! You can now try logging in with the new password.');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
