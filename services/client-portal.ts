import type {
    ChangePasswordPayload,
    ClientPortalProfile,
    UpdateClientPortalProfilePayload,
} from "@/types/client-portal";
import { getCsrfToken } from "@/lib/api/auth";

const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');

export async function fetchClientPortalProfile(): Promise<ClientPortalProfile> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/portal/me/`, {
        credentials: "include",
        cache: "no-store",
    });
    if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { detail?: string };
        throw new Error(body.detail ?? "Failed to fetch profile");
    }
    return response.json() as Promise<ClientPortalProfile>;
}

export async function updateClientPortalProfile(
    payload: UpdateClientPortalProfilePayload
): Promise<ClientPortalProfile> {
    const csrfToken = await getCsrfToken();
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/portal/me/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { detail?: string };
        throw new Error(body.detail ?? "Failed to update profile");
    }
    return response.json() as Promise<ClientPortalProfile>;
}

export async function changeClientPortalPassword(
    payload: ChangePasswordPayload
): Promise<void> {
    const csrfToken = await getCsrfToken();
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/auth/change-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { detail?: string };
        throw new Error(body.detail ?? "Failed to change password");
    }
}
