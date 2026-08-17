import type {
    BrandAsset,
    Client,
    ClientContact,
    ClientFormPayload,
    ClientsQueryParams,
    ClientsResponse,
    ClientStatsResponse,
    ComplianceDocument,
} from "@/types/clients";
import type { MultiProductQuote } from "@/types/quotes";

// Works on both client (relative) and server (absolute)
const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');

interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

const buildQueryString = (params: ClientsQueryParams): string => {
    const searchParams = new URLSearchParams();
    searchParams.set("page", params.page.toString());
    searchParams.set("page_size", params.pageSize.toString());

    if (params.search.trim()) {
        searchParams.set("search", params.search.trim());
    }

    if (params.status !== "all") {
        searchParams.set("status", params.status);
    }

    if (params.clientType !== "all") {
        searchParams.set("client_type", params.clientType);
    }

    searchParams.set("ordering", "-created_at");

    return searchParams.toString();
};

const extractErrorDetail = async (response: Response): Promise<string> => {
    try {
        const text = await response.text();
        try {
            const payload = JSON.parse(text) as Record<string, unknown>;
            if (typeof payload.detail === "string" && payload.detail.trim().length > 0) {
                return payload.detail;
            }
            // DRF field-level validation errors: {"field": ["msg"]} or {"field": "msg"}
            const fieldErrors = Object.entries(payload)
                .map(([field, msgs]) => {
                    const msg = Array.isArray(msgs) ? msgs[0] : msgs;
                    return `${field}: ${msg}`;
                })
                .join("; ");
            return fieldErrors || text || "Unknown error";
        } catch {
            return text || "Unknown error";
        }
    } catch {
        return "Unknown error";
    }
};

const normalizeClientPayload = (payload: ClientFormPayload): ClientFormPayload => {
    if (payload.client_type === "B2B") {
        return payload;
    }

    // B2C: strip all B2B-only fields so the backend's field-presence check doesn't reject them
    return {
        client_type: payload.client_type,
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        status: payload.status,
        preferred_channel: payload.preferred_channel,
        lead_source: payload.lead_source,
        address: payload.address,
        delivery_address: payload.delivery_address,
        delivery_instructions: payload.delivery_instructions,
        payment_terms: payload.payment_terms,
    };
};

const parseCollectionResponse = <T>(payload: unknown): T[] => {
    if (Array.isArray(payload)) {
        return payload as T[];
    }

    if (typeof payload === "object" && payload !== null && "results" in payload) {
        const paginated = payload as PaginatedResponse<T>;
        return paginated.results;
    }

    return [];
};

export async function fetchClients(params: ClientsQueryParams): Promise<ClientsResponse> {
    const queryString = buildQueryString(params);
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/clients/?${queryString}`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
    });

    if (!response.ok) {
        const errorText = await extractErrorDetail(response);
        throw new Error(`Failed to fetch clients: ${response.status} ${errorText}`);
    }

    return response.json();
}

export async function fetchClient(clientId: number): Promise<Client> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/clients/${clientId}/`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
    });

    if (!response.ok) {
        const errorText = await extractErrorDetail(response);
        throw new Error(`Failed to fetch client: ${response.status} ${errorText}`);
    }

    return response.json();
}

export async function createClient(payload: ClientFormPayload): Promise<Client> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/clients/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizeClientPayload(payload)),
    });

    if (!response.ok) {
        const errorText = await extractErrorDetail(response);
        throw new Error(`Failed to create client: ${response.status} ${errorText}`);
    }

    return response.json();
}

export async function updateClient(clientId: number, payload: ClientFormPayload): Promise<Client> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/clients/${clientId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizeClientPayload(payload)),
    });

    if (!response.ok) {
        const errorText = await extractErrorDetail(response);
        throw new Error(`Failed to update client: ${response.status} ${errorText}`);
    }

    return response.json();
}

export async function deleteClient(clientId: number): Promise<void> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/clients/${clientId}/`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
        const errorText = await extractErrorDetail(response);
        throw new Error(`Failed to delete client: ${response.status} ${errorText}`);
    }
}

export async function fetchClientContacts(clientId: number): Promise<ClientContact[]> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/client-contacts/?client=${clientId}`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
    });

    if (!response.ok) {
        const errorText = await extractErrorDetail(response);
        throw new Error(`Failed to fetch client contacts: ${response.status} ${errorText}`);
    }

    const payload = (await response.json()) as unknown;
    return parseCollectionResponse<ClientContact>(payload);
}

export async function fetchClientBrandAssets(clientId: number): Promise<BrandAsset[]> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/brand-assets/?client=${clientId}`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
    });

    if (!response.ok) {
        const errorText = await extractErrorDetail(response);
        throw new Error(`Failed to fetch client brand assets: ${response.status} ${errorText}`);
    }

    const payload = (await response.json()) as unknown;
    return parseCollectionResponse<BrandAsset>(payload);
}

export async function fetchClientComplianceDocuments(clientId: number): Promise<ComplianceDocument[]> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/compliance-documents/?client=${clientId}`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
    });

    if (!response.ok) {
        const errorText = await extractErrorDetail(response);
        throw new Error(`Failed to fetch client compliance documents: ${response.status} ${errorText}`);
    }

    const payload = (await response.json()) as unknown;
    return parseCollectionResponse<ComplianceDocument>(payload);
}

export async function fetchClientQuotes(clientId: number): Promise<MultiProductQuote[]> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/quotes/?client=${clientId}&ordering=-created_at&page_size=20`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
    });

    if (!response.ok) {
        const errorText = await extractErrorDetail(response);
        throw new Error(`Failed to fetch client quotes: ${response.status} ${errorText}`);
    }

    const payload = (await response.json()) as unknown;
    return parseCollectionResponse<MultiProductQuote>(payload);
}

export async function fetchClientStats(): Promise<ClientStatsResponse> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/clients/?page_size=1000`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
    });

    if (!response.ok) {
        const errorText = await extractErrorDetail(response);
        throw new Error(`Failed to fetch client stats: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const clients = data.results || [];

    const totalClients = clients.length;
    const activeClients = clients.filter((c: Client) => c.status === "Active").length;
    const b2bClients = clients.filter((c: Client) => c.client_type === "B2B").length;

    const totalRevenue = 0;

    return {
        total_clients: totalClients,
        active_clients: activeClients,
        b2b_clients: b2bClients,
        total_revenue: totalRevenue,
    };
}

export async function sendClientPortalInvite(clientId: number): Promise<{ detail: string; email_sent: boolean }> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/clients/${clientId}/invite/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
    });
    if (!response.ok) {
        const errorText = await extractErrorDetail(response);
        throw new Error(`Failed to send invite: ${response.status} ${errorText}`);
    }
    return response.json();
}

export interface PendingPortalEntry {
    client_id: number;
    client_name: string;
    email: string;
    email_verified: boolean;
    portal_tier: string;
    registered_at: string;
    status: "pending_approval" | "awaiting_email_verification";
}

export async function fetchPendingPortals(): Promise<PendingPortalEntry[]> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/clients/pending_portals/`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
    });
    if (!response.ok) {
        const errorText = await extractErrorDetail(response);
        throw new Error(`Failed to fetch pending portals: ${response.status} ${errorText}`);
    }
    return response.json();
}

export async function approvePortal(clientId: number): Promise<{ detail: string }> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/clients/${clientId}/approve_portal/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
    });
    if (!response.ok) {
        const errorText = await extractErrorDetail(response);
        throw new Error(`Failed to approve portal: ${response.status} ${errorText}`);
    }
    return response.json();
}

export async function resendVerificationEmail(clientId: number): Promise<{ detail: string }> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/clients/${clientId}/resend_verification/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
    });
    if (!response.ok) {
        const errorText = await extractErrorDetail(response);
        throw new Error(`Failed to resend verification email: ${response.status} ${errorText}`);
    }
    return response.json();
}

export async function rejectPortal(clientId: number, reason?: string): Promise<{ detail: string }> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/clients/${clientId}/reject_portal/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "" }),
        cache: "no-store",
    });
    if (!response.ok) {
        const errorText = await extractErrorDetail(response);
        throw new Error(`Failed to reject portal: ${response.status} ${errorText}`);
    }
    return response.json();
}
