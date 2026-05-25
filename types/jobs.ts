export type JobStatus = "pending" | "in_progress" | "on_hold" | "completed";

export type JobPriority = "normal" | "high" | "urgent";

export interface JobClientInfo {
    id: number;
    name: string;
    email: string | null;
}

export interface JobUserInfo {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
}

export interface JobProduct {
    id: number;
    job: number;
    product_name: string;
    quantity: number;
    unit: string;
    specifications: string;
    assigned_to: number | null;
    assigned_to_name: string | null;
    production_type: string;
    execution_type: "internal" | "external" | "field";
    vendor: number | null;
    vendor_name: string | null;
    sla_deadline: string | null;
    status: "pending" | "in_progress" | "blocked" | "qc_hold" | "ready" | "dispatched" | "completed";
    notes: string;
    brief_quoted_price: string;
    brief_artwork_ref: string;
    brief_client_contact: string;
    brief_lpo_ref: string;
    deps_open: number;
    deps_total: number;
    created_at: string;
}

export interface JobProductAssignment {
    job_product_id: number;
    user_id: number | null;
}

export interface Job {
    id: number;
    client: JobClientInfo | null;
    quote: number | null;
    job_number: string | null;
    job_name: string;
    job_type: string;
    priority: JobPriority;
    product: string;
    quantity: number;
    status: JobStatus;
    expected_completion: string | null;
    created_at: string;
    person_in_charge: JobUserInfo | null;
    notes: string | null;
    start_date: string | null;
    delivery_date: string | null;
    delivery_method: string | null;
    assignment_notes: string | null;
    job_products?: JobProduct[];
    // LPO / Zoho Books fields (only present when job came from a quote)
    lpo_id?: number | null;
    lpo_number?: string | null;
    zoho_synced?: boolean;
    zoho_invoice_number?: string | null;
}

export interface JobsResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Job[];
}

export interface JobsQueryParams {
    page: number;
    pageSize: number;
    search: string;
    status: "all" | "active" | JobStatus;
    /** Filter jobs assigned to this user (Production Team PIC / OM handoff) */
    personInCharge?: number;
}

export type JobVendorStageStatus = "pending" | "sent_to_vendor" | "in_production" | "completed" | "issues";

export interface JobVendorStage {
    id: number;
    job: number;
    vendor: number;
    stage_order: number;
    stage_name: string;
    status: JobVendorStageStatus;
    progress: number;
    expected_completion: string | null;
    started_at: string | null;
    completed_at: string | null;
    vendor_cost: string | number;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateJobVendorStagePayload {
    job: number;
    vendor: number;
    stage_order: number;
    stage_name: string;
    status: JobVendorStageStatus;
    progress: number;
    expected_completion: string | null;
    vendor_cost: string;
    notes: string | null;
}

export type UpdateJobVendorStagePayload = Partial<CreateJobVendorStagePayload>;
