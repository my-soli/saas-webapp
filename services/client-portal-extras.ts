import type {
    PortalQuotesResponse,
    DesignsResponse,
    DesignFile,
    DesignCategory,
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

export async function downloadPortalQuotePdf(quoteId: string): Promise<Blob> {
    const res = await fetch(`${BASE}/api/proxy/quotes/approve/${quoteId}/pdf/`, {
        credentials: "include",
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to download PDF");
    return res.blob();
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
}): Promise<DesignFile> {
    const csrfToken = await getCsrfToken();
    const form = new FormData();
    form.append("file", payload.file);
    form.append("title", payload.title || payload.file.name);
    form.append("category", payload.category || "other");
    form.append("notes", payload.notes || "");

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
