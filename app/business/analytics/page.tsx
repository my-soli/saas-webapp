"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircleIcon } from "lucide-react";
import BusinessLayout from "@/components/business/business-layout";
import { fetchAnalyticsData } from "@/app/admin/analytics/api";
import StatCard from "@/app/admin/analytics/components/StatCard";
import RevenueChart from "@/app/admin/analytics/components/RevenueChart";
import ProfitMarginChart from "@/app/admin/analytics/components/ProfitMarginChart";
import TopProductsTable from "@/app/admin/analytics/components/TopProductsTable";
import SalesLeaderboard from "@/app/admin/analytics/components/SalesLeaderboard";
import ConversionFunnel from "@/app/admin/analytics/components/ConversionFunnel";
import RevenueByCategoryChart from "@/app/admin/analytics/components/RevenueByCategoryChart";
import TimeInsightsCard from "@/app/admin/analytics/components/TimeInsightsCard";
import ActivityMetrics from "@/app/admin/analytics/components/ActivityMetrics";
import AnalyticsSkeleton from "@/app/admin/analytics/components/AnalyticsSkeleton";

type TabType = "overview" | "sales" | "performance" | "insights";

export default function BusinessAnalyticsPage() {
    const [activeTab, setActiveTab] = useState<TabType>("overview");
    const { data: analytics, isLoading, error } = useQuery({
        queryKey: ["analytics"],
        queryFn: fetchAnalyticsData,
    });

    if (isLoading) {
        return (
            <BusinessLayout>
                <header className="border-b border-gray-200 bg-white">
                    <div className="px-4 lg:px-8 py-4">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                            <a href="/business/dashboard" className="hover:text-brand-blue">
                                Business Portal
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
                        <nav className="flex px-4 lg:px-8 gap-6">
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
                        <AnalyticsSkeleton />
                    </div>
                </main>
            </BusinessLayout>
        );
    }

    if (error || !analytics) {
        return (
            <BusinessLayout>
                <header className="border-b border-gray-200 bg-white">
                    <div className="px-4 lg:px-8 py-4">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                            <a href="/business/dashboard" className="hover:text-brand-blue">
                                Business Portal
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
                        <nav className="flex px-4 lg:px-8 gap-6">
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
            </BusinessLayout>
        );
    }

    const { dashboard_stats, receivables, collection_rate, profit_margins } = analytics;

    const tabs = [
        { id: "overview" as TabType, label: "Overview" },
        { id: "sales" as TabType, label: "Sales & Products" },
        { id: "performance" as TabType, label: "Performance" },
        { id: "insights" as TabType, label: "Insights" },
    ];

    return (
        <BusinessLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                        <a href="/business/dashboard" className="hover:text-brand-blue">
                            Business Portal
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
                    <nav className="flex px-4 lg:px-8 gap-6">
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
                </div>
            </main>
        </BusinessLayout>
    );
}
