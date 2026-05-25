import type {
    SubscriptionPlan,
    ClientSubscription,
    CreateSubscriptionPayload,
    RegisterPayload,
    RegisterResponse,
} from "@/types/subscription";
import { getCsrfToken } from "@/lib/api/auth";

const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/subscription-plans/`, {
        cache: "no-store",
    });
    if (!response.ok) throw new Error("Failed to fetch subscription plans");
    const data = await response.json() as { results?: SubscriptionPlan[] } | SubscriptionPlan[];
    return Array.isArray(data) ? data : (data.results ?? []);
}

export async function fetchMySubscription(): Promise<ClientSubscription> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/portal/subscription/`, {
        credentials: "include",
        cache: "no-store",
    });
    if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { detail?: string };
        throw new Error(body.detail ?? "Failed to fetch subscription");
    }
    return response.json() as Promise<ClientSubscription>;
}

export async function createSubscription(payload: CreateSubscriptionPayload): Promise<ClientSubscription> {
    const csrfToken = await getCsrfToken();
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/portal/subscription/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { detail?: string };
        throw new Error(body.detail ?? "Failed to create subscription");
    }
    return response.json() as Promise<ClientSubscription>;
}

export async function updateSubscription(payload: { plan_id?: number; auto_renew?: boolean; billing_cycle?: string }): Promise<ClientSubscription> {
    const csrfToken = await getCsrfToken();
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/portal/subscription/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { detail?: string };
        throw new Error(body.detail ?? "Failed to update subscription");
    }
    return response.json() as Promise<ClientSubscription>;
}

export async function cancelSubscription(reason?: string): Promise<void> {
    const csrfToken = await getCsrfToken();
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/portal/subscription/`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        credentials: "include",
        body: JSON.stringify({ reason: reason ?? '' }),
    });
    if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { detail?: string };
        throw new Error(body.detail ?? "Failed to cancel subscription");
    }
}

export async function registerAccount(payload: RegisterPayload): Promise<RegisterResponse> {
    const csrfToken = await getCsrfToken();
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/portal/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const body = await response.json().catch(() => ({})) as Record<string, string | string[]>;
        const firstError = Object.values(body)[0];
        const msg = Array.isArray(firstError) ? firstError[0] : (firstError as string) ?? "Registration failed";
        throw new Error(msg);
    }
    return response.json() as Promise<RegisterResponse>;
}
