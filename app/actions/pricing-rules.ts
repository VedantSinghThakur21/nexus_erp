"use server";

import { frappeRequest } from "@/app/lib/api";
import { revalidatePath } from "next/cache";

interface PricingRule {
  name: string;
  title: string;
  apply_on: string;
  items?: { item_code: string }[];
  item_groups?: { item_group: string }[];
  brands?: { brand: string }[];
  selling?: number;
  buying?: number;
  rate_or_discount: string;
  discount_percentage?: number;
  discount_amount?: number;
  rate?: number;
  price_or_product_discount: string;
  customer?: string;
  customer_group?: string;
  customers?: { customer: string }[];
  customer_groups?: { customer_group: string }[];
  territory?: string;
  valid_from?: string;
  valid_upto?: string;
  min_qty?: number;
  max_qty?: number;
  disable?: number;
  priority?: number;
}

// Get all pricing rules
export async function getPricingRules(): Promise<PricingRule[]> {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list',
      'GET',
      {
        doctype: 'Pricing Rule',
        fields: '["name","title","apply_on","selling","buying","rate_or_discount","discount_percentage","discount_amount","rate","price_or_product_discount","customer","customer_group","territory","valid_from","valid_upto","min_qty","max_qty","disable","priority"]',
        limit_page_length: 999
      }
    ) as { data?: any[] }
    return response.data || []
  } catch (error) {
    console.error("Error fetching pricing rules:", error)
    return []
  }
}

// Get single pricing rule with full details
export async function getPricingRule(name: string): Promise<PricingRule | null> {
  try {
    const response = await frappeRequest(
      'frappe.client.get',
      'GET',
      {
        doctype: 'Pricing Rule',
        name: name,
      }
    ) as { data?: any };

    return response.data || null;
  } catch (error) {
    console.error("Error fetching pricing rule:", error);
    return null;
  }
}

// Create new pricing rule
export async function createPricingRule(formData: FormData) {
  try {
    const title = formData.get("title") as string;
    const applyOn = formData.get("apply_on") as string;
    const itemGroup = formData.get("item_group") as string;
    const rateOrDiscount = formData.get("rate_or_discount") as string;
    const discountPercentage = formData.get("discount_percentage") as string;
    const discountAmount = formData.get("discount_amount") as string;
    const rate = formData.get("rate") as string;
    const customerGroup = formData.get("customer_group") as string;
    const territory = formData.get("territory") as string;
    const validFrom = formData.get("valid_from") as string;
    const validUpto = formData.get("valid_upto") as string;
    const minQty = formData.get("min_qty") as string;
    const maxQty = formData.get("max_qty") as string;
    const priority = formData.get("priority") as string;

    // Validate required fields
    if (!title) {
      throw new Error("Title is required");
    }
    if (!applyOn) {
      throw new Error("Apply On field is required");
    }

    const ruleData: any = {
      doctype: "Pricing Rule",
      title,
      apply_on: applyOn,
      selling: 1, // Enable for selling transactions
      rate_or_discount: rateOrDiscount,
      price_or_product_discount: "Price",
    };

    // Add item group to child table if specified (ERPNext requirement)
    // ERPNext validates that when apply_on is "Item Group", the item_groups child table must have at least one entry
    if (applyOn === "Item Group") {
      if (!itemGroup) {
        throw new Error("Item Group is required when Apply On is set to Item Group");
      }
      ruleData.item_groups = [
        {
          item_group: itemGroup
        }
      ];
    }
    
    // For other apply_on types (Item Code, Brand), use their respective child tables
    // These should be populated when items/brands are selected in the UI
    if (applyOn === "Item Code") {
      // Item codes should be added to items child table
      ruleData.items = [];
    } else if (applyOn === "Brand") {
      ruleData.brands = [];
    }

    // Add discount/rate based on type
    if (rateOrDiscount === "Discount Percentage" && discountPercentage) {
      ruleData.discount_percentage = parseFloat(discountPercentage);
    } else if (rateOrDiscount === "Discount Amount" && discountAmount) {
      ruleData.discount_amount = parseFloat(discountAmount);
    } else if (rateOrDiscount === "Rate" && rate) {
      ruleData.rate = parseFloat(rate);
    }

    // Add optional fields
    if (customerGroup) ruleData.customer_group = customerGroup;
    if (territory) ruleData.territory = territory;
    if (validFrom) ruleData.valid_from = validFrom;
    if (validUpto) ruleData.valid_upto = validUpto;
    if (minQty) ruleData.min_qty = parseFloat(minQty);
    if (maxQty) ruleData.max_qty = parseFloat(maxQty);
    if (priority) ruleData.priority = parseInt(priority);

    console.log('[Pricing Rule] Creating with data:', JSON.stringify(ruleData, null, 2));

    await frappeRequest('frappe.client.insert', 'POST', {
      doc: ruleData
    });

    console.log('[Pricing Rule] Successfully created:', title);
    revalidatePath("/pricing-rules");
    return { success: true };
  } catch (error) {
    console.error("Error creating pricing rule:", error);
    throw error;
  }
}

// Update existing pricing rule
export async function updatePricingRule(name: string, formData: FormData) {
  try {
    const title = formData.get("title") as string;
    const rateOrDiscount = formData.get("rate_or_discount") as string;
    const discountPercentage = formData.get("discount_percentage") as string;
    const discountAmount = formData.get("discount_amount") as string;
    const rate = formData.get("rate") as string;
    const customerGroup = formData.get("customer_group") as string;
    const territory = formData.get("territory") as string;
    const validFrom = formData.get("valid_from") as string;
    const validUpto = formData.get("valid_upto") as string;
    const minQty = formData.get("min_qty") as string;
    const maxQty = formData.get("max_qty") as string;
    const priority = formData.get("priority") as string;

    const updateData: any = {
      title,
      rate_or_discount: rateOrDiscount,
    };

    // Update discount/rate based on type
    if (rateOrDiscount === "Discount Percentage" && discountPercentage) {
      updateData.discount_percentage = parseFloat(discountPercentage);
      updateData.discount_amount = 0;
      updateData.rate = 0;
    } else if (rateOrDiscount === "Discount Amount" && discountAmount) {
      updateData.discount_amount = parseFloat(discountAmount);
      updateData.discount_percentage = 0;
      updateData.rate = 0;
    } else if (rateOrDiscount === "Rate" && rate) {
      updateData.rate = parseFloat(rate);
      updateData.discount_percentage = 0;
      updateData.discount_amount = 0;
    }

    // Update optional fields
    if (customerGroup) updateData.customer_group = customerGroup;
    if (territory) updateData.territory = territory;
    if (validFrom) updateData.valid_from = validFrom;
    if (validUpto) updateData.valid_upto = validUpto;
    if (minQty) updateData.min_qty = parseFloat(minQty);
    if (maxQty) updateData.max_qty = parseFloat(maxQty);
    if (priority) updateData.priority = parseInt(priority);

    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Pricing Rule',
      name: name,
      fieldname: updateData
    });

    revalidatePath("/pricing-rules");
    revalidatePath(`/pricing-rules/${name}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating pricing rule:", error);
    throw error;
  }
}

// Toggle pricing rule status (enable/disable)
export async function togglePricingRuleStatus(name: string, disable: number) {
  try {
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Pricing Rule',
      name: name,
      fieldname: {
        disable: disable
      }
    });

    revalidatePath("/pricing-rules");
    return { success: true };
  } catch (error) {
    console.error("Error toggling pricing rule status:", error);
    throw error;
  }
}

// Delete pricing rule
export async function deletePricingRule(name: string) {
  try {
    await frappeRequest('frappe.client.delete', 'POST', {
      doctype: 'Pricing Rule',
      name: name
    });

    revalidatePath("/pricing-rules");
    return { success: true };
  } catch (error) {
    console.error("Error deleting pricing rule:", error);
    throw error;
  }
}

// Get customer groups for filtering
export async function getCustomerGroups(): Promise<string[]> {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list',
      'GET',
      {
        doctype: 'Customer Group',
        fields: JSON.stringify(["name"]),
        limit_page_length: 999,
      }
    ) as { data?: { name: string }[] }

    return response.data?.map((group: { name: string }) => group.name) || [];
  } catch (error) {
    console.error("Error fetching customer groups:", error);
    return [];
  }
}

// Get territories for filtering
export async function getTerritories(): Promise<string[]> {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list',
      'GET',
      {
        doctype: 'Territory',
        fields: JSON.stringify(["name"]),
        limit_page_length: 999,
      }
    ) as { data?: { name: string }[] };

    return response.data?.map((territory: { name: string }) => territory.name) || [];
  } catch (error) {
    console.error("Error fetching territories:", error);
    return [];
  }
}

// Get item groups for filtering
export async function getItemGroups(): Promise<string[]> {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list',
      'GET',
      {
        doctype: 'Item Group',
        fields: JSON.stringify(["name"]),
        limit_page_length: 999,
      }
    ) as { data?: { name: string }[] };

    return response.data?.map((group: { name: string }) => group.name) || [];
  } catch (error) {
    console.error("Error fetching item groups:", error);
    return [];
  }
}
