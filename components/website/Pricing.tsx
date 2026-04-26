"use client";

import Link from "next/link";
import { Check, ArrowUpRight } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    description: "For small teams getting started",
    features: [
      "Up to 2 users",
      "50 equipment assets",
      "Basic telemetry",
      "Community support",
      "Standard reports",
    ],
    cta: "Get Started",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Professional",
    price: "₹2,999",
    period: "/month",
    description: "For growing operations",
    features: [
      "Up to 10 users",
      "1,000 equipment assets",
      "Advanced AI predictions",
      "Priority support",
      "Custom dashboards",
      "CRM & Deal pipeline",
      "API access",
    ],
    cta: "Deploy Instance",
    href: "/signup",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "₹9,999",
    period: "/month",
    description: "For large-scale fleet operations",
    features: [
      "Unlimited users",
      "Unlimited assets",
      "Real-time telemetry",
      "24/7 dedicated support",
      "White-label option",
      "Custom integrations",
      "SLA guarantee",
      "On-premise deployment",
    ],
    cta: "Contact Sales",
    href: "/signup",
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <section className="py-32 bg-[#080808] border-t border-white/5" id="pricing">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="font-mono text-sm text-orange-500 uppercase tracking-widest mb-4">
            Pricing
          </h2>
          <h3 className="text-4xl md:text-5xl font-semibold tracking-tighter text-white mb-4">
            Simple, transparent pricing.
          </h3>
          <p className="text-neutral-400 text-lg max-w-xl mx-auto">
            Start free. Scale when ready. No hidden fees.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 flex flex-col justify-between transition-colors ${
                plan.highlight
                  ? "bg-[#0F0F10] border-2 border-orange-500/40 shadow-[0_0_40px_-10px_rgba(249,115,22,0.2)]"
                  : "bg-[#0A0A0A] border border-white/10 hover:border-white/20"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-orange-500 text-black text-[10px] font-mono font-bold uppercase tracking-widest rounded-full">
                  Most Popular
                </div>
              )}

              <div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  {plan.name}
                </h4>
                <p className="text-sm text-neutral-500 mb-6">
                  {plan.description}
                </p>

                <div className="mb-8">
                  <span className="text-4xl font-bold font-mono text-white">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-neutral-500 text-sm">
                      {plan.period}
                    </span>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-3 text-sm text-neutral-300"
                    >
                      <Check className="w-4 h-4 text-orange-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={plan.href}
                className={`w-full flex items-center justify-center gap-2 px-6 py-4 font-semibold text-sm tracking-tight transition-all ${
                  plan.highlight
                    ? "bg-white text-black hover:bg-neutral-200"
                    : "bg-white/5 text-white border border-white/10 hover:bg-white/10"
                }`}
              >
                {plan.cta}
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
