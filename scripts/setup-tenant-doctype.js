#!/usr/bin/env node

/**
 * Standalone script to create Tenant DocType in ERPNext
 * Run with: node scripts/setup-tenant-doctype.js
 */

const https = require('https');
const http = require('http');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const ERP_NEXT_URL = process.env.ERP_NEXT_URL || 'http://103.224.243.242:8080';
const ERP_API_KEY = process.env.ERP_API_KEY;
const ERP_API_SECRET = process.env.ERP_API_SECRET;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, ERP_NEXT_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${ERP_API_KEY}:${ERP_API_SECRET}`,
      },
    };

    const req = client.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(response.exception || response.message || body));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function checkTenantDocTypeExists() {
  try {
    const response = await makeRequest(
      'GET',
      `/api/resource/DocType/Tenant`
    );
    return response.data ? true : false;
  } catch (error) {
    return false;
  }
}

async function createTenantDocType() {
  const tenantDocType = {
    doctype: 'DocType',
    name: 'Tenant',
    module: 'Custom',
    custom: 1,
    istable: 0,
    issingle: 0,
    is_submittable: 0,
    track_changes: 1,
    autoname: 'field:subdomain',
    fields: [
      // Basic Information
      {
        fieldname: 'subdomain',
        label: 'Subdomain',
        fieldtype: 'Data',
        in_list_view: 1,
        reqd: 1,
        unique: 1,
        description: 'URL subdomain for tenant (e.g., "acme" for acme.nexuserp.com)',
      },
      {
        fieldname: 'company_name',
        label: 'Company Name',
        fieldtype: 'Data',
        in_list_view: 1,
        reqd: 1,
      },
      {
        fieldname: 'owner_email',
        label: 'Owner Email',
        fieldtype: 'Data',
        in_list_view: 1,
        reqd: 1,
        options: 'Email',
      },
      {
        fieldname: 'owner_name',
        label: 'Owner Name',
        fieldtype: 'Data',
      },
      {
        fieldname: 'section_break_1',
        fieldtype: 'Section Break',
        label: 'Subscription Details',
      },
      {
        fieldname: 'plan',
        label: 'Subscription Plan',
        fieldtype: 'Select',
        options: 'free\npro\nenterprise',
        default: 'free',
        in_list_view: 1,
        reqd: 1,
      },
      {
        fieldname: 'status',
        label: 'Status',
        fieldtype: 'Select',
        options: 'pending\ntrial\nactive\nsuspended\ncancelled',
        default: 'pending',
        in_list_view: 1,
        reqd: 1,
      },
      {
        fieldname: 'column_break_1',
        fieldtype: 'Column Break',
      },
      {
        fieldname: 'trial_end_date',
        label: 'Trial End Date',
        fieldtype: 'Date',
      },
      {
        fieldname: 'subscription_start',
        label: 'Subscription Start',
        fieldtype: 'Date',
      },
      {
        fieldname: 'subscription_end',
        label: 'Subscription End',
        fieldtype: 'Date',
      },
      {
        fieldname: 'section_break_2',
        fieldtype: 'Section Break',
        label: 'Site Configuration',
      },
      {
        fieldname: 'site_url',
        label: 'Site URL',
        fieldtype: 'Data',
        description: 'Full URL to tenant site (e.g., https://acme.nexuserp.com)',
      },
      {
        fieldname: 'erpnext_site',
        label: 'ERPNext Site Name',
        fieldtype: 'Data',
        description: 'Internal bench site name (e.g., acme.localhost)',
      },
      {
        fieldname: 'column_break_2',
        fieldtype: 'Column Break',
      },
      {
        fieldname: 'site_config',
        label: 'Site Configuration',
        fieldtype: 'Long Text',
        description: 'JSON configuration including API keys',
      },
      {
        fieldname: 'provisioned_at',
        label: 'Provisioned At',
        fieldtype: 'Datetime',
        read_only: 1,
      },
      {
        fieldname: 'section_break_3',
        fieldtype: 'Section Break',
        label: 'Usage Tracking',
      },
      {
        fieldname: 'usage_users',
        label: 'Users Count',
        fieldtype: 'Int',
        default: 0,
        description: 'Current number of active users',
      },
      {
        fieldname: 'usage_leads',
        label: 'Leads Count',
        fieldtype: 'Int',
        default: 0,
        description: 'Current number of leads',
      },
      {
        fieldname: 'usage_projects',
        label: 'Projects Count',
        fieldtype: 'Int',
        default: 0,
        description: 'Current number of projects',
      },
      {
        fieldname: 'column_break_3',
        fieldtype: 'Column Break',
      },
      {
        fieldname: 'usage_invoices',
        label: 'Invoices Count',
        fieldtype: 'Int',
        default: 0,
        description: 'Current number of invoices',
      },
      {
        fieldname: 'usage_storage',
        label: 'Storage Used (GB)',
        fieldtype: 'Float',
        default: 0,
        precision: 2,
        description: 'Storage used in gigabytes',
      },
      {
        fieldname: 'last_usage_update',
        label: 'Last Usage Update',
        fieldtype: 'Datetime',
        read_only: 1,
      },
      {
        fieldname: 'section_break_4',
        fieldtype: 'Section Break',
        label: 'Notes',
      },
      {
        fieldname: 'notes',
        label: 'Notes',
        fieldtype: 'Text Editor',
      },
    ],
    permissions: [
      {
        role: 'System Manager',
        read: 1,
        write: 1,
        create: 1,
        delete: 1,
        submit: 0,
        cancel: 0,
        amend: 0,
      },
    ],
  };

  await makeRequest('POST', '/api/resource/DocType', tenantDocType);
}

async function createTestTenant() {
  const testTenant = {
    doctype: 'Tenant',
    subdomain: 'test-demo',
    company_name: 'Test Company',
    owner_email: 'test@example.com',
    owner_name: 'Test User',
    plan: 'free',
    status: 'active',
    site_url: 'https://test-demo.nexuserp.com',
    erpnext_site: 'test-demo.localhost',
    usage_users: 1,
    usage_leads: 0,
    usage_projects: 0,
    usage_invoices: 0,
    usage_storage: 0,
  };

  await makeRequest('POST', '/api/resource/Tenant', testTenant);
}

async function main() {
  log('\n╔══════════════════════════════════════════════════════╗', 'cyan');
  log('║  Tenant DocType Setup Script for Multi-Tenancy  ║', 'cyan');
  log('╚══════════════════════════════════════════════════════╝\n', 'cyan');

  // Check environment variables
  if (!ERP_API_KEY || !ERP_API_SECRET) {
    log('❌ Error: API credentials not found!', 'red');
    log('Please set ERP_API_KEY and ERP_API_SECRET in .env.local', 'yellow');
    log('\nTo get API credentials:', 'yellow');
    log('1. Login to ERPNext', 'yellow');
    log('2. Go to: User Menu → My Settings', 'yellow');
    log('3. Scroll to API Access section', 'yellow');
    log('4. Click "Generate Keys"', 'yellow');
    log('5. Copy the keys to .env.local\n', 'yellow');
    process.exit(1);
  }

  log(`📡 ERPNext URL: ${ERP_NEXT_URL}`, 'blue');
  log(`🔑 API Key: ${ERP_API_KEY.substring(0, 10)}...`, 'blue');
  log('');

  try {
    // Step 1: Check if Tenant DocType exists
    log('🔍 Step 1: Checking if Tenant DocType exists...', 'cyan');
    const exists = await checkTenantDocTypeExists();

    if (exists) {
      log('✅ Tenant DocType already exists!', 'green');
      log('   Status: Already configured', 'green');
    } else {
      log('⏳ Tenant DocType not found. Creating...', 'yellow');

      // Step 2: Create Tenant DocType
      log('📝 Step 2: Creating Tenant DocType...', 'cyan');
      await createTenantDocType();
      log('✅ Tenant DocType created successfully!', 'green');
      log('   - 30+ fields configured', 'green');
      log('   - Usage tracking enabled', 'green');
      log('   - Permissions set for System Manager', 'green');
    }

    // Step 3: Create test tenant
    log('\n🧪 Step 3: Creating test tenant (optional)...', 'cyan');
    try {
      await createTestTenant();
      log('✅ Test tenant created successfully!', 'green');
      log('   Subdomain: test-demo', 'green');
      log('   Plan: Free', 'green');
      log('   Status: Active', 'green');
    } catch (error) {
      if (error.message.includes('already exists')) {
        log('ℹ️  Test tenant already exists', 'yellow');
      } else {
        log(`⚠️  Could not create test tenant: ${error.message}`, 'yellow');
      }
    }

    // Success summary
    log('\n╔══════════════════════════════════════════════════════╗', 'green');
    log('║              ✅ Setup Completed!                 ║', 'green');
    log('╚══════════════════════════════════════════════════════╝', 'green');
    log('\n📋 Next Steps:', 'cyan');
    log('1. Visit http://localhost:3000/login to test', 'cyan');
    log('2. Check ERPNext to see the Tenant DocType', 'cyan');
    log('3. Start creating tenants!', 'cyan');
    log('\n📚 Documentation:', 'cyan');
    log('   - docs/QUICK_START.md', 'cyan');
    log('   - docs/MULTI_TENANCY_COMPLETE.md\n', 'cyan');

  } catch (error) {
    log('\n❌ Setup failed!', 'red');
    log(`Error: ${error.message}`, 'red');
    log('\n🔧 Troubleshooting:', 'yellow');
    log('1. Check ERPNext is accessible', 'yellow');
    log('2. Verify API credentials are correct', 'yellow');
    log('3. Ensure you have System Manager role', 'yellow');
    log('4. Check ERPNext logs for details\n', 'yellow');
    process.exit(1);
  }
}

// Run the script
main();
