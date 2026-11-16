"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertCircleIcon, FilePlus2Icon, PackagePlusIcon, RefreshCwIcon, TruckIcon } from "lucide-react";
import AdminLayout from "@/components/admin/admin-layout";
import ActionCenter from "@/features/dashboard/components/ActionCenter";
import DashboardAlerts from "@/features/dashboard/components/DashboardAlerts";
import DashboardKpiGrid from "@/features/dashboard/components/DashboardKpiGrid";
import QuotePipeline from "@/features/dashboard/components/QuotePipeline";
import JobsStatusReport from "@/features/dashboard/components/reports/JobsStatusReport";
import QuotePerformanceReport from "@/features/dashboard/components/reports/QuotePerformanceReport";
import SalesPerformanceReport from "@/features/dashboard/components/reports/SalesPerformanceReport";
import ActivityFeed from "@/features/dashboard/components/reports/ActivityFeed";
import DateRangeBar, { presetRange } from "@/features/dashboard/components/reports/DateRangeBar";
import type { DateRange } from "@/features/dashboard/components/reports/DateRangeBar";
import {
    CapacityCard,
    ClientHealthCard,
    FunnelCard,
    ProfitCard,
    ReceivablesCard,
    TargetCard,
    TeamCard,
    TodayStrip,
    VendorCard,
} from "@/features/dashboard/components/reports/InsightCards";
import {
    fetchActionCenter,
    fetchDashboardAlerts,
    fetchDashboardAnalytics,
    fetchDashboardInsights,
    fetchDashboardOverview,
    fetchDashboardReports,
} from "@/services/dashboard";
import { getCurrentUser } from "@/services/users";
import type {
    ActionCenterResponse,
    DashboardAlertsResponse,
    DashboardAnalytics,
    DashboardInsights,
    DashboardOverview,
    DashboardReports,
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

    // One date range drives every report below the pipeline.
    const [range, setRange] = useState<DateRange>(() => presetRange("last_12"));
    const reportsQuery = useQuery({
        queryKey: ["dashboard", "reports", range.start, range.end],
        queryFn: (): Promise<DashboardReports> => fetchDashboardReports(12, { start: range.start, end: range.end }),
        placeholderData: (prev) => prev,
    });
    const insightsQuery = useQuery({
        queryKey: ["dashboard", "insights", range.start, range.end],
        queryFn: (): Promise<DashboardInsights> => fetchDashboardInsights(range.start, range.end),
        placeholderData: (prev) => prev,
    });

    const topAlerts = alertsQuery.data?.results ?? [];
    const hasError = overviewQuery.isError || analyticsQuery.isError || alertsQuery.isError || actionCenterQuery.isError || reportsQuery.isError || insightsQuery.isError;
    const isRefreshing =
        overviewQuery.isFetching || analyticsQuery.isFetching || alertsQuery.isFetching || actionCenterQuery.isFetching || reportsQuery.isFetching || insightsQuery.isFetching;

    const refreshAll = (): void => {
        void overviewQuery.refetch();
        void analyticsQuery.refetch();
        void alertsQuery.refetch();
        void actionCenterQuery.refetch();
        void reportsQuery.refetch();
        void insightsQuery.refetch();
    };

    const firstName = userQuery.data?.first_name;
    const isAdmin = Boolean(userQuery.data?.is_superuser || userQuery.data?.groups?.some((g) => g.name === "Admin"));
    const insights = insightsQuery.data;
    const today = new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const quickActions = [
        { label: "New quote", href: "/admin/quotes/create", icon: FilePlus2Icon },
        { label: "Create job", href: "/admin/jobs/create", icon: PackagePlusIcon },
        { label: "Dispatch", href: "/admin/dispatch", icon: TruckIcon },
    ];

    return (
        <AdminLayout>
            {/* Export PDF = browser print → "Save as PDF": hide navigation and controls. */}
            <style>{`@media print {
                aside, nav, [data-print-hide], .fixed { display: none !important; }
                body { background: #fff !important; }
                main { padding: 0 !important; }
                article { break-inside: avoid; box-shadow: none !important; }
            }`}</style>
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

                {/* 4. Right now: today's workload + this month's target */}
                {insights ? (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                        <div className="xl:col-span-2"><TodayStrip today={insights.today} basePath="/admin" /></div>
                        <TargetCard key={String(insights.target.target)} target={insights.target} canEdit={isAdmin} />
                    </div>
                ) : insightsQuery.isLoading ? (
                    <SkeletonBlock className="h-72" />
                ) : null}

                {/* 5. Reports — one date range for everything below */}
                <DateRangeBar value={range} onChange={setRange} isFetching={reportsQuery.isFetching || insightsQuery.isFetching} />

                {reportsQuery.isLoading ? (
                    <>
                        <SkeletonBlock className="h-[640px]" />
                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                            <SkeletonBlock className="h-[420px]" />
                            <SkeletonBlock className="h-[420px]" />
                        </div>
                    </>
                ) : reportsQuery.data ? (
                    <>
                        <SalesPerformanceReport
                            reports={reportsQuery.data}
                            months={reportsQuery.data.months}
                            isFetching={reportsQuery.isFetching}
                            basePath="/admin"
                        />
                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                            <JobsStatusReport reports={reportsQuery.data} basePath="/admin" />
                            <QuotePerformanceReport reports={reportsQuery.data} basePath="/admin" />
                        </div>
                    </>
                ) : null}

                {insights ? (
                    <>
                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                            <ReceivablesCard data={insights.receivables} basePath="/admin" />
                            <ProfitCard data={insights.profit} basePath="/admin" />
                        </div>
                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                            <CapacityCard data={insights.capacity} />
                            <TeamCard data={insights.team} />
                        </div>
                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                            <VendorCard data={insights.vendors} basePath="/admin" />
                            <FunnelCard data={insights.funnel} basePath="/admin" />
                        </div>
                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                            <div className="xl:col-span-2"><ClientHealthCard data={insights.clients} /></div>
                            <ActivityFeed />
                        </div>
                    </>
                ) : insightsQuery.isLoading ? (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        {[0, 1, 2, 3].map((k) => <SkeletonBlock key={k} className="h-[420px]" />)}
                    </div>
                ) : null}

                {topAlerts.length > 0 ? <DashboardAlerts alerts={topAlerts} /> : null}
            </main>
        </AdminLayout>
    );
}
