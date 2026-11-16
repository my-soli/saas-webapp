export interface DashboardOverview {
    leads: {
        total: number;
        new: number;
        converted: number;
    };
    clients: {
        total: number;
        b2b: number;
        b2c: number;
    };
    quotes: {
        total: number;
        draft: number;
        sent_to_customer: number;
        approved: number;
        lost: number;
        ecommerce: number;
    };
    jobs: {
        total: number;
        pending: number;
        in_progress: number;
        on_hold: number;
        completed: number;
    };
    lpos: {
        total: number;
        pending: number;
        approved: number;
        completed: number;
    };
}

export interface SalesPerformancePoint {
    month: string;
    revenue: number;
    orders: number;
}

export interface CategoryRevenuePoint {
    category: string;
    revenue: number;
    orders: number;
}

export interface DashboardStats {
    total_clients: number;
    active_leads: number;
    pending_orders: number;
    active_jobs: number;
    total_products: number;
    total_revenue: number;
    new_clients_trend: number;
    new_leads_trend: number;
    new_orders_trend: number;
    revenue_trend: number;
}

export interface DashboardAnalytics {
    dashboard_stats: DashboardStats;
    sales_performance_trend: SalesPerformancePoint[];
    revenue_by_category: Array<Record<string, unknown>>;
}

export interface DashboardAlert {
    id: number;
    alert_type: string;
    severity: string;
    title: string;
    message: string;
    created_at: string;
    is_active: boolean;
    is_dismissed: boolean;
}

export interface DashboardAlertsResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: DashboardAlert[];
}

export interface DashboardActivity {
    id: number;
    activity_type: string;
    title: string;
    description: string;
    client: number | null;
    created_by: number | null;
    created_at: string;
}

export interface DashboardActivityResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: DashboardActivity[];
}

export interface AccountManagerKPIs {
    my_revenue_this_month: number;
    my_quotes_this_month: number;
    active_jobs_count: number;
    new_clients_this_month: number;
}

export interface LeadFunnel {
    new: number;
    contacted: number;
    qualified: number;
    converted: number;
}

export interface QuoteStatusDistribution {
    draft: number;
    quoted: number;
    approved: number;
    lost: number;
}

export interface RevenueTrendPoint {
    month: string;
    revenue: number;
}

export interface ClientGrowthPoint {
    month: string;
    b2b: number;
    b2c: number;
}

export interface TopProduct {
    name: string;
    revenue: number;
    count: number;
}

export interface JobsStatusDistribution {
    pending: number;
    in_progress: number;
    on_hold: number;
    completed: number;
}

export interface RecentQuote {
    id: number;
    quote_id: string;
    client_name: string | null;
    lead_name: string | null;
    product_name: string;
    quantity: number;
    total_amount: number;
    status: string;
    created_at: string;
}

export interface UpcomingAction {
    type: "quote" | "job" | "lead";
    id: number;
    title: string;
    description: string;
    client_name: string;
    due_date: string;
    priority: "low" | "medium" | "high";
}

export interface AccountManagerDashboard {
    kpis: AccountManagerKPIs;
    lead_funnel: LeadFunnel;
    revenue_trend: RevenueTrendPoint[];
    client_growth: ClientGrowthPoint[];
    jobs_status: JobsStatusDistribution;
    recent_quotes: RecentQuote[];
    upcoming_actions: UpcomingAction[];
}

export interface RevenueChartPoint {
    label: string;
    revenue: number;
    orders: number;
}

export interface CategoryChartPoint {
    name: string;
    value: number;
}

export interface JobsChartPoint {
    status: string;
    count: number;
}

export type ActionCenterKind = "quote" | "job" | "dispatch" | "invoice";

export interface ActionCenterItem {
    id: number;
    ref: string;
    title: string;
    subtitle: string;
    amount?: number;
    owner?: string | null;
    due_date?: string | null;
    job_id?: number;
    age_days: number | null;
}

export interface ActionCenterSection {
    key: string;
    label: string;
    kind: ActionCenterKind;
    severity: "high" | "medium";
    count: number;
    items: ActionCenterItem[];
}

export interface ActionCenterResponse {
    generated_at: string;
    sections: ActionCenterSection[];
}

export interface ReportMonth {
    month: string;
    revenue: number;
    orders: number;
    invoiced: number;
    collected: number;
    quotes_created: number;
    quote_value: number;
    quotes_approved: number;
    approved_value: number;
    quotes_lost: number;
    jobs_created: number;
    jobs_completed: number;
}

export interface DashboardReports {
    months: number;
    start: string;
    monthly: ReportMonth[];
    top_clients: { id: number; name: string; revenue: number; orders: number }[];
    top_products: { name: string; revenue: number; quantity: number; quotes: number }[];
    jobs_by_status: Record<string, number>;
    quotes_by_status: Record<string, number>;
    quote_metrics: {
        created: number;
        approved: number;
        win_rate: number | null;
        avg_value: number;
        avg_days_to_approve: number | null;
    };
    job_metrics: { completed: number; on_time_rate: number | null };
}

export interface InsightJobItem { id: number; ref: string; client: string; name: string; owner: string | null; due: string | null }

export interface RevenueTarget {
    month: string;
    target: number | null;
    actual: number;
    progress: number | null;
    projected: number;
    days_elapsed: number;
    days_in_month: number;
    last_year_to_date: number;
    last_year_month: number;
}

export interface DashboardInsights {
    start: string;
    end: string;
    receivables: {
        total: number;
        invoices: number;
        buckets: { current: number; d1_30: number; d31_60: number; d61_90: number; d90_plus: number };
        top_debtors: { id: number; name: string; balance: number; invoices: number; oldest_days: number }[];
    };
    profit: {
        totals: { revenue: number; cost: number; profit: number; margin: number | null; costed_jobs: number; uncosted_jobs: number };
        by_account_manager: { name: string; revenue: number; cost: number; profit: number; margin: number | null; jobs: number }[];
        by_product: { name: string; revenue: number; cost: number; profit: number; margin: number | null }[];
        lowest_margin_jobs: { quote_id: number; ref: string; job_id: number | null; job_number: string | null; client: string; revenue: number; cost: number; profit: number; margin: number | null }[];
    };
    today: {
        due_today: { count: number; items: InsightJobItem[] };
        due_tomorrow: { count: number; items: InsightJobItem[] };
        due_this_week: { count: number; items: InsightJobItem[] };
        dispatches_today: { count: number; items: { id: number; ref: string; client: string; location: string; status: string }[] };
        quotes_expiring: { count: number; items: { id: number; ref: string; client: string; valid_until: string; value: number }[] };
    };
    capacity: {
        team: { id: number; name: string; open_jobs: number; overdue: number; due_this_week: number; open_items: number }[];
        unassigned_jobs: number;
        next_14_days: { date: string; jobs: number }[];
        avg_per_day: number;
    };
    team: {
        sales: { name: string; created: number; sent: number; approved: number; lost: number; approved_value: number; win_rate: number | null; avg_days_to_send: number | null }[];
        production: { name: string; completed: number; on_time: number; on_time_rate: number | null }[];
    };
    vendors: {
        vendors: { id: number; name: string; spend: number; orders: number; completed: number; late: number; late_rate: number | null; avg_days_late: number }[];
        total_spend: number;
        overdue_orders: number;
        unpaid_invoices: { count: number; total: number; items: { id: number; ref: string; vendor: string; amount: number; due: string | null; status: string }[] };
    };
    funnel: {
        leads: { total: number; converted: number; conversion: number | null; by_source: { source: string; leads: number; converted: number; conversion: number | null }[]; by_status: Record<string, number> };
        storefront: { requests: number; by_status: Record<string, number>; converted_to_quote: number; online_quotes: number; online_quotes_approved: number };
    };
    clients: {
        new_clients: number;
        buying_clients: number;
        repeat_clients: number;
        first_time_buyers: number;
        top_clients: { id: number; name: string; this_month: number; last_month: number }[];
        quiet_clients: { id: number; name: string; last_order: string; days_quiet: number; lifetime_value: number; orders: number }[];
    };
    target: RevenueTarget;
}

export interface ActivityFeedItem {
    at: string;
    type: string;
    title: string;
    detail: string;
    by: string | null;
    link: string | null;
}
