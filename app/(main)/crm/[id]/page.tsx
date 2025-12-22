import { frappeRequest } from "@/app/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Mail, Phone, MapPin } from "lucide-react"
import Link from "next/link"
import { EditLeadSheet } from "@/components/crm/edit-lead-sheet"
import { ConvertLeadDialog } from "@/components/crm/convert-lead-dialog"

// Fetch single lead data from ERPNext
async function getLead(id: string) {
  // Decode the ID because URLs replace spaces with %20
  const leadName = decodeURIComponent(id)
  
  try {
    // Fetch all fields (*) for this specific lead using the standard REST API
    const lead = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Lead',
      name: leadName
    })
    return lead
  } catch (e) {
    console.error("Error fetching lead:", e)
    return null
  }
}

// Next.js 15: Page props must define params as a Promise
export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // 1. Await the params to get the ID (Mandatory in Next.js 15)
  const { id } = await params
  
  // 2. Fetch data
  const lead = await getLead(id)

  if (!lead) {
    return (
      <div className="p-8 flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Lead Not Found</h1>
        <p className="text-muted-foreground">The lead "{id}" could not be found in ERPNext.</p>
        <Link href="/crm">
          <Button variant="outline">Back to CRM</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Back Button */}
      <Link href="/crm">
        <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent hover:text-blue-600">
          <ArrowLeft className="h-4 w-4" /> Back to Leads
        </Button>
      </Link>

      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{lead.lead_name}</h1>
          <p className="text-slate-500">{lead.company_name}</p>
        </div>
        <div className="flex gap-2 items-center">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                lead.status === 'Lead' ? 'bg-gray-100 text-gray-800' :
                lead.status === 'Open' ? 'bg-blue-100 text-blue-800' : 
                lead.status === 'Replied' ? 'bg-cyan-100 text-cyan-800' :
                lead.status === 'Interested' ? 'bg-purple-100 text-purple-800' :
                lead.status === 'Opportunity' ? 'bg-orange-100 text-orange-800' :
                lead.status === 'Quotation' ? 'bg-yellow-100 text-yellow-800' :
                lead.status === 'Converted' ? 'bg-green-100 text-green-800' :
                lead.status === 'Do Not Contact' ? 'bg-red-100 text-red-800' :
                'bg-slate-100 text-slate-800'
            }`}>
                {lead.status}
            </span>
            
            {/* Show Convert button for Interested leads */}
            {(lead.status === 'Interested' || lead.status === 'Replied') && (
              <ConvertLeadDialog leadId={lead.name} leadName={lead.lead_name} />
            )}
            
            {/* The Edit Drawer Component */}
            <EditLeadSheet lead={lead} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: Contact Info */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-slate-400" />
                <a href={`mailto:${lead.email_id}`} className="text-blue-600 hover:underline break-all">
                    {lead.email_id || "No email"}
                </a>
            </div>
            <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-slate-400" />
                <span>{lead.mobile_no || "No phone"}</span>
            </div>
            <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>{lead.city ? `${lead.city}, ${lead.country}` : "No Location"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: The "Details" (Notes, Address, etc) */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Lead Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium text-slate-500">Source</label>
                    <p className="text-slate-900 dark:text-slate-200">{lead.source || "Unknown"}</p>
                </div>
                <div>
                    <label className="text-sm font-medium text-slate-500">Territory</label>
                    <p className="text-slate-900 dark:text-slate-200">{lead.territory || "All Territories"}</p>
                </div>
                <div className="col-span-2">
                    <label className="text-sm font-medium text-slate-500">Notes</label>
                    <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-md text-sm text-slate-700 dark:text-slate-300 min-h-[100px]">
                        {/* We use a safe fallback if notes are HTML from ERPNext */}
                        {lead.notes ? (
                            <div className="whitespace-pre-wrap">{lead.notes}</div>
                        ) : (
                            "No notes added yet."
                        )}
                    </div>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
