const PROXY_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface Rider {
    id: number;
    name: string;
    phone: string;
    id_number: string;
    vehicle_type: string;
    vehicle_type_display: string;
    vehicle_plate: string;
    area_coverage: string;
    is_active: boolean;
    notes: string;
    dispatch_count: number;
    delivered_count: number;
    created_at: string;
    updated_at: string;
}

export type RiderPayload = Omit<Rider, "id" | "vehicle_type_display" | "dispatch_count" | "delivered_count" | "created_at" | "updated_at">;

async function handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
        let msg = `${res.status}`;
        try { const b = await res.json() as Record<string, unknown>; msg = JSON.stringify(b); } catch { /* ignore */ }
        throw new Error(msg);
    }
    return res.json() as Promise<T>;
}

export async function fetchRiders(): Promise<Rider[]> {
    const res = await fetch(`${PROXY_BASE}/api/proxy/api/v1/riders/`, { cache: "no-store" });
    const data = await handleResponse<{ results?: Rider[] } | Rider[]>(res);
    return Array.isArray(data) ? data : (data.results ?? []);
}

export async function createRider(payload: RiderPayload): Promise<Rider> {
    const res = await fetch(`${PROXY_BASE}/api/proxy/api/v1/riders/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
    });
    return handleResponse<Rider>(res);
}

export async function updateRider(id: number, payload: Partial<RiderPayload>): Promise<Rider> {
    const res = await fetch(`${PROXY_BASE}/api/proxy/api/v1/riders/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
    });
    return handleResponse<Rider>(res);
}

export async function deleteRider(id: number): Promise<void> {
    const res = await fetch(`${PROXY_BASE}/api/proxy/api/v1/riders/${id}/`, {
        method: "DELETE",
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}
