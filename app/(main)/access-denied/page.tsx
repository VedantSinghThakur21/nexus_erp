/**
 * Access Denied Page
 * 
 * Shown when user tries to access a module without required permissions
 */
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { UserRoleBadge } from '@/components/user-role-badge'

export default function AccessDeniedPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const module = searchParams.get('module') || 'this module'
  const requiredRole = searchParams.get('role')

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
              Access Denied
            </CardTitle>
            <CardDescription className="mt-2">
              You don't have permission to access {module}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Your Role:
              </span>
              <UserRoleBadge variant="compact" />
            </div>

            {requiredRole && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Required role: <span className="font-semibold">{requiredRole}</span>
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              If you believe you should have access to this module, please contact your system administrator.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button
              onClick={() => router.push('/dashboard')}
              className="flex-1"
            >
              Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
