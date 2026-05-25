export interface AccountManagerPerformance {
    account_manager: {
        id: number;
        username: string;
        email: string;
    };
    quotes: {
        total: number;
        approved: number;
        pending: number;
        lost: number;
        conversion_rate_percent: number;
        total_revenue: number;
        average_quote_value: number;
    };
    leads: {
        total: number;
        converted: number;
        conversion_rate_percent: number;
        by_status?: Record<string, number>;
    };
    clients: {
        managed: number;
        b2b?: number;
        b2c?: number;
        other?: number;
    };
    jobs?: {
        total: number;
        pending: number;
        in_progress: number;
        on_hold: number;
        completed: number;
        overdue: number;
    };
    performance_summary: {
        status: "strong" | "good" | "needs_improvement";
        top_metric: string;
    };
}

export interface VendorDeliveryRate {
    months: string[];
    vendors: Record<
        string,
        Array<{
            rate: number;
            on_time: number;
            total: number;
        }>
    >;
    average: number;
}

export interface VendorQualityScore {
    name: string;
    score: number;
    jobs: number;
    rating: string;
}

export interface VendorQualityScoresResponse {
    vendors: VendorQualityScore[];
    total_vendors: number;
}

export interface VendorTurnaroundTime {
    name: string;
    avg_days: number;
    jobs: number;
    performance: "Excellent" | "Good" | "Needs Improvement";
}

export interface VendorTurnaroundTimesResponse {
    vendors: VendorTurnaroundTime[];
    total_vendors: number;
}

export interface JobCompletionStats {
    completed: number;
    in_progress: number;
    pending: number;
    total: number;
    completion_rate: number;
    in_progress_rate: number;
}
