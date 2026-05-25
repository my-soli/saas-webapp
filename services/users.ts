import type { ProductionUser, ProductionUsersResponse } from "@/types/users";

const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');

export async function getCurrentUser(): Promise<ProductionUser> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/users/me/`, {
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
    });

    if (!response.ok) {
        const errorText = await response.text().catch((_error: unknown): string => "Unknown error");
        throw new Error(`Failed to fetch current user: ${response.status} ${errorText}`);
    }

    return response.json();
}

export async function fetchProductionUsers(): Promise<ProductionUsersResponse> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/production-users/`, {
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
    });

    if (!response.ok) {
        const errorText = await response.text().catch((_error: unknown): string => "Unknown error");
        throw new Error(`Failed to fetch production users: ${response.status} ${errorText}`);
    }

    return response.json();
}

export async function fetchAllUsers(): Promise<ProductionUsersResponse> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/all-users/`, {
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
    });

    if (!response.ok) {
        const errorText = await response.text().catch((_error: unknown): string => "Unknown error");
        throw new Error(`Failed to fetch users: ${response.status} ${errorText}`);
    }

    return response.json();
}
