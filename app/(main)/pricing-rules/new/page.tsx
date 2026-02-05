"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Percent, DollarSign, Calculator, Users, MapPin, Calendar, Package } from "lucide-react";
import Link from "next/link";
import { createPricingRule, getCustomerGroups, getTerritories, getItemGroups } from "@/app/actions/pricing-rules";

export default function CreatePricingRulePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [itemGroups, setItemGroups] = useState<string[]>([]);
  const [customerGroups, setCustomerGroups] = useState<string[]>([]);
  const [territories, setTerritories] = useState<string[]>([]);

  // Form state
  const [title, setTitle] = useState("");
  const [applyOn, setApplyOn] = useState("Item Group");
  const [itemGroup, setItemGroup] = useState("");
  const [rateOrDiscount, setRateOrDiscount] = useState("Discount Percentage");
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [rate, setRate] = useState("");
  const [customerGroup, setCustomerGroup] = useState("");
  const [territory, setTerritory] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUpto, setValidUpto] = useState("");
  const [minQty, setMinQty] = useState("");
  const [maxQty, setMaxQty] = useState("");
  const [priority, setPriority] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      console.log('[Pricing Rule Form] Loading data...');
      const [groups, custGroups, terr] = await Promise.all([
        getItemGroups(),
        getCustomerGroups(),
        getTerritories(),
      ]);
      console.log('[Pricing Rule Form] Item Groups loaded:', groups.length);
      setItemGroups(groups);
      setCustomerGroups(custGroups);
      setTerritories(terr);
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); // Clear previous errors
    
    console.log('[Pricing Rule Form] Submit initiated');
    console.log('[Pricing Rule Form] Apply On:', applyOn);
    console.log('[Pricing Rule Form] Item Group:', itemGroup);
    
    // Client-side validation
    if (applyOn === "Item Group" && !itemGroup) {
      setError("Please select an Item Group");
      console.warn('[Pricing Rule Form] Validation failed: Item Group required');
      return;
    }
    
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("apply_on", applyOn);
      if (itemGroup) formData.append("item_group", itemGroup);
      formData.append("rate_or_discount", rateOrDiscount);
      if (discountPercentage) formData.append("discount_percentage", discountPercentage);
      if (discountAmount) formData.append("discount_amount", discountAmount);
      if (rate) formData.append("rate", rate);
      if (customerGroup) formData.append("customer_group", customerGroup);
      if (territory) formData.append("territory", territory);
      if (validFrom) formData.append("valid_from", validFrom);
      if (validUpto) formData.append("valid_upto", validUpto);
      if (minQty) formData.append("min_qty", minQty);
      if (maxQty) formData.append("max_qty", maxQty);
      if (priority) formData.append("priority", priority);

      await createPricingRule(formData);
      router.push("/pricing-rules");
    } catch (error: any) {
      console.error("Failed to create pricing rule:", error);
      setError(error?.message || "Failed to create pricing rule. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div suppressHydrationWarning className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-8">
      <div suppressHydrationWarning className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link href="/pricing-rules">
            <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent hover:text-blue-600 mb-4">
              <ArrowLeft className="h-4 w-4" /> Back to Pricing Rules
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Create Pricing Rule
          </h1>
          <p className="text-slate-500 mt-1">
            Set up automated conditional pricing for your business
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Basic Information
              </CardTitle>
              <CardDescription>Define the rule name and what it applies to</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Rule Name *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Heavy Equipment 10% Discount"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <p className="text-xs text-slate-500">A descriptive name for this pricing rule</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="apply_on">Apply On *</Label>
                  <Select value={applyOn} onValueChange={setApplyOn}>
                    <SelectTrigger id="apply_on">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Item Group">Item Group</SelectItem>
                      <SelectItem value="Item Code">Item Code</SelectItem>
                      <SelectItem value="Brand">Brand</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {applyOn === "Item Group" && (
                  <div className="space-y-2">
                    <Label htmlFor="item_group">Item Group *</Label>
                    <Select value={itemGroup} onValueChange={setItemGroup} required>
                      <SelectTrigger id="item_group" className={!itemGroup ? "border-red-300" : ""}>
                        <SelectValue placeholder={itemGroups.length === 0 ? "Loading..." : "Select an Item Group"} />
                      </SelectTrigger>
                      <SelectContent>
                        {itemGroups.length === 0 ? (
                          <div className="px-2 py-1 text-sm text-slate-500">Loading item groups...</div>
                        ) : (
                          itemGroups.map((group) => (
                            <SelectItem key={group} value={group}>
                              {group}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">Required when applying rule to Item Group</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pricing Action */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-green-600" />
                Pricing Action
              </CardTitle>
              <CardDescription>Define the discount or rate to apply</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rate_or_discount">Action Type *</Label>
                <Select value={rateOrDiscount} onValueChange={setRateOrDiscount}>
                  <SelectTrigger id="rate_or_discount">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Discount Percentage">
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Discount Percentage
                      </div>
                    </SelectItem>
                    <SelectItem value="Discount Amount">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Discount Amount
                      </div>
                    </SelectItem>
                    <SelectItem value="Rate">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Rate Override
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {rateOrDiscount === "Discount Percentage" && (
                <div className="space-y-2">
                  <Label htmlFor="discount_percentage">Discount Percentage *</Label>
                  <div className="relative">
                    <Input
                      id="discount_percentage"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 10"
                      value={discountPercentage}
                      onChange={(e) => setDiscountPercentage(e.target.value)}
                      required
                    />
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500">Enter the percentage discount to apply</p>
                </div>
              )}

              {rateOrDiscount === "Discount Amount" && (
                <div className="space-y-2">
                  <Label htmlFor="discount_amount">Discount Amount *</Label>
                  <div className="relative">
                    <Input
                      id="discount_amount"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 500"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      required
                    />
                    <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500">Enter the fixed discount amount</p>
                </div>
              )}

              {rateOrDiscount === "Rate" && (
                <div className="space-y-2">
                  <Label htmlFor="rate">New Rate *</Label>
                  <div className="relative">
                    <Input
                      id="rate"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 1500"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      required
                    />
                    <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500">Enter the new rate to override the default price</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conditions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Conditions (Optional)
              </CardTitle>
              <CardDescription>Set conditions for when this rule applies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_group">Customer Group</Label>
                  <Select value={customerGroup} onValueChange={setCustomerGroup}>
                    <SelectTrigger id="customer_group">
                      <SelectValue placeholder="All Customers" />
                    </SelectTrigger>
                    <SelectContent>
                      {customerGroups.map((group) => (
                        <SelectItem key={group} value={group}>
                          {group}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="territory">Territory</Label>
                  <Select value={territory} onValueChange={setTerritory}>
                    <SelectTrigger id="territory">
                      <SelectValue placeholder="All Territories" />
                    </SelectTrigger>
                    <SelectContent>
                      {territories.map((terr) => (
                        <SelectItem key={terr} value={terr}>
                          {terr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_qty">Minimum Quantity</Label>
                  <Input
                    id="min_qty"
                    type="number"
                    step="1"
                    placeholder="e.g., 10"
                    value={minQty}
                    onChange={(e) => setMinQty(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">Rule applies when quantity exceeds this</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_qty">Maximum Quantity</Label>
                  <Input
                    id="max_qty"
                    type="number"
                    step="1"
                    placeholder="e.g., 100"
                    value={maxQty}
                    onChange={(e) => setMaxQty(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">Rule applies when quantity is below this</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valid_from">Valid From</Label>
                  <Input
                    id="valid_from"
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valid_upto">Valid Until</Label>
                  <Input
                    id="valid_upto"
                    type="date"
                    value={validUpto}
                    onChange={(e) => setValidUpto(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  step="1"
                  placeholder="e.g., 1"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Higher priority rules are applied first when multiple rules match
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Link href="/pricing-rules">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={loading || !title || (applyOn === "Item Group" && !itemGroup)} 
              className="gap-2"
            >
              {loading ? (
                "Creating..."
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Pricing Rule
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
