'use server'

import { cookies } from 'next/headers'
import { provisionTenant } from '@/scripts/provision-tenant'

export async function performProvisioning() {
    const cookieStore = await cookies()
    const cookieData = cookieStore.get('pending_tenant_data')?.value

    if (!cookieData) {
        return { success: false, error: 'No pending signup found. Please restart the signup process.' }
    }

    let data
    try {
        data = JSON.parse(cookieData)
    } catch (e) {
        return { success: false, error: 'Invalid signup data.' }
    }

    console.log(`[Provisioning Action] Starting for ${data.subdomain}...`)

    try {
        // 1. Run the Provisioning Script
        const result = await provisionTenant({
            organizationName: data.organizationName,
            adminEmail: data.email,
            adminPassword: data.password,
            adminFullName: data.fullName,
            planType: data.plan
        })

        if (!result.success) {
            return { success: false, error: result.error || 'Provisioning script failed.' }
        }

        // 2. Clear the pending cookie
        cookieStore.delete('pending_tenant_data')

        // 3. Return Success with Redirect URL
        // We rely on the client to redirect to the new subdomain
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
        const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'

        // Construct the final URL (e.g., http://acme.localhost or https://acme.avariq.in)
        const redirectUrl = process.env.NODE_ENV === 'production'
            ? `https://${data.subdomain}.${rootDomain}/login`
            : `http://${data.subdomain}.localhost:3000/login`

        return {
            success: true,
            redirectUrl,
            subdomain: data.subdomain
        }

    } catch (error: any) {
        console.error("[Provisioning Action] Error:", error)
        return { success: false, error: error.message || 'An unexpected error occurred.' }
    }
}
