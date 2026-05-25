export type TicketCategory = "order" | "invoice" | "delivery" | "quality" | "technical" | "other";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "awaiting_client" | "resolved" | "closed";
export type DocumentType = "invoice" | "quote" | "specification" | "artwork" | "proof" | "manual" | "certificate" | "other";

export interface TicketReply {
    id: number;
    user: number;
    user_name: string;
    message: string;
    attachment_url: string | null;
    is_internal: boolean;
    created_at: string;
}

export interface SupportTicket {
    id: number;
    ticket_number: string;
    client: number;
    client_name: string;
    title: string;
    description: string;
    category: TicketCategory;
    order: number | null;
    invoice: number | null;
    priority: TicketPriority;
    status: TicketStatus;
    assigned_to: number | null;
    assigned_to_name: string | null;
    resolution_notes: string;
    replies: TicketReply[];
    created_by: number | null;
    created_by_name: string;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
}

export interface TicketsListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: SupportTicket[];
}

export type TicketAssignToType = "am" | "pt" | "admin";

export interface CreateTicketPayload {
    title: string;
    description: string;
    category: TicketCategory;
    priority: TicketPriority;
    assign_to_type?: TicketAssignToType;
    assignee_id?: number;
}

export interface ClientDocument {
    id: number;
    document_number: string;
    client: number;
    client_name: string;
    title: string;
    description: string;
    doc_type: DocumentType;
    order: number | null;
    invoice: number | null;
    file_url: string;
    file_size: number | null;
    file_format: string;
    is_public: boolean;
    uploaded_by: number | null;
    uploaded_by_name: string;
    created_at: string;
    expires_at: string | null;
}

export interface DocumentsListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: ClientDocument[];
}
