/**
 * Currency formatting utilities for Indian Rupees (INR)
 */

/**
 * Formats a number as Indian currency with appropriate suffix (Cr/L/K)
 * @param amount - The amount to format
 * @returns Formatted string with ₹ symbol and suffix
 */
export function formatIndianCurrency(amount: number): string {
    const absAmount = Math.abs(amount);

    if (absAmount >= 10000000) {
        // Crores (10 million and above)
        const crores = amount / 10000000;
        return `₹${crores.toFixed(crores >= 100 ? 1 : 2)}Cr`;
    } else if (absAmount >= 100000) {
        // Lakhs (100 thousand and above)
        const lakhs = amount / 100000;
        return `₹${lakhs.toFixed(lakhs >= 10 ? 1 : 2)}L`;
    } else if (absAmount >= 1000) {
        // Thousands
        return `₹${(amount / 1000).toFixed(1)}K`;
    } else {
        // Below 1000
        return `₹${amount.toLocaleString('en-IN')}`;
    }
}

/**
 * Formats a number as Indian currency in Crores
 * @param amount - The amount to format
 * @returns Formatted string in Crores (e.g., ₹12.8Cr)
 */
export function formatIndianCurrencyInCrores(amount: number): string {
    const crores = amount / 10000000;
    return `₹${crores.toFixed(crores >= 100 ? 1 : 2)}Cr`;
}

/**
 * Formats a number as Indian currency in Lakhs
 * @param amount - The amount to format
 * @returns Formatted string in Lakhs (e.g., ₹42.5L)
 */
export function formatIndianCurrencyInLakhs(amount: number): string {
    const lakhs = amount / 100000;
    return `₹${lakhs.toFixed(lakhs >= 10 ? 1 : 2)}L`;
}
