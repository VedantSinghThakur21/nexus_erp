import { Users, FileText, FolderKanban, BarChart3, Wallet, Clock } from "lucide-react";

const BentoFeatures = () => {
  const features = [
    {
      icon: Users,
      title: "Intelligent CRM",
      description: "AI-powered customer relationships. Predict churn, identify opportunities, automate outreach.",
      size: "large",
      gradient: "from-blue-500/20 to-transparent",
    },
    {
      icon: FileText,
      title: "Smart Invoicing",
      description: "Generate, send, and track invoices automatically. Let AI handle collections.",
      size: "small",
      gradient: "from-green-500/20 to-transparent",
    },
    {
      icon: FolderKanban,
      title: "Project Management",
      description: "Visual project tracking with AI resource allocation and deadline predictions.",
      size: "small",
      gradient: "from-purple-500/20 to-transparent",
    },
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      description: "Live dashboards with predictive insights. Know your numbers before they happen.",
      size: "large",
      gradient: "from-orange-500/20 to-transparent",
    },
    {
      icon: Wallet,
      title: "Accounting",
      description: "Automated bookkeeping, reconciliation, and financial reporting.",
      size: "small",
      gradient: "from-cyan-500/20 to-transparent",
    },
    {
      icon: Clock,
      title: "Time Tracking",
      description: "Intelligent time capture and billing with AI-assisted categorization.",
      size: "small",
      gradient: "from-pink-500/20 to-transparent",
    },
  ];

  return (
    <section className="py-24 relative bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Everything you need,
            <br />
            <span className="text-blue-600">unified</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mx-auto">
            One platform for your entire business operations. 
            Modular, connected, and powered by AI.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all duration-300 group relative overflow-hidden ${
                feature.size === "large" ? "md:col-span-2 lg:col-span-2" : ""
              }`}
            >
              {/* Background gradient */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-radial ${feature.gradient} rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative z-10">
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                  <feature.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover indicator */}
                <div className="mt-4 flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                  <span>Learn more</span>
                  <span>→</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BentoFeatures;
