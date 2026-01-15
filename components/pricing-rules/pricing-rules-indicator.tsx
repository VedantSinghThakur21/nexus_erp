"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Percent, DollarSign, Calculator, CheckCircle2, AlertCircle } from "lucide-react";
import { getApplicablePricingRules } from "@/app/actions/apply-pricing-rules";

interface AppliedRule {
  rule_name: string;
  rule_title?: string;
  discount_percentage?: number;
  discount_amount?: number;
  rate?: number;
  apply_on: string;
}

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
  const [applicableRules, setApplicableRules] = useState<AppliedRule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (transactionDate) {
      loadApplicableRules();
    }
  }, [customer, customerGroup, territory, transactionDate, itemGroups]);

  async function loadApplicableRules() {
    setLoading(true);
    try {
      const rules = await getApplicablePricingRules({
        customer,
        customer_group: customerGroup,
        territory,
        transaction_date: transactionDate,
        item_groups: itemGroups,
      });
      setApplicableRules(rules);
    } catch (error) {
      console.error("Failed to load applicable pricing rules:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            Checking applicable pricing rules...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (applicableRules.length === 0) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-base">Applicable Pricing Rules</CardTitle>
        </div>
        <CardDescription>
          {applicableRules.length} pricing {applicableRules.length === 1 ? "rule" : "rules"} will be automatically applied to matching items
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {applicableRules.map((rule, index) => (
          <div
            key={`${rule.rule_name}-${index}`}
            className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-white p-3 dark:border-blue-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h4 className="font-medium text-slate-900 dark:text-white">
                  {rule.rule_title || rule.rule_name}
                </h4>
                <p className="text-xs text-slate-500">
                  Applies to: <span className="font-medium">{rule.apply_on}</span>
                </p>
              </div>
              <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                Auto-applied
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {rule.discount_percentage && (
                <div className="flex items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <Percent className="h-3 w-3" />
                  {rule.discount_percentage}% Discount
                </div>
              )}
              
              {rule.discount_amount && (
                <div className="flex items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <DollarSign className="h-3 w-3" />
                  ₹{rule.discount_amount} Discount
                </div>
              )}
              
              {rule.rate && (
                <div className="flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  <Calculator className="h-3 w-3" />
                  Rate: ₹{rule.rate}
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
