'use server'

import { frappeRequest } from "@/app/lib/api"

export async function getDashboardStats() {
  try {
    // 1. Get Total Revenue (from Invoices)
    const invoices = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Sales Invoice',
        fields: '["grand_total"]',
        filters: '[["docstatus", "=", 1]]', // Only submitted invoices
        limit_page_length: 1000
    })
    const revenue = invoices.reduce((sum: number, inv: any) => sum + inv.grand_total, 0)

    // 2. Get Active Bookings (Sales Orders)
    const bookings = await frappeRequest('frappe.client.get_count', 'GET', {
        doctype: 'Sales Order',
        filters: '[["status", "not in", ["Completed", "Cancelled"]]]'
    })

    // 3. Get Open Leads
    const leads = await frappeRequest('frappe.client.get_count', 'GET', {
        doctype: 'Lead',
        filters: '[["status", "=", "Open"]]'
    })

    // 4. Get Fleet Utilization
    const totalMachines = await frappeRequest('frappe.client.get_count', 'GET', {
        doctype: 'Serial No',
        filters: '[["status", "!=", "Scrapped"]]'
    })
    const activeMachines = await frappeRequest('frappe.client.get_count', 'GET', {
        doctype: 'Serial No',
        filters: '[["status", "=", "Active"]]' // Active means available/rented (not maintenance)
    })

    // Calculate utilization percentage (machines making money vs broken)
    // Note: A better metric would be "Rented" status if you track it. 
    // For now, let's just show Total vs Active count.
    
    return {
        revenue,
        active_bookings: bookings,
        open_leads: leads,
        fleet_count: totalMachines,
        fleet_status: `${activeMachines} / ${totalMachines}`
    }

  } catch (error) {
    console.error("Dashboard Stats Error:", error)
    return {
        revenue: 0,
        active_bookings: 0,
        open_leads: 0,
        fleet_count: 0,
        fleet_status: "0 / 0"
    }
  }
}
