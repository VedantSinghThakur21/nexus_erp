'use client'

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const Pricing = () => {
  const plans = [
    {
      name: "Starter",
      price: "₹49",
      period: "/month",
      description: "Perfect for small teams getting started",
      features: [
        "Up to 5 team members",
        "Core ERP modules",
        "1,000 API calls/month",
        "Email support",
        "Basic analytics",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Growth",
      price: "₹149",
      period: "/month",
      description: "For growing businesses with bigger needs",
      features: [
        "Up to 25 team members",
        "All ERP modules",
        "50,000 API calls/month",
        "Priority support",
        "Advanced analytics",
        "2 AI Agents included",
        "Custom integrations",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large organizations with custom needs",
      features: [
        "Unlimited team members",
        "All modules + custom",
        "Unlimited API calls",
        "24/7 dedicated support",
        "Custom AI agents",
        "On-premise option",
        "SLA guarantee",
        "White-label available",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <section className="py-24 relative bg-slate-50 dark:bg-slate-950" id="pricing">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-100/50 to-white dark:from-slate-950 dark:via-slate-900/50 dark:to-slate-950" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Simple, transparent
            <br />
            <span className="text-blue-600">pricing</span>
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mx-auto">
            Start free, scale as you grow. No hidden fees, no surprises.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 transition-all duration-300 ${
                plan.popular
                  ? "border-blue-600 bg-white dark:bg-slate-900 shadow-xl scale-105 z-10"
                  : "border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:border-blue-600/30"
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-medium">
                  Most Popular
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-slate-900 dark:text-white">
                    {plan.price}
                  </span>
                  <span className="text-slate-500">{plan.period}</span>
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  {plan.description}
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-600 dark:text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link href={plan.cta === "Contact Sales" ? "/contact" : "/login"}>
                <Button
                  variant={plan.popular ? "default" : "outline"}
                  className={`w-full ${plan.popular ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                  size="lg"
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <p className="text-center text-sm text-slate-500 mt-12">
          All plans include a 14-day free trial. No credit card required.
        </p>
      </div>
    </section>
  );
};

export default Pricing;

