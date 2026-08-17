const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
const BASE = `${PROXY_BASE}/api/proxy/api/v1/customer-statements/`;
const CLIENTS_BASE = `${PROXY_BASE}/api/proxy/api/v1/clients/`;

export interface StatementTransaction {
    date: string | null;
    type: "invoice" | "payment";
    source: "client_invoice" | "client_payment" | "financial_invoice" | "financial_invoice_payment";
    source_id?: number;
    reference: string;
    description: string;
    status: string;
    debit: number;
    credit: number;
    balance: number;
}

export interface CustomerStatement {
    client_id: number;
    client_name: string;
    transactions: StatementTransaction[];
    summary: {
        total_invoiced: number;
        total_paid: number;
        balance: number;
    };
}

export interface ClientOption {
    id: number;
    name: string;
}

async function throwIfBad(res: Response) {
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as Record<string, unknown>;
        const msg = (body.detail as string) || "Request failed";
        throw new Error(msg);
    }
}

export async function fetchClientOptions(): Promise<ClientOption[]> {
    const res = await fetch(`${CLIENTS_BASE}?page_size=200`, { credentials: "include", cache: "no-store" });
    await throwIfBad(res);
    const data = await res.json() as { results?: ClientOption[] } | ClientOption[];
    return Array.isArray(data) ? data : (data.results ?? []);
}

export async function fetchCustomerStatement(clientId: number, startDate?: string, endDate?: string): Promise<CustomerStatement> {
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    const qs = params.toString();
    const res = await fetch(`${BASE}${clientId}/${qs ? `?${qs}` : ""}`, { credentials: "include", cache: "no-store" });
    await throwIfBad(res);
    return res.json() as Promise<CustomerStatement>;
}

export function getStatementPdfUrl(clientId: number, startDate?: string, endDate?: string): string {
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    const qs = params.toString();
    return `${BASE}${clientId}/pdf/${qs ? `?${qs}` : ""}`;
}
