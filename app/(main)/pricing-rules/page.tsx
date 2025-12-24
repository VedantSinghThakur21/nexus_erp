"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Settings, TrendingUp, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { getPricingRules, togglePricingRuleStatus } from "@/app/actions/pricing-rules";

interface PricingRule {
  name: string;
  title: string;
  apply_on: string; // "Item Code", "Item Group", "Brand"
  items?: { item_code: string }[];
  item_group?: string;
  selling?: number; // 1 for selling rules
  buying?: number;
  rate_or_discount: string; // "Discount Percentage", "Discount Amount", "Rate"
  discount_percentage?: number;
  discount_amount?: number;
  rate?: number;
  price_or_product_discount: string; // "Price", "Product"
  apply_rule_on_other?: string;
  other_item_code?: string;
  customer?: string;
  customer_group?: string;
  territory?: string;
  valid_from?: string;
  valid_upto?: string;
  min_qty?: number;
  max_qty?: number;
  disable?: number; // 0 or 1
  priority?: number;
}

export default function PricingRulesPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [businessTypeFilter, setBusinessTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

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

  const filteredRules = rules.filter((rule) => {
    const matchesSearch = rule.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "All" || 
      (statusFilter === "Active" && rule.disable === 0) ||
      (statusFilter === "Inactive" && rule.disable === 1);

    return matchesSearch && matchesStatus;
  });

  const activeRulesCount = rules.filter(r => r.disable === 0).length;
  const totalDiscountRules = rules.filter(r => r.rate_or_discount.includes("Discount")).length;

  return (
    <div suppressHydrationWarning className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-8">
      <div suppressHydrationWarning className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Pricing Rules
            </h1>
            <p className="text-slate-500 mt-1">
              Automate conditional pricing for quotations, sales orders, and invoices
            </p>
          </div>
          <Link href="/pricing-rules/new">
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Create Rule
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeRulesCount}</div>
              <p className="text-xs text-slate-500">
                {rules.length - activeRulesCount} inactive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Discount Rules</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDiscountRules}</div>
              <p className="text-xs text-slate-500">
                {rules.length - totalDiscountRules} rate override
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
              <Settings className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rules.length}</div>
              <p className="text-xs text-slate-500">
                Across all business types
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Rules</CardTitle>
            <CardDescription>Search and filter pricing rules by status or business type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by rule name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={businessTypeFilter} onValueChange={setBusinessTypeFilter}>
                <SelectTrigger className="w-full md:w-[220px]">
                  <SelectValue placeholder="Business Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Business Types</SelectItem>
                  <SelectItem value="Heavy Equipment Rental">Heavy Equipment Rental</SelectItem>
                  <SelectItem value="Construction Services">Construction Services</SelectItem>
                  <SelectItem value="Consulting">Consulting</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Rules List */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing Rules ({filteredRules.length})</CardTitle>
            <CardDescription>Manage and monitor your pricing rules</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-slate-500">Loading pricing rules...</div>
              </div>
            ) : filteredRules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  No pricing rules found
                </h3>
                <p className="text-slate-500 mb-4">
                  {searchQuery || statusFilter !== "All" || businessTypeFilter !== "All"
                    ? "Try adjusting your filters"
                    : "Get started by creating your first pricing rule"}
                </p>
                {!searchQuery && statusFilter === "All" && businessTypeFilter === "All" && (
                  <Link href="/pricing-rules/new">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create First Rule
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRules.map((rule) => (
                  <div
                    key={rule.name}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {rule.title}
                        </h3>
                        <Badge variant={rule.disable === 0 ? "default" : "secondary"}>
                          {rule.disable === 0 ? "Active" : "Inactive"}
                        </Badge>
                        {rule.priority && (
                          <Badge variant="outline">Priority: {rule.priority}</Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <strong>Apply On:</strong> {rule.apply_on}
                          {rule.item_group && ` (${rule.item_group})`}
                        </span>
                        
                        {rule.rate_or_discount === "Discount Percentage" && rule.discount_percentage && (
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <strong>Discount:</strong> {rule.discount_percentage}%
                          </span>
                        )}
                        
                        {rule.rate_or_discount === "Discount Amount" && rule.discount_amount && (
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <strong>Discount:</strong> ₹{rule.discount_amount}
                          </span>
                        )}
                        
                        {rule.rate_or_discount === "Rate" && rule.rate && (
                          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <strong>Rate:</strong> ₹{rule.rate}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        {rule.customer_group && (
                          <Badge variant="outline">Customer Group: {rule.customer_group}</Badge>
                        )}
                        {rule.territory && (
                          <Badge variant="outline">Territory: {rule.territory}</Badge>
                        )}
                        {rule.min_qty && (
                          <Badge variant="outline">Min Qty: {rule.min_qty}</Badge>
                        )}
                        {rule.valid_from && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(rule.valid_from).toLocaleDateString()}
                            {rule.valid_upto && ` - ${new Date(rule.valid_upto).toLocaleDateString()}`}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 md:mt-0">
                      <Button
                        variant={rule.disable === 0 ? "outline" : "default"}
                        size="sm"
                        onClick={() => handleToggleStatus(rule.name, rule.disable || 0)}
                      >
                        {rule.disable === 0 ? "Disable" : "Enable"}
                      </Button>
                      <Link href={`/pricing-rules/${rule.name}`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
