const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
const BASE = `${PROXY_BASE}/api/proxy/api/v1/production-planning/outsourcing-summary/`;

export interface VendorCapacityRow {
    vendor_id: number;
    vendor_name: string;
    current_workload: number;
    max_concurrent_jobs: number;
    workload_percentage: number;
    is_at_capacity: boolean;
}

export interface OutsourcingSummary {
    purchase_orders_by_status: Record<string, number>;
    active_purchase_order_count: number;
    vendor_capacity: VendorCapacityRow[];
}

export async function fetchOutsourcingSummary(): Promise<OutsourcingSummary> {
    const res = await fetch(BASE, { credentials: "include", cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load outsourcing summary");
    return res.json() as Promise<OutsourcingSummary>;
}
