import { NextRequest, NextResponse } from 'next/server'
import { frappeRequest } from '@/app/lib/api'
import { getTenant } from '@/lib/tenant'
import { seedTenantDefaults } from '@/lib/provisioning-client'

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
    //    Territory requires System Manager permission to create via REST.
    //    Delegate to the provisioning service (runs with ignore_permissions=True).
    try {
        const existingTerritories = await frappeRequest('frappe.client.get_list', 'GET', {
            doctype: 'Territory',
            fields: '["name"]',
            limit_page_length: 5
        }) as { name: string }[]

        if (existingTerritories && existingTerritories.length > 0) {
            results.territory = `Already exists: ${existingTerritories.map(t => t.name).join(', ')}`
        } else {
            // Seed via provisioning service (bypasses permission checks)
            try {
                const subdomain = await getTenant()
                const seedResult = await seedTenantDefaults(subdomain)
                results.territory = `Seeded: ${seedResult.result.territory}`
            } catch (seedErr: any) {
                results.territory = `Missing — provisioning service unavailable: ${seedErr.message}`
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

    // 5. Ensure default Customer Groups exist
    //    Customer Group tree requires System Manager permission to create via REST.
    //    Delegate to the provisioning service (runs with ignore_permissions=True).
    try {
        const existingGroups = await frappeRequest('frappe.client.get_list', 'GET', {
            doctype: 'Customer Group',
            fields: '["name"]',
            filters: JSON.stringify([['is_group', '=', 0]]),
            limit_page_length: 5
        }) as { name: string }[]

        if (existingGroups && existingGroups.length > 0) {
            results.customer_groups = `Already exists: ${existingGroups.map(g => g.name).join(', ')}`
        } else {
            // Seed via provisioning service (bypasses permission checks)
            try {
                const subdomain = await getTenant()
                const seedResult = await seedTenantDefaults(subdomain)
                results.customer_groups = `Seeded: ${seedResult.result.customer_group}`
            } catch (seedErr: any) {
                results.customer_groups = `Missing — provisioning service unavailable: ${seedErr.message}`
            }
        }
    } catch (e: any) {
        results.customer_groups = `Error: ${e.message}`
    }

    // 6. Ensure default Item Groups exist
    try {
        const existingItemGroups = await frappeRequest('frappe.client.get_list', 'GET', {
            doctype: 'Item Group',
            fields: '["name"]',
            filters: JSON.stringify([['is_group', '=', 0]]),
            limit_page_length: 5
        }) as { name: string }[]

        if (existingItemGroups && existingItemGroups.length > 0) {
            results.item_groups = `Already exists: ${existingItemGroups.map(g => g.name).join(', ')}`
        } else {
            // Ensure root group exists
            let rootGroup = 'All Item Groups'
            try {
                const roots = await frappeRequest('frappe.client.get_list', 'GET', {
                    doctype: 'Item Group',
                    fields: '["name"]',
                    filters: JSON.stringify([['is_group', '=', 1]]),
                    limit_page_length: 1
                }) as { name: string }[]
                if (roots?.[0]?.name) rootGroup = roots[0].name
                else {
                    const r = await frappeRequest('frappe.client.insert', 'POST', {
                        doc: { doctype: 'Item Group', item_group_name: 'All Item Groups', is_group: 1 }
                    }) as { name: string }
                    rootGroup = r.name
                }
            } catch (e) { /* root may already exist */ }

            const leafGroups = ['Crane', 'Service', 'Spare Parts', 'Equipment', 'Consumables']
            const created: string[] = []
            for (const groupName of leafGroups) {
                try {
                    await frappeRequest('frappe.client.insert', 'POST', {
                        doc: { doctype: 'Item Group', item_group_name: groupName, parent_item_group: rootGroup, is_group: 0 }
                    })
                    created.push(groupName)
                } catch (e: any) {
                    if (!e.message?.includes('Duplicate')) console.warn(`Item Group "${groupName}":`, e.message)
                }
            }
            results.item_groups = `Created: ${created.join(', ')}`
        }
    } catch (e: any) {
        results.item_groups = `Error: ${e.message}`
    }

    // 7. Provision default Employee Designations
    try {
        const defaultDesignations = ['Operator', 'Senior Operator', 'Supervisor', 'Technician', 'Site Engineer']
        const existingDesignations = await frappeRequest('frappe.client.get_list', 'GET', {
            doctype: 'Designation',
            fields: '["name"]',
            limit_page_length: 100
        }) as { name: string }[]
        const existingNames = (existingDesignations || []).map(d => d.name)
        const created: string[] = []
        for (const desig of defaultDesignations) {
            if (!existingNames.includes(desig)) {
                try {
                    await frappeRequest('frappe.client.insert', 'POST', {
                        doc: { doctype: 'Designation', designation_name: desig }
                    })
                    created.push(desig)
                } catch (e: any) {
                    if (!e.message?.includes('Duplicate') && !e.message?.includes('already exists')) {
                        console.warn(`Designation "${desig}":`, e.message)
                    }
                }
            }
        }
        results.designations = created.length > 0 ? `Created: ${created.join(', ')}` : 'All designations already exist'
    } catch (e: any) {
        results.designations = `Error: ${e.message}`
    }

    // 7a. Provision default Role Profiles
    try {
        const defaultRoleProfiles = [
            { name: 'Administrator', roles: ['System Manager', 'All'] },
            { name: 'Standard User', roles: ['Employee'] },
            { name: 'Sales User', roles: ['Employee', 'Sales User'] },
            { name: 'Sales Manager', roles: ['Employee', 'Sales Manager', 'Sales User'] },
            { name: 'Projects User', roles: ['Employee', 'Projects User'] },
            { name: 'Projects Manager', roles: ['Employee', 'Projects Manager', 'Projects User'] },
            { name: 'Accounts User', roles: ['Employee', 'Accounts User'] },
            { name: 'Accounts Manager', roles: ['Employee', 'Accounts Manager', 'Accounts User'] }
        ]

        const existingProfiles = await frappeRequest('frappe.client.get_list', 'GET', {
            doctype: 'Role Profile',
            fields: '["name"]',
            limit_page_length: 100
        }) as { name: string }[]
        const existingNames = (existingProfiles || []).map(p => p.name)

        const created: string[] = []
        for (const profile of defaultRoleProfiles) {
            if (!existingNames.includes(profile.name)) {
                try {
                    await frappeRequest('frappe.client.insert', 'POST', {
                        doc: {
                            doctype: 'Role Profile',
                            role_profile: profile.name,
                            roles: profile.roles.map(r => ({ role: r }))
                        }
                    })
                    created.push(profile.name)
                } catch (e: any) {
                    if (!e.message?.includes('Duplicate') && !e.message?.includes('already exists')) {
                        console.warn(`Role Profile "${profile.name}":`, e.message)
                    }
                }
            }
        }
        results.role_profiles = created.length > 0 ? `Created: ${created.join(', ')}` : 'All Role Profiles already exist'
    } catch (e: any) {
        results.role_profiles = `Error: ${e.message}`
    }

    // 7a. Provision default Gender values (required for Employee doctype)
    try {
        const defaultGenders = ['Male', 'Female', 'Other']
        const existingGenders = await frappeRequest('frappe.client.get_list', 'GET', {
            doctype: 'Gender',
            fields: '["name"]',
            limit_page_length: 100
        }) as { name: string }[]
        const existingNames = (existingGenders || []).map(g => g.name)
        const created: string[] = []
        for (const gender of defaultGenders) {
            if (!existingNames.includes(gender)) {
                try {
                    await frappeRequest('frappe.client.insert', 'POST', {
                        doc: { doctype: 'Gender', gender: gender }
                    })
                    created.push(gender)
                } catch (e: any) {
                    if (!e.message?.includes('Duplicate') && !e.message?.includes('already exists')) {
                        console.warn(`Gender "${gender}":`, e.message)
                    }
                }
            }
        }
        results.genders = created.length > 0 ? `Created: ${created.join(', ')}` : 'All genders already exist'
    } catch (e: any) {
        results.genders = `Error: ${e.message}`
    }

    // 8. Ensure the API user has all required roles
    try {
        // Get current user
        const currentUser = await frappeRequest('frappe.auth.get_logged_user', 'GET', {}) as string
        if (currentUser && currentUser !== 'Administrator' && currentUser !== 'Guest') {
            const requiredRoles = [
                'System Manager',
                'Sales Manager', 'Sales User',
                'Stock Manager', 'Stock User',
                'Accounts Manager', 'Accounts User',
                'Projects Manager', 'Projects User',
                'HR Manager', 'HR User',
                'Quality Manager',
                'Manufacturing Manager', 'Manufacturing User',
            ]

            // Get user's existing roles
            let existingRoles: string[] = []
            try {
                const user = await frappeRequest('frappe.client.get', 'GET', {
                    doctype: 'User',
                    name: currentUser,
                }) as any
                existingRoles = (user?.roles || []).map((r: any) => r.role)
            } catch { /* ignore */ }

            const missingRoles = requiredRoles.filter(r => !existingRoles.includes(r))
            if (missingRoles.length === 0) {
                results.user_roles = `All roles already assigned to ${currentUser}`
            } else {
                // Add missing roles
                for (const role of missingRoles) {
                    try {
                        await frappeRequest('frappe.client.insert', 'POST', {
                            doc: {
                                doctype: 'Has Role',
                                parent: currentUser,
                                parenttype: 'User',
                                parentfield: 'roles',
                                role: role
                            }
                        })
                    } catch (e: any) {
                        // Ignore duplicate errors
                        if (!e.message?.includes('Duplicate') && !e.message?.includes('already exists')) {
                            console.warn(`Role "${role}":`, e.message)
                        }
                    }
                }
                results.user_roles = `Added roles to ${currentUser}: ${missingRoles.join(', ')}`
            }
        } else {
            results.user_roles = `Skipped: user is ${currentUser}`
        }
    } catch (e: any) {
        results.user_roles = `Error: ${e.message}`
    }

    // 9. Configure outbound email account for this tenant site
    // Uses a single shared SMTP account (env vars) — standard SaaS pattern.
    // Required env vars:
    //   SMTP_HOST          e.g. smtp.sendgrid.net or smtp.gmail.com
    //   SMTP_PORT          e.g. 587 (TLS) or 465 (SSL)
    //   SMTP_USE_TLS       "1" for yes
    //   SMTP_EMAIL         the "from" address, e.g. no-reply@avariq.in
    //   SMTP_PASSWORD      SMTP password or app password
    //   SMTP_DISPLAY_NAME  e.g. "Avariq ERP"  (optional, defaults to SMTP_EMAIL)
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10)
    const smtpEmail = process.env.SMTP_EMAIL
    const smtpPassword = process.env.SMTP_PASSWORD
    const smtpTls = process.env.SMTP_USE_TLS !== '0'
    const smtpDisplayName = process.env.SMTP_DISPLAY_NAME || smtpEmail

    if (!smtpHost || !smtpEmail || !smtpPassword) {
        results.email = 'Skipped: SMTP_HOST / SMTP_EMAIL / SMTP_PASSWORD not set in environment'
    } else {
        // Email Account doctype requires System Manager. When setup/init is
        // triggered by a non-admin tenant user's cookies (rather than the
        // admin-key headers from update-credentials), this will always 403.
        // Check for admin-level headers that update-credentials passes.
        const hasAdminHeaders = request.headers.get('x-tenant-api-key') && request.headers.get('x-tenant-api-secret')
        if (!hasAdminHeaders) {
            results.email = 'Skipped: requires admin credentials (run via provisioning)'
        } else {
            try {
                const existingEmail = await frappeRequest('frappe.client.get_list', 'GET', {
                    doctype: 'Email Account',
                    filters: JSON.stringify([['enable_outgoing', '=', 1]]),
                    fields: '["name"]',
                    limit_page_length: 1
                }) as { name: string }[]

                if (existingEmail && existingEmail.length > 0) {
                    results.email = `Already configured: ${existingEmail[0].name}`
                } else {
                    await frappeRequest('frappe.client.insert', 'POST', {
                        doc: {
                            doctype: 'Email Account',
                            email_account_name: smtpDisplayName,
                            email_id: smtpEmail,
                            enable_outgoing: 1,
                            smtp_server: smtpHost,
                            smtp_port: smtpPort,
                            use_tls: smtpTls ? 1 : 0,
                            password: smtpPassword,
                            default_outgoing: 1,
                            enable_incoming: 0,
                        }
                    })
                    results.email = `Configured outgoing SMTP: ${smtpEmail} via ${smtpHost}:${smtpPort}`
                }
            } catch (e: any) {
                results.email = `Error configuring email: ${e.message}`
            }
        }
    }

    return NextResponse.json({ success: true, results })
}
