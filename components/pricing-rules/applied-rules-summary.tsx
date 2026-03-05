"use client";

import { Badge } from "@/components/ui/badge";
import { Percent, DollarSign, Tag } from "lucide-react";

interface AppliedPricingRule {
  rule_name: string;
  rule_title: string;
  item_code: string;
  item_name: string;
  original_rate: number;
  final_rate: number;
  discount_percentage?: number;
  discount_amount?: number;
  savings?: number;
}

interface AppliedRulesSummaryProps {
  appliedRules: AppliedPricingRule[];
}

export function AppliedRulesSummary({ appliedRules }: AppliedRulesSummaryProps) {
  if (appliedRules.length === 0) return null;

  const totalSavings = appliedRules.reduce((sum, r) => sum + Number(r.savings ?? 0), 0);

  return (
    <div className="flex items-center gap-3 px-1 py-2 text-sm">
      <Tag className="h-4 w-4 text-green-600 shrink-0" />
      <span className="text-slate-600 dark:text-slate-400">
        {appliedRules.length === 1 ? '1 pricing rule' : `${appliedRules.length} pricing rules`} applied
      </span>
      {appliedRules.map((rule, i) => (
        <Badge key={`${rule.rule_name}-${i}`} variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
          {rule.discount_percentage ? (
            <><Percent className="h-3 w-3" />{rule.discount_percentage}%</>
          ) : rule.discount_amount ? (
            <><DollarSign className="h-3 w-3" />₹{rule.discount_amount}</>
          ) : null}
          <span className="text-xs font-normal">{rule.rule_title}</span>
        </Badge>
      ))}
      {totalSavings > 0 && (
        <span className="text-green-600 dark:text-green-400 font-medium ml-auto">
          Saving ₹{totalSavings.toLocaleString('en-IN')}
        </span>
      )}
    </div>
  );
}
