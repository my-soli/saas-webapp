"use client";

import type { ReactElement } from "react";
import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertCircleIcon, FilePlus2Icon, PackagePlusIcon, RefreshCwIcon, TruckIcon } from "lucide-react";
import AdminLayout from "@/components/admin/admin-layout";
import ActionCenter from "@/features/dashboard/components/ActionCenter";
import DashboardAlerts from "@/features/dashboard/components/DashboardAlerts";
import DashboardCharts from "@/features/dashboard/components/DashboardCharts";
import DashboardKpiGrid from "@/features/dashboard/components/DashboardKpiGrid";
import JobsStatusChart from "@/features/dashboard/components/JobsStatusChart";
import QuotePipeline from "@/features/dashboard/components/QuotePipeline";
import QuotesStatusChart from "@/features/dashboard/components/QuotesStatusChart";
import {
    fetchActionCenter,
    fetchDashboardAlerts,
    fetchDashboardAnalytics,
    fetchDashboardOverview,
} from "@/services/dashboard";
import { getCurrentUser } from "@/services/users";
import type {
    ActionCenterResponse,
    DashboardAlertsResponse,
    DashboardAnalytics,
    DashboardOverview,
    RevenueChartPoint,
} from "@/types/dashboard";

function greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}

function SkeletonBlock({ className }: { className: string }): ReactElement {
    return <div className={`animate-pulse rounded-2xl border border-gray-200 bg-white ${className}`} />;
}

export default function DashboardPage(): ReactElement {
    const overviewQuery = useQuery({
        queryKey: ["dashboard", "overview"],
        queryFn: (): Promise<DashboardOverview> => fetchDashboardOverview(),
    });

    const analyticsQuery = useQuery({
        queryKey: ["dashboard", "analytics"],
        queryFn: (): Promise<DashboardAnalytics> => fetchDashboardAnalytics(),
    });

    const alertsQuery = useQuery({
        queryKey: ["dashboard", "alerts"],
        queryFn: (): Promise<DashboardAlertsResponse> => fetchDashboardAlerts(),
    });

    const actionCenterQuery = useQuery({
        queryKey: ["dashboard", "action-center"],
        queryFn: (): Promise<ActionCenterResponse> => fetchActionCenter(),
        refetchInterval: 60_000,
    });

    const userQuery = useQuery({
        queryKey: ["current-user"],
        queryFn: getCurrentUser,
    });

    const revenueSeries = useMemo((): RevenueChartPoint[] => {
        const trend = analyticsQuery.data?.sales_performance_trend ?? [];
        return trend.map((item): RevenueChartPoint => ({
            label: item.month,
            revenue: Number(item.revenue || 0),
            orders: Number(item.orders || 0),
        }));
    }, [analyticsQuery.data?.sales_performance_trend]);

    const topAlerts = alertsQuery.data?.results ?? [];
    const hasError = overviewQuery.isError || analyticsQuery.isError || alertsQuery.isError || actionCenterQuery.isError;
    const isRefreshing =
        overviewQuery.isFetching || analyticsQuery.isFetching || alertsQuery.isFetching || actionCenterQuery.isFetching;

    const refreshAll = (): void => {
        void overviewQuery.refetch();
        void analyticsQuery.refetch();
        void alertsQuery.refetch();
        void actionCenterQuery.refetch();
    };

    const firstName = userQuery.data?.first_name;
    const today = new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const quickActions = [
        { label: "New quote", href: "/admin/quotes/create", icon: FilePlus2Icon },
        { label: "Create job", href: "/admin/jobs/create", icon: PackagePlusIcon },
        { label: "Dispatch", href: "/admin/dispatch", icon: TruckIcon },
    ];

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="flex flex-col gap-4 px-4 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{today}</p>
                        <h1 className="mt-1 text-2xl font-bold text-brand-black lg:text-3xl">
                            {greeting()}{firstName ? `, ${firstName}` : ""}
                        </h1>
                        <p className="mt-1 text-sm text-gray-600">Here&apos;s what needs attention and how the business is doing.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {quickActions.map((action): ReactElement => {
                            const Icon = action.icon;
                            return (
                                <Link
                                    key={action.label}
                                    href={action.href}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-brand-blue/40 hover:text-brand-blue"
                                >
                                    <Icon className="h-4 w-4" />
                                    {action.label}
                                </Link>
                            );
                        })}
                        <button
                            type="button"
                            onClick={refreshAll}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-blue/90"
                            aria-label="Refresh dashboard"
                        >
                            <RefreshCwIcon className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </header>

            <main className="space-y-6 bg-gray-50 p-4 lg:p-8">
                {hasError ? (
                    <div className="rounded-xl border border-brand-red/30 bg-brand-red/5 p-4">
                        <div className="flex items-start gap-2">
                            <AlertCircleIcon className="mt-0.5 h-4 w-4 text-brand-red" />
                            <div>
                                <p className="text-sm font-semibold text-brand-red">Some dashboard sections didn&apos;t load.</p>
                                <p className="mt-1 text-sm text-gray-700">Use Refresh to try again.</p>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* 1. What needs doing — first thing on the page */}
                {actionCenterQuery.isLoading ? (
                    <SkeletonBlock className="h-56" />
                ) : actionCenterQuery.data ? (
                    <ActionCenter sections={actionCenterQuery.data.sections} basePath="/admin" />
                ) : null}

                {/* 2. Headline numbers */}
                {overviewQuery.isLoading || analyticsQuery.isLoading ? (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                        {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} className="h-32" />)}
                    </div>
                ) : overviewQuery.data && analyticsQuery.data ? (
                    <DashboardKpiGrid overview={overviewQuery.data} analytics={analyticsQuery.data} basePath="/admin" />
                ) : null}

                {/* 3. Flow from quote to finished job */}
                {overviewQuery.data ? <QuotePipeline overview={overviewQuery.data} basePath="/admin" /> : null}

                {/* 4. Trends — use the full width: revenue beside job status,
                       quote status beside alerts. */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    <div className="xl:col-span-2">
                        {analyticsQuery.isLoading ? (
                            <SkeletonBlock className="h-[420px]" />
                        ) : analyticsQuery.data ? (
                            <DashboardCharts revenueSeries={revenueSeries} />
                        ) : null}
                    </div>
                    <div>
                        {overviewQuery.isLoading ? (
                            <SkeletonBlock className="h-[420px]" />
                        ) : overviewQuery.data ? (
                            <JobsStatusChart overview={overviewQuery.data} />
                        ) : null}
                    </div>
                </div>

                {overviewQuery.data ? (
                    <div className={`grid grid-cols-1 gap-6 ${topAlerts.length > 0 ? "xl:grid-cols-3" : ""}`}>
                        <QuotesStatusChart overview={overviewQuery.data} />
                        {topAlerts.length > 0 ? (
                            <div className="xl:col-span-2">
                                <DashboardAlerts alerts={topAlerts} />
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </main>
        </AdminLayout>
    );
}
