"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AnimatedCard, AnimatedButton } from "@/components/ui/animated"
import { ArrowLeft, Loader2, User, Building2, MapPin, FileText, Tag } from "lucide-react"
import { createLead } from "@/app/actions/crm"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function NewLeadPage() {
  const [loading, setLoading] = useState(false)
  const [activeSection, setActiveSection] = useState("basic")
  const router = useRouter()

  // Form State
  const [formData, setFormData] = useState({
    salutation: "",
    first_name: "",
    last_name: "",
    email_id: "",
    job_title: "",
    mobile_no: "",
    phone: "",
    company_name: "",
    website: "",
    industry: "",
    annual_revenue: "",
    source: "",
    status: "Open",
    assigned_to: "",
    street: "",
    city: "",
    state: "",
    zip_code: "",
    country: "United States",
    notes: ""
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await createLead(formData)
      router.push('/crm')
    } catch (error) {
      console.error('Failed to create lead:', error)
      alert('Failed to create lead. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const sections = [
    { id: "basic", label: "Basic Information", icon: User },
    { id: "company", label: "Company Data", icon: Building2 },
    { id: "tracking", label: "Tracking & Assignment", icon: Tag },
    { id: "address", label: "Address", icon: MapPin },
    { id: "notes", label: "Notes", icon: FileText }
  ]

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/crm">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
              Create New Lead
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Enter the details below to add a new prospect to the system.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/crm')}>
            Cancel
          </Button>
          <AnimatedButton 
            variant="neon" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Lead
          </AnimatedButton>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar Navigation */}
        <AnimatedCard className="lg:col-span-1 h-fit" variant="glass" delay={0.1}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">SECTIONS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {sections.map((section, idx) => {
                const Icon = section.icon
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {section.label}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Form Content */}
        <AnimatedCard className="lg:col-span-3" variant="glass" delay={0.2}>
          <form onSubmit={handleSubmit}>
            {/* Basic Information */}
            {activeSection === "basic" && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    Basic Information
                  </h3>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        placeholder="e.g., Jane"
                        required
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        placeholder="e.g., Doe"
                        required
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email_id">Email Address *</Label>
                      <Input
                        id="email_id"
                        name="email_id"
                        type="email"
                        value={formData.email_id}
                        onChange={handleChange}
                        placeholder="jane@company.com"
                        required
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="job_title">Job Title</Label>
                      <Input
                        id="job_title"
                        name="job_title"
                        value={formData.job_title}
                        onChange={handleChange}
                        placeholder="e.g., Purchasing Manager"
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="mobile_no">Mobile Phone</Label>
                      <Input
                        id="mobile_no"
                        name="mobile_no"
                        type="tel"
                        value={formData.mobile_no}
                        onChange={handleChange}
                        placeholder="+1 555-0100"
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Office Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+1 555-0101"
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Company Data */}
            {activeSection === "company" && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-purple-600" />
                    Company Data
                  </h3>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="company_name">Company Name</Label>
                      <Input
                        id="company_name"
                        name="company_name"
                        value={formData.company_name}
                        onChange={handleChange}
                        placeholder="e.g., Acme Corp"
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="website">Website</Label>
                      <div className="relative mt-1.5">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm">
                          https://
                        </span>
                        <Input
                          id="website"
                          name="website"
                          value={formData.website}
                          onChange={handleChange}
                          placeholder="example.com"
                          className="pl-[70px]"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="industry">Industry</Label>
                      <Select name="industry" value={formData.industry} onValueChange={(val) => handleSelectChange("industry", val)}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select Industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                          <SelectItem value="Construction">Construction</SelectItem>
                          <SelectItem value="Technology">Technology</SelectItem>
                          <SelectItem value="Healthcare">Healthcare</SelectItem>
                          <SelectItem value="Retail">Retail</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="annual_revenue">Annual Revenue</Label>
                      <div className="relative mt-1.5">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm">
                          $
                        </span>
                        <Input
                          id="annual_revenue"
                          name="annual_revenue"
                          type="number"
                          value={formData.annual_revenue}
                          onChange={handleChange}
                          placeholder="0.00"
                          className="pl-7"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tracking & Assignment */}
            {activeSection === "tracking" && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Tag className="h-5 w-5 text-orange-600" />
                    Tracking & Assignment
                  </h3>
                  
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <Label htmlFor="source">Lead Source</Label>
                      <Select name="source" value={formData.source} onValueChange={(val) => handleSelectChange("source", val)}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Select Source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Web Form">Web Form</SelectItem>
                          <SelectItem value="Email">Email</SelectItem>
                          <SelectItem value="Phone">Phone</SelectItem>
                          <SelectItem value="Referral">Referral</SelectItem>
                          <SelectItem value="Campaign">Campaign</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="status">Lead Status</Label>
                      <Select name="status" value={formData.status} onValueChange={(val) => handleSelectChange("status", val)}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Open" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Open">Open</SelectItem>
                          <SelectItem value="Contacted">Contacted</SelectItem>
                          <SelectItem value="Qualified">Qualified</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="assigned_to">Assigned To</Label>
                      <Select name="assigned_to" value={formData.assigned_to} onValueChange={(val) => handleSelectChange("assigned_to", val)}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Alex Morgan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Alex Morgan">Alex Morgan</SelectItem>
                          <SelectItem value="John Doe">John Doe</SelectItem>
                          <SelectItem value="Jane Smith">Jane Smith</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Address Details */}
            {activeSection === "address" && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-green-600" />
                    Address Details
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="street">Street Address</Label>
                      <Input
                        id="street"
                        name="street"
                        value={formData.street}
                        onChange={handleChange}
                        placeholder="123 Business Blvd, Suite 200"
                        className="mt-1.5"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          placeholder="New York"
                          className="mt-1.5"
                        />
                      </div>

                      <div>
                        <Label htmlFor="state">State / Province</Label>
                        <Input
                          id="state"
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          placeholder="NY"
                          className="mt-1.5"
                        />
                      </div>

                      <div>
                        <Label htmlFor="zip_code">Zip Code</Label>
                        <Input
                          id="zip_code"
                          name="zip_code"
                          value={formData.zip_code}
                          onChange={handleChange}
                          placeholder="10001"
                          className="mt-1.5"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Select name="country" value={formData.country} onValueChange={(val) => handleSelectChange("country", val)}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="United States" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="United States">United States</SelectItem>
                          <SelectItem value="Canada">Canada</SelectItem>
                          <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                          <SelectItem value="Australia">Australia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Internal Notes */}
            {activeSection === "notes" && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-slate-600" />
                    Internal Notes
                  </h3>
                  
                  <div>
                    <Label htmlFor="notes">Remarks</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="Add any initial notes about the lead, meeting summary, or next steps here..."
                      rows={6}
                      className="mt-1.5 resize-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </form>
        </AnimatedCard>
      </div>
    </div>
  )
}
