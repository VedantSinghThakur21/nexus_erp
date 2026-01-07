'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CreateTenantDialogProps {
  onSuccess?: () => void
}

export function CreateTenantDialog({ onSuccess }: CreateTenantDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null)
  const [checkingSubdomain, setCheckingSubdomain] = useState(false)

  const [formData, setFormData] = useState({
    customer_name: '',
    company_name: '',
    subdomain: '',
    owner_email: '',
    owner_name: '',
    plan: 'free' as 'free' | 'pro' | 'enterprise',
    admin_password: ''
  })

  const handleSubdomainChange = async (subdomain: string) => {
    setFormData(prev => ({ ...prev, subdomain }))
    setSubdomainAvailable(null)

    if (subdomain.length < 3) {
      return
    }

    setCheckingSubdomain(true)
    try {
      const response = await fetch('/api/tenants/check-subdomain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain })
      })

      const result = await response.json()
      setSubdomainAvailable(result.available)
      if (!result.available) {
        setError(result.error || 'Subdomain not available')
      } else {
        setError(null)
      }
    } catch (err) {
      console.error('Subdomain check failed:', err)
    } finally {
      setCheckingSubdomain(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Step 1: Create tenant record
      const createResponse = await fetch('/api/tenants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json()
        throw new Error(errorData.error || 'Failed to create tenant')
      }

      const tenant = await createResponse.json()

      // Step 2: Provision the site (this may take a while)
      const provisionResponse = await fetch('/api/tenants/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id,
          subdomain: formData.subdomain,
          adminEmail: formData.owner_email,
          adminPassword: formData.admin_password || 'admin123'
        })
      })

      if (!provisionResponse.ok) {
        const errorData = await provisionResponse.json()
        throw new Error(errorData.error || 'Failed to provision site')
      }

      const result = await provisionResponse.json()

      // Success!
      alert(`Tenant created successfully!\n\nSite URL: ${result.site_url}\nAdmin URL: ${result.admin_url}`)
      
      setOpen(false)
      if (onSuccess) {
        onSuccess()
      }
      
      // Reset form
      setFormData({
        customer_name: '',
        company_name: '',
        subdomain: '',
        owner_email: '',
        owner_name: '',
        plan: 'free',
        admin_password: ''
      })
    } catch (err: any) {
      console.error('Create tenant error:', err)
      setError(err.message || 'Failed to create tenant')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create New Tenant</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Tenant</DialogTitle>
            <DialogDescription>
              Provision a new ERPNext site for a customer. This will create a dedicated site instance.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="customer_name">Customer Name *</Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subdomain">Subdomain *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="subdomain"
                  value={formData.subdomain}
                  onChange={(e) => handleSubdomainChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="acme"
                  required
                />
                <span className="text-sm text-muted-foreground">.nexuserp.com</span>
              </div>
              {checkingSubdomain && (
                <p className="text-xs text-muted-foreground">Checking availability...</p>
              )}
              {subdomainAvailable === true && (
                <p className="text-xs text-green-600">✓ Available</p>
              )}
              {subdomainAvailable === false && (
                <p className="text-xs text-red-600">✗ Not available</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="owner_name">Owner Name *</Label>
              <Input
                id="owner_name"
                value={formData.owner_name}
                onChange={(e) => setFormData(prev => ({ ...prev, owner_name: e.target.value }))}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="owner_email">Owner Email *</Label>
              <Input
                id="owner_email"
                type="email"
                value={formData.owner_email}
                onChange={(e) => setFormData(prev => ({ ...prev, owner_email: e.target.value }))}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="admin_password">Admin Password</Label>
              <Input
                id="admin_password"
                type="password"
                value={formData.admin_password}
                onChange={(e) => setFormData(prev => ({ ...prev, admin_password: e.target.value }))}
                placeholder="Leave blank for default (admin123)"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="plan">Subscription Plan *</Label>
              <Select
                value={formData.plan}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, plan: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free - ₹0/month</SelectItem>
                  <SelectItem value="pro">Pro - ₹2,999/month</SelectItem>
                  <SelectItem value="enterprise">Enterprise - ₹9,999/month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || subdomainAvailable === false}>
              {loading ? 'Creating...' : 'Create Tenant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
