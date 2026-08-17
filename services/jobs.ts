import {
    CreateJobVendorStagePayload,
    Job,
    JobVendorStage,
    JobsQueryParams,
    JobsResponse,
    UpdateJobVendorStagePayload,
} from "@/types/jobs";
import { getCsrfToken } from "@/lib/api/auth";

const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');

const buildQueryString = (params: JobsQueryParams): string => {
    const searchParams = new URLSearchParams();
    searchParams.set("page", params.page.toString());
    searchParams.set("page_size", params.pageSize.toString());

    if (params.search.trim()) {
        searchParams.set("search", params.search.trim());
    }

    if (params.status !== "all") {
        searchParams.set("status", params.status);
    }

    if (params.personInCharge != null && params.personInCharge > 0) {
        searchParams.set("person_in_charge", String(params.personInCharge));
    }

    return searchParams.toString();
};

const buildWriteHeaders = async (): Promise<HeadersInit> => {
    const csrfToken = await getCsrfToken();
    return {
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    };
};

export async function fetchJobs(params: JobsQueryParams): Promise<JobsResponse> {
    const queryString = buildQueryString(params);
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/jobs/?${queryString}`, {
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
    });

    if (!response.ok) {
        const errorText = await response.text().catch((_error: unknown): string => "Unknown error");
        throw new Error(`Failed to fetch jobs: ${response.status} ${errorText}`);
    }

    return response.json();
}

// Lightweight, unpaginated fetch of jobs due within a date range — used by
// ScheduleCalendar, which needs every job in a visible month, not a page.
export async function fetchJobsByDeadline(dateFrom: string, dateTo: string): Promise<Job[]> {
    const qs = new URLSearchParams({
        expected_completion__gte: dateFrom,
        expected_completion__lte: dateTo,
        page_size: "500",
    });
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/jobs/?${qs.toString()}`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
    });
    if (!response.ok) {
        const errorText = await response.text().catch((_error: unknown): string => "Unknown error");
        throw new Error(`Failed to fetch jobs: ${response.status} ${errorText}`);
    }
    const data = await response.json() as JobsResponse | Job[];
    return Array.isArray(data) ? data : (data.results ?? []);
}

export async function fetchJob(jobId: number): Promise<Job> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/jobs/${jobId}/`, {
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
    });

    if (!response.ok) {
        const errorText = await response.text().catch((_error: unknown): string => "Unknown error");
        throw new Error(`Failed to fetch job: ${response.status} ${errorText}`);
    }

    return response.json();
}

export async function fetchJobVendorStages(jobId: number): Promise<JobVendorStage[]> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/job-vendor-stages/?job=${jobId}`, {
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
    });

    if (!response.ok) {
        const errorText = await response.text().catch((_error: unknown): string => "Unknown error");
        throw new Error(`Failed to fetch job vendor stages: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.results ?? [];
}

export async function createJobVendorStage(payload: CreateJobVendorStagePayload): Promise<JobVendorStage> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/job-vendor-stages/`, {
        method: "POST",
        headers: await buildWriteHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text().catch((_error: unknown): string => "Unknown error");
        throw new Error(`Failed to assign vendor: ${response.status} ${errorText}`);
    }

    return response.json();
}

export async function updateJobVendorStage(
    stageId: number,
    payload: UpdateJobVendorStagePayload
): Promise<JobVendorStage> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/job-vendor-stages/${stageId}/`, {
        method: "PATCH",
        headers: await buildWriteHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text().catch((_error: unknown): string => "Unknown error");
        throw new Error(`Failed to update progress: ${response.status} ${errorText}`);
    }

    return response.json();
}

export async function createJob(payload: Partial<Job>): Promise<Job> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/jobs/`, {
        method: "POST",
        headers: await buildWriteHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text().catch((_error: unknown): string => "Unknown error");
        throw new Error(`Failed to create job: ${response.status} ${errorText}`);
    }

    return response.json();
}

export async function updateJob(jobId: number, payload: Partial<Job>): Promise<Job> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/jobs/${jobId}/`, {
        method: "PATCH",
        headers: await buildWriteHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text().catch((_error: unknown): string => "Unknown error");
        throw new Error(`Failed to update job: ${response.status} ${errorText}`);
    }

    return response.json();
}

export async function deleteJob(jobId: number): Promise<void> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/jobs/${jobId}/`, {
        method: "DELETE",
        headers: await buildWriteHeaders(),
        credentials: "include",
    });

    if (!response.ok) {
        const errorText = await response.text().catch((_error: unknown): string => "Unknown error");
        throw new Error(`Failed to delete job: ${response.status} ${errorText}`);
    }
}

export interface JobProductAssignment {
    job_product_id: number;
    user_id: number | null;
}

export interface AssignJobPayload {
    user_id: number;
    assignment_notes?: string;
    remind_days_before?: number;
    line_item_assignments?: JobProductAssignment[];
}

export async function assignJobToProductionTeam(jobId: number, payload: AssignJobPayload): Promise<{ success: boolean; message: string }> {
    const csrfToken = await getCsrfToken();
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/jobs/${jobId}/assign/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
        },
        credentials: "include",
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text().catch((_error: unknown): string => "Unknown error");
        throw new Error(`Failed to assign job: ${response.status} ${errorText}`);
    }

    return response.json();
}

export async function sendJobReminder(jobId: number, reminderNote?: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/jobs/${jobId}/remind/`, {
        method: "POST",
        headers: await buildWriteHeaders(),
        credentials: "include",
        body: JSON.stringify({ reminder_note: reminderNote ?? "" }),
    });

    if (!response.ok) {
        const errorText = await response.text().catch((_error: unknown): string => "Unknown error");
        throw new Error(`Failed to send reminder: ${response.status} ${errorText}`);
    }

    return response.json();
}

export interface JobAttachment {
    id: number;
    file_name: string;
    file_size: number;
    file_url: string | null;
    uploaded_by: string | null;
    uploaded_at: string;
}

export async function fetchJobAttachments(jobId: number): Promise<JobAttachment[]> {
    const res = await fetch(`${PROXY_BASE}/api/proxy/api/v1/jobs/${jobId}/attachments`, {
        credentials: "include",
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`Failed to fetch attachments: ${res.status}`);
    return res.json();
}

export async function uploadJobAttachments(jobId: number, files: File[]): Promise<void> {
    const csrfToken = await getCsrfToken();
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    const res = await fetch(`${PROXY_BASE}/api/proxy/api/v1/jobs/${jobId}/attachments`, {
        method: "POST",
        headers: csrfToken ? { "X-CSRFToken": csrfToken } : {},
        credentials: "include",
        body: formData,
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to upload attachments: ${res.status} ${text}`);
    }
}

export interface ComponentEvent {
    id: number;
    component_id: number;
    component_name: string;
    event_type: "status_change" | "assignment" | "note";
    old_value: string;
    new_value: string;
    note: string;
    changed_by: string | null;
    created_at: string;
}

export async function fetchComponentEvents(jobId: number): Promise<ComponentEvent[]> {
    const res = await fetch(`${PROXY_BASE}/api/proxy/api/v1/jobs/${jobId}/component-events/`, {
        credentials: "include",
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
    return res.json();
}

export interface ZohoSyncResult {
    status: "success" | "already_synced";
    zoho_invoice_id: string;
    zoho_invoice_number: string;
    message: string;
}

export async function syncJobToZoho(jobId: number): Promise<ZohoSyncResult> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/jobs/${jobId}/sync_to_zoho/`, {
        method: "POST",
        headers: await buildWriteHeaders(),
        credentials: "include",
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error || `Sync failed: ${response.status}`);
    }

    return response.json();
}
