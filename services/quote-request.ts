const PROXY_BASE = typeof window !== "undefined" ? "" : (process.env.NEXTAUTH_URL || "http://localhost:3000");

export interface QuoteRequestLineItem {
    product_id: string;
    product_name: string;
    quantity: number;
    notes: string;
}

export interface QuoteRequestCustomer {
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_company: string;
}

export interface QuoteRequestResult {
    id: number;
    estimate_id: string;
    share_token: string;
}

export async function submitQuoteRequest(
    customer: QuoteRequestCustomer,
    lineItems: QuoteRequestLineItem[],
    specialNotes: string,
): Promise<QuoteRequestResult> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/storefront-estimates/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...customer,
            line_items: lineItems,
            special_notes: specialNotes,
        }),
    });
    if (!response.ok) {
        const body = await response.json().catch(() => null) as Record<string, unknown> | null;
        const message = body && typeof body === "object"
            ? Object.values(body).flat().filter(Boolean).join(" ")
            : "";
        throw new Error(message || `Failed to submit quote request: ${response.status}`);
    }
    return response.json() as Promise<QuoteRequestResult>;
}

export async function uploadQuoteAttachment(estimateId: number, file: File): Promise<void> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(
        `${PROXY_BASE}/api/proxy/api/v1/storefront-estimates/${estimateId}/upload-attachment/`,
        { method: "POST", body: formData },
    );
    if (!response.ok) throw new Error(`Failed to upload ${file.name}`);
}
