'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2 } from "lucide-react"
import { createLead } from "@/app/actions/crm"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function NewLeadPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Form State
  const [formData, setFormData] = useState({
    salutation: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    job_title: "",
    gender: "",
    source: "",
    email_id: "",
    mobile_no: "",
    phone: "",
    website: "",
    company_name: "",
    no_of_employees: "",
    annual_revenue: "",
    industry: "",
    market_segment: "",
    territory: "",
    fax: ""
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    
    const res = await createLead(formData)
    
    if (res.success) {
      router.push('/crm')
      router.refresh()
    } else {
      alert("Error: " + res.error)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Link href="/crm">
                <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">New Lead</h1>
                <p className="text-slate-500">Add a new potential customer</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
                <Link href="/crm">Cancel</Link>
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Lead
            </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Section 1: Details */}
        <Card>
            <CardHeader className="pb-4 border-b">
                <CardTitle className="text-base font-semibold">Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="grid gap-2">
                        <Label>Series</Label>
                        <Input value="CRM-LEAD-.YYYY.-" disabled className="bg-slate-100 dark:bg-slate-800 text-slate-500 border-none" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Job Title</Label>
                        <Input name="job_title" value={formData.job_title} onChange={handleChange} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Status <span className="text-red-500">*</span></Label>
                        <Input value="Lead" disabled className="bg-slate-100 dark:bg-slate-800 text-slate-500 border-none" />
                    </div>

                    <div className="grid gap-2">
                        <Label>Salutation</Label>
                        <Select onValueChange={(val) => handleSelectChange('salutation', val)}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Mr">Mr</SelectItem>
                                <SelectItem value="Ms">Ms</SelectItem>
                                <SelectItem value="Mrs">Mrs</SelectItem>
                                <SelectItem value="Dr">Dr</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Gender</Label>
                        <Select onValueChange={(val) => handleSelectChange('gender', val)}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Source</Label>
                        <Select onValueChange={(val) => handleSelectChange('source', val)} value={formData.source}>
                            <SelectTrigger><SelectValue placeholder="Select source (optional)" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Existing Customer">Existing Customer</SelectItem>
                                <SelectItem value="Reference">Reference</SelectItem>
                                <SelectItem value="Advertisement">Advertisement</SelectItem>
                                <SelectItem value="Cold Calling">Cold Calling</SelectItem>
                                <SelectItem value="Exhibition">Exhibition</SelectItem>
                                <SelectItem value="Supplier Reference">Supplier Reference</SelectItem>
                                <SelectItem value="Mass Mailing">Mass Mailing</SelectItem>
                                <SelectItem value="Customer's Vendor">Customer's Vendor</SelectItem>
                                <SelectItem value="Campaign">Campaign</SelectItem>
                                <SelectItem value="Walk In">Walk In</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500">Leave blank if not applicable</p>
                    </div>

                    <div className="grid gap-2">
                        <Label>First Name <span className="text-red-500">*</span></Label>
                        <Input name="first_name" value={formData.first_name} onChange={handleChange} required className="bg-yellow-50/50 border-yellow-200 focus-visible:ring-yellow-200" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Middle Name</Label>
                        <Input name="middle_name" value={formData.middle_name} onChange={handleChange} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Last Name</Label>
                        <Input name="last_name" value={formData.last_name} onChange={handleChange} />
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Section 2: Contact Info */}
        <Card>
            <CardHeader className="pb-4 border-b">
                <CardTitle className="text-base font-semibold">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="grid gap-2">
                        <Label>Email</Label>
                        <Input type="email" name="email_id" value={formData.email_id} onChange={handleChange} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Mobile No</Label>
                        <Input name="mobile_no" value={formData.mobile_no} onChange={handleChange} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Phone</Label>
                        <Input name="phone" value={formData.phone} onChange={handleChange} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Website</Label>
                        <Input name="website" value={formData.website} onChange={handleChange} placeholder="https://" />
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Section 3: Organization */}
        <Card>
            <CardHeader className="pb-4 border-b">
                <CardTitle className="text-base font-semibold">Organization</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="grid gap-2 lg:col-span-2">
                        <Label>Organization Name</Label>
                        <Input name="company_name" value={formData.company_name} onChange={handleChange} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Territory</Label>
                        <Input name="territory" value={formData.territory} onChange={handleChange} />
                    </div>
                    <div className="grid gap-2">
                        <Label>No of Employees</Label>
                        <Select onValueChange={(val) => handleSelectChange('no_of_employees', val)}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1-10">1-10</SelectItem>
                                <SelectItem value="11-50">11-50</SelectItem>
                                <SelectItem value="51-200">51-200</SelectItem>
                                <SelectItem value="201-500">201-500</SelectItem>
                                <SelectItem value="501-1000">501-1000</SelectItem>
                                <SelectItem value="1000+">1000+</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Industry</Label>
                        <Input 
                          name="industry" 
                          value={formData.industry} 
                          onChange={handleChange} 
                          placeholder="e.g., Technology, Manufacturing, Healthcare (optional)"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Annual Revenue</Label>
                        <Input name="annual_revenue" value={formData.annual_revenue} onChange={handleChange} />
                    </div>
                </div>
            </CardContent>
        </Card>

      </form>
    </div>
  )
}

