import { getCsrfToken } from "@/lib/api/auth";

const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
const BASE = `${PROXY_BASE}/api/proxy/api/v1/machine-assignments/`;
const JOB_COMPONENTS_BASE = `${PROXY_BASE}/api/proxy/api/v1/job-components/`;

export interface MachineAssignment {
    id: number;
    job_product: number;
    job_product_name: string;
    job_number: string;
    job_id: number | null;
    machine: number;
    machine_name: string;
    scheduled_date: string | null;
    scheduled_end_date: string | null;
    status: string;
    status_display: string;
    sequence: number;
    notes: string;
    person_in_charge: number | null;
    person_in_charge_name: string;
    created_at: string;
    updated_at: string;
}

export interface AssignmentPayload {
    job_product: number;
    machine: number;
    scheduled_date?: string | null;
    scheduled_end_date?: string | null;
    notes?: string;
}

export interface AssignmentUpdatePayload {
    machine?: number;
    scheduled_date?: string | null;
    scheduled_end_date?: string | null;
    status?: string;
    notes?: string;
}

export interface AssignableJobProduct {
    id: number;
    product_name: string;
    job: number;
    job_number?: string;
    quantity: number;
    status: string;
    execution_type: string;
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

export async function fetchAssignments(params?: { machine?: number; status?: string; dateFrom?: string; dateTo?: string }): Promise<MachineAssignment[]> {
    const qs = new URLSearchParams();
    if (params?.machine) qs.set("machine", String(params.machine));
    if (params?.status) qs.set("status", params.status);
    if (params?.dateFrom) qs.set("scheduled_date__gte", params.dateFrom);
    if (params?.dateTo) qs.set("scheduled_date__lte", params.dateTo);
    const res = await fetch(`${BASE}?${qs.toString()}`, { credentials: "include", cache: "no-store" });
    await throwIfBad(res);
    const data = await res.json() as { results?: MachineAssignment[] } | MachineAssignment[];
    return Array.isArray(data) ? data : (data.results ?? []);
}

export async function createAssignment(payload: AssignmentPayload): Promise<MachineAssignment> {
    const res = await fetch(BASE, {
        method: "POST",
        headers: await headers(),
        credentials: "include",
        body: JSON.stringify(payload),
    });
    await throwIfBad(res);
    return res.json() as Promise<MachineAssignment>;
}

export async function updateAssignment(id: number, payload: AssignmentUpdatePayload): Promise<MachineAssignment> {
    const res = await fetch(`${BASE}${id}/`, {
        method: "PATCH",
        headers: await headers(),
        credentials: "include",
        body: JSON.stringify(payload),
    });
    await throwIfBad(res);
    return res.json() as Promise<MachineAssignment>;
}

export async function cancelAssignment(id: number): Promise<MachineAssignment> {
    const res = await fetch(`${BASE}${id}/cancel/`, {
        method: "POST",
        headers: await headers(),
        credentials: "include",
    });
    await throwIfBad(res);
    return res.json() as Promise<MachineAssignment>;
}

// Read-only: reuses the existing job-components endpoint (orchestration_views.JobComponentViewSet)
export async function fetchAssignableJobProducts(): Promise<AssignableJobProduct[]> {
    const res = await fetch(`${JOB_COMPONENTS_BASE}?execution_type=internal`, { credentials: "include", cache: "no-store" });
    await throwIfBad(res);
    const data = await res.json() as { results?: AssignableJobProduct[] } | AssignableJobProduct[];
    return Array.isArray(data) ? data : (data.results ?? []);
}
