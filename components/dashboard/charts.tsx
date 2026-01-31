// (file removed)
'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

interface Activity {
  type: string
  title: string
  description: string
  value: string
  color: string
}

export function DashboardCharts({ revenueData, recentActivity }: { revenueData: any[], recentActivity: Activity[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7" suppressHydrationWarning>
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={revenueData}>
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: any) => `₹${Number(value ?? 0).toLocaleString('en-IN')}`}
              />
              <Tooltip 
                cursor={{fill: 'transparent'}}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar
                dataKey="total"
                fill="currentColor"
                radius={[4, 4, 0, 0]}
                className="fill-primary"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8" suppressHydrationWarning>
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center" suppressHydrationWarning>
                  <div className="ml-4 space-y-1" suppressHydrationWarning>
                    <p className="text-sm font-medium leading-none">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                  </div>
                  <div className={`ml-auto font-medium text-sm ${activity.color}`} suppressHydrationWarning>{activity.value}</div>
                </div>
              ))
            ) : (
              <div className="text-center text-sm text-muted-foreground py-8" suppressHydrationWarning>
                No recent activity
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

