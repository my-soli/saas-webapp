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

export interface SalesPerformanceTrendItem {
    month: string;
    revenue: number;
    orders: number;
}

export interface TopProduct {
    product_name: string;
    total_quantity: number;
    total_revenue: number;
    order_count: number;
}

export interface ConversionMetrics {
    lead_conversion_rate: number;
    quote_approval_rate: number;
    total_leads: number;
    converted_leads: number;
    total_quotes: number;
    approved_quotes: number;
}

export interface RevenueByCategory {
    product_name: string;
    revenue: number;
    orders: number;
}

export interface ProfitMargins {
    avg_markup: number | null;
    total_revenue: number | null;
    total_cost: number | null;
    overall_margin: number;
}

export interface TimeInsights {
    today_revenue: number;
    yesterday_revenue: number;
    daily_change: number;
    daily_change_abs: number;
    this_week_revenue: number;
    last_week_revenue: number;
    weekly_change: number;
    weekly_change_abs: number;
    this_month_revenue: number;
    last_month_revenue: number;
    monthly_change: number;
    monthly_change_abs: number;
    busiest_days: { date: string; orders: number }[];
}

export interface OutstandingReceivables {
    total_receivables: number;
    overdue_amount: number;
    overdue_percentage: number;
    current: number;
    days_30_60: number;
    days_60_90: number;
    over_90: number;
    unpaid_invoices_count: number;
}

export interface CollectionRate {
    collection_rate: number;
    avg_days_to_payment: number;
    total_invoiced: number;
    total_collected: number;
}

export interface SalesRepresentative {
    name: string;
    deals_closed: number;
    win_rate: number;
    revenue: number;
    avg_deal_size: number;
}

export interface StaffPerformance {
    sales_leaderboard: SalesRepresentative[];
    production_leaderboard: { name: string; jobs_completed: number }[];
}

export interface ActiveQuotes {
    count: number;
    total_value: number;
}

export interface OrdersPipeline {
    pending: number;
    in_progress: number;
    blocked: number;
    qc_hold: number;
    ready: number;
    dispatched: number;
    completed: number;
    overdue: number;
    total_active: number;
}

export interface AnalyticsData {
    dashboard_stats: DashboardStats;
    sales_performance_trend: SalesPerformanceTrendItem[];
    top_products: TopProduct[];
    conversion_metrics: ConversionMetrics;
    average_order_value: number;
    revenue_by_category: RevenueByCategory[];
    profit_margins: ProfitMargins;
    time_insights: TimeInsights;
    receivables: OutstandingReceivables;
    collection_rate: CollectionRate;
    staff_performance: StaffPerformance;
    active_quotes: ActiveQuotes;
    orders_pipeline: OrdersPipeline;
}

export interface ActionBreakdownItem {
    action: string;
    label: string;
    count: number;
}

export interface TopActiveClient {
    client_name: string;
    client_id: string;
    action_count: number;
    last_active: string | null;
}

export interface ActivityOverTimeItem {
    date: string;
    count: number;
}

export interface ClientActivityData {
    total_portal_users: number;
    active_last_n_days: number;
    total_actions: number;
    period_days: number;
    action_breakdown: ActionBreakdownItem[];
    top_active_clients: TopActiveClient[];
    activity_over_time: ActivityOverTimeItem[];
}

export interface TopClient {
    client_id: string;
    name: string;
    total_revenue: number;
    order_count: number;
    last_order: string | null;
    is_lapsed: boolean;
}

export interface ClientRevenueData {
    top_clients: TopClient[];
    total_clients: number;
    lapsed_count: number;
    repeat_clients: number;
    repeat_rate_percent: number;
}

export interface DispatchHealthData {
    pending: number;
    ready: number;
    dispatched: number;
    delivered: number;
    on_time_rate_percent: number;
    dispatched_without_invoice: number;
    total_dispatches_30d: number;
}
