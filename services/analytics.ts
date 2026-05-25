import type {
    AccountManagerPerformance,
    VendorDeliveryRate,
    VendorQualityScoresResponse,
    VendorTurnaroundTimesResponse,
    JobCompletionStats,
} from "@/types/analytics";

const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');

async function getCsrfToken(): Promise<string> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/auth/csrf/`, {
        credentials: "include",
    });
    const data = await response.json();
    return data.csrfToken;
}

export async function fetchAccountManagerPerformance(): Promise<AccountManagerPerformance> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/analytics/am_performance/`, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error("Failed to fetch account manager performance");
    }

    return response.json();
}

export async function fetchVendorDeliveryRate(months: number = 12): Promise<VendorDeliveryRate> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/analytics/vendor_delivery_rate/?months=${months}`, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error("Failed to fetch vendor delivery rate");
    }

    return response.json();
}

export async function fetchVendorQualityScores(limit: number = 10): Promise<VendorQualityScoresResponse> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/analytics/vendor_quality_scores/?limit=${limit}`, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error("Failed to fetch vendor quality scores");
    }

    return response.json();
}

export async function fetchVendorTurnaroundTimes(months: number = 12): Promise<VendorTurnaroundTimesResponse> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/analytics/vendor_turnaround_time/?months=${months}`, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error("Failed to fetch vendor turnaround times");
    }

    return response.json();
}

export async function fetchJobCompletionStats(): Promise<JobCompletionStats> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/analytics/job_completion_stats/`, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error("Failed to fetch job completion stats");
    }

    return response.json();
}

export interface CustomProductEntry {
    name: string;
    times_quoted: number;
}

export interface CustomProductsStats {
    pending_addition: CustomProductEntry[];
    already_added: CustomProductEntry[];
    pending_count: number;
    added_count: number;
    total_custom_quoted: number;
}

export async function fetchCustomProductsStats(): Promise<CustomProductsStats> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/analytics/custom_products_stats/`, {
        credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch custom products stats");
    return response.json();
}
