import { frappeRequest } from "@/app/lib/api"
import { getDashboardStats } from "@/app/actions/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Truck, Calendar, Wallet, ArrowRight } from "lucide-react"
import Link from "next/link"
import { DashboardCharts } from "@/components/dashboard/charts"

// Helper to get user name
async function getUser() {
  try {
    const userEmail = await frappeRequest('frappe.auth.get_logged_user')
    // Fetch full user details using the REST API directly
    const userRes = await fetch(`${process.env.ERP_NEXT_URL}/api/resource/User/${userEmail}`, {
       headers: { 
         'Authorization': `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}` 
       },
       cache: 'no-store'
    })
    const userData = await userRes.json()
    return userData.data || { full_name: 'User' }
  } catch (e) {
    return { full_name: 'User' }
  }
}

// Helper to get Chart Data (Revenue History)
async function getRevenueData() {
    try {
        const invoices = await frappeRequest('frappe.client.get_list', 'GET', {
            doctype: 'Sales Invoice',
            fields: '["grand_total", "posting_date"]',
            filters: '[["docstatus", "=", 1]]', // Submitted only
            order_by: 'posting_date asc',
            limit_page_length: 1000
        });

        // Get last 6 months
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const now = new Date();
        const last6Months = [];
        
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            last6Months.push(months[d.getMonth()]);
        }

        // Group by Month
        const monthlyData: Record<string, number> = {};
        last6Months.forEach(month => monthlyData[month] = 0);
        
        invoices.forEach((inv: any) => {
            const date = new Date(inv.posting_date);
            const month = months[date.getMonth()];
            if (monthlyData.hasOwnProperty(month)) {
                monthlyData[month] += inv.grand_total;
            }
        });

        // Convert to array for Recharts
        return last6Months.map(key => ({
            name: key,
            total: Math.round(monthlyData[key])
        }));
    } catch (e) {
        return [];
    }
}

// Helper to get Recent Activity
async function getRecentActivity() {
    try {
        const activities = [];
        
        // Get latest lead
        const leads = await frappeRequest('frappe.client.get_list', 'GET', {
            doctype: 'Lead',
            fields: '["name", "lead_name", "source", "creation"]',
            order_by: 'creation desc',
            limit_page_length: 1
        });
        if (leads.length > 0) {
            const lead = leads[0];
            activities.push({
                type: 'lead',
                title: 'New Lead Created',
                description: `${lead.lead_name} via ${lead.source || 'Direct'}`,
                value: 'Just now',
                color: 'text-slate-500'
            });
        }
        
        // Get latest paid invoice
        const invoices = await frappeRequest('frappe.client.get_list', 'GET', {
            doctype: 'Sales Invoice',
            fields: '["name", "customer_name", "grand_total", "currency"]',
            filters: '[["status", "=", "Paid"]]',
            order_by: 'modified desc',
            limit_page_length: 1
        });
        if (invoices.length > 0) {
            const inv = invoices[0];
            activities.push({
                type: 'invoice',
                title: 'Invoice Paid',
                description: `${inv.customer_name} - ${inv.name}`,
                value: `+₹${inv.grand_total.toLocaleString('en-IN')}`,
                color: 'text-green-600'
            });
        }
        
        // Get latest booking
        const bookings = await frappeRequest('frappe.client.get_list', 'GET', {
            doctype: 'Sales Order',
            fields: '["name", "customer_name", "status"]',
            filters: '[["status", "not in", ["Completed", "Cancelled"]]]',
            order_by: 'creation desc',
            limit_page_length: 1
        });
        if (bookings.length > 0) {
            const booking = bookings[0];
            activities.push({
                type: 'booking',
                title: 'Machine Booked',
                description: `${booking.customer_name} - ${booking.name}`,
                value: 'Active',
                color: 'text-blue-600'
            });
        }
        
        return activities;
    } catch (e) {
        console.error('Error fetching activity:', e);
        return [];
    }
}

export default async function DashboardPage() {
  const user = await getUser()
  const stats = await getDashboardStats()
  const revenueData = await getRevenueData()
  const recentActivity = await getRecentActivity()

  return (
    <div className="p-8 space-y-8" suppressHydrationWarning>
      {/* Welcome Section */}
      <div className="flex justify-between items-end" suppressHydrationWarning>
        <div suppressHydrationWarning>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Welcome back, {user.full_name?.split(' ')[0]}
            </h1>
            <p className="text-slate-500 mt-2">Here's what's happening in your business today.</p>
        </div>
        <div className="flex gap-2" suppressHydrationWarning>
             {/* Quick Actions */}
            <Link href="/crm/new"><Button variant="outline" size="sm">Add Lead</Button></Link>
            <Link href="/invoices/new"><Button size="sm">New Invoice</Button></Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" suppressHydrationWarning>
        
        {/* Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" suppressHydrationWarning>₹{stats.revenue.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">Collected to date</p>
          </CardContent>
        </Card>

        {/* Active Rentals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rentals</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" suppressHydrationWarning>{stats.active_bookings}</div>
            <Link href="/bookings" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                View schedule <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Fleet Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fleet Health</CardTitle>
            <Truck className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" suppressHydrationWarning>{stats.fleet_status}</div>
            <p className="text-xs text-muted-foreground">Operational Machines</p>
          </CardContent>
        </Card>

        {/* Sales Pipeline */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Leads</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" suppressHydrationWarning>{stats.open_leads}</div>
            <p className="text-xs text-muted-foreground">Potential Customers</p>
          </CardContent>
        </Card>
      </div>

      {/* NEW: Charts & Activity */}
      <DashboardCharts revenueData={revenueData} recentActivity={recentActivity} />

      {/* Quick Links / "Apps" View */}
      <div suppressHydrationWarning>
        <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Your Apps</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4" suppressHydrationWarning>
            {[
                { name: 'CRM', icon: Users, color: 'text-purple-600', bg: 'bg-purple-100', href: '/crm' },
                { name: 'Invoices', icon: Wallet, color: 'text-green-600', bg: 'bg-green-100', href: '/invoices' },
                { name: 'Fleet', icon: Truck, color: 'text-orange-600', bg: 'bg-orange-100', href: '/fleet' },
                { name: 'Bookings', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100', href: '/bookings' },
            ].map((app) => (
                <Link key={app.name} href={app.href}>
                    <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 border rounded-xl hover:shadow-md transition-all cursor-pointer group h-32" suppressHydrationWarning>
                        <div className={`p-3 rounded-lg ${app.bg} mb-3 group-hover:scale-110 transition-transform`} suppressHydrationWarning>
                            <app.icon className={`h-6 w-6 ${app.color}`} />
                        </div>
                        <span className="font-medium text-sm text-slate-700 dark:text-slate-300">{app.name}</span>
                    </div>
                </Link>
            ))}
        </div>
      </div>
    </div>
  )
}
