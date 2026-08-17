import { AnalyticsData, ClientActivityData, ClientRevenueData, DispatchHealthData } from "./types";

const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');

export async function fetchAnalyticsData(): Promise<AnalyticsData> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/analytics/`, {
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Failed to fetch analytics data: ${response.status} ${errorText}`);
    }

    return response.json();
}

export async function fetchClientRevenueData(): Promise<ClientRevenueData> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/analytics/client_revenue/`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
    });
    if (!response.ok) throw new Error(`Failed to fetch client revenue: ${response.status}`);
    return response.json();
}

export async function fetchDispatchHealthData(): Promise<DispatchHealthData> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/analytics/dispatch_health/`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
    });
    if (!response.ok) throw new Error(`Failed to fetch dispatch health: ${response.status}`);
    return response.json();
}

export async function fetchClientActivityData(): Promise<ClientActivityData> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/analytics/client_activity/`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
    });
    if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Failed to fetch client activity: ${response.status} ${errorText}`);
    }
    return response.json();
}
