#!/usr/bin/env node

/**
 * Test Provisioning Script
 * 
 * Provisions a test tenant and verifies all steps work correctly.
 * Run this before deploying to production.
 * 
 * Usage:
 *   node test-provisioning.js
 */

const { spawn } = require('child_process');

// Test configuration
const TEST_CONFIG = {
  subdomain: `test-${Date.now()}`,
  email: `test-${Date.now()}@example.com`,
  fullName: 'Test User',
  password: 'TestPass123!',
  organizationName: `Test Org ${Date.now()}`
};

console.log('🧪 Starting Provisioning Test\n');
console.log('Test Configuration:');
console.log(JSON.stringify(TEST_CONFIG, null, 2));
console.log('\n' + '='.repeat(60) + '\n');

// Run provisioning script
const child = spawn('node', [
  'provision-tenant.js',
  TEST_CONFIG.subdomain,
  TEST_CONFIG.email,
  TEST_CONFIG.fullName,
  TEST_CONFIG.password,
  TEST_CONFIG.organizationName
], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';

child.stdout.on('data', (data) => {
  stdout += data.toString();
});

child.stderr.on('data', (data) => {
  const output = data.toString();
  stderr += output;
  process.stderr.write(output); // Show progress in real-time
});

child.on('close', (code) => {
  console.log('\n' + '='.repeat(60) + '\n');
  
  if (code === 0) {
    try {
      // Parse result
      const lastLine = stdout.trim().split('\n').pop();
      const result = JSON.parse(lastLine);
      
      console.log('✅ PROVISIONING TEST PASSED\n');
      console.log('Result:');
      console.log(JSON.stringify(result, null, 2));
      console.log('\nVerification Checklist:');
      console.log(result.success ? '  ✅ success: true' : '  ❌ success: false');
      console.log(result.site ? '  ✅ site: ' + result.site : '  ❌ site: missing');
      console.log(result.url ? '  ✅ url: ' + result.url : '  ❌ url: missing');
      console.log(result.email ? '  ✅ email: ' + result.email : '  ❌ email: missing');
      console.log(result.apiKey ? '  ✅ apiKey: ' + result.apiKey.substring(0, 8) + '...' : '  ❌ apiKey: missing');
      console.log(result.apiSecret ? '  ✅ apiSecret: ' + result.apiSecret.substring(0, 8) + '...' : '  ❌ apiSecret: missing');
      console.log(result.elapsed ? `  ✅ elapsed: ${result.elapsed}s` : '  ⚠️  elapsed: missing');
      
      console.log('\n🧹 Cleanup Commands:');
      console.log(`  docker compose exec backend bench drop-site ${result.site} --force`);
      console.log(`  docker compose exec backend bench mariadb -e "DROP DATABASE IF EXISTS \\`${result.site.replace(/\./g, '-')}\\`"`);
      
      process.exit(0);
    } catch (error) {
      console.error('❌ FAILED TO PARSE RESULT');
      console.error('Error:', error.message);
      console.error('\nRaw stdout:');
      console.error(stdout);
      process.exit(1);
    }
  } else {
    console.error('❌ PROVISIONING TEST FAILED');
    console.error(`Exit code: ${code}`);
    
    try {
      const lastLine = stdout.trim().split('\n').pop();
      const result = JSON.parse(lastLine);
      console.error('\nError Result:');
      console.error(JSON.stringify(result, null, 2));
    } catch (parseError) {
      console.error('\nRaw output:');
      console.error(stdout);
    }
    
    process.exit(1);
  }
});

child.on('error', (error) => {
  console.error('❌ SCRIPT EXECUTION ERROR');
  console.error(error);
  process.exit(1);
});
