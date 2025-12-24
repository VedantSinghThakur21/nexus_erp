"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Percent, DollarSign, Calculator, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { getPricingRule, updatePricingRule, deletePricingRule, getCustomerGroups, getTerritories } from "@/app/actions/pricing-rules";
import { getItemGroups } from "@/app/actions/invoices";

export default function EditPricingRulePage({ params }: { params: Promise<{ name: string }> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [ruleName, setRuleName] = useState("");
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
    async function loadData() {
      const { name } = await params;
      setRuleName(decodeURIComponent(name));
      
      try {
        const [rule, groups, custGroups, terr] = await Promise.all([
          getPricingRule(decodeURIComponent(name)),
          getItemGroups(),
          getCustomerGroups(),
          getTerritories(),
        ]);

        if (rule) {
          setTitle(rule.title);
          setApplyOn(rule.apply_on);
          setItemGroup(rule.item_group || "");
          setRateOrDiscount(rule.rate_or_discount);
          setDiscountPercentage(rule.discount_percentage?.toString() || "");
          setDiscountAmount(rule.discount_amount?.toString() || "");
          setRate(rule.rate?.toString() || "");
          setCustomerGroup(rule.customer_group || "");
          setTerritory(rule.territory || "");
          setValidFrom(rule.valid_from || "");
          setValidUpto(rule.valid_upto || "");
          setMinQty(rule.min_qty?.toString() || "");
          setMaxQty(rule.max_qty?.toString() || "");
          setPriority(rule.priority?.toString() || "");
        }

        setItemGroups(groups);
        setCustomerGroups(custGroups);
        setTerritories(terr);
      } catch (error) {
        console.error("Failed to load pricing rule:", error);
        alert("Failed to load pricing rule details");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
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

      await updatePricingRule(ruleName, formData);
      router.push("/pricing-rules");
    } catch (error) {
      console.error("Failed to update pricing rule:", error);
      alert("Failed to update pricing rule. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this pricing rule? This action cannot be undone.")) {
      return;
    }

    setDeleting(true);
    try {
      await deletePricingRule(ruleName);
      router.push("/pricing-rules");
    } catch (error) {
      console.error("Failed to delete pricing rule:", error);
      alert("Failed to delete pricing rule. Please try again.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link href="/pricing-rules">
            <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent hover:text-blue-600 mb-4">
              <ArrowLeft className="h-4 w-4" /> Back to Pricing Rules
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Edit Pricing Rule
              </h1>
              <p className="text-slate-500 mt-1">{ruleName}</p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-2"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Rule
                </>
              )}
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Rule name and application settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Rule Name *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Apply On</Label>
                  <Input value={applyOn} disabled className="bg-slate-100 dark:bg-slate-800" />
                  <p className="text-xs text-slate-500">Cannot be changed after creation</p>
                </div>

                {applyOn === "Item Group" && (
                  <div className="space-y-2">
                    <Label>Item Group</Label>
                    <Input value={itemGroup || "All Groups"} disabled className="bg-slate-100 dark:bg-slate-800" />
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
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rate_or_discount">Action Type *</Label>
                <Select value={rateOrDiscount} onValueChange={setRateOrDiscount}>
                  <SelectTrigger id="rate_or_discount">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Discount Percentage">Discount Percentage</SelectItem>
                    <SelectItem value="Discount Amount">Discount Amount</SelectItem>
                    <SelectItem value="Rate">Rate Override</SelectItem>
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
                      value={discountPercentage}
                      onChange={(e) => setDiscountPercentage(e.target.value)}
                      required
                    />
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
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
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      required
                    />
                    <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
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
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      required
                    />
                    <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conditions */}
          <Card>
            <CardHeader>
              <CardTitle>Conditions</CardTitle>
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
                      <SelectItem value="">All Customers</SelectItem>
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
                      <SelectItem value="">All Territories</SelectItem>
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
                    value={minQty}
                    onChange={(e) => setMinQty(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_qty">Maximum Quantity</Label>
                  <Input
                    id="max_qty"
                    type="number"
                    step="1"
                    value={maxQty}
                    onChange={(e) => setMaxQty(e.target.value)}
                  />
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
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Higher priority rules are applied first
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
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
