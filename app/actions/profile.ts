'use server'

import { frappeRequest } from '@/app/lib/api'
import { cookies } from 'next/headers'

export interface UserProfile {
    email: string
    fullName: string
    firstName: string
    lastName: string
    role: string
    initials: string
}

/**
 * Fetch the current logged-in user's profile from Frappe
 */
export async function getUserProfile(): Promise<UserProfile | null> {
    try {
        const cookieStore = await cookies()
        const userEmail = cookieStore.get('user_email')?.value || cookieStore.get('user_id')?.value

        if (!userEmail) {
            return null
        }

        // Fetch user details from Frappe
        const userData = await frappeRequest('frappe.client.get_value', 'GET', {
            doctype: 'User',
            filters: JSON.stringify({ name: userEmail }),
            fieldname: '["first_name", "last_name", "full_name", "email"]'
        }) as any

        const firstName = userData?.first_name || ''
        const lastName = userData?.last_name || ''
        const fullName = userData?.full_name || `${firstName} ${lastName}`.trim() || userEmail.split('@')[0]

        // Fetch user's primary role via the shared provisioning-first strategy
        let role = 'User'
        try {
            const { getUserRolesForUser } = await import('@/app/actions/user-roles')
            const userRoles = await getUserRolesForUser(userEmail)
            const roleHierarchy = [
                'System Manager',
                'Sales Manager',
                'Sales User',
                'Projects Manager',
                'Accounts Manager',
                'HR Manager',
                'Employee'
            ]
            const primaryRole = roleHierarchy.find(r => userRoles.includes(r)) || userRoles[0]
            if (primaryRole) {
                role = primaryRole
            }
        } catch {
            // Silently ignore role fetch errors
        }

        // Generate initials
        const initials = fullName
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)

        return {
            email: userEmail,
            fullName,
            firstName,
            lastName,
            role: formatRoleName(role),
            initials
        }
    } catch (error) {
        console.error('Error fetching user profile:', error)
        return null
    }
}

function formatRoleName(role: string): string {
    // Make role names more display-friendly
    const displayNames: Record<string, string> = {
        'System Manager': 'Administrator',
        'Sales Manager': 'Sales Manager',
        'Sales User': 'Sales Representative',
        'Projects Manager': 'Projects Manager',
        'Accounts Manager': 'Finance Manager',
        'HR Manager': 'HR Manager',
        'Employee': 'Team Member',
        'User': 'Team Member',
        'Guest': 'Guest'
    }
    return displayNames[role] || role
}



