// Quick script to fix the tenant site URL in the database
// Run this with: node fix-tenant-url.js

const subdomain = 'testorganisation-sau';
const newSiteUrl = `http://${subdomain}.localhost:8080`;

const API_KEY = process.env.ERP_API_KEY || '8f15d0e5c0f36a2';
const API_SECRET = process.env.ERP_API_SECRET || 'f17f36e89dc2e0a';
const MASTER_URL = process.env.ERP_NEXT_URL || 'http://103.224.243.242:8080';

async function fixTenantUrl() {
  try {
    // Get the tenant
    const getTenantResponse = await fetch(`${MASTER_URL}/api/method/frappe.client.get_list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${API_KEY}:${API_SECRET}`
      },
      body: JSON.stringify({
        doctype: 'Tenant',
        filters: { subdomain: subdomain },
        fields: ['name', 'site_url', 'subdomain'],
        limit_page_length: 1
      })
    });

    const tenantData = await getTenantResponse.json();
    
    if (!tenantData.message || tenantData.message.length === 0) {
      console.error('Tenant not found');
      return;
    }

    const tenant = tenantData.message[0];
    console.log('Current tenant:', tenant);

    // Update the site_url
    const updateResponse = await fetch(`${MASTER_URL}/api/method/frappe.client.set_value`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${API_KEY}:${API_SECRET}`
      },
      body: JSON.stringify({
        doctype: 'Tenant',
        name: tenant.name,
        fieldname: 'site_url',
        value: newSiteUrl
      })
    });

    const result = await updateResponse.json();
    console.log('Update result:', result);
    console.log(`✅ Tenant site_url updated to: ${newSiteUrl}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixTenantUrl();
