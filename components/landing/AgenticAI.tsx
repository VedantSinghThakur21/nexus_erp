import { Bot, DollarSign, UserSearch, FileText, Mail, TrendingUp } from "lucide-react";

const AgenticAI = () => {
  const agents = [
    {
      icon: DollarSign,
      name: "The Collector",
      role: "Automated AR Agent",
      description: "Autonomously chases outstanding invoices, sends reminders, and escalates when needed. Collects payments while you sleep.",
      stats: "Avg 34% faster collections",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "group-hover:border-green-500/50",
    },
    {
      icon: UserSearch,
      name: "The Recruiter",
      role: "Talent Acquisition Agent",
      description: "Screens resumes, schedules interviews, and nurtures candidates through your pipeline. Never miss great talent.",
      stats: "Screen 500+ resumes/day",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "group-hover:border-blue-500/50",
    },
    {
      icon: FileText,
      name: "The Analyst",
      role: "Financial Intelligence Agent",
      description: "Monitors cash flow, flags anomalies, and generates insights. Your always-on CFO assistant.",
      stats: "Real-time financial insights",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      borderColor: "group-hover:border-purple-500/50",
    },
    {
      icon: Mail,
      name: "The Coordinator",
      role: "Operations Agent",
      description: "Manages vendor communications, purchase orders, and supply chain logistics autonomously.",
      stats: "Handles 1000+ tasks/week",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      borderColor: "group-hover:border-orange-500/50",
    },
  ];

  return (
    <section className="py-24 relative bg-white dark:bg-slate-950 overflow-hidden" id="agents">
      {/* Background Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-600 dark:text-blue-400 mb-4">
            <Bot className="w-3 h-3" />
            Agentic AI
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Meet your
            <br />
            <span className="text-blue-600">AI Workforce</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mx-auto">
            Autonomous AI agents that work 24/7. They don't just assist — 
            they execute. Trained on your business data, aligned with your goals.
          </p>
        </div>

        {/* Agents Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {agents.map((agent, index) => (
            <div
              key={agent.name}
              className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group relative overflow-hidden ${agent.borderColor}`}
            >
              {/* Gradient overlay on hover */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none ${agent.bgColor.replace('/10', '')}`} />
              
              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${agent.bgColor} flex items-center justify-center`}>
                      <agent.icon className={`w-6 h-6 ${agent.color}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{agent.name}</h3>
                      <p className="text-sm text-slate-500 font-medium">{agent.role}</p>
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${agent.color.replace('text-', 'bg-')} animate-pulse`} />
                </div>

                {/* Description */}
                <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm leading-relaxed">
                  {agent.description}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-2 text-sm bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <TrendingUp className={`w-4 h-4 ${agent.color}`} />
                  <span className={`font-semibold ${agent.color}`}>{agent.stats}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <p className="text-slate-500 mb-4">
            Custom agents built for your specific workflows
          </p>
          <a href="#" className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-2 transition-colors">
            Explore all agents
            <span>→</span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default AgenticAI;

