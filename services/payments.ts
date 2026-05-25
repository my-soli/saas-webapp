import { Payment, PaymentsQueryParams, PaymentsResponse } from "@/types/payments";
import { getCsrfToken } from "@/lib/api/auth";

const buildWriteHeaders = async (): Promise<HeadersInit> => {
    const csrfToken = await getCsrfToken();
    return { "Content-Type": "application/json", ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}) };
};

const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');

const buildQueryString = (params: PaymentsQueryParams): string => {
    const searchParams = new URLSearchParams();
    searchParams.set("page", params.page.toString());
    searchParams.set("page_size", params.pageSize.toString());

    if (params.search.trim()) {
        searchParams.set("search", params.search.trim());
    }

    if (params.status !== "all") {
        searchParams.set("status", params.status);
    }

    if (params.method !== "all") {
        searchParams.set("payment_method", params.method);
    }

    if (params.dateFrom) {
        searchParams.set("payment_date__gte", params.dateFrom);
    }

    if (params.dateTo) {
        searchParams.set("payment_date__lte", params.dateTo);
    }

    if (params.ordering) {
        searchParams.set("ordering", params.ordering);
    }

    return searchParams.toString();
};

export async function fetchPayments(params: PaymentsQueryParams): Promise<PaymentsResponse> {
    const queryString = buildQueryString(params);
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/payments/?${queryString}`, {
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Failed to fetch payments: ${response.status} ${errorText}`);
    }

    return response.json();
}

export async function createPayment(payload: Partial<Payment>): Promise<Payment> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/payments/`, {
        method: "POST",
        headers: await buildWriteHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Failed to create payment: ${response.status} ${errorText}`);
    }
    return response.json();
}

export async function updatePayment(paymentId: number, payload: Partial<Payment>): Promise<Payment> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/payments/${paymentId}/`, {
        method: "PATCH",
        headers: await buildWriteHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Failed to update payment: ${response.status} ${errorText}`);
    }
    return response.json();
}

export async function deletePayment(paymentId: number): Promise<void> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/payments/${paymentId}/`, {
        method: "DELETE",
        headers: await buildWriteHeaders(),
        credentials: "include",
    });
    if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Failed to delete payment: ${response.status} ${errorText}`);
    }
}
