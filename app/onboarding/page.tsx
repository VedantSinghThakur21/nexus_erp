'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { completeSocialOnboarding, lookupTenantByEmail } from '@/app/actions/social-onboarding'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Building2 } from 'lucide-react'

export default function OnboardingPage() {
    const sessionResult = useSession()
    const { data: session, status } = sessionResult || {}
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [checking, setChecking] = useState(true)

    // Check if user already has a tenant (e.g., created via email signup)
    useEffect(() => {
        async function checkExistingTenant() {
            if (session?.user?.email) {
                try {
                    const result = await lookupTenantByEmail(session.user.email)
                    if (result.hasTenant && result.siteUrl) {
                        // User already has a tenant — redirect to their dashboard
                        window.location.href = `${result.siteUrl}/dashboard`
                        return
                    }
                } catch (e) {
                    console.warn('Tenant lookup failed:', e)
                }
            }
            setChecking(false)
        }
        if (status === 'authenticated') {
            checkExistingTenant()
        } else if (status !== 'loading') {
            setChecking(false)
        }
    }, [session, status])

    if (!sessionResult || status === 'loading' || checking) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>
    }

    if (status === 'unauthenticated') {
        router.push('/login')
        return null
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setIsLoading(true)
        setError(null)

        const formData = new FormData(event.currentTarget)
        const orgName = formData.get('organization_name') as string

        try {
            if (!session?.user?.email) {
                throw new Error('User email not found in session')
            }

            const result = await completeSocialOnboarding({
                email: session.user.email,
                name: session.user.name || session.user.email.split('@')[0],
                organizationName: orgName
            })

            if (!result.success) {
                setError(result.error || 'Setup failed')
                setIsLoading(false)
                return
            }

            // Redirect to the new tenant URL or dashboard
            if (result.redirectUrl) {
                window.location.href = result.redirectUrl
            } else {
                window.location.href = '/dashboard'
            }

        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred')
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Welcome, {session?.user?.name}!</CardTitle>
                    <CardDescription>
                        Just one more step. Name your organization to create your workspace.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="organization_name">Organization Name</Label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="organization_name"
                                    name="organization_name"
                                    placeholder="My Company"
                                    required
                                    disabled={isLoading}
                                    className="pl-10"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                This will create your unique subdomain (e.g. my-company.avariq.in)
                            </p>
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Setting up workspace...
                                </>
                            ) : (
                                'Create Workspace'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
