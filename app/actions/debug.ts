'use server'

import { frappeRequest } from "@/app/lib/api"

export async function checkSystemSetup() {
  const results: any = {};

  try {
    // 1. Check Global Defaults
    results.globalDefaults = await frappeRequest('frappe.client.get_value', 'GET', {
      doctype: 'Global Defaults',
      fieldname: 'default_company'
    });
  } catch (e: any) {
    results.globalDefaultsError = e.message;
  }

  try {
    // 2. List Companies
    results.companies = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Company',
      fields: '["name"]',
      limit_page_length: 5
    });
  } catch (e: any) {
    results.companiesError = e.message;
  }

  try {
    // 3. Check User Info (who are we?)
    results.user = await frappeRequest('frappe.client.get_info', 'GET', {});
  } catch (e: any) {
    results.userError = e.message;
  }

  console.log('--- SYSTEM SETUP CHECK ---');
  console.log(JSON.stringify(results, null, 2));
  console.log('--------------------------');

  return results;
}
