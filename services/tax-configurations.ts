import { getCsrfToken } from "@/lib/api/auth";

const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
const BASE = `${PROXY_BASE}/api/proxy/api/v1/tax-configurations/`;

export const TAX_TYPE_OPTIONS = [
    { value: "vat", label: "VAT" },
    { value: "gst", label: "GST" },
    { value: "sales_tax", label: "Sales Tax" },
    { value: "exempt", label: "Tax Exempt" },
];

export const REGION_TYPE_OPTIONS = [
    { value: "country", label: "Country" },
    { value: "state", label: "State/Province" },
    { value: "city", label: "City" },
    { value: "postal_code", label: "Postal Code" },
];

export interface TaxConfiguration {
    id: number;
    name: string;
    tax_type: string;
    rate: string;
    region_type: string;
    country: string;
    state_province: string;
    city: string;
    postal_code: string;
    is_active: boolean;
    applies_to_b2b: boolean;
    applies_to_b2c: boolean;
    exempt_product_categories: string[];
    exempt_business_types: string[];
    created_at: string;
    updated_at: string;
}

export type TaxConfigurationPayload = Omit<TaxConfiguration, "id" | "created_at" | "updated_at">;

async function headers() {
    const csrf = await getCsrfToken();
    return { "Content-Type": "application/json", "X-CSRFToken": csrf };
}

async function throwIfBad(res: Response) {
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as Record<string, unknown>;
        const first = Object.values(body)[0];
        const msg = Array.isArray(first) ? (first[0] as string) : (typeof first === 'string' ? first : "Request failed");
        throw new Error(msg);
    }
}

export async function fetchTaxConfigurations(): Promise<TaxConfiguration[]> {
    const res = await fetch(BASE, { credentials: "include", cache: "no-store" });
    await throwIfBad(res);
    const data = await res.json() as { results?: TaxConfiguration[] } | TaxConfiguration[];
    return Array.isArray(data) ? data : (data.results ?? []);
}

export async function createTaxConfiguration(payload: TaxConfigurationPayload): Promise<TaxConfiguration> {
    const res = await fetch(BASE, {
        method: "POST",
        headers: await headers(),
        credentials: "include",
        body: JSON.stringify(payload),
    });
    await throwIfBad(res);
    return res.json() as Promise<TaxConfiguration>;
}

export async function updateTaxConfiguration(id: number, payload: Partial<TaxConfigurationPayload>): Promise<TaxConfiguration> {
    const res = await fetch(`${BASE}${id}/`, {
        method: "PATCH",
        headers: await headers(),
        credentials: "include",
        body: JSON.stringify(payload),
    });
    await throwIfBad(res);
    return res.json() as Promise<TaxConfiguration>;
}

export async function deleteTaxConfiguration(id: number): Promise<void> {
    const res = await fetch(`${BASE}${id}/`, {
        method: "DELETE",
        headers: await headers(),
        credentials: "include",
    });
    if (!res.ok && res.status !== 204) await throwIfBad(res);
}
