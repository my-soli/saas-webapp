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
}

export interface JobComponent {
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
    name: string;
    assigned_to: number | null;
    assigned_to_name: string | null;
    status: "pending" | "in_progress" | "done" | "overdue" | "blocked";
    due_by: string | null;
    created_at: string;
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
}

export interface ReconciliationRow {
    jobId: string;
    jobName: string;
    client: string;
    quotedRevenue: number;
    actualCost: number;
    invoicedAmount: number;
    variance: number;
    margin: number;
    status: "MATCHED" | "VARIANCE" | "PENDING";
    jobStatus: string;
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

export const approveDispatch = (unitId: number): Promise<DispatchUnit> =>
    post<DispatchUnit>(`dispatch-units/${unitId}/approve/`);

export const markDelivered = (unitId: number, podSignedBy: string): Promise<DispatchUnit> =>
    post<DispatchUnit>(`dispatch-units/${unitId}/mark_delivered/`, { pod_signed_by: podSignedBy });

export const flagDispatchException = (unitId: number, notes: string): Promise<DispatchUnit> =>
    post<DispatchUnit>(`dispatch-units/${unitId}/flag_exception/`, { notes });

// ── Control Tower ─────────────────────────────────────────────────────────────

export const fetchControlTowerStats = (): Promise<ControlTowerStats> =>
    get<ControlTowerStats>("pt/control-tower/");

// ── Reconciliation ────────────────────────────────────────────────────────────

export const fetchReconciliation = (): Promise<ReconciliationData> =>
    get<{ results: ReconciliationRow[]; count: number; rework_costs_total: number }>("pt/reconciliation/")
        .then((d) => ({ rows: d.results ?? [], count: d.count ?? 0, rework_costs_total: d.rework_costs_total ?? 0 }));

export const fetchOverrideLog = (): Promise<OverrideLogEntry[]> =>
    get<{ results: OverrideLogEntry[] }>("pt/override-log/").then((d) => d.results ?? []);

// ── Vendor Brief ──────────────────────────────────────────────────────────────

export const sendVendorBrief = (compId: number): Promise<{ detail: string }> =>
    post<{ detail: string }>(`job-components/${compId}/send_brief/`);

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
    const res = await fetch(`${PROXY_BASE}/api/proxy/api/v1/job-components/${compId}/files/`, {
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
