import { AnalyticsData } from "./types";

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
