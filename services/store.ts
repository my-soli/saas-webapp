import type { Product, ProductPricingMode, ProductSpecGroup } from "@/types/products";

const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');

export interface CatalogProduct {
    id: number;
    name: string;
    internal_code: string;
    primary_image_url: string | null;
    short_description: string;
    long_description: string;
    print_category: number | null;
    print_category_name: string | null;
    primary_category: number | null;
    primary_category_name: string | null;
    sub_category: number | null;
    sub_category_name: string | null;
    /** Storefront category: primary category, else the sub-category's parent. */
    category_id?: number | null;
    category_name?: string | null;
    product_type: string;
    tags: Array<{ id: number; name: string; slug: string }>;
    pricing_mode: ProductPricingMode;
    starting_price: string | null;
    starting_price_moq: number | null;
    is_visible: boolean;
    visibility: string;
    feature_product: boolean;
    bestseller_badge: boolean;
    new_arrival: boolean;
    new_arrival_expires: string | null;
    on_sale_badge: boolean;
    unit_of_measure: string;
    stock_status: string;
    spec_groups: ProductSpecGroup[];
    images: Array<{ id: number; image_url: string | null; alt_text: string; is_primary: boolean; display_order: number; color_name: string; color_hex: string; image_type?: string }>;
    /** Production turnaround in days (from API settings). */
    turnaround_days?: { standard: number; rush: number; expedited: number };
    faqs: Array<{ id: number; question: string; answer: string; display_order: number }>;
}

export interface PriceCalculationResult {
    valid: boolean;
    final_selling_price: string;
    final_vendor_cost: string;
    margin_percent: string;
    line_items: Array<{
        spec_group_id: number;
        spec_group_name: string;
        description: string;
        selling_price: string;
        vendor_cost: string;
    }>;
    errors: string[];
}

export type SelectionValue = number | number[] | number | { width: number; height: number };

export async function fetchCatalogProducts(params?: {
    category?: string;
    print_category?: string;
    pricing_mode?: string;
    search?: string;
    page_size?: number;
    page?: number;
}): Promise<{ count: number; results: CatalogProduct[] }> {
    const qs = new URLSearchParams();
    if (params?.category) qs.set("category", params.category);
    if (params?.print_category) qs.set("print_category", params.print_category);
    if (params?.pricing_mode) qs.set("pricing_mode", params.pricing_mode);
    if (params?.search) qs.set("search", params.search);
    qs.set("page_size", String(params?.page_size ?? 48));
    if (params?.page && params.page > 1) qs.set("page", String(params.page));

    const url = `${PROXY_BASE}/api/proxy/api/v1/product-catalog/?${qs.toString()}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to fetch catalog: ${response.status}`);
    return response.json() as Promise<{ count: number; results: CatalogProduct[] }>;
}

/** Whole published catalog (100 per request). Shared by the /store browse view and
 *  the store navbar (query key ["catalog-all"]). */
export async function fetchAllCatalog(): Promise<CatalogProduct[]> {
    const out: CatalogProduct[] = [];
    for (let page = 1; page <= 20; page++) {
        const res = await fetchCatalogProducts({ page_size: 100, page });
        out.push(...res.results);
        if (res.results.length === 0 || out.length >= res.count) break;
    }
    return out;
}

export async function fetchCatalogProduct(productId: number): Promise<CatalogProduct> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/product-catalog/${productId}/`, {
        cache: "no-store",
    });
    if (!response.ok) throw new Error(`Product not found: ${response.status}`);
    return response.json() as Promise<CatalogProduct>;
}

export async function calculatePrice(
    productId: number,
    selections: Record<number, SelectionValue>,
): Promise<PriceCalculationResult> {
    const stringKeyedSelections: Record<string, SelectionValue> = {};
    for (const [key, value] of Object.entries(selections)) {
        stringKeyedSelections[key] = value;
    }
    const response = await fetch(
        `${PROXY_BASE}/api/proxy/api/v1/product-catalog/${productId}/calculate-price/`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ selections: stringKeyedSelections }),
        },
    );
    if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { detail?: string; errors?: string[] };
        const message = data.detail ?? (data.errors?.join(", ")) ?? `Calculation failed: ${response.status}`;
        throw new Error(message);
    }
    return response.json() as Promise<PriceCalculationResult>;
}
