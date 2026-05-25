"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircleIcon, PackageSearch } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import AdminLayout from "@/components/admin/admin-layout";
import { fetchAnalyticsData, fetchClientActivityData } from "./api";
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

type TabType = "overview" | "sales" | "performance" | "insights" | "clients";

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
                        <YAxis type="category" dataKey="name" tick={{ fill: "#374151", fontSize: 11 }} stroke="#d1d5db" width={140} />
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

    if (isLoading) {
        return (
            <AdminLayout>
                <header className="border-b border-gray-200 bg-white">
                    <div className="px-4 lg:px-8 py-4">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                            <a href="/staff" className="hover:text-brand-blue">
                                Staff Portal
                            </a>
                            <span>/</span>
                            <span className="text-gray-900">Analytics</span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Comprehensive business analytics and performance metrics
                        </p>
                    </div>
                    <div className="border-t border-gray-200">
                        <nav className="flex px-4 lg:px-8 gap-4 overflow-x-auto">
                            <div className="py-3 text-sm font-medium border-b-2 border-brand-blue text-brand-blue">
                                Overview
                            </div>
                            <div className="py-3 text-sm font-medium border-b-2 border-transparent text-gray-400">
                                Sales & Products
                            </div>
                            <div className="py-3 text-sm font-medium border-b-2 border-transparent text-gray-400">
                                Performance
                            </div>
                            <div className="py-3 text-sm font-medium border-b-2 border-transparent text-gray-400">
                                Insights
                            </div>
                            <div className="py-3 text-sm font-medium border-b-2 border-transparent text-gray-400">
                                Clients
                            </div>
                        </nav>
                    </div>
                </header>
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
                <header className="border-b border-gray-200 bg-white">
                    <div className="px-4 lg:px-8 py-4">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                            <a href="/staff" className="hover:text-brand-blue">
                                Staff Portal
                            </a>
                            <span>/</span>
                            <span className="text-gray-900">Analytics</span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Comprehensive business analytics and performance metrics
                        </p>
                    </div>
                    <div className="border-t border-gray-200">
                        <nav className="flex px-4 lg:px-8 gap-4 overflow-x-auto">
                            <div className="py-3 text-sm font-medium border-b-2 border-brand-blue text-brand-blue">
                                Overview
                            </div>
                            <div className="py-3 text-sm font-medium border-b-2 border-transparent text-gray-400">
                                Sales & Products
                            </div>
                            <div className="py-3 text-sm font-medium border-b-2 border-transparent text-gray-400">
                                Performance
                            </div>
                            <div className="py-3 text-sm font-medium border-b-2 border-transparent text-gray-400">
                                Insights
                            </div>
                        </nav>
                    </div>
                </header>
                <main className="bg-gray-50 min-h-screen">
                    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 lg:py-6">
                        <div className="bg-brand-red/10 border border-brand-red/20 rounded-lg p-6">
                            <div className="flex items-center gap-3">
                                <AlertCircleIcon className="h-6 w-6 text-brand-red" />
                                <div>
                                    <h3 className="font-semibold text-brand-red">Failed to load analytics</h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Unable to fetch analytics data. Please try again later.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </AdminLayout>
        );
    }

    const { dashboard_stats, receivables, collection_rate, profit_margins } = analytics;

    const tabs = [
        { id: "overview" as TabType, label: "Overview" },
        { id: "sales" as TabType, label: "Sales & Products" },
        { id: "performance" as TabType, label: "Performance" },
        { id: "insights" as TabType, label: "Insights" },
        { id: "clients" as TabType, label: "Clients" },
    ];

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                        <a href="/staff" className="hover:text-brand-blue">
                            Staff Portal
                        </a>
                        <span>/</span>
                        <span className="text-gray-900">Analytics</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Comprehensive business analytics and performance metrics
                    </p>
                </div>
                <div className="border-t border-gray-200">
                    <nav className="flex px-4 lg:px-8 gap-4 overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
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
            <main className="bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 lg:py-6 space-y-6">
                    {activeTab === "overview" && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard
                                    title="Total Revenue (YTD)"
                                    value={`KES ${dashboard_stats.total_revenue.toLocaleString()}`}
                                    trend={dashboard_stats.revenue_trend}
                                    trendLabel="this month"
                                />
                                <StatCard
                                    title="Outstanding Receivables"
                                    value={`KES ${receivables.total_receivables.toLocaleString()}`}
                                    trend={-receivables.overdue_percentage}
                                    trendLabel="overdue"
                                    showPercentage
                                />
                                <StatCard
                                    title="Avg. Deal Size"
                                    value={`KES ${analytics.average_order_value.toLocaleString()}`}
                                />
                                <StatCard
                                    title="Collection Rate"
                                    value={`${collection_rate.collection_rate}%`}
                                />
                            </div>

                            <RevenueChart data={analytics.sales_performance_trend} />

                            <ActivityMetrics stats={dashboard_stats} />
                        </>
                    )}

                    {activeTab === "sales" && (
                        <>
                            <RevenueByCategoryChart data={analytics.revenue_by_category} />

                            <TopProductsTable products={analytics.top_products} />

                            <ProfitMarginChart data={profit_margins} />

                            {/* Off-Catalogue Products Chart */}
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                                <div className="border-b border-gray-200 px-6 py-4 flex items-center gap-2">
                                    <PackageSearch className="w-5 h-5 text-brand-blue" />
                                    <div>
                                        <h2 className="text-sm font-semibold text-gray-900">Off-Catalogue Quoted Products</h2>
                                        <p className="text-xs text-gray-500 mt-0.5">Products quoted by AMs not in the catalog — pending vs added to catalog</p>
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
                        </>
                    )}

                    {activeTab === "clients" && (
                        <>
                            {clientActivityQuery.isLoading && (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-32 animate-pulse bg-gray-100 rounded-lg" />
                                    ))}
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
                </div>
            </main>
        </AdminLayout>
    );
}
