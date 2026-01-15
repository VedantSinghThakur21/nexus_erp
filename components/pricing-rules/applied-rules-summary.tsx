"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Percent, DollarSign, Calculator, TrendingDown, Sparkles } from "lucide-react";

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
  if (appliedRules.length === 0) {
    return null;
  }

  const totalSavings = appliedRules.reduce(
    (sum, rule) => sum + Number(rule.savings ?? 0),
    0
  );

  // Group rules by rule name
  const groupedRules = appliedRules.reduce((acc, rule) => {
    const key = rule.rule_name;
    if (!acc[key]) {
      acc[key] = {
        rule_title: rule.rule_title,
        items: [],
        totalSavings: 0,
      };
    }
    acc[key].items.push(rule);
    acc[key].totalSavings += Number(rule.savings ?? 0);
    return acc;
  }, {} as Record<string, { rule_title: string; items: AppliedPricingRule[]; totalSavings: number }>);

  return (
    <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-green-600" />
          <CardTitle className="text-base">Applied Pricing Rules</CardTitle>
        </div>
        <CardDescription>
          {appliedRules.length} {appliedRules.length === 1 ? "rule" : "rules"} applied • Total savings: ₹{Number(totalSavings ?? 0).toFixed(2)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(groupedRules).map(([ruleName, data]) => (
          <div
            key={ruleName}
            className="rounded-lg border border-green-200 bg-white p-3 dark:border-green-800 dark:bg-slate-900"
          >
            <div className="mb-2 flex items-start justify-between">
              <div>
                <h4 className="font-medium text-slate-900 dark:text-white">
                  {data.rule_title}
                </h4>
                <p className="text-xs text-slate-500">
                  Applied to {data.items.length} {data.items.length === 1 ? "item" : "items"}
                </p>
              </div>
              <div className="flex items-center gap-1 text-sm font-semibold text-green-700 dark:text-green-400">
                <TrendingDown className="h-4 w-4" />
                ₹{Number(data.totalSavings ?? 0).toFixed(2)}
              </div>
            </div>

            <div className="space-y-1.5">
              {data.items.map((rule, index) => (
                <div
                  key={`${rule.item_code}-${index}`}
                  className="flex items-center justify-between rounded-md bg-slate-50 p-2 text-xs dark:bg-slate-800/50"
                >
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {rule.item_name}
                  </span>
                  <div className="flex items-center gap-2">
                    {rule.discount_percentage && (
                      <Badge variant="outline" className="h-5 gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <Percent className="h-3 w-3" />
                        {rule.discount_percentage}%
                      </Badge>
                    )}
                    {rule.discount_amount && (
                      <Badge variant="outline" className="h-5 gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <DollarSign className="h-3 w-3" />
                        ₹{rule.discount_amount}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 line-through">
                        ₹{Number(rule.original_rate ?? 0).toFixed(2)}
                      </span>
                      <span className="font-semibold text-green-700 dark:text-green-400">
                        ₹{Number(rule.final_rate ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
