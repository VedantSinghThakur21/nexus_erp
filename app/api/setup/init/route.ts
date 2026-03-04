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

    // 3. Ensure default Territory tree exists (root + at least one leaf)
    try {
        let hasExisting = false
        try {
            const existingTerritories = await frappeRequest('frappe.client.get_list', 'GET', {
                doctype: 'Territory',
                fields: '["name"]',
                limit_page_length: 5
            }) as { name: string }[]
            hasExisting = existingTerritories && existingTerritories.length > 0
            if (hasExisting) {
                results.territory = `Already exists: ${existingTerritories.map(t => t.name).join(', ')}`
            }
        } catch (listErr: any) {
            // If we can't list, try to create anyway
            console.warn('Territory list check failed, attempting creation:', listErr.message)
        }

        if (!hasExisting) {
            try {
                // Create root group
                const root = await frappeRequest('frappe.client.insert', 'POST', {
                    doc: {
                        doctype: 'Territory',
                        territory_name: 'All Territories',
                        is_group: 1
                    }
                }) as { name: string }

                // Create a default leaf territory
                const leaf = await frappeRequest('frappe.client.insert', 'POST', {
                    doc: {
                        doctype: 'Territory',
                        territory_name: 'India',
                        parent_territory: root.name,
                        is_group: 0
                    }
                }) as { name: string }

                results.territory = `Created: ${root.name} (root) + ${leaf.name} (default)`
            } catch (createErr: any) {
                if (createErr.message?.includes('Duplicate') || createErr.message?.includes('already exists')) {
                    results.territory = 'Already exists (checked via create)'
                } else {
                    results.territory = `Error creating: ${createErr.message}`
                }
            }
        }
    } catch (e: any) {
        results.territory = `Error: ${e.message}`
    }
    // 4. Ensure default Modes of Payment exist
    try {
        const existingModes = await frappeRequest('frappe.client.get_list', 'GET', {
            doctype: 'Mode of Payment',
            fields: '["name"]',
            limit_page_length: 5
        }) as { name: string }[]

        if (existingModes && existingModes.length > 0) {
            results.modes_of_payment = `Already exists: ${existingModes.map(m => m.name).join(', ')}`
        } else {
            const defaultModes = ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'NEFT', 'RTGS']
            const created: string[] = []
            for (const modeName of defaultModes) {
                try {
                    await frappeRequest('frappe.client.insert', 'POST', {
                        doc: {
                            doctype: 'Mode of Payment',
                            mode_of_payment: modeName,
                            type: modeName === 'Cash' ? 'Cash' : 'Bank'
                        }
                    })
                    created.push(modeName)
                } catch (e: any) {
                    // Skip if already exists (race condition or partial run)
                    if (!e.message?.includes('Duplicate')) {
                        console.warn(`Failed to create Mode of Payment "${modeName}":`, e.message)
                    }
                }
            }
            results.modes_of_payment = `Created: ${created.join(', ')}`
        }
    } catch (e: any) {
        results.modes_of_payment = `Error: ${e.message}`
    }

    return NextResponse.json({ success: true, results })
}
