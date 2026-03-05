"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { getApplicablePricingRules } from "@/app/actions/apply-pricing-rules";

interface PricingRulesIndicatorProps {
  customer?: string;
  customerGroup?: string;
  territory?: string;
  transactionDate: string;
  itemGroups?: string[];
}

export function PricingRulesIndicator({
  customer,
  customerGroup,
  territory,
  transactionDate,
  itemGroups = [],
}: PricingRulesIndicatorProps) {
  const [ruleCount, setRuleCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!transactionDate) return;
    setLoading(true);
    getApplicablePricingRules({
      customer,
      customer_group: customerGroup,
      territory,
      transaction_date: transactionDate,
      item_groups: itemGroups,
    })
      .then(rules => setRuleCount(rules.length))
      .catch(() => setRuleCount(0))
      .finally(() => setLoading(false));
  }, [customer, customerGroup, territory, transactionDate, itemGroups]);

  if (loading || ruleCount === 0) return null;

  return (
    <div className="flex items-center gap-2 px-1 py-1 text-sm text-blue-600 dark:text-blue-400">
      <Sparkles className="h-4 w-4" />
      <span>{ruleCount} pricing {ruleCount === 1 ? 'rule' : 'rules'} available</span>
    </div>
  );
}
