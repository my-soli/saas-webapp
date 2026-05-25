import { DeliveriesQueryParams, DeliveriesResponse } from "@/types/deliveries";

const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');

const buildQueryString = (params: DeliveriesQueryParams): string => {
    const searchParams = new URLSearchParams();
    searchParams.set("page", params.page.toString());
    searchParams.set("page_size", params.pageSize.toString());

    if (params.search.trim()) {
        searchParams.set("search", params.search.trim());
    }

    if (params.status !== "all") {
        searchParams.set("status", params.status);
    }

    if (params.stagingLocation !== "all") {
        searchParams.set("staging_location", params.stagingLocation);
    }

    if (params.handoffConfirmed !== "all") {
        searchParams.set("handoff_confirmed", params.handoffConfirmed);
    }

    if (params.urgentOnly !== "all") {
        searchParams.set("mark_urgent", params.urgentOnly);
    }

    if (params.method !== "all") {
        searchParams.set("job__delivery_method", params.method);
    }

    if (params.dateFrom) {
        searchParams.set("created_at__gte", params.dateFrom);
    }

    if (params.dateTo) {
        searchParams.set("created_at__lte", params.dateTo);
    }

    if (params.ordering) {
        searchParams.set("ordering", params.ordering);
    }

    return searchParams.toString();
};

export async function fetchDeliveries(params: DeliveriesQueryParams): Promise<DeliveriesResponse> {
    const queryString = buildQueryString(params);
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/deliveries/?${queryString}`, {
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Failed to fetch deliveries: ${response.status} ${errorText}`);
    }

    return response.json();
}
