import { getCsrfToken } from "@/lib/api/auth";

const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
const BASE = `${PROXY_BASE}/api/proxy/api/v1/expenses/`;
const VENDORS_BASE = `${PROXY_BASE}/api/proxy/api/v1/vendors/`;

export const EXPENSE_CATEGORY_OPTIONS = [
    { value: "rent", label: "Rent" },
    { value: "utilities", label: "Utilities" },
    { value: "salaries", label: "Salaries" },
    { value: "supplies", label: "Supplies" },
    { value: "maintenance", label: "Maintenance" },
    { value: "marketing", label: "Marketing" },
    { value: "transport", label: "Transport" },
    { value: "other", label: "Other" },
];

export const EXPENSE_PAYMENT_METHOD_OPTIONS = [
    { value: "cash", label: "Cash" },
    { value: "mpesa", label: "M-Pesa" },
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "cheque", label: "Cheque" },
    { value: "credit_card", label: "Credit Card" },
];

export interface Expense {
    id: number;
    category: string;
    category_display: string;
    description: string;
    amount: string;
    expense_date: string;
    payment_method: string;
    payment_method_display: string;
    vendor: number | null;
    vendor_name: string;
    receipt_file: string | null;
    notes: string;
    created_at: string;
    updated_at: string;
}

export interface ExpensePayload {
    category: string;
    description: string;
    amount: string;
    expense_date: string;
    payment_method: string;
    vendor?: number | null;
    notes?: string;
    receipt_file?: File | null;
}

export interface PaginatedResult<T> {
    results: T[];
    count: number;
}

export interface ExpenseSummary {
    total_this_month: number;
    by_category: { category: string; total: number }[];
}

export interface VendorOption {
    id: number;
    name: string;
}

async function headers() {
    const csrf = await getCsrfToken();
    return { "Content-Type": "application/json", "X-CSRFToken": csrf };
}

async function multipartHeaders() {
    const csrf = await getCsrfToken();
    return { "X-CSRFToken": csrf };
}

function toFormData(payload: Partial<ExpensePayload>): FormData {
    const fd = new FormData();
    for (const [key, value] of Object.entries(payload)) {
        if (value === undefined || value === null) continue;
        if (key === "receipt_file") {
            if (value instanceof File) fd.append(key, value);
            continue;
        }
        fd.append(key, String(value));
    }
    return fd;
}

async function throwIfBad(res: Response) {
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as Record<string, unknown>;
        const first = Object.values(body)[0];
        const msg = Array.isArray(first) ? (first[0] as string) : (typeof first === 'string' ? first : "Request failed");
        throw new Error(msg);
    }
}

export async function fetchExpenses(params: { search?: string; page?: number } = {}): Promise<PaginatedResult<Expense>> {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.page && params.page > 1) qs.set("page", String(params.page));
    const url = qs.toString() ? `${BASE}?${qs}` : BASE;
    const res = await fetch(url, { credentials: "include", cache: "no-store" });
    await throwIfBad(res);
    const data = await res.json() as { count?: number; results?: Expense[] } | Expense[];
    if (Array.isArray(data)) return { results: data, count: data.length };
    return { results: data.results ?? [], count: data.count ?? (data.results ?? []).length };
}

export async function fetchExpenseSummary(): Promise<ExpenseSummary> {
    const res = await fetch(`${BASE}summary/`, { credentials: "include", cache: "no-store" });
    await throwIfBad(res);
    return res.json() as Promise<ExpenseSummary>;
}

export async function createExpense(payload: ExpensePayload): Promise<Expense> {
    const res = payload.receipt_file
        ? await fetch(BASE, {
            method: "POST",
            headers: await multipartHeaders(),
            credentials: "include",
            body: toFormData(payload),
        })
        : await fetch(BASE, {
            method: "POST",
            headers: await headers(),
            credentials: "include",
            body: JSON.stringify(payload),
        });
    await throwIfBad(res);
    return res.json() as Promise<Expense>;
}

export async function updateExpense(id: number, payload: Partial<ExpensePayload>): Promise<Expense> {
    if (payload.receipt_file) {
        const res = await fetch(`${BASE}${id}/`, {
            method: "PATCH",
            headers: await multipartHeaders(),
            credentials: "include",
            body: toFormData(payload),
        });
        await throwIfBad(res);
        return res.json() as Promise<Expense>;
    }
    const res = await fetch(`${BASE}${id}/`, {
        method: "PATCH",
        headers: await headers(),
        credentials: "include",
        body: JSON.stringify(payload),
    });
    await throwIfBad(res);
    return res.json() as Promise<Expense>;
}

export async function deleteExpense(id: number): Promise<void> {
    const res = await fetch(`${BASE}${id}/`, {
        method: "DELETE",
        headers: await headers(),
        credentials: "include",
    });
    if (!res.ok && res.status !== 204) await throwIfBad(res);
}

export async function fetchVendorOptions(): Promise<VendorOption[]> {
    const res = await fetch(`${VENDORS_BASE}?page_size=200`, { credentials: "include", cache: "no-store" });
    await throwIfBad(res);
    const data = await res.json() as { results?: VendorOption[] } | VendorOption[];
    return Array.isArray(data) ? data : (data.results ?? []);
}
