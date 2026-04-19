import { getCustomers } from "@/app/actions/crm" import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card" import { Button } from "@/components/ui/button" import { ArrowLeft, Users } from "lucide-react" import Link from "next/link" export const dynamic = 'force-dynamic' export default async function CustomersPage() { const customers = await getCustomers() return ( <div className="p-8 space-y-6"> {/* Header */} <div className="flex justify-between items-center">
<div>
<h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Customers</h1>
<p className="text-muted-foreground ">View all converted customers</p>
</div>
<Link href="/crm">
<Button variant="outline" className="gap-2">
<ArrowLeft className="h-4 w-4" /> Back to Leads </Button>
</Link>
</div> {/* Stats Card */} <div className="grid md:grid-cols-3 gap-4">
<Card>
<CardHeader className="flex flex-row items-center justify-between pb-2">
<CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
<Users className="h-4 w-4 text-slate-400" />
</CardHeader>
<CardContent>
<div className="text-2xl font-bold">{customers.length}</div>
</CardContent>
</Card>
<Card>
<CardHeader className="flex flex-row items-center justify-between pb-2">
<CardTitle className="text-sm font-medium text-muted-foreground">Company Customers</CardTitle>
</CardHeader>
<CardContent>
<div className="text-2xl font-bold text-blue-600"> {customers.filter(c => c.customer_type === 'Company').length} </div>
</CardContent>
</Card>
<Card>
<CardHeader className="flex flex-row items-center justify-between pb-2">
<CardTitle className="text-sm font-medium text-muted-foreground">Individual Customers</CardTitle>
</CardHeader>
<CardContent>
<div className="text-2xl font-bold text-green-600"> {customers.filter(c => c.customer_type === 'Individual').length} </div>
</CardContent>
</Card>
</div> {/* Customers Table */} <Card>
<CardHeader>
<CardTitle>All Customers</CardTitle>
</CardHeader>
<CardContent> {customers.length === 0 ? ( <div className="text-center py-12 text-muted-foreground">
<Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
<p>No customers yet.</p>
<p className="text-sm mt-2">Convert interested leads to create customers.</p>
</div> ) : ( <div className="rounded-md border border-slate-200 dark:border-slate-800">
<table className="w-full text-sm">
<thead className="bg-slate-50 dark:bg-background font-medium text-muted-foreground">
<tr className="border-b border-border/60 bg-muted/30">
<th className="text-left font-medium text-muted-foreground px-4 py-3">Customer Name</th>
<th className="text-left font-medium text-muted-foreground px-4 py-3">Type</th>
<th className="text-left font-medium text-muted-foreground px-4 py-3">Territory</th>
<th className="text-left font-medium text-muted-foreground px-4 py-3">Email</th>
</tr>
</thead>
<tbody> {customers.map((customer) => ( <tr key={customer.name} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
<td className="px-4 py-3 text-foreground font-medium "> {customer.customer_name} </td>
<td className="px-4 py-3 text-foreground">
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"> {customer.customer_type} </span>
</td>
<td className="px-4 py-3 text-foreground ">{customer.territory}</td>
<td className="px-4 py-3 text-foreground ">{customer.email_id || 'N/A'}</td>
</tr> ))} </tbody>
</table>
</div> )} </CardContent>
</Card>
</div> ) } 