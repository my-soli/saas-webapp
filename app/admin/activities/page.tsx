"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Search, Filter, User, FileText, Briefcase, RefreshCw } from "lucide-react";
import AdminLayout from "@/components/admin/admin-layout";

interface ActivityLog {
    id: number;
    activity_type: string;
    title: string;
    description: string;
    created_at: string;
    client?: number | null;
    client_name?: string | null;
    performed_by?: string | null;
    related_quote?: string | null;
    related_job?: number | null;
    metadata?: Record<string, unknown>;
}

interface ActivityLogResponse {
    results: ActivityLog[];
    count: number;
    next: string | null;
    previous: string | null;
}

const ACTIVITY_TYPES = [
    { value: "", label: "All Types" },
    { value: "quote_created", label: "Quote Created" },
    { value: "quote_updated", label: "Quote Updated" },
    { value: "quote_approved", label: "Quote Approved" },
    { value: "quote_sent", label: "Quote Sent" },
    { value: "job_created", label: "Job Created" },
    { value: "job_updated", label: "Job Updated" },
    { value: "payment_received", label: "Payment Received" },
    { value: "client_created", label: "Client Created" },
    { value: "lead_created", label: "Lead Created" },
    { value: "note_added", label: "Note Added" },
];

function getActivityIcon(type: string) {
    if (type.startsWith("quote")) return FileText;
    if (type.startsWith("job")) return Briefcase;
    if (type.startsWith("client") || type.startsWith("lead")) return User;
    return Activity;
}

function getActivityColor(type: string): string {
    if (type.includes("approved") || type.includes("received")) return "bg-green-100 text-green-700";
    if (type.includes("created")) return "bg-blue-100 text-blue-700";
    if (type.includes("updated")) return "bg-yellow-100 text-yellow-700";
    if (type.includes("sent")) return "bg-purple-100 text-purple-700";
    return "bg-gray-100 text-gray-700";
}

function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

async function fetchActivityLog(params: { search?: string; activity_type?: string; page?: number }): Promise<ActivityLogResponse> {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.activity_type) query.set("activity_type", params.activity_type);
    if (params.page && params.page > 1) query.set("page", String(params.page));

    const res = await fetch(`/api/proxy/api/v1/activity-log/${query.toString() ? `?${query}` : ""}`, {
        credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch activity log");
    return res.json();
}

export default function ActivitiesPage() {
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [activityType, setActivityType] = useState("");
    const [page, setPage] = useState(1);

    const { data, isLoading, error, refetch, isFetching } = useQuery({
        queryKey: ["activity-log", debouncedSearch, activityType, page],
        queryFn: () => fetchActivityLog({ search: debouncedSearch, activity_type: activityType, page }),
    });

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        const val = e.target.value;
        clearTimeout((window as unknown as { _activitySearchTimer?: ReturnType<typeof setTimeout> })._activitySearchTimer);
        (window as unknown as { _activitySearchTimer?: ReturnType<typeof setTimeout> })._activitySearchTimer = setTimeout(() => {
            setDebouncedSearch(val);
            setPage(1);
        }, 400);
    };

    const activities = data?.results ?? [];
    const totalCount = data?.count ?? 0;
    const pageSize = 20;
    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4 lg:py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Activity Feed</h1>
                            <p className="mt-1 text-sm text-gray-600">
                                System-wide activity log — quotes, jobs, payments, and more
                            </p>
                        </div>
                        <button
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </header>

            <main className="bg-gray-50 min-h-screen">
                <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 space-y-4">
                    {/* Filters */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={handleSearchChange}
                                placeholder="Search activities..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <select
                                value={activityType}
                                onChange={(e) => { setActivityType(e.target.value); setPage(1); }}
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                            >
                                {ACTIVITY_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Count */}
                    {!isLoading && (
                        <p className="text-sm text-gray-500">
                            {totalCount} {totalCount === 1 ? "activity" : "activities"}
                        </p>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                            Failed to load activity log. Please try again.
                        </div>
                    )}

                    {/* Loading skeleton */}
                    {isLoading && (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                                    <div className="flex gap-3">
                                        <div className="w-9 h-9 bg-gray-200 rounded-full flex-shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-gray-200 rounded w-3/4" />
                                            <div className="h-3 bg-gray-200 rounded w-1/2" />
                                        </div>
                                        <div className="h-3 bg-gray-200 rounded w-16" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Activity list */}
                    {!isLoading && activities.length === 0 && !error && (
                        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                            <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No activities found</p>
                            <p className="text-sm text-gray-400 mt-1">
                                {search || activityType ? "Try adjusting your filters." : "Activity will appear here as the team works."}
                            </p>
                        </div>
                    )}

                    {!isLoading && activities.length > 0 && (
                        <div className="space-y-2">
                            {activities.map((log) => {
                                const Icon = getActivityIcon(log.activity_type);
                                const colorClass = getActivityColor(log.activity_type);
                                return (
                                    <div key={log.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                                        <div className="flex items-start gap-3">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {log.title}
                                                </p>
                                                {log.description && (
                                                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                                                        {log.description}
                                                    </p>
                                                )}
                                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                    {log.performed_by && (
                                                        <span className="text-xs text-gray-400">by {log.performed_by}</span>
                                                    )}
                                                    {log.client_name && (
                                                        <>
                                                            <span className="text-xs text-gray-300">·</span>
                                                            <span className="text-xs text-gray-400">{log.client_name}</span>
                                                        </>
                                                    )}
                                                    {log.related_quote && (
                                                        <>
                                                            <span className="text-xs text-gray-300">·</span>
                                                            <span className="text-xs text-brand-blue font-medium">{log.related_quote}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <time className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                                                {formatRelativeTime(log.created_at)}
                                            </time>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-gray-600">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </AdminLayout>
    );
}
