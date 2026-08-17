import type {
    PortalQuotesResponse,
    DesignsResponse,
    DesignFile,
    DesignCategory,
    DesignProject,
    DesignProjectsResponse,
    StaffMember,
    CartResponse,
    CartItem,
    AddToCartPayload,
    CheckoutPayload,
    CheckoutResult,
    AMUser,
    FinancialsResponse,
    PortalProductsResponse,
} from "@/types/client-portal-extras";
import { getCsrfToken } from "@/lib/api/auth";

const BASE = typeof window !== "undefined" ? "" : (process.env.NEXTAUTH_URL || "http://localhost:3000");
const PROXY = `${BASE}/api/proxy/api/v1`;

// ── Quotes ────────────────────────────────────────────────────────────────────

export async function fetchPortalQuotes(statusFilter = "all"): Promise<PortalQuotesResponse> {
    const qs = statusFilter !== "all" ? `?status=${statusFilter}` : "";
    const res = await fetch(`${PROXY}/portal/quotes/${qs}`, {
        credentials: "include",
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch quotes");
    return res.json();
}

export async function downloadPortalQuotePdf(approvalToken: string): Promise<Blob> {
    const res = await fetch(`${BASE}/api/proxy/quotes/approve/${approvalToken}/pdf/`, {
        credentials: "include",
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to download PDF");
    return res.blob();
}

// ── Jobs (production jobs created by admin/AM/PT) ─────────────────────────────

export interface PortalJobItem {
    id: number;
    product_name: string;
    quantity: number;
    description: string;
}

export interface PortalJob {
    id: number;
    job_number: string;
    job_name: string;
    status: string;
    status_label: string;
    priority: string;
    created_at: string | null;
    start_date: string | null;
    expected_completion: string | null;
    delivery_date: string | null;
    actual_completion: string | null;
    delivery_method: string;
    product: string;
    quantity: number;
    quote_id: string | null;
    total_amount: string | null;
    item_count: number;
    items: PortalJobItem[];
    notes: string;
}

export interface PortalJobsResponse {
    count: number;
    results: PortalJob[];
}

export async function fetchPortalJobs(statusFilter = "all"): Promise<PortalJobsResponse> {
    const qs = statusFilter !== "all" ? `?status=${statusFilter}` : "";
    const res = await fetch(`${PROXY}/portal/jobs/${qs}`, {
        credentials: "include",
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch jobs");
    return res.json();
}

// ── Designs ───────────────────────────────────────────────────────────────────

export async function fetchDesigns(category = "all"): Promise<DesignsResponse> {
    const qs = category !== "all" ? `?category=${category}` : "";
    const res = await fetch(`${PROXY}/portal/designs/${qs}`, {
        credentials: "include",
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch designs");
    return res.json();
}

export async function uploadDesign(payload: {
    file: File;
    title?: string;
    category?: DesignCategory;
    notes?: string;
    project_id?: number;
}): Promise<DesignFile> {
    const csrfToken = await getCsrfToken();
    const form = new FormData();
    form.append("file", payload.file);
    form.append("title", payload.title || payload.file.name);
    form.append("category", payload.category || "other");
    form.append("notes", payload.notes || "");
    if (payload.project_id) form.append("project_id", String(payload.project_id));

    const res = await fetch(`${PROXY}/portal/designs/`, {
        method: "POST",
        headers: { "X-CSRFToken": csrfToken },
        credentials: "include",
        body: form,
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(body.detail ?? "Upload failed");
    }
    return res.json();
}

// ── Design Projects ───────────────────────────────────────────────────────────

export async function fetchDesignProjects(): Promise<DesignProjectsResponse> {
    const res = await fetch(`${PROXY}/portal/projects/`, {
        credentials: "include",
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch projects");
    return res.json();
}

export async function createDesignProject(name: string, description?: string): Promise<DesignProject> {
    const csrfToken = await getCsrfToken();
    const res = await fetch(`${PROXY}/portal/projects/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        credentials: "include",
        body: JSON.stringify({ name, description: description ?? "" }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(body.detail ?? "Failed to create project");
    }
    return res.json();
}

export async function updateDesignProject(id: number, name: string, description?: string): Promise<DesignProject> {
    const csrfToken = await getCsrfToken();
    const res = await fetch(`${PROXY}/portal/projects/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        credentials: "include",
        body: JSON.stringify({ name, description: description ?? "" }),
    });
    if (!res.ok) throw new Error("Failed to update project");
    return res.json();
}

export async function deleteDesignProject(id: number): Promise<void> {
    const csrfToken = await getCsrfToken();
    const res = await fetch(`${PROXY}/portal/projects/${id}/`, {
        method: "DELETE",
        headers: { "X-CSRFToken": csrfToken },
        credentials: "include",
    });
    if (!res.ok && res.status !== 204) throw new Error("Failed to delete project");
}

// ── Design Sharing ────────────────────────────────────────────────────────────

export async function fetchStaffForShare(): Promise<StaffMember[]> {
    const res = await fetch(`${PROXY}/portal/staff-for-share/`, {
        credentials: "include",
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch staff list");
    return res.json();
}

export async function shareDesignFiles(payload: {
    file_ids: number[];
    recipient_ids: number[];
    instructions?: string;
}): Promise<{ shared_count: number; notified: number }> {
    const csrfToken = await getCsrfToken();
    const res = await fetch(`${PROXY}/portal/designs/share/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(body.detail ?? "Failed to share files");
    }
    return res.json();
}

export async function deleteDesign(id: number): Promise<void> {
    const csrfToken = await getCsrfToken();
    const res = await fetch(`${PROXY}/portal/designs/${id}/`, {
        method: "DELETE",
        headers: { "X-CSRFToken": csrfToken },
        credentials: "include",
    });
    if (!res.ok && res.status !== 204) throw new Error("Failed to delete design");
}

// ── Cart ──────────────────────────────────────────────────────────────────────

export async function fetchCart(): Promise<CartResponse> {
    const res = await fetch(`${PROXY}/portal/cart/`, {
        credentials: "include",
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch cart");
    return res.json();
}

export async function addToCart(payload: AddToCartPayload): Promise<CartItem> {
    const csrfToken = await getCsrfToken();
    const res = await fetch(`${PROXY}/portal/cart/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(body.detail ?? "Failed to add to cart");
    }
    return res.json();
}

export async function updateCartItem(id: number, updates: {
    quantity?: number;
    notes?: string;
    description?: string;
    design_file_id?: number | null;
}): Promise<CartItem> {
    const csrfToken = await getCsrfToken();
    const res = await fetch(`${PROXY}/portal/cart/items/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        credentials: "include",
        body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update cart item");
    return res.json();
}

export async function removeFromCart(id: number): Promise<void> {
    const csrfToken = await getCsrfToken();
    const res = await fetch(`${PROXY}/portal/cart/items/${id}/`, {
        method: "DELETE",
        headers: { "X-CSRFToken": csrfToken },
        credentials: "include",
    });
    if (!res.ok && res.status !== 204) throw new Error("Failed to remove cart item");
}

export async function clearCart(): Promise<void> {
    const csrfToken = await getCsrfToken();
    const res = await fetch(`${PROXY}/portal/cart/`, {
        method: "DELETE",
        headers: { "X-CSRFToken": csrfToken },
        credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to clear cart");
}

export async function checkoutCart(payload: CheckoutPayload): Promise<CheckoutResult> {
    const csrfToken = await getCsrfToken();
    const res = await fetch(`${PROXY}/portal/cart/checkout/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(body.detail ?? "Checkout failed");
    }
    return res.json();
}

export async function fetchPortalProducts(search = ""): Promise<PortalProductsResponse> {
    const qs = new URLSearchParams();
    if (search.trim()) qs.set("search", search.trim());
    const url = `${PROXY}/portal/products/${qs.toString() ? `?${qs}` : ""}`;
    const res = await fetch(url, {
        credentials: "include",
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to load products");
    return res.json();
}

export async function fetchAMs(): Promise<AMUser[]> {
    const res = await fetch(`${PROXY}/portal/ams/`, {
        credentials: "include",
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch account managers");
    return res.json();
}

// ── Financials ────────────────────────────────────────────────────────────────

export async function fetchFinancials(): Promise<FinancialsResponse> {
    const res = await fetch(`${PROXY}/portal/financials/`, {
        credentials: "include",
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch financials");
    return res.json();
}
