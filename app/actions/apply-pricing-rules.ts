"use server";

import { frappeRequest } from "@/app/lib/api";

interface PricingRuleMatch {
  rule_name: string;
  rule_title?: string;
  discount_percentage?: number;
  discount_amount?: number;
  rate?: number;
  apply_on?: string;
}

type PricingRuleDoc = {
  name: string;
  title?: string;
  apply_on?: string;
  item_group?: string;
  rate_or_discount?: string;
  discount_percentage?: number;
  discount_amount?: number;
  rate?: number;
  customer?: string;
  customer_group?: string;
  territory?: string;
  min_qty?: number;
  max_qty?: number;
  valid_from?: string;
  valid_upto?: string;
  priority?: number;
  disable?: number;
};

async function fetchActivePricingRules(): Promise<PricingRuleDoc[]> {
  try {
    const list = await frappeRequest(
      "frappe.client.get_list",
      "GET",
      {
        doctype: "Pricing Rule",
        fields: JSON.stringify(["name"]),
        filters: JSON.stringify([["disable", "=", 0]]),
        limit_page_length: 200,
      }
    );

    if (!Array.isArray(list)) return [];

    const rules = await Promise.all(
      list.map(async (entry) => {
        try {
          return await frappeRequest("frappe.client.get", "GET", {
            doctype: "Pricing Rule",
            name: entry.name,
          });
        } catch (err) {
          console.error(`Failed to fetch pricing rule ${entry.name}:`, err);
          return null;
        }
      })
    );

    return rules.filter((rule): rule is PricingRuleDoc => Boolean(rule));
  } catch (error) {
    console.error("Failed to fetch pricing rules list:", error);
    return [];
  }
}

// Apply pricing rules to quotation items
export async function applyPricingRules(params: {
  customer?: string;
  customer_group?: string;
  territory?: string;
  transaction_date: string;
  items: Array<{
    item_code: string;
    item_group?: string;
    qty: number;
    rate: number;
  }>;
}): Promise<{
  items: Array<{
    item_code: string;
    rate: number;
    discount_percentage?: number;
    discount_amount?: number;
    pricing_rule?: string;
  }>;
  applied_rules: PricingRuleMatch[];
}> {
  try {
    const rules = await fetchActivePricingRules();
    const appliedRules: PricingRuleMatch[] = [];
    const processedItems = params.items.map((item) => {
      // Find matching rules for this item
      const matchingRules = rules.filter((rule) => {
        // Check if rule applies to this item
        if (rule.apply_on === "Item Group" && rule.item_group) {
          if (rule.item_group !== item.item_group) return false;
        }

        // Check customer conditions
        if (rule.customer && rule.customer !== params.customer) return false;
        if (rule.customer_group && rule.customer_group !== params.customer_group) return false;
        if (rule.territory && rule.territory !== params.territory) return false;

        // Check quantity conditions
        if (rule.min_qty && item.qty < rule.min_qty) return false;
        if (rule.max_qty && item.qty > rule.max_qty) return false;

        // Check date validity
        if (rule.valid_from && params.transaction_date < rule.valid_from) return false;
        if (rule.valid_upto && params.transaction_date > rule.valid_upto) return false;

        return true;
      });

      // Sort by priority (higher priority first)
      matchingRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));

      // Apply the highest priority rule
      if (matchingRules.length > 0) {
        const rule = matchingRules[0];
        
        const ruleMatch: PricingRuleMatch = {
          rule_name: rule.name,
          rule_title: rule.title,
          apply_on: rule.apply_on,
        };

        let newRate = item.rate;
        let discountPercentage: number | undefined;
        let discountAmount: number | undefined;

        if (rule.rate_or_discount === "Discount Percentage" && rule.discount_percentage) {
          discountPercentage = rule.discount_percentage;
          ruleMatch.discount_percentage = rule.discount_percentage;
        } else if (rule.rate_or_discount === "Discount Amount" && rule.discount_amount) {
          discountAmount = rule.discount_amount;
          ruleMatch.discount_amount = rule.discount_amount;
        } else if (rule.rate_or_discount === "Rate" && rule.rate) {
          newRate = rule.rate;
          ruleMatch.rate = rule.rate;
        }

        appliedRules.push(ruleMatch);

        return {
          item_code: item.item_code,
          rate: newRate,
          discount_percentage: discountPercentage,
          discount_amount: discountAmount,
          pricing_rule: rule.name,
        };
      }

      return {
        item_code: item.item_code,
        rate: item.rate,
      };
    });

    return {
      items: processedItems,
      applied_rules: appliedRules,
    };
  } catch (error) {
    console.error("Error applying pricing rules:", error);
    return {
      items: params.items.map((item) => ({
        item_code: item.item_code,
        rate: item.rate,
      })),
      applied_rules: [],
    };
  }
}

// Get applicable pricing rules preview (for UI display)
export async function getApplicablePricingRules(params: {
  customer?: string;
  customer_group?: string;
  territory?: string;
  transaction_date: string;
  item_groups?: string[];
}): Promise<PricingRuleMatch[]> {
  try {
    const rules = await fetchActivePricingRules();
    
    return rules
      .filter((rule) => {
        // Check customer conditions
        if (rule.customer && rule.customer !== params.customer) return false;
        if (rule.customer_group && rule.customer_group !== params.customer_group) return false;
        if (rule.territory && rule.territory !== params.territory) return false;

        // Check date validity
        if (rule.valid_from && params.transaction_date < rule.valid_from) return false;
        if (rule.valid_upto && params.transaction_date > rule.valid_upto) return false;

        // Check item groups if specified
        if (params.item_groups && params.item_groups.length > 0) {
          if (rule.apply_on === "Item Group" && rule.item_group) {
            if (!params.item_groups.includes(rule.item_group)) return false;
          }
        }

        return true;
      })
      .map((rule) => ({
        rule_name: rule.name,
        rule_title: rule.title,
        apply_on: rule.apply_on,
        discount_percentage: rule.discount_percentage,
        discount_amount: rule.discount_amount,
        rate: rule.rate,
      }));
  } catch (error) {
    console.error("Error getting applicable pricing rules:", error);
    return [];
  }
}
