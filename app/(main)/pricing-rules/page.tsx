"use client";

import { useState, useEffect } from "react";
import { getPricingRules, togglePricingRuleStatus } from "@/app/actions/pricing-rules";
import { PricingRulesClient } from "@/components/pricing-rules/pricing-rules-client";

interface PricingRule {
  name: string;
  title: string;
  apply_on: string;
  items?: { item_code: string }[];
  item_group?: string;
  selling?: number;
  buying?: number;
  rate_or_discount: string;
  discount_percentage?: number;
  discount_amount?: number;
  rate?: number;
  price_or_product_discount: string;
  apply_rule_on_other?: string;
  other_item_code?: string;
  customer?: string;
  customer_group?: string;
  territory?: string;
  valid_from?: string;
  valid_upto?: string;
  min_qty?: number;
  max_qty?: number;
  disable?: number;
  priority?: number;
}

export default function PricingRulesPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    setLoading(true);
    try {
      const data = await getPricingRules();
      setRules(data);
    } catch (error) {
      console.error("Failed to load pricing rules:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(ruleName: string, currentStatus: number) {
    try {
      await togglePricingRuleStatus(ruleName, currentStatus === 0 ? 1 : 0);
      await loadRules();
    } catch (error) {
      console.error("Failed to toggle rule status:", error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-slate-500">Loading pricing rules...</div>
      </div>
    );
  }

  return <PricingRulesClient rules={rules} onToggleStatus={handleToggleStatus} />;
}
