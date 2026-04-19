import { frappeRequest } from "@/app/lib/api" import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card" import { Button } from "@/components/ui/button" import { ArrowLeft, Calendar, TrendingUp, User, Building2, DollarSign } from "lucide-react" import Link from "next/link" import { getOpportunity } from "@/app/actions/crm" import { OpportunityActions } from "@/components/crm/opportunity-actions" import { EditOpportunityDialog } from "@/components/crm/edit-opportunity-dialog" import { DeleteOpportunityForm } from "@/components/crm/delete-opportunity-form" import { StatusBadge } from "@/components/ui/status-badge" export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params const opportunityName = decodeURIComponent(id) let opportunity try { opportunity = await getOpportunity(opportunityName) } catch (e) { console.error("Error fetching opportunity:", e) return ( <div className="p-8 flex flex-col gap-4">
<h1 className="text-2xl font-bold">Opportunity Not Found</h1>
<p className="text-muted-foreground">The opportunity "{opportunityName}" could not be found.</p>
<Link href="/crm/opportunities">
<Button variant="outline">Back to Pipeline</Button>
</Link>
</div> ) } if (!opportunity) { return ( <div className="p-8 flex flex-col gap-4">
<h1 className="text-2xl font-bold">Opportunity Not Found</h1>
<p className="text-muted-foreground">The opportunity "{opportunityName}" could not be found.</p>
<Link href="/crm/opportunities">
<Button variant="outline">Back to Pipeline</Button>
</Link>
</div> ) } // Sales stage colors (ERPNext default stages) // Check if opportunity is closed (won or lost) const isClosed = opportunity.status === 'Converted' || opportunity.status === 'Lost' return ( <div className="p-8 space-y-6"> {/* Back Button */} <Link href="/crm/opportunities">
<Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent hover:text-blue-600">
<ArrowLeft className="h-4 w-4" /> Back to Pipeline </Button>
</Link> {/* Header Section */} <div className="flex justify-between items-start">
<div>
<h1 className="text-3xl font-bold tracking-tight text-foreground"> {opportunity.opportunity_from === 'Lead' ? opportunity.party_name : opportunity.customer_name} </h1>
<p className="text-muted-foreground">{opportunity.opportunity_type}</p>
</div>
<div className="flex gap-2 items-center">
<EditOpportunityDialog opportunity={opportunity} /> {/* Delete Button: Only show if Open */} {opportunity.status === 'Open' && ( <DeleteOpportunityForm opportunityId={opportunity.name} /> )} {/* Show status badge for closed opportunities */} {isClosed ? ( <StatusBadge status={opportunity.status === 'Converted' ? 'Completed' : opportunity.status} /> ) : ( <>
<StatusBadge status={opportunity.sales_stage} />
<StatusBadge status={opportunity.probability >= 60 ? "Interested" : "Pending"} />
</> )} </div>
</div> {/* Stats Cards */} <div className="grid md:grid-cols-4 gap-4">
<Card>
<CardHeader className="flex flex-row items-center justify-between pb-2">
<CardTitle className="text-sm font-medium text-muted-foreground">Opportunity Value</CardTitle>
<DollarSign className="h-4 w-4 text-muted-foreground" />
</CardHeader>
<CardContent>
<div className="text-2xl font-bold">₹{(opportunity.opportunity_amount || 0).toLocaleString('en-IN')}</div>
</CardContent>
</Card>
<Card>
<CardHeader className="flex flex-row items-center justify-between pb-2">
<CardTitle className="text-sm font-medium text-muted-foreground">Expected Close</CardTitle>
<Calendar className="h-4 w-4 text-muted-foreground" />
</CardHeader>
<CardContent>
<div className="text-2xl font-bold"> {opportunity.expected_closing ? new Date(opportunity.expected_closing).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Not set'} </div>
</CardContent>
</Card>
<Card>
<CardHeader className="flex flex-row items-center justify-between pb-2">
<CardTitle className="text-sm font-medium text-muted-foreground">Source</CardTitle>
<TrendingUp className="h-4 w-4 text-muted-foreground" />
</CardHeader>
<CardContent>
<div className="text-lg font-semibold">{opportunity.source || 'Direct'}</div>
</CardContent>
</Card>
<Card>
<CardHeader className="flex flex-row items-center justify-between pb-2">
<CardTitle className="text-sm font-medium text-muted-foreground">Territory</CardTitle>
<Building2 className="h-4 w-4 text-muted-foreground" />
</CardHeader>
<CardContent>
<div className="text-lg font-semibold">{opportunity.territory || 'All'}</div>
</CardContent>
</Card>
</div>
<div className="grid md:grid-cols-3 gap-6"> {/* Left Column: Details */} <Card className="md:col-span-2">
<CardHeader>
<CardTitle className="text-lg">Opportunity Details</CardTitle>
</CardHeader>
<CardContent className="space-y-4">
<div className="grid grid-cols-2 gap-4">
<div>
<label className="text-sm font-medium text-muted-foreground">Type</label>
<p className="text-foreground">{opportunity.opportunity_type || 'Sales'}</p>
</div>
<div>
<label className="text-sm font-medium text-muted-foreground">Currency</label>
<p className="text-foreground">{opportunity.currency || 'INR'}</p>
</div>
<div>
<label className="text-sm font-medium text-muted-foreground">Contact Person</label>
<p className="text-foreground">{opportunity.contact_person || 'N/A'}</p>
</div>
<div>
<label className="text-sm font-medium text-muted-foreground">Email</label>
<p className="text-foreground">{opportunity.contact_email || 'N/A'}</p>
</div>
</div> {/* Items Table */} {opportunity.items && opportunity.items.length > 0 && ( <div className="mt-6">
<label className="text-sm font-medium text-muted-foreground mb-2 block">Items</label>
<div className="border rounded-lg overflow-hidden">
<table className="w-full text-sm">
<thead>
<tr className="border-b border-border/60 bg-muted/30">
<th className="text-left font-medium text-muted-foreground px-4 py-3">Item</th>
<th className="text-right font-medium text-muted-foreground px-4 py-3">Qty</th>
<th className="text-right font-medium text-muted-foreground px-4 py-3">Rate</th>
<th className="text-right font-medium text-muted-foreground px-4 py-3">Amount</th>
</tr>
</thead>
<tbody> {opportunity.items.map((item: Record<string, any>, idx: number) => ( <tr key={idx} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
<td className="px-4 py-3 text-foreground">{item.item_code}</td>
<td className="px-4 py-3 text-foreground text-right">{item.qty}</td>
<td className="px-4 py-3 text-foreground text-right">₹{(item.rate || 0).toLocaleString('en-IN')}</td>
<td className="px-4 py-3 text-foreground text-right font-medium">₹{(item.amount || 0).toLocaleString('en-IN')}</td>
</tr> ))} </tbody>
</table>
</div>
</div> )} {/* Notes */} <div className="mt-6">
<label className="text-sm font-medium text-muted-foreground">Notes</label>
<div className="mt-2 p-3 bg-muted rounded-md text-sm text-foreground min-h-[80px] whitespace-pre-wrap"> {opportunity.notes || 'No notes added.'} </div>
</div>
</CardContent>
</Card> {/* Right Column: Actions */} <Card className="md:col-span-1">
<CardHeader>
<CardTitle className="text-lg">Actions</CardTitle>
</CardHeader>
<CardContent>
<OpportunityActions opportunity={opportunity} />
</CardContent>
</Card>
</div>
</div> ) } 