import type {
    AccountManagerPerformance,
    VendorDeliveryRate,
    VendorQualityScoresResponse,
    VendorTurnaroundTimesResponse,
    JobCompletionStats,
} from "@/types/analytics";

const PROXY_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');

async function getCsrfToken(): Promise<string> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/auth/csrf/`, {
        credentials: "include",
    });
    const data = await response.json();
    return data.csrfToken;
}

export async function fetchAccountManagerPerformance(): Promise<AccountManagerPerformance> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/analytics/am_performance/`, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error("Failed to fetch account manager performance");
    }

    return response.json();
}

export async function fetchVendorDeliveryRate(months: number = 12): Promise<VendorDeliveryRate> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/analytics/vendor_delivery_rate/?months=${months}`, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error("Failed to fetch vendor delivery rate");
    }

    return response.json();
}

export async function fetchVendorQualityScores(limit: number = 10): Promise<VendorQualityScoresResponse> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/analytics/vendor_quality_scores/?limit=${limit}`, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error("Failed to fetch vendor quality scores");
    }

    return response.json();
}

export async function fetchVendorTurnaroundTimes(months: number = 12): Promise<VendorTurnaroundTimesResponse> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/analytics/vendor_turnaround_time/?months=${months}`, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error("Failed to fetch vendor turnaround times");
    }

    return response.json();
}

export async function fetchJobCompletionStats(): Promise<JobCompletionStats> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/analytics/job_completion_stats/`, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error("Failed to fetch job completion stats");
    }

    return response.json();
}

export interface CustomProductEntry {
    name: string;
    times_quoted: number;
}

export interface CustomProductsStats {
    pending_addition: CustomProductEntry[];
    already_added: CustomProductEntry[];
    pending_count: number;
    added_count: number;
    total_custom_quoted: number;
}

export async function fetchCustomProductsStats(): Promise<CustomProductsStats> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/analytics/custom_products_stats/`, {
        credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch custom products stats");
    return response.json();
}

export interface AIKpi {
    label: string;
    status: "good" | "warning" | "critical";
    note: string;
}

export interface AIInsight {
    type: "positive" | "warning" | "neutral";
    title: string;
    body: string;
}

export interface AIInsightsData {
    summary: string;
    kpis: AIKpi[];
    insights: AIInsight[];
    actions: string[];
}

export async function fetchAINarrative(): Promise<AIInsightsData> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/ai/analytics_narrative/`, {
        credentials: "include",
    });
    if (response.status === 429) throw new Error("429 rate limited");
    if (!response.ok) throw new Error("AI service unavailable");
    return response.json();
}

export interface AIPaymentMatchResult {
    invoice_id: number | null;
    lpo_number?: string;
    confidence: number;
    reasoning: string;
    job_id?: number | null;
    job_number?: string | null;
    job_name?: string | null;
}

export async function matchPaymentToInvoice(
    description: string,
    amount: number
): Promise<AIPaymentMatchResult> {
    const csrfToken = await getCsrfToken();
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/ai/match_payment/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        body: JSON.stringify({ description, amount }),
    });
    if (!response.ok) throw new Error("AI match failed");
    return response.json();
}

export async function fetchAILeadsHealth(): Promise<{ narrative: string; stale_leads: number }> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/ai/leads_health/`, {
        credentials: "include",
    });
    if (!response.ok) throw new Error("AI service unavailable");
    return response.json();
}

export async function aiChat(question: string): Promise<{ answer: string }> {
    const csrfToken = await getCsrfToken();
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/ai/chat/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
        body: JSON.stringify({ question }),
    });
    if (response.status === 429) throw new Error("rate_limited");
    if (!response.ok) throw new Error("AI service unavailable");
    return response.json();
}

export interface BottleneckAlertsResult {
    overdue_components: {
        component: string;
        job_number: string;
        job_name: string;
        client: string;
        sla_deadline: string;
        days_overdue: number;
        status: string;
        vendor: string | null;
        assigned_to: string | null;
    }[];
    approaching_deadlines: {
        job_number: string;
        job_name: string;
        client: string;
        deadline: string;
        days_left: number;
        pic: string;
        components_not_ready: number;
    }[];
    stale_jobs: {
        job_number: string;
        job_name: string;
        client: string;
        status: string;
        days_no_movement: number;
        pic: string;
    }[];
    generated_at: string;
}

export async function fetchBottleneckAlerts(): Promise<BottleneckAlertsResult> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/ai/bottleneck_alerts/`, {
        credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch bottleneck alerts");
    return response.json();
}

export interface QuoteInsightsResult {
    cold_quotes: {
        quote_id: string;
        client: string;
        days_old: number;
        valid_until: string | null;
        expired: boolean;
    }[];
    conversion_30d: {
        total_sent: number;
        approved: number;
        rate: number;
    };
    generated_at: string;
}

export async function fetchQuoteInsights(): Promise<QuoteInsightsResult> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/ai/quote_insights/`, {
        credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch quote insights");
    return response.json();
}

export interface StaffUsageResult {
    staff: {
        name: string;
        email: string;
        quotes_30d: number;
        leads_30d: number;
        jobs_30d: number;
        activity_logs: number;
        total_30d: number;
    }[];
    dormant_staff: { name: string; email: string }[];
    generated_at: string;
}

export async function fetchStaffUsage(): Promise<StaffUsageResult> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/ai/staff_usage/`, {
        credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch staff usage");
    return response.json();
}

export interface VendorPerformanceResult {
    vendors: {
        vendor: string;
        total_components: number;
        overdue: number;
        completed: number;
        overdue_rate: number;
        completion_rate: number;
        late_invoices: number;
        reliability_score: number;
        system_rating: number;
        quality_rating: string;
    }[];
    generated_at: string;
}

export async function fetchVendorPerformance(): Promise<VendorPerformanceResult> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/ai/vendor_performance/`, {
        credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch vendor performance");
    return response.json();
}

export interface PaymentGapsResult {
    jobs_no_payment: { job_number: string; job_name: string; client: string; pic: string; days_since_update: number }[];
    lpos_no_payment: { lpo_number: string; client: string; total: number; status: string; due_date: string | null }[];
    jobs_no_invoice: { job_number: string; job_name: string; client: string; days_since_update: number }[];
    generated_at: string;
}

export async function fetchPaymentGaps(): Promise<PaymentGapsResult> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/ai/payment_gaps/`, {
        credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch payment gaps");
    return response.json();
}

export interface LeadPriorityItem {
    lead_id: string;
    name: string;
    company: string;
    status: string;
    product_interest: string;
    age_days: number;
    follow_up_date: string | null;
    follow_up_overdue: boolean;
    priority_score: number;
    source: string;
    preferred_client_type: string;
}

export async function fetchLeadPriority(): Promise<LeadPriorityItem[]> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/ai/lead_priority/`, {
        credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch lead priority");
    return response.json();
}

export interface ClientPatternItem {
    client: string;
    quotes_12m: number;
    approved: number;
    conversion_rate: number;
    avg_days_to_approve: number | null;
}

export async function fetchClientPatterns(): Promise<ClientPatternItem[]> {
    const response = await fetch(`${PROXY_BASE}/api/proxy/api/v1/ai/client_patterns/`, {
        credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch client patterns");
    return response.json();
}
