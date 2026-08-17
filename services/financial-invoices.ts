import { getCsrfToken } from "@/lib/api/auth";

const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
const BASE = `${PROXY_BASE}/api/proxy/api/v1/financial-invoices/`;
const CLIENTS_BASE = `${PROXY_BASE}/api/proxy/api/v1/clients/`;
const PRODUCTS_BASE = `${PROXY_BASE}/api/proxy/api/v1/products/`;

export const PAYMENT_TERMS_OPTIONS: { value: string; label: string }[] = [
    { value: "due_on_receipt", label: "Due on Receipt" },
    { value: "net_15", label: "Net 15" },
    { value: "net_30", label: "Net 30" },
    { value: "net_45", label: "Net 45" },
    { value: "net_60", label: "Net 60" },
    { value: "custom", label: "Custom" },
];

const PAYMENT_TERMS_DAYS: Record<string, number> = {
    due_on_receipt: 0,
    net_15: 15,
    net_30: 30,
    net_45: 45,
    net_60: 60,
};

export function computeDueDate(invoiceDate: string, paymentTerms: string): string | null {
    if (!invoiceDate || paymentTerms === "custom") return null;
    const days = PAYMENT_TERMS_DAYS[paymentTerms] ?? 0;
    const [y, m, d] = invoiceDate.split("-").map(Number);
    if (!y || !m || !d) return null;
    // Build/format using local date components throughout — going through
    // toISOString() (UTC) here would shift the date by a day in timezones
    // ahead of UTC (e.g. Nairobi, UTC+3), since "YYYY-MM-DDT00:00:00" parses
    // as local midnight but toISOString() converts back to UTC.
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

export interface InvoiceLineItem {
    id?: number;
    description: string;
    quantity: string | number;
    unit_rate: string | number;
    tax_rate: string | number;
    line_total?: string;
    sort_order?: number;
}

export interface FinancialInvoice {
    id: number;
    invoice_number: string;
    client: number;
    client_name: string;
    invoice_date: string;
    payment_terms: string;
    payment_terms_display: string;
    due_date: string | null;
    status: string;
    status_display: string;
    effective_status: string;
    subtotal: string;
    tax_total: string;
    discount: string;
    total: string;
    amount_paid: number;
    balance_due: number;
    notes: string;
    terms: string;
    line_items: InvoiceLineItem[];
    etims_status: string;
    created_at: string;
    updated_at: string;
}

export interface PaginatedResult<T> {
    results: T[];
    count: number;
}

export interface InvoicePayload {
    client: number;
    invoice_number?: string;
    invoice_date: string;
    payment_terms?: string;
    due_date?: string | null;
    discount?: string | number;
    notes?: string;
    terms?: string;
    status?: string;
    line_items: InvoiceLineItem[];
}

export interface ClientOption {
    id: number;
    name: string;
}

export interface ProductSuggestion {
    id: number;
    name: string;
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

export async function fetchInvoices(params: { search?: string; page?: number } = {}): Promise<PaginatedResult<FinancialInvoice>> {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.page && params.page > 1) qs.set("page", String(params.page));
    const url = qs.toString() ? `${BASE}?${qs}` : BASE;
    const res = await fetch(url, { credentials: "include", cache: "no-store" });
    await throwIfBad(res);
    const data = await res.json() as { count?: number; results?: FinancialInvoice[] } | FinancialInvoice[];
    if (Array.isArray(data)) return { results: data, count: data.length };
    return { results: data.results ?? [], count: data.count ?? (data.results ?? []).length };
}

export async function fetchInvoice(id: number): Promise<FinancialInvoice> {
    const res = await fetch(`${BASE}${id}/`, { credentials: "include", cache: "no-store" });
    await throwIfBad(res);
    return res.json() as Promise<FinancialInvoice>;
}

export async function createInvoice(payload: InvoicePayload): Promise<FinancialInvoice> {
    const res = await fetch(BASE, {
        method: "POST",
        headers: await headers(),
        credentials: "include",
        body: JSON.stringify(payload),
    });
    await throwIfBad(res);
    return res.json() as Promise<FinancialInvoice>;
}

export async function updateInvoice(id: number, payload: Partial<InvoicePayload>): Promise<FinancialInvoice> {
    const res = await fetch(`${BASE}${id}/`, {
        method: "PATCH",
        headers: await headers(),
        credentials: "include",
        body: JSON.stringify(payload),
    });
    await throwIfBad(res);
    return res.json() as Promise<FinancialInvoice>;
}

export async function voidInvoice(id: number): Promise<FinancialInvoice> {
    const res = await fetch(`${BASE}${id}/void/`, {
        method: "POST",
        headers: await headers(),
        credentials: "include",
    });
    await throwIfBad(res);
    return res.json() as Promise<FinancialInvoice>;
}

export async function resendInvoice(id: number): Promise<FinancialInvoice> {
    const res = await fetch(`${BASE}${id}/resend/`, {
        method: "POST",
        headers: await headers(),
        credentials: "include",
    });
    await throwIfBad(res);
    return res.json() as Promise<FinancialInvoice>;
}

export async function queueForEtims(id: number): Promise<{ status: string; kra_invoice_number: string; qr_code_url: string; error_message: string }> {
    const res = await fetch(`${BASE}${id}/queue-etims/`, {
        method: "POST",
        headers: await headers(),
        credentials: "include",
    });
    await throwIfBad(res);
    return res.json();
}

export async function fetchClientOptions(): Promise<ClientOption[]> {
    const res = await fetch(`${CLIENTS_BASE}?page_size=200`, { credentials: "include", cache: "no-store" });
    await throwIfBad(res);
    const data = await res.json() as { results?: ClientOption[] } | ClientOption[];
    return Array.isArray(data) ? data : (data.results ?? []);
}

export function getInvoicePdfUrl(id: number): string {
    return `${BASE}${id}/pdf/`;
}

export async function fetchNextInvoiceNumber(): Promise<string> {
    const res = await fetch(`${BASE}next-number/`, { credentials: "include", cache: "no-store" });
    await throwIfBad(res);
    const data = await res.json() as { invoice_number: string };
    return data.invoice_number;
}

export async function fetchProductSuggestions(query: string): Promise<ProductSuggestion[]> {
    if (!query.trim()) return [];
    const res = await fetch(`${PRODUCTS_BASE}?search=${encodeURIComponent(query)}&page_size=8`, {
        credentials: "include",
        cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json() as { results?: ProductSuggestion[] } | ProductSuggestion[];
    const list = Array.isArray(data) ? data : (data.results ?? []);
    return list.map((p) => ({ id: p.id, name: p.name }));
}
