"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    AlertCircleIcon, PackageSearch, AlertTriangleIcon, ClockIcon, TrendingUpIcon, SparklesIcon,
    UsersIcon, ShieldCheckIcon, BanknoteIcon, StarIcon, BarChart2Icon,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import AdminLayout from "@/components/admin/admin-layout";
import { fetchAnalyticsData, fetchClientActivityData, fetchClientRevenueData, fetchDispatchHealthData } from "./api";
import {
    fetchVendorDeliveryRate, fetchVendorQualityScores, fetchVendorTurnaroundTimes,
    fetchBottleneckAlerts, fetchQuoteInsights,
    fetchStaffUsage, fetchVendorPerformance, fetchPaymentGaps, fetchLeadPriority, fetchClientPatterns,
} from "@/services/analytics";
import { fetchCustomProductsStats } from "@/services/analytics";
import StatCard from "./components/StatCard";
import RevenueChart from "./components/RevenueChart";
import ProfitMarginChart from "./components/ProfitMarginChart";
import TopProductsTable from "./components/TopProductsTable";
import SalesLeaderboard from "./components/SalesLeaderboard";
import ConversionFunnel from "./components/ConversionFunnel";
import RevenueByCategoryChart from "./components/RevenueByCategoryChart";
import TimeInsightsCard from "./components/TimeInsightsCard";
import ActivityMetrics from "./components/ActivityMetrics";
import AnalyticsSkeleton from "./components/AnalyticsSkeleton";
import ClientActivityCard from "./components/ClientActivityCard";
import ReceivablesAgingChart from "./components/ReceivablesAgingChart";
import OrdersPipelineCard from "./components/OrdersPipelineCard";
import ClientRevenueTable from "./components/ClientRevenueTable";
import DispatchHealthCard from "./components/DispatchHealthCard";
import AINarrativeCard from "./components/AINarrativeCard";

type TabType = "overview" | "sales" | "performance" | "insights" | "clients" | "suppliers" | "dispatch" | "ai";

interface OffCatalogueChartProps {
    stats: import("@/services/analytics").CustomProductsStats;
}

function OffCatalogueChart({ stats }: OffCatalogueChartProps) {
    const chartData = [
        ...stats.pending_addition.map(p => ({ name: p.name, pending: p.times_quoted, added: 0 })),
        ...stats.already_added.map(p => ({ name: p.name, pending: 0, added: p.times_quoted })),
    ];
    return (
        <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{stats.total_custom_quoted}</p>
                    <p className="text-xs text-gray-500 mt-1">Total custom products</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-amber-600">{stats.pending_count}</p>
                    <p className="text-xs text-gray-500 mt-1">Pending PT addition</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.added_count}</p>
                    <p className="text-xs text-gray-500 mt-1">Added to catalog</p>
                </div>
            </div>
            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 44)}>
                    <BarChart data={chartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                        <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} stroke="#d1d5db" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" tick={{ fill: "#374151", fontSize: 11 }} stroke="#d1d5db" width={200} />
                        <Tooltip
                            contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }}
                            formatter={(v, name) => [`×${v ?? 0} quoted`, name === "pending" ? "Pending" : "Added"]}
                        />
                        <Bar dataKey="pending" name="Pending" fill="#F6B619" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="added" name="Added" fill="#009444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <p className="text-sm text-gray-400 text-center py-8">No off-catalogue products found.</p>
            )}
        </div>
    );
}

export default function AnalyticsPage() {
    const [activeTab, setActiveTab] = useState<TabType>("overview");

    const { data: analytics, isLoading, error } = useQuery({
        queryKey: ["analytics"],
        queryFn: fetchAnalyticsData,
    });

    const customProductsQuery = useQuery({
        queryKey: ["custom-products-stats"],
        queryFn: fetchCustomProductsStats,
    });

    const clientActivityQuery = useQuery({
        queryKey: ["client-activity"],
        queryFn: fetchClientActivityData,
        enabled: activeTab === "clients",
    });

    const clientRevenueQuery = useQuery({
        queryKey: ["client-revenue"],
        queryFn: fetchClientRevenueData,
        enabled: activeTab === "clients",
    });

    const dispatchHealthQuery = useQuery({
        queryKey: ["dispatch-health"],
        queryFn: fetchDispatchHealthData,
        enabled: activeTab === "dispatch",
    });

    const vendorDeliveryQuery = useQuery({
        queryKey: ["vendor-delivery-rate"],
        queryFn: () => fetchVendorDeliveryRate(12),
        enabled: activeTab === "suppliers",
    });

    const vendorQualityQuery = useQuery({
        queryKey: ["vendor-quality-scores"],
        queryFn: () => fetchVendorQualityScores(),
        enabled: activeTab === "suppliers",
    });

    const bottleneckQuery = useQuery({
        queryKey: ["bottleneck-alerts"],
        queryFn: fetchBottleneckAlerts,
        enabled: activeTab === "insights",
        staleTime: 300_000,
    });

    const quoteInsightsQuery = useQuery({
        queryKey: ["quote-insights"],
        queryFn: fetchQuoteInsights,
        enabled: activeTab === "insights",
        staleTime: 300_000,
    });

    const staffUsageQuery = useQuery({
        queryKey: ["staff-usage"],
        queryFn: fetchStaffUsage,
        enabled: activeTab === "ai",
        staleTime: 600_000,
    });

    const vendorPerfQuery = useQuery({
        queryKey: ["vendor-performance-ai"],
        queryFn: fetchVendorPerformance,
        enabled: activeTab === "ai",
        staleTime: 600_000,
    });

    const paymentGapsQuery = useQuery({
        queryKey: ["payment-gaps"],
        queryFn: fetchPaymentGaps,
        enabled: activeTab === "ai",
        staleTime: 300_000,
    });

    const leadPriorityQuery = useQuery({
        queryKey: ["lead-priority"],
        queryFn: fetchLeadPriority,
        enabled: activeTab === "ai",
        staleTime: 300_000,
    });

    const clientPatternsQuery = useQuery({
        queryKey: ["client-patterns"],
        queryFn: fetchClientPatterns,
        enabled: activeTab === "ai",
        staleTime: 600_000,
    });

    const tabs = [
        { id: "overview" as TabType, label: "Overview" },
        { id: "sales" as TabType, label: "Sales & Products" },
        { id: "performance" as TabType, label: "Performance" },
        { id: "insights" as TabType, label: "Insights" },
        { id: "clients" as TabType, label: "Clients" },
        { id: "suppliers" as TabType, label: "Suppliers" },
        { id: "dispatch" as TabType, label: "Dispatch" },
        { id: "ai" as TabType, label: "✦ AI Ops" },
    ];

    const pageHeader = (
        <header className="border-b border-gray-200 bg-white">
            <div className="px-4 lg:px-8 py-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <a href="/staff" className="hover:text-brand-blue">Staff Portal</a>
                    <span>/</span>
                    <span className="text-gray-900">Analytics</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
                <p className="mt-2 text-sm text-gray-600">Comprehensive business analytics and performance metrics</p>
            </div>
            <div className="border-t border-gray-200">
                <nav className="flex px-4 lg:px-8 gap-4 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id
                                ? "border-brand-blue text-brand-blue"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
        </header>
    );

    if (isLoading) {
        return (
            <AdminLayout>
                {pageHeader}
                <main className="bg-gray-50 min-h-screen">
                    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 lg:py-6">
                        <AnalyticsSkeleton />
                    </div>
                </main>
            </AdminLayout>
        );
    }

    if (error || !analytics) {
        return (
            <AdminLayout>
                {pageHeader}
                <main className="bg-gray-50 min-h-screen">
                    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 lg:py-6">
                        <div className="bg-brand-red/10 border border-brand-red/20 rounded-lg p-6">
                            <div className="flex items-center gap-3">
                                <AlertCircleIcon className="h-6 w-6 text-brand-red" />
                                <div>
                                    <h3 className="font-semibold text-brand-red">Failed to load analytics</h3>
                                    <p className="text-sm text-gray-600 mt-1">Unable to fetch analytics data. Please try again later.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </AdminLayout>
        );
    }

    const { dashboard_stats, receivables, collection_rate, profit_margins, active_quotes, orders_pipeline } = analytics;

    return (
        <AdminLayout>
            {pageHeader}
            <main className="bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 lg:py-6 space-y-6">

                    {activeTab === "overview" && (
                        <>
                            {/* Primary KPI row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard
                                    title="Total Revenue (YTD)"
                                    value={`KES ${dashboard_stats.total_revenue.toLocaleString()}`}
                                    trend={dashboard_stats.revenue_trend}
                                    trendLabel="this month"
                                />
                                <StatCard
                                    title="Active Quotes"
                                    value={active_quotes.count.toLocaleString()}
                                    trendLabel={`KES ${active_quotes.total_value.toLocaleString(undefined, { maximumFractionDigits: 0 })} pipeline`}
                                />
                                <StatCard
                                    title="Outstanding Receivables"
                                    value={`KES ${receivables.total_receivables.toLocaleString()}`}
                                    trend={-receivables.overdue_percentage}
                                    trendLabel="overdue"
                                    showPercentage
                                />
                                <StatCard
                                    title="Collection Rate"
                                    value={`${collection_rate.collection_rate}%`}
                                    trendLabel={`Avg ${collection_rate.avg_days_to_payment}d to pay`}
                                />
                            </div>

                            {/* Revenue vs Collected gap */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <StatCard
                                    title="Invoiced (90d)"
                                    value={`KES ${collection_rate.total_invoiced.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                />
                                <StatCard
                                    title="Collected (90d)"
                                    value={`KES ${collection_rate.total_collected.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                />
                                <StatCard
                                    title="Avg. Deal Size"
                                    value={`KES ${analytics.average_order_value.toLocaleString()}`}
                                />
                            </div>

                            <RevenueChart data={analytics.sales_performance_trend} />

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <OrdersPipelineCard data={orders_pipeline} />
                                <ReceivablesAgingChart data={receivables} />
                            </div>

                            <ActivityMetrics stats={dashboard_stats} />

                            <AINarrativeCard />
                        </>
                    )}

                    {activeTab === "sales" && (
                        <>
                            <RevenueByCategoryChart data={analytics.revenue_by_category} />
                            <TopProductsTable products={analytics.top_products} />
                            <ProfitMarginChart data={profit_margins} />
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                                <div className="border-b border-gray-200 px-6 py-4 flex items-center gap-2">
                                    <PackageSearch className="w-5 h-5 text-brand-blue" />
                                    <div>
                                        <h2 className="text-sm font-semibold text-gray-900">Off-Catalogue Quoted Products</h2>
                                        <p className="text-xs text-gray-500 mt-0.5">Products quoted by AMs not in the catalog</p>
                                    </div>
                                </div>
                                {customProductsQuery.isLoading && (
                                    <div className="p-6 space-y-2">
                                        {[1, 2, 3].map(i => <div key={i} className="h-8 animate-pulse bg-gray-100 rounded" />)}
                                    </div>
                                )}
                                {!customProductsQuery.isLoading && customProductsQuery.data && (
                                    <OffCatalogueChart stats={customProductsQuery.data} />
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === "performance" && (
                        <>
                            <ConversionFunnel data={analytics.conversion_metrics} />
                            <SalesLeaderboard staffPerformance={analytics.staff_performance} />
                        </>
                    )}

                    {activeTab === "insights" && (
                        <>
                            <TimeInsightsCard data={analytics.time_insights} />

                            {/* Production Bottlenecks */}
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                                <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                                    <AlertTriangleIcon className="w-5 h-5 text-amber-500" />
                                    <div>
                                        <h2 className="text-sm font-semibold text-gray-900">Production Bottlenecks</h2>
                                        <p className="text-xs text-gray-500 mt-0.5">Overdue components, approaching deadlines, stale jobs</p>
                                    </div>
                                </div>
                                {bottleneckQuery.isLoading && (
                                    <div className="p-6 space-y-2">
                                        {[1, 2, 3].map(i => <div key={i} className="h-10 animate-pulse bg-gray-100 rounded" />)}
                                    </div>
                                )}
                                {bottleneckQuery.data && (
                                    <div className="p-6 space-y-6">
                                        {bottleneckQuery.data.overdue_components.length > 0 && (
                                            <div>
                                                <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                                                    Overdue Components ({bottleneckQuery.data.overdue_components.length})
                                                </h3>
                                                <div className="space-y-2">
                                                    {bottleneckQuery.data.overdue_components.map((c, i) => (
                                                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-gray-900">{c.component}</p>
                                                                <p className="text-xs text-gray-500">{c.job_number} · {c.client}</p>
                                                            </div>
                                                            <div className="text-right flex-shrink-0">
                                                                <span className="inline-flex items-center text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                                                                    {c.days_overdue}d overdue
                                                                </span>
                                                                <p className="text-xs text-gray-400 mt-1">{c.status}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {bottleneckQuery.data.approaching_deadlines.length > 0 && (
                                            <div>
                                                <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                                                    Deadlines Within 3 Days ({bottleneckQuery.data.approaching_deadlines.length})
                                                </h3>
                                                <div className="space-y-2">
                                                    {bottleneckQuery.data.approaching_deadlines.map((j, i) => (
                                                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-gray-900">{j.job_name}</p>
                                                                <p className="text-xs text-gray-500">{j.job_number} · {j.client} · PIC: {j.pic}</p>
                                                            </div>
                                                            <div className="text-right flex-shrink-0">
                                                                <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                                                    {j.days_left === 0 ? "Due today" : `${j.days_left}d left`}
                                                                </span>
                                                                {j.components_not_ready > 0 && (
                                                                    <p className="text-xs text-red-500 mt-1">{j.components_not_ready} comp. not ready</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {bottleneckQuery.data.stale_jobs.length > 0 && (
                                            <div>
                                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                                                    Stale Jobs — No Movement 5+ Days ({bottleneckQuery.data.stale_jobs.length})
                                                </h3>
                                                <div className="space-y-2">
                                                    {bottleneckQuery.data.stale_jobs.map((j, i) => (
                                                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-gray-900">{j.job_name}</p>
                                                                <p className="text-xs text-gray-500">{j.job_number} · {j.client} · PIC: {j.pic}</p>
                                                            </div>
                                                            <span className="text-xs text-gray-500 flex-shrink-0">{j.days_no_movement}d idle</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {bottleneckQuery.data.overdue_components.length === 0 &&
                                         bottleneckQuery.data.approaching_deadlines.length === 0 &&
                                         bottleneckQuery.data.stale_jobs.length === 0 && (
                                            <p className="text-sm text-green-600 text-center py-4">✓ No bottlenecks detected — production is on track.</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Quote Pipeline */}
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                                <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                                    <TrendingUpIcon className="w-5 h-5 text-brand-blue" />
                                    <div>
                                        <h2 className="text-sm font-semibold text-gray-900">Quote Pipeline</h2>
                                        <p className="text-xs text-gray-500 mt-0.5">Cold quotes and 30-day conversion stats</p>
                                    </div>
                                </div>
                                {quoteInsightsQuery.isLoading && (
                                    <div className="p-6 space-y-2">
                                        {[1, 2].map(i => <div key={i} className="h-10 animate-pulse bg-gray-100 rounded" />)}
                                    </div>
                                )}
                                {quoteInsightsQuery.data && (
                                    <div className="p-6 space-y-5">
                                        {/* Conversion stats */}
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-gray-900">{quoteInsightsQuery.data.conversion_30d.total_sent}</p>
                                                <p className="text-xs text-gray-500 mt-1">Quotes (30d)</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-green-600">{quoteInsightsQuery.data.conversion_30d.approved}</p>
                                                <p className="text-xs text-gray-500 mt-1">Approved</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-brand-blue">{quoteInsightsQuery.data.conversion_30d.rate}%</p>
                                                <p className="text-xs text-gray-500 mt-1">Conversion rate</p>
                                            </div>
                                        </div>

                                        {/* Cold quotes */}
                                        {quoteInsightsQuery.data.cold_quotes.length > 0 && (
                                            <div>
                                                <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                                    <ClockIcon className="w-3 h-3" />
                                                    Cold Quotes — Sent but No Response ({quoteInsightsQuery.data.cold_quotes.length})
                                                </h3>
                                                <div className="space-y-2">
                                                    {quoteInsightsQuery.data.cold_quotes.map((q, i) => (
                                                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-gray-900">{q.quote_id}</p>
                                                                <p className="text-xs text-gray-500">{q.client}</p>
                                                            </div>
                                                            <div className="text-right flex-shrink-0 space-y-1">
                                                                <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                                                    {q.days_old}d old
                                                                </span>
                                                                {q.expired && (
                                                                    <p className="text-xs text-red-500">Expired</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {quoteInsightsQuery.data.cold_quotes.length === 0 && (
                                            <p className="text-sm text-green-600 text-center py-2">✓ No cold quotes — all sent quotes have had responses.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === "clients" && (
                        <>
                            {clientRevenueQuery.isLoading && (
                                <div className="space-y-2">
                                    {[1, 2, 3].map(i => <div key={i} className="h-12 animate-pulse bg-gray-100 rounded-lg" />)}
                                </div>
                            )}
                            {clientRevenueQuery.data && (
                                <ClientRevenueTable data={clientRevenueQuery.data} />
                            )}
                            {clientActivityQuery.isLoading && (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => <div key={i} className="h-32 animate-pulse bg-gray-100 rounded-lg" />)}
                                </div>
                            )}
                            {clientActivityQuery.error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-sm text-red-700">
                                    Failed to load client activity data.
                                </div>
                            )}
                            {clientActivityQuery.data && (
                                <ClientActivityCard data={clientActivityQuery.data} />
                            )}
                        </>
                    )}

                    {activeTab === "suppliers" && (
                        <div className="space-y-6">
                            {(vendorDeliveryQuery.isLoading || vendorQualityQuery.isLoading) && (
                                <div className="space-y-3">
                                    {[1, 2].map(i => <div key={i} className="h-40 animate-pulse bg-gray-100 rounded-lg" />)}
                                </div>
                            )}
                            {vendorQualityQuery.data && (vendorQualityQuery.data.vendors?.length ?? 0) > 0 && (
                                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                                    <div className="px-6 py-4 border-b border-gray-200">
                                        <h3 className="text-sm font-semibold text-gray-900">Vendor Quality Scores</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">Average quality score per vendor (min 3 jobs)</p>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-200 bg-gray-50">
                                                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                                                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Score</th>
                                                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Rating</th>
                                                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Jobs</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {(vendorQualityQuery.data.vendors ?? []).map((v: any) => (
                                                    <tr key={v.name} className="hover:bg-gray-50">
                                                        <td className="px-6 py-3 font-medium text-gray-900">{v.name}</td>
                                                        <td className="px-6 py-3 text-right font-semibold text-gray-900">{v.score}</td>
                                                        <td className="px-6 py-3 text-right">{v.rating}</td>
                                                        <td className="px-6 py-3 text-right text-gray-500">{v.jobs}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            {vendorDeliveryQuery.data && Object.keys(vendorDeliveryQuery.data.vendors).length > 0 && (
                                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-1">On-Time Delivery by Vendor</h3>
                                    <p className="text-xs text-gray-500 mb-4">Average across all jobs in the last 12 months</p>
                                    <div className="space-y-3">
                                        {Object.entries(vendorDeliveryQuery.data.vendors).map(([name, data]: [string, any]) => {
                                            const latest = Array.isArray(data) ? data[data.length - 1] : null;
                                            const rate = latest?.rate ?? 0;
                                            return (
                                                <div key={name} className="flex items-center gap-4">
                                                    <div className="w-48 text-sm text-gray-700 truncate" title={name}>{name}</div>
                                                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                                                        <div
                                                            className={`h-2 rounded-full ${rate >= 90 ? "bg-green-500" : rate >= 70 ? "bg-yellow-500" : "bg-red-500"}`}
                                                            style={{ width: `${rate}%` }}
                                                        />
                                                    </div>
                                                    <div className="w-12 text-right text-sm font-semibold text-gray-700">{rate}%</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            {(vendorQualityQuery.data?.vendors?.length ?? 0) === 0 && vendorDeliveryQuery.data && Object.keys(vendorDeliveryQuery.data.vendors ?? {}).length === 0 && (
                                <div className="py-12 text-center text-sm text-gray-400">
                                    Supplier performance data will appear once jobs are recorded against vendors with quality scores.
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "ai" && (
                        <div className="space-y-6">
                            {/* Section helper */}
                            {[
                                leadPriorityQuery, paymentGapsQuery, clientPatternsQuery,
                                staffUsageQuery, vendorPerfQuery
                            ].some(q => q.isLoading) && (
                                <div className="space-y-3">
                                    {[1,2,3].map(i => <div key={i} className="h-32 animate-pulse bg-gray-100 rounded-lg" />)}
                                </div>
                            )}

                            {/* ── Lead Priority ── */}
                            {leadPriorityQuery.data && (
                                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                                    <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                                        <StarIcon className="w-5 h-5 text-amber-500" />
                                        <div>
                                            <h2 className="text-sm font-semibold text-gray-900">Lead Priority Ranking</h2>
                                            <p className="text-xs text-gray-500 mt-0.5">Active leads scored by age, follow-up status, and value signals</p>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-200 bg-gray-50">
                                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Lead</th>
                                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Interest</th>
                                                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Age</th>
                                                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Follow-up</th>
                                                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Score</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {leadPriorityQuery.data.slice(0, 20).map((lead, i) => (
                                                    <tr key={lead.lead_id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                                                        <td className="px-4 py-3">
                                                            <p className="font-medium text-gray-900">{lead.name}</p>
                                                            <p className="text-xs text-gray-500">{lead.company}</p>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${
                                                                lead.status === 'Qualified' ? 'bg-green-100 text-green-700' :
                                                                lead.status === 'Contacted' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-gray-100 text-gray-600'
                                                            }`}>{lead.status}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px] truncate">{lead.product_interest}</td>
                                                        <td className="px-4 py-3 text-right text-xs text-gray-500">{lead.age_days}d</td>
                                                        <td className="px-4 py-3 text-right">
                                                            {lead.follow_up_overdue ? (
                                                                <span className="text-xs text-red-600 font-medium">Overdue</span>
                                                            ) : lead.follow_up_date ? (
                                                                <span className="text-xs text-gray-500">{lead.follow_up_date}</span>
                                                            ) : (
                                                                <span className="text-xs text-gray-300">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className={`inline-flex text-xs font-bold px-2 py-0.5 rounded ${
                                                                lead.priority_score >= 70 ? 'bg-red-100 text-red-700' :
                                                                lead.priority_score >= 40 ? 'bg-amber-100 text-amber-700' :
                                                                'bg-gray-100 text-gray-600'
                                                            }`}>{lead.priority_score}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {leadPriorityQuery.data.length === 0 && (
                                            <p className="text-sm text-gray-400 text-center py-8">No active leads.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Payment Gaps ── */}
                            {paymentGapsQuery.data && (
                                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                                    <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                                        <BanknoteIcon className="w-5 h-5 text-red-500" />
                                        <div>
                                            <h2 className="text-sm font-semibold text-gray-900">Payment & Invoice Gaps</h2>
                                            <p className="text-xs text-gray-500 mt-0.5">Completed jobs/LPOs with no payment, and jobs with no invoice raised</p>
                                        </div>
                                    </div>
                                    <div className="p-6 space-y-6">
                                        {paymentGapsQuery.data.jobs_no_payment.length > 0 && (
                                            <div>
                                                <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-3">
                                                    Completed Jobs — No Payment Recorded ({paymentGapsQuery.data.jobs_no_payment.length})
                                                </h3>
                                                <div className="space-y-2">
                                                    {paymentGapsQuery.data.jobs_no_payment.map((j, i) => (
                                                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-gray-900">{j.job_name}</p>
                                                                <p className="text-xs text-gray-500">{j.job_number} · {j.client} · PIC: {j.pic}</p>
                                                            </div>
                                                            <span className="text-xs text-gray-500 flex-shrink-0">{j.days_since_update}d ago</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {paymentGapsQuery.data.lpos_no_payment.length > 0 && (
                                            <div>
                                                <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">
                                                    Active Orders — No Payment ({paymentGapsQuery.data.lpos_no_payment.length})
                                                </h3>
                                                <div className="space-y-2">
                                                    {paymentGapsQuery.data.lpos_no_payment.map((lpo, i) => (
                                                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-gray-900">{lpo.lpo_number}</p>
                                                                <p className="text-xs text-gray-500">{lpo.client} · {lpo.status}</p>
                                                            </div>
                                                            <div className="text-right flex-shrink-0">
                                                                <p className="text-sm font-semibold text-gray-900">KES {lpo.total.toLocaleString()}</p>
                                                                {lpo.due_date && <p className="text-xs text-gray-400">Due: {lpo.due_date}</p>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {paymentGapsQuery.data.jobs_no_invoice.length > 0 && (
                                            <div>
                                                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                                                    Completed Jobs — No Invoice Raised ({paymentGapsQuery.data.jobs_no_invoice.length})
                                                </h3>
                                                <div className="space-y-2">
                                                    {paymentGapsQuery.data.jobs_no_invoice.map((j, i) => (
                                                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-gray-900">{j.job_name}</p>
                                                                <p className="text-xs text-gray-500">{j.job_number} · {j.client}</p>
                                                            </div>
                                                            <span className="text-xs text-gray-400">{j.days_since_update}d ago</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {!paymentGapsQuery.data.jobs_no_payment.length &&
                                         !paymentGapsQuery.data.lpos_no_payment.length &&
                                         !paymentGapsQuery.data.jobs_no_invoice.length && (
                                            <p className="text-sm text-green-600 text-center py-4">✓ No payment or invoice gaps found.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Client Patterns ── */}
                            {clientPatternsQuery.data && (
                                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                                    <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                                        <BarChart2Icon className="w-5 h-5 text-brand-blue" />
                                        <div>
                                            <h2 className="text-sm font-semibold text-gray-900">Client Approval Patterns</h2>
                                            <p className="text-xs text-gray-500 mt-0.5">Quote conversion rate and avg days to approve per client (last 12 months)</p>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-200 bg-gray-50">
                                                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Client</th>
                                                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Quotes</th>
                                                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Approved</th>
                                                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Conversion</th>
                                                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Avg Days to Approve</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {clientPatternsQuery.data.map((c, i) => (
                                                    <tr key={i} className="hover:bg-gray-50">
                                                        <td className="px-6 py-3 font-medium text-gray-900">{c.client}</td>
                                                        <td className="px-6 py-3 text-right text-gray-600">{c.quotes_12m}</td>
                                                        <td className="px-6 py-3 text-right text-green-600 font-medium">{c.approved}</td>
                                                        <td className="px-6 py-3 text-right">
                                                            <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${
                                                                c.conversion_rate >= 70 ? 'bg-green-100 text-green-700' :
                                                                c.conversion_rate >= 40 ? 'bg-amber-100 text-amber-700' :
                                                                'bg-red-100 text-red-700'
                                                            }`}>{c.conversion_rate}%</span>
                                                        </td>
                                                        <td className="px-6 py-3 text-right text-gray-500 text-xs">
                                                            {c.avg_days_to_approve !== null ? `${c.avg_days_to_approve}d` : '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {clientPatternsQuery.data.length === 0 && (
                                            <p className="text-sm text-gray-400 text-center py-8">No quote data available for the last 12 months.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Staff Usage ── */}
                            {staffUsageQuery.data && (
                                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                                    <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                                        <UsersIcon className="w-5 h-5 text-purple-500" />
                                        <div>
                                            <h2 className="text-sm font-semibold text-gray-900">Staff Usage & Training Gaps</h2>
                                            <p className="text-xs text-gray-500 mt-0.5">Feature usage per staff member in the last 30 days</p>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-200 bg-gray-50">
                                                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Staff Member</th>
                                                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Quotes (30d)</th>
                                                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Leads (30d)</th>
                                                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Jobs (30d)</th>
                                                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Activity Logs</th>
                                                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {staffUsageQuery.data.staff.map((s, i) => (
                                                    <tr key={i} className="hover:bg-gray-50">
                                                        <td className="px-6 py-3">
                                                            <p className="font-medium text-gray-900">{s.name}</p>
                                                            <p className="text-xs text-gray-400">{s.email}</p>
                                                        </td>
                                                        <td className="px-6 py-3 text-right">{s.quotes_30d || <span className="text-gray-300">0</span>}</td>
                                                        <td className="px-6 py-3 text-right">{s.leads_30d || <span className="text-gray-300">0</span>}</td>
                                                        <td className="px-6 py-3 text-right">{s.jobs_30d || <span className="text-gray-300">0</span>}</td>
                                                        <td className="px-6 py-3 text-right text-gray-500">{s.activity_logs}</td>
                                                        <td className="px-6 py-3 text-right">
                                                            <span className={`font-semibold ${s.total_30d === 0 ? 'text-gray-300' : 'text-gray-900'}`}>
                                                                {s.total_30d}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {staffUsageQuery.data.dormant_staff.length > 0 && (
                                        <div className="px-6 py-4 border-t border-gray-200 bg-amber-50">
                                            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
                                                Dormant Accounts — No activity in 30 days ({staffUsageQuery.data.dormant_staff.length})
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {staffUsageQuery.data.dormant_staff.map((s, i) => (
                                                    <span key={i} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">{s.name}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Vendor Performance ── */}
                            {vendorPerfQuery.data && vendorPerfQuery.data.vendors.length > 0 && (
                                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                                    <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                                        <ShieldCheckIcon className="w-5 h-5 text-teal-500" />
                                        <div>
                                            <h2 className="text-sm font-semibold text-gray-900">Vendor Performance Scoring</h2>
                                            <p className="text-xs text-gray-500 mt-0.5">Reliability based on overdue components and invoice timeliness</p>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-200 bg-gray-50">
                                                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                                                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Jobs</th>
                                                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Overdue</th>
                                                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Completed</th>
                                                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Late Invoices</th>
                                                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Reliability</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {vendorPerfQuery.data.vendors.map((v, i) => (
                                                    <tr key={i} className="hover:bg-gray-50">
                                                        <td className="px-6 py-3 font-medium text-gray-900">{v.vendor}</td>
                                                        <td className="px-6 py-3 text-right text-gray-600">{v.total_components}</td>
                                                        <td className="px-6 py-3 text-right">
                                                            <span className={v.overdue > 0 ? 'text-red-600 font-semibold' : 'text-gray-300'}>{v.overdue}</span>
                                                        </td>
                                                        <td className="px-6 py-3 text-right text-green-600">{v.completed}</td>
                                                        <td className="px-6 py-3 text-right">
                                                            <span className={v.late_invoices > 0 ? 'text-amber-600 font-medium' : 'text-gray-300'}>{v.late_invoices}</span>
                                                        </td>
                                                        <td className="px-6 py-3 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <div className="w-16 bg-gray-100 rounded-full h-1.5">
                                                                    <div
                                                                        className={`h-1.5 rounded-full ${v.reliability_score >= 80 ? 'bg-green-500' : v.reliability_score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                                        style={{ width: `${v.reliability_score}%` }}
                                                                    />
                                                                </div>
                                                                <span className={`text-xs font-semibold w-10 text-right ${v.reliability_score >= 80 ? 'text-green-600' : v.reliability_score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                                                    {v.reliability_score}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "dispatch" && (
                        <>
                            {dispatchHealthQuery.isLoading && (
                                <div className="space-y-4">
                                    {[1, 2].map(i => <div key={i} className="h-32 animate-pulse bg-gray-100 rounded-lg" />)}
                                </div>
                            )}
                            {dispatchHealthQuery.error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-sm text-red-700">
                                    Failed to load dispatch data.
                                </div>
                            )}
                            {dispatchHealthQuery.data && (
                                <DispatchHealthCard data={dispatchHealthQuery.data} />
                            )}
                        </>
                    )}
                </div>
            </main>
        </AdminLayout>
    );
}
