'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AnimatedCard, AnimatedButton } from "@/components/ui/animated"
import { User, Building2, Target, MapPin, FileText, ChevronRight } from "lucide-react"
import { createLead } from "@/app/actions/crm"
import { getTeamMembers } from "@/app/actions/team"
import { useRouter } from 'next/navigation'

const sections = [
  { id: 'basic', label: 'Basic Information', icon: User },
  { id: 'company', label: 'Company Data', icon: Building2 },
  { id: 'tracking', label: 'Tracking & Assignment', icon: Target },
  { id: 'address', label: 'Address Details', icon: MapPin },
  { id: 'notes', label: 'Internal Notes', icon: FileText }
]

export default function ERPNextLeadForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [activeSection, setActiveSection] = useState('basic')
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  useEffect(() => {
    async function fetchTeam() {
      try {
        const members = await getTeamMembers()
        setTeamMembers(members)
      } catch (e) {
        setTeamMembers([])
      }
    }
    fetchTeam()
  }, [])

  const [formData, setFormData] = useState<any>({
    salutation: '',
    first_name: '',
    last_name: '',
    gender: '',
    job_title: '',
    email_id: '',
    mobile_no: '',
    office_phone: '',
    industry: '',
    // Tracking & Assignment
    source: '',
    status: 'Lead',
    lead_owner: '',
    assigned_to: '',
    // Address Details
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    // Other fields
    notes: '',
  })

  const updateField = (field: string, value: string) => {
    setFormData((prev: typeof formData) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation for mandatory fields
    if (!formData.first_name) {
      alert('First name is required')
      setActiveSection('basic')
      return
    }
    
    if (!formData.email_id) {
      alert('Email address is required')
      setActiveSection('basic')
      return
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email_id)) {
      alert('Please enter a valid email address')
      setActiveSection('basic')
      return
    }
    
    if (!formData.mobile_no) {
      alert('Mobile phone is required')
      setActiveSection('basic')
      return
    }
    if (!formData.industry) {
      alert('Industry is required')
      setActiveSection('company')
      return
    }
    
    if (!formData.source) {
      alert('Lead source is required')
      setActiveSection('tracking')
      return
    }
    
    if (!formData.city) {
      alert('City is required')
      setActiveSection('address')
      return
    }
    
    if (!formData.state) {
      alert('State/Province is required')
      setActiveSection('address')
      return
    }
    
    setLoading(true)

    try {
      const result = await createLead(formData)
      if (result.success) {
        router.push('/crm')
      } else {
        // Parse error message for better user experience
        let errorMsg = result.error || 'Failed to create lead'
        if (errorMsg.includes('Email Address must be unique')) {
          errorMsg = 'This email address is already registered in the system. Please use a different email or check existing leads.'
        } else if (errorMsg.includes('Could not find Source')) {
          errorMsg = 'Invalid lead source selected. Please choose a valid source from the dropdown.'
        }
        alert(errorMsg)
      }
    } catch (error) {
      console.error('Failed to create lead:', error)
      alert('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function renderSectionContent() {
    switch (activeSection) {
      case 'basic':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Salutation</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  value={formData.salutation}
                  onChange={(e) => updateField('salutation', e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="Mr">Mr</option>
                  <option value="Ms">Ms</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Dr">Dr</option>
                  <option value="Prof">Prof</option>
                </select>
              </div>
              <div>
                <Label>First Name *</Label>
                <Input
                  required
                  placeholder="e.g. Jane"
                  value={formData.first_name}
                  onChange={(e) => updateField('first_name', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input
                  placeholder="e.g. Doe"
                  value={formData.last_name}
                  onChange={(e) => updateField('last_name', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Gender</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  value={formData.gender || ''}
                  onChange={(e) => updateField('gender', e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <Label>Job Title</Label>
                <Input
                  placeholder="e.g. Founder"
                  value={formData.job_title || ''}
                  onChange={(e) => updateField('job_title', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Email Address *</Label>
                <Input
                  required
                  type="email"
                  placeholder="e.g. user@email.com"
                  value={formData.email_id}
                  onChange={(e) => updateField('email_id', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Mobile Phone *</Label>
                <Input
                  required
                  placeholder="e.g. +919876543210"
                  value={formData.mobile_no}
                  onChange={(e) => updateField('mobile_no', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Office Phone</Label>
                <Input
                  placeholder="e.g. +1 585-0101"
                  value={formData.office_phone || ''}
                  onChange={(e) => updateField('office_phone', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                type="button"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
                onClick={() => setActiveSection('company')}
              >
                Next
              </button>
            </div>
          </div>
        )

      case 'company':
        return (
          <div className="space-y-4">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Company Name *</Label>
                <Input
                  required
                  placeholder="e.g. Acme Corp"
                  value={formData.company_name}
                  onChange={(e) => updateField('company_name', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Website</Label>
                <Input
                  placeholder="https://example.com"
                  value={formData.website}
                  onChange={(e) => updateField('website', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Industry *</Label>
                <select
                  required
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  value={formData.industry}
                  onChange={e => updateField('industry', e.target.value)}
                >
                  <option value="">Select Industry</option>
                  <option value="Agriculture">Agriculture</option>
                  <option value="Automotive">Automotive</option>
                  <option value="Banking">Banking</option>
                  <option value="Construction">Construction</option>
                  <option value="Consulting">Consulting</option>
                  <option value="Education">Education</option>
                  <option value="Energy">Energy</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Finance">Finance</option>
                  <option value="Government">Government</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Hospitality">Hospitality</option>
                  <option value="Insurance">Insurance</option>
                  <option value="IT">IT</option>
                  <option value="Legal">Legal</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Media">Media</option>
                  <option value="Nonprofit">Nonprofit</option>
                  <option value="Pharmaceutical">Pharmaceutical</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Retail">Retail</option>
                  <option value="Telecommunications">Telecommunications</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Number of Employees</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  value={formData.no_of_employees}
                  onChange={(e) => updateField('no_of_employees', e.target.value)}
                >
                  <option value="">Select Range</option>
                  <option value="1-10">1-10</option>
                  <option value="11-50">11-50</option>
                  <option value="51-200">51-200</option>
                  <option value="201-500">201-500</option>
                  <option value="501-1000">501-1000</option>
                  <option value="1000+">1000+</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                type="button"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
                onClick={() => setActiveSection('tracking')}
              >
                Next
              </button>
            </div>
          </div>
        )

      case 'tracking':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Lead Source *</Label>
                <select
                  required
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  value={formData.source}
                  onChange={(e) => updateField('source', e.target.value)}
                >
                  <option value="">Select Source</option>
                  <option value="Existing Customer">Existing Customer</option>
                  <option value="Reference">Reference</option>
                  <option value="Advertisement">Advertisement</option>
                  <option value="Cold Calling">Cold Calling</option>
                  <option value="Exhibition">Exhibition</option>
                  <option value="Supplier Reference">Supplier Reference</option>
                  <option value="Mass Mailing">Mass Mailing</option>
                  <option value="Customer's Vendor">Customer's Vendor</option>
                  <option value="Campaign">Campaign</option>
                  <option value="Walk In">Walk In</option>
                </select>
              </div>
              <div>
                <Label>Lead Status</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  value={formData.status}
                  onChange={(e) => updateField('status', e.target.value)}
                >
                  <option value="Lead">Lead</option>
                  <option value="Open">Open</option>
                  <option value="Replied">Replied</option>
                  <option value="Opportunity">Opportunity</option>
                  <option value="Quotation">Quotation</option>
                  <option value="Lost Quotation">Lost Quotation</option>
                  <option value="Interested">Interested</option>
                  <option value="Converted">Converted</option>
                  <option value="Do Not Contact">Do Not Contact</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Assigned To</Label>
                <select
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  value={formData.lead_owner}
                  onChange={(e) => updateField('lead_owner', e.target.value)}
                >
                  <option value="">Select team member</option>
                  {teamMembers.map((member) => (
                    <option key={member.name} value={member.name}>
                      {member.first_name || member.name} {member.last_name || ''} ({member.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                type="button"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
                onClick={() => setActiveSection('address')}
              >
                Next
              </button>
            </div>
          </div>
        )

      case 'address':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Street Address</Label>
                <Input
                  placeholder="123 Business Blvd, Suite 200"
                  value={formData.address_line1}
                  onChange={(e) => updateField('address_line1', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>City *</Label>
                <Input
                  required
                  placeholder="New York"
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>State / Province *</Label>
                <Input
                  required
                  placeholder="NY"
                  value={formData.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Zip Code</Label>
                <Input
                  placeholder="10001"
                  value={formData.pincode}
                  onChange={(e) => updateField('pincode', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Country *</Label>
                <select
                  required
                  className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                  value={formData.country}
                  onChange={(e) => updateField('country', e.target.value)}
                >
                  <option value="">Select Country</option>
                  <option value="United States">United States</option>
                  <option value="India">India</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                type="button"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
                onClick={() => setActiveSection('notes')}
              >
                Next
              </button>
            </div>
          </div>
        )

      case 'notes':
        return (
          <div className="space-y-4">
            <div>
              <Label>Remarks</Label>
              <Textarea
                placeholder="Add any initial notes about the lead, meeting summary, or next steps here..."
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                rows={8}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end mt-6">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
              >
                Save Lead
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl lg:text-4xl font-bold text-slate-900 dark:text-white">
            Create New Lead
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Enter the details below to add a new prospect to the system.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <AnimatedButton 
            type="submit" 
            variant="neon"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Lead'}
          </AnimatedButton>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <span>CRM</span>
        <ChevronRight className="w-4 h-4" />
        <span>Leads</span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-slate-900 dark:text-white">New Lead</span>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar Navigation */}
        <div className="col-span-12 lg:col-span-3">
          <AnimatedCard>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
                SECTIONS
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                        activeSection === section.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-600'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{section.label}</span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </AnimatedCard>
        </div>

        {/* Main Content Area */}
        <div className="col-span-12 lg:col-span-9">
          <AnimatedCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {(() => {
                  const ActiveIcon = sections.find(s => s.id === activeSection)?.icon || User
                  return <ActiveIcon className="w-5 h-5" />
                })()}
                {sections.find(s => s.id === activeSection)?.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderSectionContent()}
            </CardContent>
          </AnimatedCard>
        </div>
      </div>
    </form>
  )
}
