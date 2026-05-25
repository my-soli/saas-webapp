import { getCsrfToken } from "@/lib/api/auth";

const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
const BASE = `${PROXY_BASE}/api/proxy/api/v1/subscription-plans/`;

export interface AdminPlan {
    id: number;
    name: string;
    slug: string;
    description: string;
    price_monthly: string;
    price_annually: string;
    max_users: number;
    api_access: boolean;
    white_label: boolean;
    features: string[];
    is_active: boolean;
    is_featured: boolean;
    sort_order: number;
    subscriber_count: number;
    created_at: string;
    updated_at: string;
}

export interface PlanPayload {
    name: string;
    slug: string;
    description: string;
    price_monthly: number | string;
    price_annually: number | string;
    max_users: number;
    api_access: boolean;
    white_label: boolean;
    features: string[];
    is_active: boolean;
    is_featured: boolean;
    sort_order: number;
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

export async function fetchAdminPlans(): Promise<AdminPlan[]> {
    const res = await fetch(BASE, { credentials: "include", cache: "no-store" });
    await throwIfBad(res);
    const data = await res.json() as { results?: AdminPlan[] } | AdminPlan[];
    return Array.isArray(data) ? data : (data.results ?? []);
}

export async function createPlan(payload: PlanPayload): Promise<AdminPlan> {
    const res = await fetch(BASE, {
        method: "POST",
        headers: await headers(),
        credentials: "include",
        body: JSON.stringify(payload),
    });
    await throwIfBad(res);
    return res.json() as Promise<AdminPlan>;
}

export async function updatePlan(id: number, payload: Partial<PlanPayload>): Promise<AdminPlan> {
    const res = await fetch(`${BASE}${id}/`, {
        method: "PATCH",
        headers: await headers(),
        credentials: "include",
        body: JSON.stringify(payload),
    });
    await throwIfBad(res);
    return res.json() as Promise<AdminPlan>;
}

export async function deletePlan(id: number): Promise<void> {
    const res = await fetch(`${BASE}${id}/`, {
        method: "DELETE",
        headers: await headers(),
        credentials: "include",
    });
    if (!res.ok && res.status !== 204) await throwIfBad(res);
}
