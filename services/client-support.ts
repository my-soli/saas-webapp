import type {
    SupportTicket,
    TicketsListResponse,
    CreateTicketPayload,
    DocumentsListResponse,
} from "@/types/client-support";
import type { AMUser } from "@/types/client-portal-extras";
import { getCsrfToken } from "@/lib/api/auth";

const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');

export interface TicketsQueryParams {
    page?: number;
    status?: string;
}

export async function fetchSupportTickets(
    params: TicketsQueryParams = {}
): Promise<TicketsListResponse> {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.status && params.status !== "all") qs.set("status", params.status);
    const response = await fetch(
        `${PROXY_BASE}/api/proxy/api/v1/client-support-tickets/?${qs.toString()}`,
        { credentials: "include", cache: "no-store" }
    );
    if (!response.ok) throw new Error("Failed to fetch tickets");
    return response.json() as Promise<TicketsListResponse>;
}

export async function createSupportTicket(payload: CreateTicketPayload): Promise<SupportTicket> {
    const csrf = await getCsrfToken();
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/client-support-tickets/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { detail?: string };
        throw new Error(body.detail ?? "Failed to create ticket");
    }
    return response.json() as Promise<SupportTicket>;
}

export async function replyToTicket(ticketId: number, message: string): Promise<SupportTicket> {
    const csrf = await getCsrfToken();
    const response = await fetch(
        `${PROXY_BASE}/api/proxy/api/v1/client-support-tickets/${ticketId}/add_reply/`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-CSRFToken": csrf },
            credentials: "include",
            body: JSON.stringify({ message }),
        }
    );
    if (!response.ok) throw new Error("Failed to send reply");
    return response.json() as Promise<SupportTicket>;
}

export async function fetchPTMembers(): Promise<AMUser[]> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/portal/pt-members/`, {
        credentials: "include",
        cache: "no-store",
    });
    if (!response.ok) return [];
    return response.json() as Promise<AMUser[]>;
}

export interface DocumentsQueryParams {
    page?: number;
    doc_type?: string;
}

export async function fetchClientDocuments(
    params: DocumentsQueryParams = {}
): Promise<DocumentsListResponse> {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.doc_type && params.doc_type !== "all") qs.set("doc_type", params.doc_type);
    const response = await fetch(
        `${PROXY_BASE}/api/proxy/api/v1/client-documents/?${qs.toString()}`,
        { credentials: "include", cache: "no-store" }
    );
    if (!response.ok) throw new Error("Failed to fetch documents");
    return response.json() as Promise<DocumentsListResponse>;
}
