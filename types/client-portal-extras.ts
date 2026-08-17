// ── Quotes ────────────────────────────────────────────────────────────────────

export interface PortalQuoteLineItem {
    id: number;
    product_name: string;
    quantity: number;
    unit: string;
    unit_price: string;
    line_total: string;
    description: string;
}

export type PortalQuoteStatus = "Draft" | "Sent to PT" | "Costed" | "Sent to Customer" | "Approved" | "Lost";

export interface PortalQuote {
    id: number;
    quote_id: string;
    status: PortalQuoteStatus;
    created_at: string | null;
    valid_until: string | null;
    total_amount: string;
    subtotal: string;
    tax_total: string;
    tax_rate: number;
    include_vat: boolean;
    project_name: string;
    item_count: number;
    approval_token: string | null;
    line_items: PortalQuoteLineItem[];
}

export interface PortalQuotesResponse {
    count: number;
    results: PortalQuote[];
}

// ── Designs ───────────────────────────────────────────────────────────────────

export type DesignCategory = "logo" | "artwork" | "photo" | "document" | "other";

export interface DesignFile {
    id: number;
    title: string;
    file_name: string;
    file_size: number;
    category: DesignCategory;
    notes: string;
    uploaded_at: string;
    file_url: string | null;
    project_id: number | null;
}

export interface DesignsResponse {
    count: number;
    results: DesignFile[];
}

export interface DesignProject {
    id: number;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
    file_count: number;
}

export interface DesignProjectsResponse {
    count: number;
    results: DesignProject[];
}

export interface StaffMember {
    id: number;
    name: string;
    email: string;
    role: string;
}

// ── Cart ──────────────────────────────────────────────────────────────────────

export interface CartItem {
    id: number;
    product_id: number | null;
    product_name: string;
    description: string;
    quantity: number;
    unit_price: string;
    line_total: string;
    notes: string;
    image_url: string | null;
    design_file_id: number | null;
    design_file_name: string | null;
    design_url: string | null;
    added_at: string;
}

export interface CartResponse {
    items: CartItem[];
    item_count: number;
    subtotal: string;
}

export interface AddToCartPayload {
    product_id?: number;
    product_name: string;
    description?: string;
    quantity: number;
    unit_price?: number | string;
    notes?: string;
    design_file_id?: number;
}

// ── Portal Products (storefront catalog for cart picker) ─────────────────────

export interface PortalProduct {
    id: number;
    name: string;
    short_description: string;
    primary_image_url: string | null;
    status: string;
    primary_category_name: string | null;
}

export interface PortalProductsResponse {
    count: number;
    results: PortalProduct[];
}

export type NotifyVia = "email" | "whatsapp" | "am";

export interface CheckoutPayload {
    notes?: string;
    project_name?: string;
    delivery_date?: string;
    notify_via: NotifyVia;
    assigned_am_id?: number;
}

export interface CheckoutResult {
    quote_id: string;
    order_id: number;
    order_number: string;
    total_amount: string;
    whatsapp_url: string | null;
    message: string;
}

export interface AMUser {
    id: number;
    name: string;
    email: string;
}

// ── Financials ────────────────────────────────────────────────────────────────

export interface FinancialSummary {
    total_quoted: string;
    total_invoiced: string;
    total_paid: string;
    outstanding_balance: string;
    overdue_invoices: number;
    quotes_by_status: {
        draft: number;
        sent: number;
        approved: number;
        lost: number;
    };
}

export interface FinancialQuote {
    id: number;
    quote_id: string;
    status: string;
    total_amount: string;
    created_at: string | null;
    valid_until: string | null;
    project_name: string;
}

export interface FinancialInvoice {
    id: number;
    invoice_number: string;
    status: string;
    total_amount: string;
    balance_due: string;
    issue_date: string | null;
    due_date: string | null;
    order_number: string | null;
}

export interface FinancialPayment {
    id: number;
    amount: string;
    method: string;
    status: string;
    reference: string;
    payment_date: string | null;
    invoice_number: string | null;
}

export interface FinancialsResponse {
    summary: FinancialSummary;
    recent_quotes: FinancialQuote[];
    recent_invoices: FinancialInvoice[];
    recent_payments: FinancialPayment[];
}
