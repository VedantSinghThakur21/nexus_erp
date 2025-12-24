import { Zap, Puzzle, Brain, Server } from "lucide-react";

const HeadlessAdvantage = () => {
  const advantages = [
    {
      icon: Zap,
      title: "Lightning Speed",
      description: "API-first architecture means instant data access. No more waiting for clunky interfaces to load.",
      metric: "10x faster",
    },
    {
      icon: Puzzle,
      title: "Total Customization",
      description: "Build your perfect workflow. Connect any frontend, any tool, any integration — without limitations.",
      metric: "Infinite flexibility",
    },
    {
      icon: Brain,
      title: "AI-Ready Infrastructure",
      description: "Purpose-built for autonomous agents. Your AI workforce has native access to all business data.",
      metric: "Native AI support",
    },
  ];

  return (
    <section className="py-24 relative bg-white dark:bg-slate-950" id="features">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50/50 to-white dark:from-slate-950 dark:via-slate-900/50 dark:to-slate-950" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-xs text-slate-500 mb-4">
            <Server className="w-3 h-3" />
            The Headless Advantage
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Why headless beats
            <br />
            <span className="text-blue-600">traditional ERPs</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mx-auto">
            Legacy ERPs lock you into rigid workflows and outdated interfaces. 
            Nexus gives you the power with none of the constraints.
          </p>
        </div>

        {/* Comparison Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {advantages.map((advantage, index) => (
            <div
              key={advantage.title}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 group"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                <advantage.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>

              {/* Metric Badge */}
              <div className="inline-block px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-medium mb-4">
                {advantage.metric}
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                {advantage.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                {advantage.description}
              </p>
            </div>
          ))}
        </div>

        {/* VS Traditional */}
        <div className="mt-16 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Traditional ERP */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-500">
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-sm font-medium">Traditional ERP</span>
              </div>
              <ul className="space-y-3">
                {[
                  "Monolithic, all-in-one software",
                  "Locked vendor ecosystem",
                  "Months of implementation",
                  "Rigid, predefined workflows",
                  "No native AI capabilities",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-slate-500">
                    <span className="text-red-500 mt-1">✗</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Nexus */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
                <span className="text-sm font-medium">Nexus Headless ERP</span>
              </div>
              <ul className="space-y-3">
                {[
                  "Modular, API-first platform",
                  "Open ecosystem, any integration",
                  "Deploy in days, not months",
                  "Custom workflows, your way",
                  "Built-in Agentic AI workforce",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-slate-900 dark:text-white">
                    <span className="text-blue-600 mt-1">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeadlessAdvantage;

