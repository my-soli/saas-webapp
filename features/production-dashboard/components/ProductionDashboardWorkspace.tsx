"use client";

import { useState, useMemo } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    AlertCircleIcon,
    ArrowRightIcon,
    BellIcon,
    Building2Icon,
    CheckCircleIcon,
    ClipboardListIcon,
    Loader2Icon,
    PackageIcon,
    TimerIcon,
    XIcon,
    TrendingUpIcon,
} from "lucide-react";
import { fetchProductionAnalyticsData, fetchRecentProductionJobs } from "@/lib/api/production-analytics";
import { fetchNotifications } from "@/lib/api/notifications";
import type { Job } from "@/types/jobs";

const formatDate = (value: string | null): string => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-KE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const getStatusPillClass = (status: string): string => {
    if (status === "completed") return "bg-brand-green/10 text-brand-green";
    if (status === "in_progress") return "bg-brand-blue/10 text-brand-blue";
    if (status === "on_hold") return "bg-brand-orange/10 text-brand-orange";
    return "bg-brand-yellow/15 text-brand-black";
};

const toTitleCase = (value: string): string =>
    value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

interface DeadlineState {
    label: string;
    isOverdue: boolean;
    isDueToday: boolean;
}

const getDeadlineState = (dateStr: string | null): DeadlineState => {
    if (!dateStr) return { label: "", isOverdue: false, isDueToday: false };
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const d = new Date(dateStr);
    const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.floor((dOnly.getTime() - todayOnly.getTime()) / 86400000);
    if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, isOverdue: true, isDueToday: false };
    if (diff === 0) return { label: "Due today", isOverdue: false, isDueToday: true };
    return { label: `${diff}d left`, isOverdue: false, isDueToday: false };
};

const STATUS_BAR_ITEMS = [
    { key: "pending", label: "Pending", dotColor: "bg-brand-yellow", barColor: "bg-brand-yellow/80" },
    { key: "in_progress", label: "In Progress", dotColor: "bg-brand-blue", barColor: "bg-brand-blue" },
    { key: "on_hold", label: "On Hold", dotColor: "bg-brand-orange", barColor: "bg-brand-orange" },
    { key: "completed", label: "Completed", dotColor: "bg-brand-green", barColor: "bg-brand-green" },
] as const;

export default function ProductionDashboardWorkspace(): ReactElement {
    const router = useRouter();
    const [notifDismissed, setNotifDismissed] = useState(false);

    const analyticsQuery = useQuery({
        queryKey: ["pt-dashboard", "analytics"],
        queryFn: fetchProductionAnalyticsData,
        staleTime: 5 * 60 * 1000,
    });

    const recentJobsQuery = useQuery({
        queryKey: ["pt-dashboard", "recent-jobs"],
        queryFn: () => fetchRecentProductionJobs(8),
        staleTime: 2 * 60 * 1000,
    });

    const notifQuery = useQuery({
        queryKey: ["pt-dashboard", "notifications"],
        queryFn: () => fetchNotifications({ unreadOnly: true }),
        staleTime: 0,
        refetchInterval: 30_000,
    });

    const analytics = analyticsQuery.data;
    const recentJobs = recentJobsQuery.data ?? [];
    const unreadCount = notifQuery.data?.count ?? 0;
    const latestNotif = notifQuery.data?.results?.[0];

    const statusMap = useMemo((): Record<string, number> => {
        const map: Record<string, number> = {};
        (analytics?.job_status_distribution ?? []).forEach((item) => {
            map[item.status] = item.count;
        });
        return map;
    }, [analytics?.job_status_distribution]);

    const totalJobs = useMemo(
        (): number => Object.values(statusMap).reduce((a, b) => a + b, 0),
        [statusMap]
    );

    const isLoading = analyticsQuery.isLoading;

    const kpis = [
        {
            label: "Active Jobs",
            value: isLoading ? null : (statusMap["pending"] ?? 0) + (statusMap["in_progress"] ?? 0),
            sub: "pending + in progress",
            icon: ClipboardListIcon,
            colorText: "text-brand-blue",
            colorBg: "bg-brand-blue/10",
            colorBorder: "border-brand-blue/20",
        },
        {
            label: "Completed",
            value: isLoading ? null : (statusMap["completed"] ?? 0),
            sub: "all time",
            icon: CheckCircleIcon,
            colorText: "text-brand-green",
            colorBg: "bg-brand-green/10",
            colorBorder: "border-brand-green/20",
        },
        {
            label: "Avg Turnaround",
            value: isLoading ? null : (analytics ? `${analytics.average_turnaround_days.toFixed(1)} days` : "—"),
            sub: "production cycle",
            icon: TimerIcon,
            colorText: "text-brand-orange",
            colorBg: "bg-brand-orange/10",
            colorBorder: "border-brand-orange/20",
        },
        {
            label: "Vendor On-Time",
            value: isLoading ? null : (analytics ? `${analytics.vendor_on_time_rate.toFixed(1)}%` : "—"),
            sub: "delivery rate",
            icon: Building2Icon,
            colorText: "text-brand-purple",
            colorBg: "bg-brand-purple/10",
            colorBorder: "border-brand-purple/20",
        },
    ];

    return (
        <>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Production Dashboard</h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Track job progress, deadlines, and production flow.
                        </p>
                    </div>
                    <Link
                        href="/production-team/orchestration"
                        className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90"
                    >
                        Master Jobs
                    </Link>
                </div>
            </header>

            <main className="min-h-screen bg-gray-50 p-8 space-y-6">
                {/* Notification alert banner */}
                {unreadCount > 0 && !notifDismissed && (
                    <div className="flex items-start gap-3 rounded-lg border border-brand-blue/30 bg-brand-blue/10 px-4 py-3">
                        <BellIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-blue" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-brand-blue">
                                {unreadCount === 1
                                    ? "You have 1 new notification"
                                    : `You have ${unreadCount} unread notifications`}
                            </p>
                            {latestNotif && (
                                <p className="mt-0.5 text-xs text-gray-600 truncate">
                                    {latestNotif.title}: {latestNotif.message}
                                </p>
                            )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <button
                                type="button"
                                onClick={(): void => router.push("/production-team/notifications")}
                                className="text-xs font-medium text-brand-blue hover:underline"
                            >
                                View all
                            </button>
                            <button
                                type="button"
                                onClick={(): void => setNotifDismissed(true)}
                                className="rounded p-0.5 text-gray-400 hover:bg-brand-blue/10 hover:text-gray-600"
                            >
                                <XIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                {analyticsQuery.isError && (
                    <div className="rounded-lg border border-brand-red/30 bg-brand-red/5 p-4">
                        <div className="flex items-center gap-2">
                            <AlertCircleIcon className="h-4 w-4 text-brand-red" />
                            <p className="text-sm text-brand-red">
                                Could not load dashboard data.{" "}
                                <button
                                    type="button"
                                    className="underline"
                                    onClick={(): void => { void analyticsQuery.refetch(); }}
                                >
                                    Retry
                                </button>
                            </p>
                        </div>
                    </div>
                )}

                {/* KPI cards */}
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {kpis.map((kpi): ReactElement => {
                        const Icon = kpi.icon;
                        return (
                            <article
                                key={kpi.label}
                                className={`rounded-xl border bg-white px-5 py-4 shadow-sm ${kpi.colorBorder}`}
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        {kpi.label}
                                    </p>
                                    <span className={`rounded-md p-2 ${kpi.colorBg}`}>
                                        <Icon className={`h-4 w-4 ${kpi.colorText}`} />
                                    </span>
                                </div>
                                {kpi.value === null ? (
                                    <div className="mt-3 h-8 w-20 animate-pulse rounded bg-gray-200" />
                                ) : (
                                    <p className="mt-3 text-2xl font-bold text-gray-900">{kpi.value}</p>
                                )}
                                <p className="mt-1 text-xs text-gray-500">{kpi.sub}</p>
                            </article>
                        );
                    })}
                </section>

                {/* Job status distribution bar */}
                {!isLoading && totalJobs > 0 && (
                    <section className="rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-semibold text-gray-900">Jobs by Status</p>
                            <span className="text-xs text-gray-500">{totalJobs} total</span>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1.5 mb-3">
                            {STATUS_BAR_ITEMS.map((s) => (
                                <div key={s.key} className="flex items-center gap-2">
                                    <span className={`h-2.5 w-2.5 rounded-full ${s.dotColor}`} />
                                    <span className="text-sm text-gray-600">{s.label}</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {statusMap[s.key] ?? 0}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
                            {STATUS_BAR_ITEMS.map((s) => {
                                const pct = ((statusMap[s.key] ?? 0) / totalJobs) * 100;
                                if (pct === 0) return null;
                                return (
                                    <div
                                        key={s.key}
                                        className={`h-full ${s.barColor}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Main grid: recent jobs + sidebar */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
                    {/* Recent jobs table */}
                    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                            <h2 className="text-sm font-semibold text-gray-900">Recent Jobs</h2>
                            <Link
                                href="/production-team/orchestration"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-blue hover:underline"
                            >
                                View all
                                <ArrowRightIcon className="h-3 w-3" />
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Job</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Client</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Product</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Due</th>
                                        <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {recentJobsQuery.isLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i}>
                                                <td colSpan={5} className="px-5 py-3">
                                                    <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                                                </td>
                                            </tr>
                                        ))
                                    ) : recentJobs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-10 text-center text-sm text-gray-500">
                                                No recent jobs found.
                                            </td>
                                        </tr>
                                    ) : (
                                        recentJobs.map((job: Job): ReactElement => {
                                            const dl = getDeadlineState(job.expected_completion);
                                            return (
                                                <tr
                                                    key={job.id}
                                                    className="cursor-pointer hover:bg-gray-50"
                                                    onClick={(): void =>
                                                        router.push(`/production-team/jobs/${job.id}`)
                                                    }
                                                >
                                                    <td className="px-5 py-3 font-semibold text-gray-900">
                                                        {job.job_number || `#${job.id}`}
                                                    </td>
                                                    <td className="px-5 py-3 text-gray-700">
                                                        {job.client?.name || "—"}
                                                    </td>
                                                    <td className="max-w-[160px] truncate px-5 py-3 text-gray-600">
                                                        {job.product || "—"}
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <div className="text-sm text-gray-700">
                                                            {formatDate(job.expected_completion)}
                                                        </div>
                                                        {dl.label && (
                                                            <div
                                                                className={`text-xs ${
                                                                    dl.isOverdue
                                                                        ? "font-semibold text-brand-red"
                                                                        : dl.isDueToday
                                                                        ? "font-semibold text-brand-orange"
                                                                        : "text-gray-400"
                                                                }`}
                                                            >
                                                                {dl.label}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3 text-right">
                                                        <span
                                                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusPillClass(job.status)}`}
                                                        >
                                                            {toTitleCase(job.status)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Sidebar: quick actions + team performance */}
                    <aside className="space-y-5">
                        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                            <h2 className="mb-3 text-sm font-semibold text-gray-900">Quick Actions</h2>
                            <div className="space-y-1.5">
                                {(
                                    [
                                        {
                                            href: "/production-team/orchestration",
                                            label: "Master Jobs",
                                            icon: ClipboardListIcon,
                                            colorText: "text-brand-blue",
                                        },
                                        {
                                            href: "/production-team/analytics",
                                            label: "Analytics",
                                            icon: TrendingUpIcon,
                                            colorText: "text-brand-orange",
                                        },
                                        {
                                            href: "/production-team/processes",
                                            label: "Processes",
                                            icon: PackageIcon,
                                            colorText: "text-brand-green",
                                        },
                                        {
                                            href: "/production-team/vendors",
                                            label: "Vendors",
                                            icon: Building2Icon,
                                            colorText: "text-brand-purple",
                                        },
                                        {
                                            href: "/production-team/notifications",
                                            label: "Notifications",
                                            icon: BellIcon,
                                            colorText: "text-brand-yellow",
                                            badge: unreadCount > 0 ? unreadCount : undefined,
                                        },
                                    ] as const
                                ).map((action): ReactElement => {
                                    const Icon = action.icon;
                                    return (
                                        <Link
                                            key={action.href}
                                            href={action.href}
                                            className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-200 hover:bg-gray-50"
                                        >
                                            <Icon className={`h-4 w-4 shrink-0 ${action.colorText}`} />
                                            <span className="flex-1">{action.label}</span>
                                            {"badge" in action && action.badge !== undefined ? (
                                                <span className="rounded-full bg-brand-blue px-1.5 py-0.5 text-[10px] font-bold text-white">
                                                    {action.badge}
                                                </span>
                                            ) : (
                                                <ArrowRightIcon className="h-3.5 w-3.5 text-gray-300" />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Team performance mini view */}
                        {analytics && analytics.team_performance.length > 0 && (
                            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-sm font-semibold text-gray-900">Team Performance</h2>
                                    <Link
                                        href="/production-team/analytics"
                                        className="text-xs font-medium text-brand-blue hover:underline"
                                    >
                                        Full view
                                    </Link>
                                </div>
                                <div className="space-y-3">
                                    {analytics.team_performance.slice(0, 5).map((member) => (
                                        <div key={member.user_id}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs text-gray-700 truncate pr-2">
                                                    {member.user_name}
                                                </span>
                                                <span className="text-xs font-semibold text-gray-900 shrink-0">
                                                    {member.completion_rate.toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                                                <div
                                                    className="h-full rounded-full bg-brand-blue transition-all"
                                                    style={{
                                                        width: `${Math.min(100, member.completion_rate)}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* QC Rejection alert if high */}
                        {analytics && analytics.qc_rejection_rate > 10 && (
                            <div className="rounded-xl border border-brand-orange/30 bg-brand-orange/10 px-4 py-3">
                                <p className="text-xs font-semibold text-brand-orange">QC Rejection Rate High</p>
                                <p className="mt-0.5 text-sm font-bold text-gray-900">
                                    {analytics.qc_rejection_rate.toFixed(1)}%
                                </p>
                                <p className="mt-1 text-xs text-gray-600">
                                    Review quality control processes to reduce rejections.
                                </p>
                            </div>
                        )}
                    </aside>
                </div>
            </main>
        </>
    );
}
