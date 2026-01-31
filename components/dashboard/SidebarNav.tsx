import { cn } from "@/lib/utils";
import { Home, Users, FileText, Briefcase, DollarSign, Target, Trophy, Settings, Layers, BookOpen, BarChart2 } from "lucide-react";

const navSections = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", icon: Home, href: "/dashboard" },
      { label: "Leads", icon: Users, href: "/leads" },
      { label: "Opportunities", icon: FileText, href: "/opportunities" },
    ],
  },
  {
    title: "Sales",
    items: [
      { label: "Quotations", icon: FileText, href: "/quotations" },
      { label: "Sales Orders", icon: FileText, href: "/sales-orders" },
      { label: "Invoices", icon: FileText, href: "/invoices" },
      { label: "Payments", icon: DollarSign, href: "/payments" },
    ],
  },
  {
    title: "Inventory",
    items: [
      { label: "Catalogue", icon: BookOpen, href: "/catalogue" },
      { label: "Pricing Rules", icon: BarChart2, href: "/pricing-rules" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Projects", icon: Layers, href: "/projects" },
      { label: "Bookings", icon: Briefcase, href: "/bookings" },
      { label: "Inspections", icon: Target, href: "/inspections" },
      { label: "Operators", icon: Users, href: "/operators" },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Team", icon: Users, href: "/team" },
      { label: "Settings", icon: Settings, href: "/settings" },
      { label: "AI Agent", icon: Trophy, href: "/ai-agent" },
    ],
  },
];

export function SidebarNav() {
  return (
    <aside className="bg-[#181C23] text-white w-64 flex flex-col h-screen px-4 py-6">
      <div className="mb-8 flex items-center gap-2">
        <span className="font-bold text-xl">Nexus</span>
      </div>
      <nav className="flex-1 overflow-y-auto">
        {navSections.map(section => (
          <div key={section.title} className="mb-6">
            <div className="uppercase text-xs text-gray-400 mb-2">{section.title}</div>
            <ul>
              {section.items.map(item => (
                <li key={item.label} className="mb-1">
                  <a href={item.href} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#23272F] transition">
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="mt-auto flex items-center gap-3 p-3 bg-[#23272F] rounded-lg">
        <img src="/user-avatar.png" className="w-8 h-8 rounded-full" />
        <div>
          <div className="font-medium">Adrian Chen</div>
          <div className="text-xs text-gray-400">Regional Director</div>
        </div>
      </div>
    </aside>
  );
}
