import { getCsrfToken } from "@/lib/api/auth";

const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
const BASE = `${PROXY_BASE}/api/proxy/api/v1/machines/`;

export interface Machine {
    id: number;
    name: string;
    machine_type: string;
    machine_type_display: string;
    code: string;
    location: string;
    daily_capacity_units: number;
    capacity_unit_label: string;
    status: string;
    status_display: string;
    is_active: boolean;
    notes: string;
    current_load: number;
    workload_percentage: number | null;
    created_at: string;
    updated_at: string;
}

export interface MachinePayload {
    name: string;
    machine_type: string;
    code: string;
    location: string;
    daily_capacity_units: number;
    capacity_unit_label: string;
    status: string;
    is_active: boolean;
    notes: string;
}

export interface CapacitySummaryRow {
    machine_id: number;
    machine_name: string;
    current_load: number;
    capacity: number;
    utilization_pct: number | null;
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

export async function fetchMachines(): Promise<Machine[]> {
    const res = await fetch(BASE, { credentials: "include", cache: "no-store" });
    await throwIfBad(res);
    const data = await res.json() as { results?: Machine[] } | Machine[];
    return Array.isArray(data) ? data : (data.results ?? []);
}

export async function createMachine(payload: MachinePayload): Promise<Machine> {
    const res = await fetch(BASE, {
        method: "POST",
        headers: await headers(),
        credentials: "include",
        body: JSON.stringify(payload),
    });
    await throwIfBad(res);
    return res.json() as Promise<Machine>;
}

export async function updateMachine(id: number, payload: Partial<MachinePayload>): Promise<Machine> {
    const res = await fetch(`${BASE}${id}/`, {
        method: "PATCH",
        headers: await headers(),
        credentials: "include",
        body: JSON.stringify(payload),
    });
    await throwIfBad(res);
    return res.json() as Promise<Machine>;
}

export async function deleteMachine(id: number): Promise<void> {
    const res = await fetch(`${BASE}${id}/`, {
        method: "DELETE",
        headers: await headers(),
        credentials: "include",
    });
    if (!res.ok && res.status !== 204) await throwIfBad(res);
}

export async function fetchCapacitySummary(): Promise<CapacitySummaryRow[]> {
    const res = await fetch(`${BASE}capacity_summary/`, { credentials: "include", cache: "no-store" });
    await throwIfBad(res);
    return res.json() as Promise<CapacitySummaryRow[]>;
}
