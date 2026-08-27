export interface LineItem {
    tempId: string;
    product_id: number;
    product?: number | null;
    product_name: string;
    product_sku: string;
    pricing_mode: string;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    discount_type: "percent" | "fixed";
    variable_amount: number;
    vat_rate?: number;
    description?: string;
    is_custom?: boolean;
    /** Optional per-unit cost estimate — feeds the quotes-list Margin column as
     * sum(estimated_cost * quantity) across all lines, computed server-side. */
    estimated_cost?: number;
}
