"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
    AlertCircleIcon,
    BellIcon,
    RefreshCcwIcon,
    Users2Icon,
    ArrowRightIcon,
    ActivityIcon,
    XIcon,
    DownloadIcon,
    SearchIcon,
    Building2Icon,
    StarIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchNotifications } from "@/lib/api/notifications";
import { fetchAllVendors } from "@/services/vendors";
import { fetchVendorJobAnalytics, type VendorJobStat } from "@/services/orchestration";
import type { Vendor } from "@/types/vendors";
import type { ServiceRating } from "@/types/vendors";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    fetchProductionAnalyticsData,
    fetchRecentProductionJobs,
} from "@/lib/api/production-analytics";
import type { Job } from "@/types/jobs";
import type {
    JobStatusDistributionItem,
    ProductionAnalyticsData,
} from "@/types/production-analytics";

interface StatusChartItem {
    name: string;
    value: number;
    color: string;
}

const STATUS_COLORS: string[] = [
    "#093756", // brand-blue
    "#F6B619", // brand-yellow
    "#009444", // brand-green
    "#F15A29", // brand-orange
    "#662D91", // brand-purple
    "#ED1C24", // brand-red
];

const toTitleCase = (value: string): string => {
    return value
        .replaceAll("_", " ")
        .split(" ")
        .filter((part: string): boolean => part.length > 0)
        .map((part: string): string => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
};

const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
};

const formatDate = (value: string | null): string => {
    if (!value) {
        return "Not set";
    }

    const dateValue = new Date(value);
    if (Number.isNaN(dateValue.getTime())) {
        return "Not set";
    }

    return dateValue.toLocaleDateString("en-KE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const getStatusBadgeClass = (status: string): string => {
    if (status === "completed") {
        return "bg-brand-green/10 text-brand-green border-brand-green/20";
    }

    if (status === "in_progress") {
        return "bg-brand-blue/10 text-brand-blue border-brand-blue/20";
    }

    if (status === "on_hold") {
        return "bg-brand-orange/10 text-brand-orange border-brand-orange/20";
    }

    return "bg-brand-yellow/10 text-brand-yellow border-brand-yellow/20";
};

const buildStatusChartData = (items: JobStatusDistributionItem[]): StatusChartItem[] => {
    return items.map((item: JobStatusDistributionItem, index: number): StatusChartItem => {
        return {
            name: toTitleCase(item.status),
            value: item.count,
            color: STATUS_COLORS[index % STATUS_COLORS.length],
        };
    });
};

// Custom Tooltip for Bar Chart
const BarChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-gray-200 shadow-xl rounded-xl">
                <p className="font-semibold text-gray-900 mb-1">{label}</p>
                <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-brand-blue"></div>
                    <p className="text-gray-700 font-medium">
                        {payload[0].value.toFixed(1)}% <span className="text-gray-500 font-normal text-xs ml-1">Completion</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

// Custom Tooltip for Pie Chart
const PieChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-gray-200 shadow-xl rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: payload[0].payload.fill }}></div>
                    <p className="font-semibold text-gray-900">{payload[0].name}</p>
                </div>
                <p className="text-gray-700 font-medium">
                    {payload[0].value.toLocaleString()} <span className="text-gray-500 font-normal text-xs ml-1">Jobs</span>
                </p>
            </div>
        );
    }
    return null;
};

function buildVendorCSVRows(vendors: Vendor[], statsMap: Map<number, VendorJobStat>): string[][] {
    const headers = [
        "Vendor", "Email", "Active",
        "Total Jobs", "Completed Jobs", "Completion Rate %",
        "Briefs Sent", "Acknowledged", "Proofs Uploaded", "Avg Completion Days",
        "Service", "Rating", "Quality", "Reliability", "Lead Time",
    ];
    const rows = vendors.flatMap((v) => {
        const js = statsMap.get(v.id);
        const jobCols = [
            String(js?.total_jobs ?? 0),
            String(js?.completed_jobs ?? 0),
            js ? `${js.completion_rate}%` : "—",
            String(js?.briefs_sent ?? 0),
            String(js?.acknowledged ?? 0),
            String(js?.proofs_uploaded ?? 0),
            js?.avg_completion_days != null ? `${js.avg_completion_days}` : "—",
        ];
        const base = [v.name, v.email ?? "", v.active ? "Yes" : "No"];
        if (v.service_ratings && v.service_ratings.length > 0) {
            return v.service_ratings.map((sr: ServiceRating) => [
                ...base, ...jobCols, sr.name, String(sr.rating), sr.quality, sr.reliability, sr.lead_time,
            ]);
        }
        return [[...base, ...jobCols, "—", "—", "—", "—", "—"]];
    });
    return [headers, ...rows];
}

function downloadCSV(rows: string[][], filename: string): void {
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportAllVendorsCSV(vendors: Vendor[], jobStats: VendorJobStat[]): void {
    const statsMap = new Map(jobStats.map((s) => [s.id, s]));
    downloadCSV(buildVendorCSVRows(vendors, statsMap), `vendor-analytics-all-${new Date().toISOString().slice(0, 10)}.csv`);
}

function exportSingleVendorCSV(vendor: Vendor, statsMap: Map<number, VendorJobStat>): void {
    const slug = vendor.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    downloadCSV(buildVendorCSVRows([vendor], statsMap), `vendor-${slug}-${new Date().toISOString().slice(0, 10)}.csv`);
}

export default function ProductionAnalyticsWorkspace(): ReactElement {
    const router = useRouter();
    const [notifDismissed, setNotifDismissed] = useState(false);
    const [activeTab, setActiveTab] = useState<"overview" | "vendors">("overview");
    const [vendorSearch, setVendorSearch] = useState("");

    const analyticsQuery = useQuery({
        queryKey: ["production-analytics"],
        queryFn: fetchProductionAnalyticsData,
    });

    const recentJobsQuery = useQuery({
        queryKey: ["production-analytics-jobs"],
        queryFn: (): Promise<Job[]> => fetchRecentProductionJobs(6),
    });

    const notifQuery = useQuery({
        queryKey: ["production-analytics", "notifications"],
        queryFn: () => fetchNotifications({ unreadOnly: true }),
        staleTime: 0,
        refetchInterval: 30_000,
    });

    const vendorsQuery = useQuery({
        queryKey: ["vendors-all-performance"],
        queryFn: fetchAllVendors,
        staleTime: 60_000,
        enabled: activeTab === "vendors",
    });

    const vendorJobAnalyticsQuery = useQuery({
        queryKey: ["vendor-job-analytics"],
        queryFn: fetchVendorJobAnalytics,
        staleTime: 60_000,
        enabled: activeTab === "vendors",
    });

    const analytics: ProductionAnalyticsData | undefined = analyticsQuery.data;
    const unreadCount = notifQuery.data?.count ?? 0;
    const latestNotif = notifQuery.data?.results?.[0];
    const statusChartData = useMemo((): StatusChartItem[] => {
        return buildStatusChartData(analytics?.job_status_distribution ?? []);
    }, [analytics?.job_status_distribution]);

    const totalTrackedJobs = useMemo((): number => {
        return (analytics?.job_status_distribution ?? []).reduce((sum: number, item: JobStatusDistributionItem): number => {
            return sum + item.count;
        }, 0);
    }, [analytics?.job_status_distribution]);

    if (analyticsQuery.isLoading) {
        return (
            <main className="bg-[#f8fafc] min-h-screen pb-12">
                <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 lg:py-6">
                    <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
                    <div className="mt-4 h-8 w-72 animate-pulse rounded bg-gray-200" />
                </header>
                <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-32 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                                <div className="h-4 w-32 animate-pulse rounded bg-gray-200 mb-4" />
                                <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        );
    }

    if (analyticsQuery.isError || !analytics) {
        return (
            <main className="bg-[#f8fafc] min-h-screen pb-12">
                <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 lg:py-6">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Production Analytics</h1>
                </header>
                <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8 lg:py-12">
                    <div className="rounded-2xl border border-brand-red/20 bg-brand-red/5 p-8 text-center">
                        <AlertCircleIcon className="h-12 w-12 text-brand-red mx-auto mb-4" />
                        <h2 className="text-lg font-semibold text-brand-red">Unable to load production analytics</h2>
                        <p className="mt-2 text-gray-600">The analytics service did not return data. Please try again later.</p>
                        <button
                            type="button"
                            onClick={() => {
                                void analyticsQuery.refetch();
                                void recentJobsQuery.refetch();
                            }}
                            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-blue px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 shadow-sm"
                        >
                            <RefreshCcwIcon className="h-4 w-4" />
                            Retry
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="bg-[#f8fafc] min-h-screen pb-12">
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 lg:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <nav className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-3">
                            <Link href="/production-team" className="hover:text-brand-blue transition-colors">Production Team</Link>
                            <span>/</span>
                            <span className="text-gray-900">Analytics</span>
                        </nav>
                        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                            Production Analytics
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-blue/10 px-2.5 py-1 text-xs font-semibold text-brand-blue">
                                <ActivityIcon className="h-3.5 w-3.5" />
                                Live View
                            </span>
                        </h1>
                        <p className="mt-2 text-sm text-gray-500">
                            Operations-focused visibility for turnaround, quality, and team execution.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            void analyticsQuery.refetch();
                            void recentJobsQuery.refetch();
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-brand-blue hover:text-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                    >
                        <RefreshCcwIcon className={`h-4 w-4 ${analyticsQuery.isFetching ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </header>

            {/* Notification banner */}
            {unreadCount > 0 && !notifDismissed && (
                <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-6">
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
                </div>
            )}

            {/* Tab navigation */}
            <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-6">
                <div className="flex gap-1 border-b border-gray-200">
                    {([
                        { id: "overview", label: "Overview", icon: ActivityIcon },
                        { id: "vendors", label: "Vendor Performance", icon: Building2Icon },
                    ] as const).map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setActiveTab(id)}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                                activeTab === id
                                    ? "border-brand-blue text-brand-blue"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === "vendors" && (() => {
                const vendors: Vendor[] = vendorsQuery.data ?? [];
                const jobStats: VendorJobStat[] = vendorJobAnalyticsQuery.data ?? [];
                const jobStatsMap = new Map(jobStats.map((s) => [s.id, s]));
                const filtered = vendors.filter((v) =>
                    v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
                    (v.email ?? "").toLowerCase().includes(vendorSearch.toLowerCase())
                );
                const ratedVendors = vendors.filter((v) => v.service_ratings && v.service_ratings.length > 0);
                const allRatings = vendors.flatMap((v) => v.service_ratings ?? []).map((sr: ServiceRating) => sr.rating).filter((r) => r > 0);
                const avgRating = allRatings.length > 0 ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0;
                const totalJobsAssigned = jobStats.reduce((s, v) => s + v.total_jobs, 0);
                const totalCompleted = jobStats.reduce((s, v) => s + v.completed_jobs, 0);
                const overallCompletion = totalJobsAssigned > 0 ? ((totalCompleted / totalJobsAssigned) * 100).toFixed(1) : "—";

                // Chart data — top 8 by total jobs
                const top8 = [...jobStats].sort((a, b) => b.total_jobs - a.total_jobs).slice(0, 8);
                const jobVolumeData = top8.map((s) => ({
                    name: s.name.length > 14 ? s.name.slice(0, 12) + "…" : s.name,
                    fullName: s.name,
                    Total: s.total_jobs,
                    Completed: s.completed_jobs,
                    Pending: s.total_jobs - s.completed_jobs,
                }));
                const turnaroundData = top8
                    .filter((s) => s.avg_completion_days != null)
                    .map((s) => ({ name: s.name.length > 14 ? s.name.slice(0, 12) + "…" : s.name, fullName: s.name, Days: s.avg_completion_days! }));
                const completionRateData = top8.map((s) => ({
                    name: s.name.length > 14 ? s.name.slice(0, 12) + "…" : s.name,
                    fullName: s.name,
                    Rate: s.completion_rate,
                }));
                const ratingChartData = vendors
                    .filter((v) => v.service_ratings && v.service_ratings.length > 0)
                    .map((v) => {
                        const ratings = v.service_ratings as ServiceRating[];
                        const avg = ratings.reduce((s, r) => s + (r.rating ?? 0), 0) / ratings.length;
                        return { name: v.name.length > 14 ? v.name.slice(0, 12) + "…" : v.name, fullName: v.name, Rating: parseFloat(avg.toFixed(2)) };
                    })
                    .sort((a, b) => b.Rating - a.Rating)
                    .slice(0, 8);

                const isLoading = vendorsQuery.isLoading || vendorJobAnalyticsQuery.isLoading;

                return (
                    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-8 space-y-6">

                        {/* Summary KPI cards */}
                        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                            <article className="rounded-xl border border-brand-blue/15 bg-white px-5 py-4 shadow-sm">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Total Vendors</p>
                                <h3 className="mt-2 text-2xl font-bold text-gray-900">{vendors.length}</h3>
                                <p className="mt-0.5 text-xs text-gray-400">{vendors.filter((v) => v.active).length} active</p>
                            </article>
                            <article className="rounded-xl border border-brand-green/15 bg-white px-5 py-4 shadow-sm">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Rated Vendors</p>
                                <h3 className="mt-2 text-2xl font-bold text-gray-900">{ratedVendors.length}</h3>
                                <p className="mt-0.5 text-xs text-gray-400">have service ratings</p>
                            </article>
                            <article className="rounded-xl border border-brand-yellow/15 bg-white px-5 py-4 shadow-sm">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Avg Rating</p>
                                <div className="mt-2 flex items-end gap-1.5">
                                    <h3 className="text-2xl font-bold text-gray-900">{avgRating > 0 ? avgRating.toFixed(1) : "—"}</h3>
                                    {avgRating > 0 && <span className="pb-0.5 text-xs text-gray-500">/ 5.0</span>}
                                </div>
                            </article>
                            <article className="rounded-xl border border-brand-purple/15 bg-white px-5 py-4 shadow-sm">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Jobs Assigned</p>
                                <h3 className="mt-2 text-2xl font-bold text-gray-900">{totalJobsAssigned}</h3>
                                <p className="mt-0.5 text-xs text-gray-400">{totalCompleted} completed</p>
                            </article>
                            <article className="rounded-xl border border-brand-orange/15 bg-white px-5 py-4 shadow-sm">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Overall Completion</p>
                                <h3 className="mt-2 text-2xl font-bold text-gray-900">{overallCompletion}{overallCompletion !== "—" ? "%" : ""}</h3>
                                <p className="mt-0.5 text-xs text-gray-400">across all vendors</p>
                            </article>
                        </section>

                        {/* Charts row */}
                        {isLoading ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {[1,2].map((i) => <div key={i} className="h-72 animate-pulse rounded-2xl bg-gray-100" />)}
                            </div>
                        ) : (
                            <>
                                {/* Row 1: Job volume + Completion rate — only if any vendor has jobs */}
                                {jobVolumeData.some((d) => d.Total > 0) && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                                            <h2 className="text-sm font-bold text-gray-900 mb-1">Jobs by Vendor</h2>
                                            <p className="text-xs text-gray-400 mb-4">Total vs completed (top 8)</p>
                                            <div className="h-56">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={jobVolumeData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                                                        <Tooltip
                                                            formatter={(val, name) => [val, name]}
                                                            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                                                            contentStyle={{ borderRadius: 8, fontSize: 12 }}
                                                        />
                                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                                        <Bar dataKey="Total" fill="#093756" radius={[3,3,0,0]} />
                                                        <Bar dataKey="Completed" fill="#009444" radius={[3,3,0,0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </article>

                                        <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                                            <h2 className="text-sm font-bold text-gray-900 mb-1">Completion Rate</h2>
                                            <p className="text-xs text-gray-400 mb-4">% of assigned jobs completed (top 8)</p>
                                            <div className="h-56">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={completionRateData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                                        <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                                                        <Tooltip
                                                            formatter={(val) => [`${val}%`, "Completion"]}
                                                            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                                                            contentStyle={{ borderRadius: 8, fontSize: 12 }}
                                                        />
                                                        <Bar dataKey="Rate" radius={[3,3,0,0]}>
                                                            {completionRateData.map((entry, index) => (
                                                                <Cell
                                                                    key={index}
                                                                    fill={entry.Rate >= 80 ? "#009444" : entry.Rate >= 50 ? "#F6B619" : "#ED1C24"}
                                                                />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </article>
                                    </div>
                                )}

                                {/* Row 2: Turnaround + Rating — each independently guarded */}
                                {(turnaroundData.length > 0 || ratingChartData.length > 0) && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {turnaroundData.length > 0 && (
                                            <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                                                <h2 className="text-sm font-bold text-gray-900 mb-1">Avg Turnaround (days)</h2>
                                                <p className="text-xs text-gray-400 mb-4">Brief sent → job component completed</p>
                                                <div className="h-56">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={turnaroundData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                                            <YAxis tick={{ fontSize: 10 }} unit="d" />
                                                            <Tooltip
                                                                formatter={(val) => [`${val} days`, "Turnaround"]}
                                                                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                                                                contentStyle={{ borderRadius: 8, fontSize: 12 }}
                                                            />
                                                            <Bar dataKey="Days" fill="#662D91" radius={[3,3,0,0]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </article>
                                        )}

                                        {ratingChartData.length > 0 && (
                                            <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                                                <h2 className="text-sm font-bold text-gray-900 mb-1">Vendor Ratings</h2>
                                                <p className="text-xs text-gray-400 mb-4">Average service rating out of 5.0 (top 8)</p>
                                                <div className="h-56">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={ratingChartData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                                            <YAxis tick={{ fontSize: 10 }} domain={[0, 5]} />
                                                            <Tooltip
                                                                formatter={(val) => [`${val} / 5.0`, "Rating"]}
                                                                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                                                                contentStyle={{ borderRadius: 8, fontSize: 12 }}
                                                            />
                                                            <Bar dataKey="Rating" fill="#F6B619" radius={[3,3,0,0]} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </article>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Per-vendor breakdown table */}
                        <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
                                <h2 className="text-base font-bold text-gray-900">Per-Vendor Breakdown</h2>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:w-52">
                                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            value={vendorSearch}
                                            onChange={(e) => setVendorSearch(e.target.value)}
                                            placeholder="Search vendors…"
                                            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-brand-blue"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => exportAllVendorsCSV(filtered, jobStats)}
                                        disabled={filtered.length === 0}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:border-brand-blue hover:text-brand-blue disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                                    >
                                        <DownloadIcon className="h-3.5 w-3.5" />
                                        Export All
                                    </button>
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="p-8 space-y-3">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
                                    ))}
                                </div>
                            ) : vendorsQuery.isError ? (
                                <div className="px-6 py-10 text-center text-sm text-brand-red/80">Unable to load vendor data.</div>
                            ) : filtered.length === 0 ? (
                                <div className="px-6 py-10 text-center text-sm text-gray-500">
                                    {vendorSearch ? "No vendors match your search." : "No vendor data available."}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-left">
                                        <thead>
                                            <tr className="bg-gray-50/50">
                                                <th className="whitespace-nowrap border-b border-gray-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Vendor</th>
                                                <th className="whitespace-nowrap border-b border-gray-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Jobs</th>
                                                <th className="whitespace-nowrap border-b border-gray-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Completion</th>
                                                <th className="whitespace-nowrap border-b border-gray-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Briefs</th>
                                                <th className="whitespace-nowrap border-b border-gray-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Proofs</th>
                                                <th className="whitespace-nowrap border-b border-gray-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Avg Days</th>
                                                <th className="whitespace-nowrap border-b border-gray-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Services</th>
                                                <th className="whitespace-nowrap border-b border-gray-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Rating</th>
                                                <th className="whitespace-nowrap border-b border-gray-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                                                <th className="whitespace-nowrap border-b border-gray-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 text-right">Export</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filtered.map((vendor: Vendor) => {
                                                const ratings: ServiceRating[] = Array.isArray(vendor.service_ratings) ? vendor.service_ratings : [];
                                                const avgR = ratings.length > 0 ? ratings.reduce((s, r) => s + (r.rating ?? 0), 0) / ratings.length : null;
                                                const js = jobStatsMap.get(vendor.id);

                                                return (
                                                    <tr key={vendor.id} className="transition-colors hover:bg-gray-50/50">
                                                        <td className="whitespace-nowrap px-5 py-3.5 text-sm font-semibold text-gray-900">
                                                            <div>{vendor.name}</div>
                                                            <div className="text-xs font-normal text-gray-400">{vendor.email}</div>
                                                        </td>
                                                        <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-700">
                                                            {js ? (
                                                                <span>
                                                                    <span className="font-semibold">{js.total_jobs}</span>
                                                                    <span className="text-gray-400 text-xs ml-1">({js.completed_jobs} done)</span>
                                                                </span>
                                                            ) : <span className="text-gray-400 text-xs">—</span>}
                                                        </td>
                                                        <td className="whitespace-nowrap px-5 py-3.5 text-sm">
                                                            {js && js.total_jobs > 0 ? (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                                                        <div
                                                                            className={`h-full rounded-full ${js.completion_rate >= 80 ? "bg-brand-green" : js.completion_rate >= 50 ? "bg-brand-yellow" : "bg-brand-red"}`}
                                                                            style={{ width: `${js.completion_rate}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className={`font-semibold text-xs ${js.completion_rate >= 80 ? "text-brand-green" : js.completion_rate >= 50 ? "text-brand-orange" : "text-brand-red"}`}>
                                                                        {js.completion_rate}%
                                                                    </span>
                                                                </div>
                                                            ) : <span className="text-gray-400 text-xs">—</span>}
                                                        </td>
                                                        <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-600">
                                                            {js ? (
                                                                <span>
                                                                    {js.briefs_sent}
                                                                    {js.acknowledged > 0 && <span className="text-gray-400 text-xs ml-1">({js.acknowledged} ack.)</span>}
                                                                </span>
                                                            ) : <span className="text-gray-400 text-xs">—</span>}
                                                        </td>
                                                        <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-600">
                                                            {js ? js.proofs_uploaded : <span className="text-gray-400 text-xs">—</span>}
                                                        </td>
                                                        <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-600">
                                                            {js?.avg_completion_days != null ? (
                                                                <span className="font-medium">{js.avg_completion_days}d</span>
                                                            ) : <span className="text-gray-400 text-xs">—</span>}
                                                        </td>
                                                        <td className="px-5 py-3.5 text-sm text-gray-600 max-w-[160px]">
                                                            {ratings.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {ratings.map((sr: ServiceRating) => (
                                                                        <span key={sr.name} className="inline-flex items-center rounded-md bg-brand-blue/5 px-2 py-0.5 text-xs font-medium text-brand-blue border border-brand-blue/10">
                                                                            {sr.name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : <span className="text-gray-400 italic text-xs">—</span>}
                                                        </td>
                                                        <td className="whitespace-nowrap px-5 py-3.5 text-sm">
                                                            {avgR !== null ? (
                                                                <span className="inline-flex items-center gap-1 font-semibold text-gray-900">
                                                                    <StarIcon className="h-3.5 w-3.5 text-brand-yellow fill-brand-yellow" />
                                                                    {avgR.toFixed(1)}
                                                                </span>
                                                            ) : <span className="text-gray-400 italic text-xs">—</span>}
                                                        </td>
                                                        <td className="whitespace-nowrap px-5 py-3.5">
                                                            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${vendor.active ? "bg-brand-green/10 text-brand-green border-brand-green/20" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                                                                {vendor.active ? "Active" : "Inactive"}
                                                            </span>
                                                        </td>
                                                        <td className="whitespace-nowrap px-5 py-3.5 text-right">
                                                            <button
                                                                type="button"
                                                                title={`Export ${vendor.name}`}
                                                                onClick={() => exportSingleVendorCSV(vendor, jobStatsMap)}
                                                                className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:border-brand-blue hover:text-brand-blue transition-colors"
                                                            >
                                                                <DownloadIcon className="h-3 w-3" />
                                                                CSV
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </article>
                    </div>
                );
            })()}

            {activeTab === "overview" && <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-8 space-y-8">
                {/* Metrics Row */}
                <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <article className="rounded-xl border border-brand-blue/15 bg-white px-4 py-4 shadow-sm transition-colors hover:border-brand-blue/30">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Avg Turnaround</p>
                        <div className="mt-3 flex items-end gap-1.5">
                            <h3 className="text-2xl font-bold tracking-tight text-gray-900">{analytics.average_turnaround_days.toFixed(1)}</h3>
                            <span className="pb-0.5 text-xs font-medium text-gray-500">days</span>
                        </div>
                    </article>

                    <article className="rounded-xl border border-brand-red/15 bg-white px-4 py-4 shadow-sm transition-colors hover:border-brand-red/30">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">QC Rejection</p>
                        <h3 className="mt-3 text-2xl font-bold tracking-tight text-gray-900">{formatPercentage(analytics.qc_rejection_rate)}</h3>
                        {analytics.qc_rejection_rate > 10 && (
                            <p className="mt-1 text-[11px] font-medium text-brand-orange">Above threshold — review QC</p>
                        )}
                    </article>

                    <article className="rounded-xl border border-brand-green/15 bg-white px-4 py-4 shadow-sm transition-colors hover:border-brand-green/30">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Vendor On-Time</p>
                        <h3 className="mt-3 text-2xl font-bold tracking-tight text-gray-900">{formatPercentage(analytics.vendor_on_time_rate)}</h3>
                    </article>

                    <article className="rounded-xl border border-brand-purple/15 bg-white px-4 py-4 shadow-sm transition-colors hover:border-brand-purple/30">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Completed Jobs</p>
                        <h3 className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
                            {analytics.job_status_distribution.find((s) => s.status === "completed")?.count ?? 0}
                        </h3>
                        <p className="mt-0.5 text-[11px] text-gray-400">all time</p>
                    </article>
                </section>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
                    <div>
                        <article className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Completion Performance</h2>
                                    <p className="text-sm text-gray-500 mt-1">Completion rates across the production team</p>
                                </div>
                                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-blue/5 border border-brand-blue/10 px-3 py-1.5 text-xs font-semibold text-brand-blue">
                                    <Users2Icon className="h-3.5 w-3.5" />
                                    {analytics.team_performance.length} Members tracked
                                </span>
                            </div>

                            {analytics.team_performance.length === 0 ? (
                                <div className="h-[300px] rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-sm text-gray-500">
                                    Team performance data is not available yet.
                                </div>
                            ) : (
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics.team_performance} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis
                                                dataKey="user_name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: "#6B7280", fontSize: 13, fontWeight: 500 }}
                                                dy={10}
                                            />
                                            <YAxis
                                                domain={[0, 100]}
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: "#6B7280", fontSize: 12 }}
                                                tickFormatter={(value: number): string => `${value}%`}
                                            />
                                            <Tooltip content={<BarChartTooltip />} cursor={{ fill: "#F3F4F6", opacity: 0.4 }} />
                                            <Bar dataKey="completion_rate" fill="#093756" radius={[4, 4, 0, 0]} maxBarSize={48} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </article>
                    </div>

                    <div>
                        <article className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                            <h2 className="text-lg font-bold text-gray-900 mb-1">Job Status Map</h2>
                            <p className="text-sm text-gray-500 mb-6">{totalTrackedJobs.toLocaleString()} jobs currently tracked</p>

                            {statusChartData.length === 0 ? (
                                <div className="h-[240px] rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-sm text-gray-500">
                                    Status data is not available yet.
                                </div>
                            ) : (
                                <div className="h-[260px] relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={statusChartData}
                                                dataKey="value"
                                                nameKey="name"
                                                innerRadius={68}
                                                outerRadius={96}
                                                paddingAngle={3}
                                                stroke="none"
                                            >
                                                {statusChartData.map((item: StatusChartItem): ReactElement => (
                                                    <Cell key={item.name} fill={item.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<PieChartTooltip />} />
                                            <Legend
                                                verticalAlign="bottom"
                                                height={40}
                                                iconType="circle"
                                                iconSize={8}
                                                wrapperStyle={{ fontSize: '13px', color: '#4B5563', paddingTop: '20px' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </article>
                    </div>
                </div>

                <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-between border-b border-gray-100 p-6 sm:p-8">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Recent Jobs</h2>
                            <p className="mt-1 text-sm text-gray-500">Latest production jobs updated recently</p>
                        </div>
                        <Link
                            href="/production-team/orchestration"
                            className="group inline-flex items-center gap-1 text-sm font-semibold text-brand-blue transition-colors hover:text-brand-blue/80"
                        >
                            View all
                            <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="whitespace-nowrap border-b border-gray-100 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Job</th>
                                    <th className="whitespace-nowrap border-b border-gray-100 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Client</th>
                                    <th className="whitespace-nowrap border-b border-gray-100 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Product</th>
                                    <th className="whitespace-nowrap border-b border-gray-100 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Due</th>
                                    <th className="whitespace-nowrap border-b border-gray-100 px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {recentJobsQuery.isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="border-b-0 p-6">
                                            <div className="space-y-4">
                                                {Array.from({ length: 4 }).map((_, i) => (
                                                    <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ) : recentJobsQuery.isError ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-brand-red/80">
                                            Unable to load recent jobs.
                                        </td>
                                    </tr>
                                ) : (recentJobsQuery.data ?? []).length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                                            No recent production jobs found.
                                        </td>
                                    </tr>
                                ) : (
                                    (recentJobsQuery.data ?? []).map((job: Job): ReactElement => (
                                        <tr key={job.id} className="transition-colors hover:bg-gray-50/50">
                                            <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900">
                                                <Link href={`/production-team/jobs/${job.id}`} className="hover:text-brand-blue hover:underline">
                                                    {job.job_number || `#${job.id}`}
                                                </Link>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-700">
                                                {job.client?.name || <span className="text-gray-400 italic">Unassigned</span>}
                                            </td>
                                            <td className="max-w-[320px] px-6 py-4 text-sm text-gray-600 truncate" title={job.product ?? ""}>
                                                {job.product || <span className="text-gray-400 italic">Not set</span>}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{formatDate(job.expected_completion)}</td>
                                            <td className="whitespace-nowrap px-6 py-4 text-right">
                                                <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(job.status)}`}>
                                                    {toTitleCase(job.status)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </article>
            </div>}
        </main>
    );
}
