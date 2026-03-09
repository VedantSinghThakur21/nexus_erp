import { frappeRequest } from "./app/lib/api";

async function run() {
  const opps = await frappeRequest('frappe.client.get_list', 'GET', { doctype: 'Opportunity', fields: '["name", "status"]' });
  const invoices = await frappeRequest('frappe.client.get_list', 'GET', { doctype: 'Sales Invoice', fields: '["name", "status", "grand_total"]' });
  const orders = await frappeRequest('frappe.client.get_list', 'GET', { doctype: 'Sales Order', fields: '["name", "status"]' });
  console.log("Opps:", opps);
  console.log("Invoices:", invoices);
  console.log("Orders:", orders);
}
run();
