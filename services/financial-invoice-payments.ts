import { getCsrfToken } from "@/lib/api/auth";

const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
const BASE = `${PROXY_BASE}/api/proxy/api/v1/financial-invoice-payments/`;

export const INVOICE_PAYMENT_METHOD_OPTIONS = [
    { value: "cash", label: "Cash" },
    { value: "mpesa", label: "M-Pesa" },
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "cheque", label: "Cheque" },
    { value: "credit_card", label: "Credit Card" },
];

export interface FinancialInvoicePayment {
    id: number;
    invoice: number;
    invoice_number: string;
    client_name: string;
    payment_date: string;
    amount: string;
    payment_method: string;
    payment_method_display: string;
    reference_number: string;
    notes: string;
    created_at: string;
}

export interface FinancialInvoicePaymentPayload {
    invoice: number;
    payment_date: string;
    amount: string;
    payment_method: string;
    reference_number?: string;
    notes?: string;
}

async function headers() {
    const csrf = await getCsrfToken();
    return { "Content-Type": "application/json", "X-CSRFToken": csrf };
}

async function throwIfBad(res: Response) {
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as Record<string, unknown>;
        const first = Object.values(body)[0];
        const msg = Array.isArray(first) ? (first[0] as string) : (typeof first === 'string' ? first : "Request failed");
        throw new Error(msg);
    }
}

export async function fetchInvoicePayments(invoiceId: number): Promise<FinancialInvoicePayment[]> {
    const res = await fetch(`${BASE}?invoice=${invoiceId}`, { credentials: "include", cache: "no-store" });
    await throwIfBad(res);
    const data = await res.json() as { results?: FinancialInvoicePayment[] } | FinancialInvoicePayment[];
    return Array.isArray(data) ? data : (data.results ?? []);
}

export async function createInvoicePayment(payload: FinancialInvoicePaymentPayload): Promise<FinancialInvoicePayment> {
    const res = await fetch(BASE, {
        method: "POST",
        headers: await headers(),
        credentials: "include",
        body: JSON.stringify(payload),
    });
    await throwIfBad(res);
    return res.json() as Promise<FinancialInvoicePayment>;
}

export async function deleteInvoicePayment(id: number): Promise<void> {
    const res = await fetch(`${BASE}${id}/`, {
        method: "DELETE",
        headers: await headers(),
        credentials: "include",
    });
    if (!res.ok && res.status !== 204) await throwIfBad(res);
}
