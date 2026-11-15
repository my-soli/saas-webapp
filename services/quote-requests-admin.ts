import { getCsrfToken } from "@/lib/api/auth";

/** Staff-side access to storefront quote requests (EstimateQuote on the API). */

const BASE = "/api/proxy/api/v1/storefront-estimates";

export type QuoteRequestStatus = "draft_unsaved" | "shared_with_am" | "converted_to_quote" | "archived";
export type QuoteRequestFilter = "open" | "all" | QuoteRequestStatus;

export interface QuoteRequestLine {
    product_id?: string | number;
    product_name?: string;
    quantity?: number;
    notes?: string;
}

export interface QuoteRequestAttachment {
    id: number;
    filename: string;
    url: string | null;
    uploaded_at: string;
}

export interface QuoteRequest {
    id: number;
    estimate_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_company: string;
    line_items: QuoteRequestLine[];
    special_notes: string;
    status: QuoteRequestStatus;
    converted_quote_id: string;
    attachments: QuoteRequestAttachment[];
    created_at: string;
    updated_at: string;
    expires_at: string | null;
}

export interface QuoteRequestPage {
    count: number;
    results: QuoteRequest[];
}

const writeHeaders = async (): Promise<HeadersInit> => {
    const csrf = await getCsrfToken();
    return { "Content-Type": "application/json", ...(csrf ? { "X-CSRFToken": csrf } : {}) };
};

const errorFrom = async (res: Response, fallback: string): Promise<Error> => {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null;
    return new Error(body?.detail || `${fallback} (${res.status})`);
};

export async function fetchQuoteRequests(params: { status: QuoteRequestFilter; search: string; page: number }): Promise<QuoteRequestPage> {
    const qs = new URLSearchParams({ page: String(params.page), page_size: "25" });
    if (params.status !== "all") qs.set("status", params.status);
    if (params.search.trim()) qs.set("search", params.search.trim());
    const res = await fetch(`${BASE}/?${qs.toString()}`, { credentials: "include", cache: "no-store" });
    if (!res.ok) throw await errorFrom(res, "Failed to load quote requests");
    const data = (await res.json()) as QuoteRequestPage | QuoteRequest[];
    const page = Array.isArray(data) ? { count: data.length, results: data } : data;
    // Older API versions omit some fields — default them so the page never crashes.
    return {
        count: page.count ?? 0,
        results: (page.results ?? []).map((r) => ({
            ...r,
            line_items: Array.isArray(r.line_items) ? r.line_items : [],
            attachments: Array.isArray(r.attachments) ? r.attachments : [],
            converted_quote_id: r.converted_quote_id ?? "",
            special_notes: r.special_notes ?? "",
            customer_company: r.customer_company ?? "",
            customer_phone: r.customer_phone ?? "",
        })),
    };
}

export async function updateQuoteRequestStatus(id: number, status: QuoteRequestStatus): Promise<QuoteRequest> {
    const res = await fetch(`${BASE}/${id}/`, {
        method: "PATCH",
        credentials: "include",
        headers: await writeHeaders(),
        body: JSON.stringify({ status }),
    });
    if (!res.ok) throw await errorFrom(res, "Failed to update quote request");
    return res.json() as Promise<QuoteRequest>;
}

export async function createLeadFromQuoteRequest(id: number): Promise<{ lead_id: number; lead_code: string; lead_name: string; created: boolean }> {
    const res = await fetch(`${BASE}/${id}/create-lead/`, {
        method: "POST",
        credentials: "include",
        headers: await writeHeaders(),
        body: "{}",
    });
    if (!res.ok) throw await errorFrom(res, "Failed to create lead");
    return res.json() as Promise<{ lead_id: number; lead_code: string; lead_name: string; created: boolean }>;
}
