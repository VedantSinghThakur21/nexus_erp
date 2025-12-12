'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { login } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button className="w-full" type="submit" disabled={pending}>
      {pending ? 'Signing in...' : 'Sign In'}
    </Button>
  )
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setError(null)
    
    const result = await login(null, formData)
    
    if (result?.error) {
      setError(result.error)
    } else if (result?.success) {
      // FORCE REFRESH to update cookies before redirecting
      router.refresh() 
      // REDIRECT TO DASHBOARD (Not Marketing Page)
      router.push('/dashboard') 
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Nexus Enterprise</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access the workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email / Username</Label>
              <Input 
                id="email" 
                name="email" 
                type="text" 
                placeholder="Administrator" 
                required 
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                required 
                className="bg-white"
              />
            </div>
            
            {error && (
              <div className="text-sm text-red-500 font-medium bg-red-50 p-2 rounded border border-red-200">
                Error: {error}
              </div>
            )}

            <SubmitButton />
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
