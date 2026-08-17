import { getCsrfToken } from "@/lib/api/auth";

const PROXY_BASE = typeof window !== "undefined" ? "" : (process.env.NEXTAUTH_URL || "http://localhost:3000");

const buildHeaders = async (): Promise<HeadersInit> => {
    const csrf = await getCsrfToken();
    return {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRFToken": csrf } : {}),
    };
};

const get = async <T>(path: string): Promise<T> => {
    const res = await fetch(`${PROXY_BASE}/api/proxy/api/v1/${path}`, {
        credentials: "include",
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return res.json();
};

const post = async <T>(path: string, body?: unknown): Promise<T> => {
    const res = await fetch(`${PROXY_BASE}/api/proxy/api/v1/${path}`, {
        method: "POST",
        headers: await buildHeaders(),
        credentials: "include",
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`POST ${path} failed: ${res.status} ${text}`);
    }
    return res.json();
};

const patch = async <T>(path: string, body: unknown): Promise<T> => {
    const res = await fetch(`${PROXY_BASE}/api/proxy/api/v1/${path}`, {
        method: "PATCH",
        headers: await buildHeaders(),
        credentials: "include",
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`PATCH ${path} failed: ${res.status} ${text}`);
    }
    return res.json();
};

const del = async (path: string): Promise<void> => {
    const res = await fetch(`${PROXY_BASE}/api/proxy/api/v1/${path}`, {
        method: "DELETE",
        headers: await buildHeaders(),
        credentials: "include",
    });
    if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PTUser {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    is_superuser?: boolean;
    groups?: { id: number; name: string }[];
}

export interface JobComponent {
    id: number;
    job: number;
    job_name: string | null;
    job_number: string | null;
    job_person_in_charge_id: number | null;
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

export interface ComponentDependency {
    id: number;
    component: number;
    dependency_type: string;
    description: string;
    status: "open" | "resolved";
    blocking: string;
    due_by: string | null;
    resolved_at: string | null;
    created_at: string;
}

export interface ComponentTask {
    id: number;
    component: number;
    component_name: string | null;
    job_id: number | null;
    job_name: string | null;
    job_number: string | null;
    name: string;
    description: string;
    assigned_to: number | null;
    assigned_to_name: string | null;
    status: "pending" | "in_progress" | "done" | "overdue" | "blocked";
    due_by: string | null;
    notes: string;
    created_at: string;
    updated_at: string;
}

export interface ComponentQCResult {
    id: number;
    component: number;
    description: string;
    category: string;
    passed: boolean | null;
    notes: string;
    checked_by: number | null;
    checked_by_name: string | null;
    checked_at: string | null;
    is_custom: boolean;
    created_at: string;
}

export interface DispatchUnit {
    id: number;
    job: number;
    job_name: string;
    client_name: string | null;
    dispatch_number: string;
    dispatch_type: string;
    status: "pending" | "ready" | "partial" | "dispatched" | "delivered";
    courier: string;
    dispatch_date: string | null;
    delivery_location: string;
    components: number[];
    components_detail: {
        id: number;
        product_name: string;
        quantity: number;
        unit: string;
        status: string;
        produced_qty: number;
        invoiced_qty: number;
    }[];
    pod_signed_by: string;
    pod_signed_at: string | null;
    exception_notes: string;
    created_by: number | null;
    created_at: string;
    rider_link?: string;
    recipient_link?: string;
    rider_confirmed_by?: string;
    rider_confirmed_at?: string | null;
    rider_gps_lat?: number | null;
    rider_gps_lng?: number | null;
    rider_notes?: string;
    rider_photos?: string[];
    recipient_confirmed_by?: string;
    recipient_confirmed_at?: string | null;
    recipient_notes?: string;
    recipient_photos?: string[];
}

export type ProductionCostType = "material" | "vendor" | "labor" | "other";

export interface ProductionCostItem {
    service_name: string;
    cost: number;
    cost_type?: ProductionCostType;
}

export interface ComponentCost {
    componentId: number;
    name: string;
    quantity: number;
    unit: string;
    quotedAmount: number;
    items: ProductionCostItem[];
    total: number;
}

export interface ProductionCostEntry {
    job_product_id: number;
    items: ProductionCostItem[];
    total: number;
    updated_at?: string;
}

export interface ReconciliationRow {
    jobId: string;
    jobDbId: number;
    jobName: string;
    client: string;
    quotedRevenue: number;
    actualCost: number;
    invoicedAmount: number;
    variance: number;
    margin: number;
    status: "MATCHED" | "VARIANCE" | "PENDING";
    jobStatus: string;
    components: ComponentCost[];
    zohoSynced: boolean;
    zohoInvoiceNumber: string | null;
    zohoStatus: string | null;
    zohoBalance: number | null;
    hasLpo: boolean;
    overridden: boolean;
    flagged: boolean;
}

export interface ZohoSyncResult {
    status: "success" | "already_synced";
    zoho_invoice_id: string;
    zoho_invoice_number: string;
    zoho_status: string;
    zoho_balance: number;
    message: string;
}

export interface ReconciliationData {
    rows: ReconciliationRow[];
    count: number;
    rework_costs_total: number;
}

export interface OverrideLogEntry {
    id: number;
    title: string;
    details: string;
    action: string;
    model: string;
    overriddenBy: string;
    timestamp: string;
}

export interface CreateDispatchUnitPayload {
    job: number;
    dispatch_type: string;
    courier: string;
    delivery_location: string;
    dispatch_date: string | null;
    components: number[];
}

export interface ControlTowerStats {
    blocked_count: number;
    qc_failures_count: number;
    active_jobs_count: number;
    vendor_pending_count: number;
    blocked_components: Array<{
        id: number;
        product_name: string;
        status: string;
        job_id: number;
        job_name: string;
        vendor_name: string | null;
        sla_deadline: string | null;
        deps_open: number;
        block_types: string[];
    }>;
    qc_hold_components: Array<{
        id: number;
        product_name: string;
        status: string;
        job_id: number;
        job_name: string;
        vendor_name: string | null;
        sla_deadline: string | null;
        deps_open: number;
        block_types: string[];
    }>;
    open_dependencies: Array<{
        id: number;
        component_id: number;
        component_name: string;
        job_id: number;
        job_name: string;
        dependency_type: string;
        description: string;
        due_by: string | null;
    }>;
    pending_approvals: Array<{
        id: number;
        title: string;
        description: string;
        action_label: string;
        component_id: number;
        job_id: number;
        dependency_type: string;
    }>;
    vendor_capacity: Array<{
        id: number;
        name: string;
        active_jobs: number;
        max_capacity: number;
        utilization_pct: number;
        status: "available" | "busy" | "critical";
    }>;
}

// ── Users ─────────────────────────────────────────────────────────────────────

export const fetchProductionUsers = (): Promise<PTUser[]> =>
    get<{ results: PTUser[] }>("production-users/").then((d) => d.results ?? []);

// ── Job Components ────────────────────────────────────────────────────────────

export const fetchJobComponents = (jobId: number): Promise<JobComponent[]> =>
    get<{ results?: JobComponent[] } | JobComponent[]>(`job-components/?job=${jobId}`).then((d) =>
        Array.isArray(d) ? d : (d as { results: JobComponent[] }).results ?? []
    );

/** All components visible to the current user (backend-scoped). For non-PIC
 *  PT members this returns only the components directly assigned to them. */
export const fetchAssignedComponents = (): Promise<JobComponent[]> =>
    get<{ results?: JobComponent[] } | JobComponent[]>("job-components/").then((d) =>
        Array.isArray(d) ? d : (d as { results: JobComponent[] }).results ?? []
    );

export const createJobComponent = (payload: Partial<JobComponent>): Promise<JobComponent> =>
    post<JobComponent>("job-components/", payload);

export const updateJobComponent = (compId: number, payload: Partial<JobComponent>): Promise<JobComponent> =>
    patch<JobComponent>(`job-components/${compId}/`, payload);

export const updateComponentStatus = (compId: number, status: JobComponent["status"]): Promise<JobComponent> =>
    post<JobComponent>(`job-components/${compId}/update_status/`, { status });

// ── Dependencies ──────────────────────────────────────────────────────────────

export const fetchDependencies = (compId: number): Promise<ComponentDependency[]> =>
    get<{ results?: ComponentDependency[] } | ComponentDependency[]>(`job-component-dependencies/?component=${compId}`).then(
        (d) => (Array.isArray(d) ? d : (d as { results: ComponentDependency[] }).results ?? [])
    );

export const createDependency = (payload: Partial<ComponentDependency>): Promise<ComponentDependency> =>
    post<ComponentDependency>("job-component-dependencies/", payload);

export const resolveDependency = (depId: number): Promise<ComponentDependency> =>
    post<ComponentDependency>(`job-component-dependencies/${depId}/resolve/`);

export const deleteDependency = (depId: number): Promise<void> =>
    del(`job-component-dependencies/${depId}/`);

// ── Tasks ─────────────────────────────────────────────────────────────────────

export const fetchTasks = (compId: number): Promise<ComponentTask[]> =>
    get<{ results?: ComponentTask[] } | ComponentTask[]>(`job-component-tasks/?component=${compId}`).then(
        (d) => (Array.isArray(d) ? d : (d as { results: ComponentTask[] }).results ?? [])
    );

/** Returns all tasks assigned to the current user (across all components). */
export const fetchMyTasks = (): Promise<ComponentTask[]> =>
    get<{ results?: ComponentTask[] } | ComponentTask[]>(`job-component-tasks/?assigned_to_me=1`).then(
        (d) => (Array.isArray(d) ? d : (d as { results: ComponentTask[] }).results ?? [])
    );

export const createTask = (payload: Partial<ComponentTask>): Promise<ComponentTask> =>
    post<ComponentTask>("job-component-tasks/", payload);

export const updateTask = (taskId: number, payload: Partial<ComponentTask>): Promise<ComponentTask> =>
    patch<ComponentTask>(`job-component-tasks/${taskId}/`, payload);

export const deleteTask = (taskId: number): Promise<void> =>
    del(`job-component-tasks/${taskId}/`);

// ── QC Results ────────────────────────────────────────────────────────────────

export const fetchQCResults = (compId: number): Promise<ComponentQCResult[]> =>
    get<{ results?: ComponentQCResult[] } | ComponentQCResult[]>(`job-component-qc/?component=${compId}`).then(
        (d) => (Array.isArray(d) ? d : (d as { results: ComponentQCResult[] }).results ?? [])
    );

export const markQCResult = (resultId: number, passed: boolean | null, notes?: string): Promise<ComponentQCResult> =>
    post<ComponentQCResult>(`job-component-qc/${resultId}/mark/`, { passed, notes: notes ?? "" });

export const loadQCTemplate = (compId: number, templateType: string): Promise<ComponentQCResult[]> =>
    post<ComponentQCResult[]>("job-component-qc/load_template/", {
        component_id: compId,
        template_type: templateType,
    });

export const createCustomQCResult = (payload: Partial<ComponentQCResult>): Promise<ComponentQCResult> =>
    post<ComponentQCResult>("job-component-qc/", payload);

export const deleteQCResult = (resultId: number): Promise<void> =>
    del(`job-component-qc/${resultId}/`);

// ── Dispatch Units ────────────────────────────────────────────────────────────

export const fetchDispatchUnits = (jobId?: number): Promise<DispatchUnit[]> => {
    const q = jobId ? `?job=${jobId}` : "";
    return get<{ results?: DispatchUnit[] } | DispatchUnit[]>(`dispatch-units/${q}`).then(
        (d) => (Array.isArray(d) ? d : (d as { results: DispatchUnit[] }).results ?? [])
    );
};

export const createDispatchUnit = (payload: CreateDispatchUnitPayload): Promise<DispatchUnit> =>
    post<DispatchUnit>("dispatch-units/", payload);

export const updateDispatchUnit = (unitId: number, payload: Partial<CreateDispatchUnitPayload>): Promise<DispatchUnit> =>
    patch<DispatchUnit>(`dispatch-units/${unitId}/`, payload);

export const deleteDispatchUnit = (unitId: number): Promise<void> =>
    del(`dispatch-units/${unitId}/`);

export const approveDispatch = (unitId: number): Promise<DispatchUnit> =>
    post<DispatchUnit>(`dispatch-units/${unitId}/approve/`);

export const markDelivered = (unitId: number, podSignedBy: string): Promise<DispatchUnit> =>
    post<DispatchUnit>(`dispatch-units/${unitId}/mark_delivered/`, { pod_signed_by: podSignedBy });

export const flagDispatchException = (unitId: number, notes: string): Promise<DispatchUnit> =>
    post<DispatchUnit>(`dispatch-units/${unitId}/flag_exception/`, { notes });

export const uploadDeliveryPhoto = async (token: string, photo: File): Promise<void> => {
    const formData = new FormData();
    formData.append("photo", photo);
    const res = await fetch(`${PROXY_BASE}/api/proxy/api/v1/delivery-confirmation/${token}/photo/`, {
        method: "POST",
        body: formData,
    });
    if (!res.ok) throw new Error("Failed to upload photo");
};

// ── Control Tower ─────────────────────────────────────────────────────────────

export const fetchControlTowerStats = (): Promise<ControlTowerStats> =>
    get<ControlTowerStats>("pt/control-tower/");

// ── Reconciliation ────────────────────────────────────────────────────────────

export const fetchReconciliation = (): Promise<ReconciliationData> =>
    get<{ results: ReconciliationRow[]; count: number; rework_costs_total: number }>("pt/reconciliation/")
        .then((d) => ({ rows: d.results ?? [], count: d.count ?? 0, rework_costs_total: d.rework_costs_total ?? 0 }));

export const fetchProductionCost = (jobProductId: number): Promise<ProductionCostEntry> =>
    get<ProductionCostEntry>(`pt/production-cost/${jobProductId}/`);

export const saveProductionCost = (jobProductId: number, items: ProductionCostItem[]): Promise<ProductionCostEntry> =>
    post<ProductionCostEntry>(`pt/production-cost/${jobProductId}/`, { items });

export const sendAdjustmentRequest = (jobProductId: number, note: string): Promise<{ detail: string }> =>
    post<{ detail: string }>(`pt/component-adjustment/${jobProductId}/`, { note });

export const fetchOverrideLog = (): Promise<OverrideLogEntry[]> =>
    get<{ results: OverrideLogEntry[] }>("pt/override-log/").then((d) => d.results ?? []);

export const postReconciliationOverride = (jobDbId: number, reason: string): Promise<{ detail: string; zoho_invoice_number?: string; zoho_status?: string; zoho_balance?: number }> =>
    post<{ detail: string; zoho_invoice_number?: string; zoho_status?: string; zoho_balance?: number }>("pt/reconciliation/override/", { job_id: jobDbId, reason });

export const postReconciliationFlag = (jobDbId: number, flagged: boolean): Promise<{ detail: string; jobId: number; flagged: boolean }> =>
    post<{ detail: string; jobId: number; flagged: boolean }>("pt/reconciliation/flag/", { job_id: jobDbId, flagged });

export const syncJobToZoho = (jobDbId: number): Promise<ZohoSyncResult> =>
    post<ZohoSyncResult>(`pt/zoho/sync-job/${jobDbId}/`, {});

export const pullZohoPayments = (): Promise<{ created: number; updated: number; total: number; payments_created: number }> =>
    post<{ created: number; updated: number; total: number; payments_created: number }>("zoho-invoices/import/", {});

// ── Vendor Brief ──────────────────────────────────────────────────────────────

export interface SendBriefResult {
    channel: string;
    acknowledge_url: string;
    wa_message: string;
    vendor_phone: string;
    vendor_email: string;
    deadline_missing?: boolean;
    compose_data?: {
        subject: string;
        body: string;
        to: string;
    };
}

export const sendVendorBrief = (
    compId: number,
    channel: "email" | "whatsapp" = "email",
): Promise<SendBriefResult> =>
    post<SendBriefResult>(`job-components/${compId}/send_brief/`, { channel });

// ── Brief Attachments ──────────────────────────────────────────────────────────

export interface BriefAttachment {
    id: number;
    attachment_name: string;
    description: string;
    uploaded_at: string;
    uploaded_by: string | null;
}

export const fetchBriefAttachments = (compId: number): Promise<BriefAttachment[]> =>
    get<BriefAttachment[]>(`job-components/${compId}/brief-attachments/`);

export const uploadBriefAttachment = async (compId: number, file: File | null, attachmentName: string, description: string): Promise<BriefAttachment> => {
    const csrf = await getCsrfToken();
    const formData = new FormData();
    if (file) formData.append("file", file);
    formData.append("attachment_name", attachmentName);
    formData.append("description", description);
    const res = await fetch(`${PROXY_BASE}/api/proxy/api/v1/job-components/${compId}/brief-attachments/`, {
        method: "POST",
        headers: { ...(csrf ? { "X-CSRFToken": csrf } : {}) },
        credentials: "include",
        body: formData,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json();
};

export const deleteBriefAttachment = (attachmentId: number): Promise<void> =>
    del(`brief-attachments/${attachmentId}/`);

// ── Off-System Communication Log ───────────────────────────────────────────────

export type OffSystemChannel = "phone" | "whatsapp" | "email" | "in_person" | "other";
export type OffSystemDirection = "outbound" | "inbound";

export interface OffSystemLog {
    id: number;
    channel: string;
    direction: string;
    summary: string;
    occurred_at: string;
    recorded_by: string;
}

export const logCommunication = (compId: number, payload: {
    channel: OffSystemChannel;
    direction: OffSystemDirection;
    summary: string;
    occurred_at: string;
}): Promise<OffSystemLog> =>
    post<OffSystemLog>(`job-components/${compId}/log-communication/`, payload);

// ── Adjustment Response ────────────────────────────────────────────────────────

export const respondToAdjustment = (compId: number, payload: {
    action: "approve" | "reject" | "reply";
    message?: string;
    new_deadline?: string;
    new_cost?: string;
}): Promise<{ detail: string; adjustment_status: string }> =>
    post(`job-components/${compId}/respond-to-adjustment/`, payload);

export const respondToPrice = (compId: number, payload: {
    action: "accept" | "counter";
    message?: string;
    counter_price?: string;
}): Promise<{ detail: string; price_review_status: string }> =>
    post(`job-components/${compId}/respond-to-price/`, payload);

// ── QC Custom Templates ───────────────────────────────────────────────────────

export interface QCCustomTemplate {
    id: number;
    name: string;
    icon: string;
    production_type: string;
    checkpoints: { description: string; category: string }[];
    created_by: number;
    created_by_name: string;
    created_at: string;
    updated_at: string;
}

export const fetchQCCustomTemplates = (): Promise<QCCustomTemplate[]> =>
    get<{ results?: QCCustomTemplate[] } | QCCustomTemplate[]>("qc-custom-templates/").then(
        (d) => (Array.isArray(d) ? d : (d as { results: QCCustomTemplate[] }).results ?? [])
    );

export const createQCCustomTemplate = (payload: Omit<QCCustomTemplate, "id" | "created_by" | "created_by_name" | "created_at" | "updated_at">): Promise<QCCustomTemplate> =>
    post<QCCustomTemplate>("qc-custom-templates/", payload);

export const updateQCCustomTemplate = (id: number, payload: Partial<QCCustomTemplate>): Promise<QCCustomTemplate> =>
    patch<QCCustomTemplate>(`qc-custom-templates/${id}/`, payload);

export const deleteQCCustomTemplate = (id: number): Promise<void> =>
    del(`qc-custom-templates/${id}/`);

// ── Component Files ───────────────────────────────────────────────────────────

export type ComponentFileSlot = "artwork" | "bom" | "brief_pdf" | "proof" | "qc_sheet" | "delivery_note";

export interface ComponentFile {
    id: number;
    component: number;
    slot: ComponentFileSlot;
    file_name: string;
    file_size: number;
    file_url: string | null;
    uploaded_by: number | null;
    uploaded_by_name: string | null;
    uploaded_at: string;
}

export const fetchComponentFiles = (compId: number): Promise<ComponentFile[]> =>
    get<ComponentFile[]>(`job-components/${compId}/files/`).then((d) => (Array.isArray(d) ? d : []));

export const uploadComponentFile = async (compId: number, slot: ComponentFileSlot, file: File): Promise<ComponentFile> => {
    const csrf = await getCsrfToken();
    const formData = new FormData();
    formData.append("slot", slot);
    formData.append("file", file);
    const res = await fetch(`${PROXY_BASE}/api/proxy/api/v1/job-components/${compId}/files`, {
        method: "POST",
        headers: { ...(csrf ? { "X-CSRFToken": csrf } : {}) },
        credentials: "include",
        body: formData,
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Upload failed: ${res.status} ${text}`);
    }
    return res.json();
};

export const deleteComponentFile = (fileId: number): Promise<void> =>
    del(`job-component-files/${fileId}/`);

// ── Vendor Brief Status (for PT timeline) ─────────────────────────────────────

export interface VendorBriefProofStatus {
    id: number;
    file_name: string;
    uploaded_at: string;
    uploaded_by_name: string;
    pt_feedback: string | null;
    feedback_at: string | null;
}

export interface VendorBriefStatus {
    has_brief: boolean;
    brief_sent_at?: string;
    acknowledged?: boolean;
    acknowledged_at?: string | null;
    acknowledged_by?: string;
    vendor_accepted?: boolean;
    vendor_accepted_at?: string | null;
    time_adjustment_requested?: boolean;
    time_adjustment_reason?: string;
    time_adjustment_requested_at?: string | null;
    proposed_deadline?: string | null;
    proposed_cost?: string;
    adjustment_status?: "pending" | "approved" | "rejected";
    adjustment_response?: string;
    adjustment_responded_at?: string | null;
    adjustment_responded_by?: string | null;
    vendor_proposed_price?: string;
    price_review_status?: "pending" | "accepted" | "countered" | "";
    price_counter_offer?: string;
    price_review_note?: string;
    price_reviewed_at?: string | null;
    proofs?: VendorBriefProofStatus[];
    updates?: { note: string; created_at: string }[];
    is_active?: boolean;
    brief_attachments?: BriefAttachment[];
    off_system_logs?: OffSystemLog[];
}

export const fetchVendorBriefStatus = (compId: number): Promise<VendorBriefStatus> =>
    get<VendorBriefStatus>(`job-components/${compId}/vendor-brief-status/`);

// ── Vendor Job Analytics ──────────────────────────────────────────────────────

export interface VendorJobStat {
    id: number;
    name: string;
    email: string;
    active: boolean;
    total_jobs: number;
    completed_jobs: number;
    completion_rate: number;
    briefs_sent: number;
    acknowledged: number;
    proofs_uploaded: number;
    avg_completion_days: number | null;
}

export const fetchVendorJobAnalytics = (): Promise<VendorJobStat[]> =>
    get<VendorJobStat[]>("pt/vendor-analytics/").then((d) => (Array.isArray(d) ? d : []));

// ── Vendors ───────────────────────────────────────────────────────────────────

export interface VendorOption {
    id: number;
    name: string;
    email: string;
}

export const fetchVendors = (): Promise<VendorOption[]> =>
    get<{ results?: VendorOption[] } | VendorOption[]>("vendors/?page_size=200").then(
        (d) => (Array.isArray(d) ? d : (d as { results: VendorOption[] }).results ?? [])
    );

// ── Print Categories (for QC template production type dropdown) ───────────────

export interface PrintCategoryOption {
    id: number;
    name: string;
    slug: string;
}

export const fetchPrintCategories = (): Promise<PrintCategoryOption[]> =>
    get<{ results?: PrintCategoryOption[] } | PrintCategoryOption[]>("print-categories/?page_size=200").then(
        (d) => (Array.isArray(d) ? d : (d as { results: PrintCategoryOption[] }).results ?? [])
    );

// ── Active Jobs (for Dispatch Unit creation modal) ────────────────────────────

export interface ActiveJobOption {
    id: number;
    job_number: string;
    job_name: string;
    client: { id: number; name: string } | null;
    status: string;
}

export const fetchActiveJobs = (): Promise<ActiveJobOption[]> =>
    get<{ results?: ActiveJobOption[] } | ActiveJobOption[]>("jobs/?page_size=200").then(
        (d) => (Array.isArray(d) ? d : (d as { results: ActiveJobOption[] }).results ?? [])
    );
