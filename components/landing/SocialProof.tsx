const SocialProof = () => {
  const logos = [
    { name: "Acme Corp", initials: "AC" },
    { name: "TechStart", initials: "TS" },
    { name: "Innovate", initials: "IN" },
    { name: "FutureScale", initials: "FS" },
    { name: "DataFlow", initials: "DF" },
    { name: "CloudNine", initials: "C9" },
  ];

  return (
    <section className="py-16 border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 mb-8">
          Trusted by forward-thinking companies
        </p>
        
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
          {logos.map((logo) => (
            <div
              key={logo.name}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-300 cursor-default"
            >
              <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold">
                {logo.initials}
              </div>
              <span className="text-lg font-medium">{logo.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProof;

