import {
    Tenant,
    TenantsListResponse,
    TenantsQueryParams,
    CreateTenantPayload,
    UpdateTenantPayload,
} from "@/types/tenant";

const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');

class TenantsApiError extends Error {
    constructor(
        message: string,
        public statusCode?: number
    ) {
        super(message);
        this.name = "TenantsApiError";
    }
}

export async function fetchTenants(params: TenantsQueryParams = {}): Promise<TenantsListResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page.toString());
    if (params.search) searchParams.append("search", params.search);
    if (params.is_active !== undefined) searchParams.append("is_active", params.is_active.toString());

    const url = `${PROXY_BASE}/api/proxy/api/v1/tenants/?${searchParams.toString()}`;

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
            if (response.status === 401) throw new TenantsApiError("Authentication required", 401);
            if (response.status === 403) throw new TenantsApiError("Access denied", 403);
            throw new TenantsApiError("Failed to fetch tenants");
        }

        return (await response.json()) as TenantsListResponse;
    } catch (error) {
        if (error instanceof TenantsApiError) throw error;
        throw new TenantsApiError("Unable to load tenants. Please try again.");
    }
}

export async function createTenant(payload: CreateTenantPayload): Promise<Tenant> {
    const url = `${PROXY_BASE}/api/proxy/api/v1/tenants/`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            const detail = data.subdomain?.[0] || data.admin_email?.[0] || data.detail || "Failed to create tenant";
            throw new TenantsApiError(detail);
        }

        return (await response.json()) as Tenant;
    } catch (error) {
        if (error instanceof TenantsApiError) throw error;
        throw new TenantsApiError("Unable to create tenant. Please try again.");
    }
}

export async function updateTenant(tenantId: number, updates: UpdateTenantPayload): Promise<Tenant> {
    const url = `${PROXY_BASE}/api/proxy/api/v1/tenants/${tenantId}/`;

    try {
        const response = await fetch(url, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new TenantsApiError(data.detail || "Failed to update tenant");
        }

        return (await response.json()) as Tenant;
    } catch (error) {
        if (error instanceof TenantsApiError) throw error;
        throw new TenantsApiError("Unable to update tenant. Please try again.");
    }
}

export async function deactivateTenant(tenantId: number): Promise<void> {
    const url = `${PROXY_BASE}/api/proxy/api/v1/tenants/${tenantId}/`;

    try {
        const response = await fetch(url, { method: "DELETE" });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new TenantsApiError(data.detail || `Failed to deactivate tenant (${response.status})`, response.status);
        }
    } catch (error) {
        if (error instanceof TenantsApiError) throw error;
        throw new TenantsApiError("Unable to deactivate tenant. Please try again.");
    }
}
