import fetch from 'node-fetch';
import { execSync } from 'child_process';
import path from 'path';

const BASE_URL = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080';
const API_KEY = process.env.ERP_API_KEY;
const API_SECRET = process.env.ERP_API_SECRET;
const SITES_DIR = process.env.FRAPPE_SITES_DIR || '/home/frappe/frappe-bench/sites';

async function getAllTenants() {
  const authHeader = `token ${API_KEY}:${API_SECRET}`;
  const response = await fetch(`${BASE_URL}/api/resource/Tenant?fields=["name","subdomain","site_url"]&limit_page_length=1000`, {
    headers: { 'Authorization': authHeader },
  });
  const data = await response.json();
  return data.data || [];
}

function siteFolderExists(siteUrl: string) {
  if (!siteUrl) return false;
  // Extract subdomain or site name from URL
  let siteName = siteUrl.replace(/^https?:\/\//, '').replace(/[:/].*$/, '');
  try {
    execSync(`ls ${path.join(SITES_DIR, siteName)}`);
    return true;
  } catch {
    return false;
  }
}

async function deleteTenant(tenantName: string) {
  const authHeader = `token ${API_KEY}:${API_SECRET}`;
  await fetch(`${BASE_URL}/api/resource/Tenant/${tenantName}`, {
    method: 'DELETE',
    headers: { 'Authorization': authHeader },
  });
}

(async () => {
  const tenants = await getAllTenants();
  let deleted = 0;
  for (const tenant of tenants) {
    if (!siteFolderExists(tenant.site_url)) {
      console.log(`Deleting orphaned tenant: ${tenant.name} (${tenant.site_url})`);
      await deleteTenant(tenant.name);
      deleted++;
    }
  }
  console.log(`Cleanup complete. Deleted ${deleted} orphaned tenants.`);
})();
