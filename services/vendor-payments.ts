import { getCsrfToken } from "@/lib/api/auth";

const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
const BASE = `${PROXY_BASE}/api/proxy/api/v1/vendor-payments/`;
const VENDORS_BASE = `${PROXY_BASE}/api/proxy/api/v1/vendors/`;
const VENDOR_INVOICES_BASE = `${PROXY_BASE}/api/proxy/api/v1/vendor-invoices/`;

export const VENDOR_PAYMENT_METHOD_OPTIONS = [
    { value: "cash", label: "Cash" },
    { value: "mpesa", label: "M-Pesa" },
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "cheque", label: "Cheque" },
    { value: "credit_card", label: "Credit Card" },
];

export interface VendorPayment {
    id: number;
    vendor: number;
    vendor_name: string;
    vendor_invoice: number | null;
    vendor_invoice_number: string;
    payment_date: string;
    amount: string;
    payment_method: string;
    payment_method_display: string;
    reference_number: string;
    notes: string;
    created_at: string;
}

export interface VendorPaymentPayload {
    vendor: number;
    vendor_invoice?: number | null;
    payment_date: string;
    amount: string;
    payment_method: string;
    reference_number?: string;
    notes?: string;
}

export interface VendorPaymentSummary {
    total_this_month: number;
    count_this_month: number;
}

export interface VendorOption {
    id: number;
    name: string;
}

export interface VendorInvoiceOption {
    id: number;
    invoice_number: string;
    vendor: number;
    total_amount: string;
    status: string;
}

export interface PaginatedResult<T> {
    results: T[];
    count: number;
}

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

export async function fetchVendorPayments(params: { search?: string; page?: number } = {}): Promise<PaginatedResult<VendorPayment>> {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.page && params.page > 1) qs.set("page", String(params.page));
    const url = qs.toString() ? `${BASE}?${qs}` : BASE;
    const res = await fetch(url, { credentials: "include", cache: "no-store" });
    await throwIfBad(res);
    const data = await res.json() as { count?: number; results?: VendorPayment[] } | VendorPayment[];
    if (Array.isArray(data)) return { results: data, count: data.length };
    return { results: data.results ?? [], count: data.count ?? (data.results ?? []).length };
}

export async function fetchVendorPaymentSummary(): Promise<VendorPaymentSummary> {
    const res = await fetch(`${BASE}summary/`, { credentials: "include", cache: "no-store" });
    await throwIfBad(res);
    return res.json() as Promise<VendorPaymentSummary>;
}

export async function createVendorPayment(payload: VendorPaymentPayload): Promise<VendorPayment> {
    const res = await fetch(BASE, {
        method: "POST",
        headers: await headers(),
        credentials: "include",
        body: JSON.stringify(payload),
    });
    await throwIfBad(res);
    return res.json() as Promise<VendorPayment>;
}

export async function updateVendorPayment(id: number, payload: Partial<VendorPaymentPayload>): Promise<VendorPayment> {
    const res = await fetch(`${BASE}${id}/`, {
        method: "PATCH",
        headers: await headers(),
        credentials: "include",
        body: JSON.stringify(payload),
    });
    await throwIfBad(res);
    return res.json() as Promise<VendorPayment>;
}

export async function deleteVendorPayment(id: number): Promise<void> {
    const res = await fetch(`${BASE}${id}/`, {
        method: "DELETE",
        headers: await headers(),
        credentials: "include",
    });
    if (!res.ok && res.status !== 204) await throwIfBad(res);
}

export async function fetchVendorOptions(): Promise<VendorOption[]> {
    const res = await fetch(`${VENDORS_BASE}?page_size=200`, { credentials: "include", cache: "no-store" });
    await throwIfBad(res);
    const data = await res.json() as { results?: VendorOption[] } | VendorOption[];
    return Array.isArray(data) ? data : (data.results ?? []);
}

export async function fetchVendorInvoiceOptions(vendorId: number): Promise<VendorInvoiceOption[]> {
    const res = await fetch(`${VENDOR_INVOICES_BASE}?vendor=${vendorId}&page_size=100`, { credentials: "include", cache: "no-store" });
    await throwIfBad(res);
    const data = await res.json() as { results?: VendorInvoiceOption[] } | VendorInvoiceOption[];
    return Array.isArray(data) ? data : (data.results ?? []);
}
