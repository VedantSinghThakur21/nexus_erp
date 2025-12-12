import Link from "next/link"; // <--- Import Next.js Link
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50/50 dark:to-slate-950/50" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/5 text-sm text-blue-600 dark:text-blue-400">
            <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
            Introducing Agentic AI for Enterprise
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white leading-tight">
            The Operating System
            <br />
            <span className="text-blue-600">for Modern Business</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Replace your legacy ERP with a headless, AI-powered platform. 
            CRM, Invoicing, Accounting — unified and autonomous.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/login">
                <Button size="lg" className="h-12 px-8 text-lg gap-2">
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
                </Button>
            </Link>
            
            <Link href="/demo">
                <Button variant="outline" size="lg" className="h-12 px-8 text-lg gap-2">
                <Play className="w-5 h-5" />
                Book Demo
                </Button>
            </Link>
          </div>

          {/* Dashboard Mockup */}
          <div className="relative mt-16 mx-auto max-w-5xl">
            <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden shadow-2xl shadow-blue-500/5">
              {/* Glow Effect */}
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-blue-500/20 rounded-full blur-[80px]" />
              
              {/* Browser Chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="max-w-md mx-auto h-6 rounded-md bg-slate-200/50 dark:bg-slate-800/50 flex items-center justify-center text-xs text-slate-500">
                    app.avariq.com/dashboard
                  </div>
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="p-6 min-h-[400px] bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-900">
                {/* Top Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Revenue", value: "$847,291", change: "+12.5%" },
                    { label: "Orders", value: "1,284", change: "+8.2%" },
                    { label: "Customers", value: "3,847", change: "+15.3%" },
                    { label: "AI Tasks", value: "2,156", change: "+32.1%" },
                  ].map((stat) => (
                    <div key={stat.label} className="p-4 rounded-xl bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800">
                      <p className="text-xs text-slate-500">{stat.label}</p>
                      <p className="text-xl font-semibold text-slate-900 dark:text-white mt-1">{stat.value}</p>
                      <p className="text-xs text-blue-600 mt-1">{stat.change}</p>
                    </div>
                  ))}
                </div>

                {/* Chart Placeholder */}
                <div className="h-48 rounded-xl bg-slate-100/50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 flex items-end justify-around px-4 pb-4">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((height, i) => (
                    <div
                      key={i}
                      className="w-6 md:w-8 rounded-t bg-gradient-to-t from-blue-600/60 to-blue-600"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -left-8 top-1/4 p-4 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-blue-500/20 shadow-lg hidden lg:block">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <span className="text-blue-600 text-lg">🤖</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">AI Agent Active</p>
                  <p className="text-xs text-slate-500">Processing 47 invoices</p>
                </div>
              </div>
            </div>

            <div className="absolute -right-8 top-1/3 p-4 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-blue-500/20 shadow-lg hidden lg:block">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <span className="text-green-500 text-lg">✓</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Payment Collected</p>
                  <p className="text-xs text-slate-500">$12,450 from Acme Corp</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
