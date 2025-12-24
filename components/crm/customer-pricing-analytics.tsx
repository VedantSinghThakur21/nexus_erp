"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Percent, DollarSign, TrendingDown, AlertCircle, Sparkles } from "lucide-react";

interface CustomerPricingRuleAnalytics {
  total_rules_applied: number;
  total_savings: number;
  most_used_rule: {
    rule_title: string;
    usage_count: number;
    total_savings: number;
  } | null;
  recent_applications: Array<{
    transaction_type: string;
    transaction_name: string;
    rule_title: string;
    savings: number;
    date: string;
  }>;
}

interface CustomerPricingAnalyticsProps {
  customerName: string;
}

export function CustomerPricingAnalytics({ customerName }: CustomerPricingAnalyticsProps) {
  const [analytics, setAnalytics] = useState<CustomerPricingRuleAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (customerName) {
      loadAnalytics();
    }
  }, [customerName]);

  async function loadAnalytics() {
    setLoading(true);
    try {
      // TODO: Implement backend endpoint to fetch customer pricing analytics
      // This would query ERPNext for all quotations and sales orders
      // where pricing rules were applied for this customer
      
      // Mock data for now
      setTimeout(() => {
        setAnalytics({
          total_rules_applied: 12,
          total_savings: 45000,
          most_used_rule: {
            rule_title: "Heavy Equipment 10% Discount",
            usage_count: 5,
            total_savings: 25000,
          },
          recent_applications: [
            {
              transaction_type: "Quotation",
              transaction_name: "QTN-2024-00123",
              rule_title: "Heavy Equipment 10% Discount",
              savings: 5000,
              date: "2024-12-20",
            },
            {
              transaction_type: "Sales Order",
              transaction_name: "SO-2024-00089",
              rule_title: "Long Term Rental Discount",
              savings: 8000,
              date: "2024-12-15",
            },
          ],
        });
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Failed to load pricing analytics:", error);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Pricing Rules Impact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics || analytics.total_rules_applied === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Pricing Rules Impact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-slate-400 mb-3" />
            <p className="text-slate-600 dark:text-slate-400">
              No pricing rules have been applied to this customer yet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          Pricing Rules Impact
        </CardTitle>
        <CardDescription>
          Automatic discounts and pricing adjustments applied
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-600 dark:text-slate-400">Total Rules Applied</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {analytics.total_rules_applied}
            </p>
          </div>
          
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <p className="text-sm text-green-700 dark:text-green-400">Total Savings</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">
              ₹{analytics.total_savings.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Most Used Rule */}
        {analytics.most_used_rule && (
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
            <h4 className="text-sm font-medium text-purple-900 dark:text-purple-300 mb-2">
              Most Frequently Applied Rule
            </h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-purple-900 dark:text-purple-100">
                  {analytics.most_used_rule.rule_title}
                </p>
                <p className="text-sm text-purple-700 dark:text-purple-400">
                  Applied {analytics.most_used_rule.usage_count} times
                </p>
              </div>
              <div className="flex items-center gap-1 text-lg font-bold text-green-700 dark:text-green-400">
                <TrendingDown className="h-5 w-5" />
                ₹{analytics.most_used_rule.total_savings.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Recent Applications */}
        {analytics.recent_applications.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Recent Applications
            </h4>
            <div className="space-y-2">
              {analytics.recent_applications.map((app, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {app.transaction_type}
                      </Badge>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {app.transaction_name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {app.rule_title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(app.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 font-semibold text-green-700 dark:text-green-400">
                    <TrendingDown className="h-4 w-4" />
                    ₹{app.savings.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
