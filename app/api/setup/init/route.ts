import { NextRequest, NextResponse } from 'next/server'
import { frappeRequest } from '@/app/lib/api'

/**
 * One-time tenant initialization endpoint.
 * Creates the Standard Selling Price List and sets it as default.
 * 
 * Hit this once per tenant: GET /api/setup/init
 */
export async function GET(request: NextRequest) {
    const results: Record<string, string> = {}

    // 1. Check if Price List already exists
    try {
        const existing = await frappeRequest('frappe.client.get_list', 'GET', {
            doctype: 'Price List',
            filters: '[["selling","=","1"]]',
            fields: '["name"]',
            limit_page_length: 5
        }) as { name: string }[]

        if (existing?.length > 0) {
            results.price_list = `Already exists: ${existing.map(p => p.name).join(', ')}`
        } else {
            // Create it
            const created = await frappeRequest('frappe.client.insert', 'POST', {
                doc: {
                    doctype: 'Price List',
                    price_list_name: 'Standard Selling',
                    selling: 1,
                    buying: 0,
                    enabled: 1,
                    currency: 'INR'
                }
            }) as { name: string }
            results.price_list = `Created: ${created.name}`
        }
    } catch (e: any) {
        results.price_list = `Error: ${e.message}`
    }

    // 2. Set default in Selling Settings
    try {
        const settings = await frappeRequest('frappe.client.get_value', 'GET', {
            doctype: 'Selling Settings',
            fieldname: 'selling_price_list'
        }) as { selling_price_list?: string }

        if (!settings?.selling_price_list) {
            await frappeRequest('frappe.client.set_value', 'POST', {
                doctype: 'Selling Settings',
                name: 'Selling Settings',
                fieldname: 'selling_price_list',
                value: 'Standard Selling'
            })
            results.selling_settings = 'Set Standard Selling as default'
        } else {
            results.selling_settings = `Already set: ${settings.selling_price_list}`
        }
    } catch (e: any) {
        results.selling_settings = `Error: ${e.message}`
    }

    return NextResponse.json({ success: true, results })
}
