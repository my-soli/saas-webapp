"use client";

import { Fragment, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Mail,
    Search,
    Filter,
    RefreshCw,
    CheckCircle2,
    XCircle,
    MousePointerClick,
    Eye,
    AlertTriangle,
    Clock,
} from "lucide-react";
import AdminLayout from "@/components/admin/admin-layout";

interface EmailLogEntry {
    id: number;
    quote_id: string;
    client_name: string;
    status: string;
    email_sent_at: string | null;
    email_opened: boolean;
    email_opened_at: string | null;
    email_clicked: boolean;
    email_clicked_at: string | null;
    email_failed: boolean;
    email_failed_reason: string;
}

interface EmailLogResponse {
    results: EmailLogEntry[];
    count: number;
    page: number;
    page_size: number;
    total_pages: number;
}

type EmailStatusFilter = "" | "opened" | "not_opened" | "clicked" | "failed";

const STATUS_OPTIONS: { value: EmailStatusFilter; label: string }[] = [
    { value: "", label: "All Emails" },
    { value: "opened", label: "Opened" },
    { value: "not_opened", label: "Not Opened" },
    { value: "clicked", label: "Link Clicked" },
    { value: "failed", label: "Failed" },
];

function formatDate(value: string | null): string {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-KE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatShortDate(value: string | null): string {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-KE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

async function fetchEmailLog(params: {
    search: string;
    status: EmailStatusFilter;
    date_from: string;
    date_to: string;
    page: number;
}): Promise<EmailLogResponse> {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.status) query.set("status", params.status);
    if (params.date_from) query.set("date_from", params.date_from);
    if (params.date_to) query.set("date_to", params.date_to);
    if (params.page > 1) query.set("page", String(params.page));
    const res = await fetch(`/api/proxy/api/v1/email-log/${query.toString() ? `?${query}` : ""}`, {
        credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch email log");
    return res.json();
}

export default function EmailLogPage() {
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<EmailStatusFilter>("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [page, setPage] = useState(1);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 400);
        return () => clearTimeout(t);
    }, [search]);

    const { data, isLoading, error, refetch, isFetching } = useQuery({
        queryKey: ["email-log", debouncedSearch, statusFilter, dateFrom, dateTo, page],
        queryFn: () => fetchEmailLog({ search: debouncedSearch, status: statusFilter, date_from: dateFrom, date_to: dateTo, page }),
    });

    const entries = data?.results ?? [];
    const totalCount = data?.count ?? 0;
    const totalPages = data?.total_pages ?? 1;

    const openedCount = entries.filter((e) => e.email_opened).length;
    const clickedCount = entries.filter((e) => e.email_clicked).length;
    const failedCount = entries.filter((e) => e.email_failed).length;

    function getDeliveryStatus(entry: EmailLogEntry) {
        if (entry.email_failed) return { label: "Failed", icon: XCircle, color: "text-red-600 bg-red-50" };
        if (entry.email_clicked) return { label: "Clicked", icon: MousePointerClick, color: "text-purple-600 bg-purple-50" };
        if (entry.email_opened) return { label: "Opened", icon: Eye, color: "text-green-600 bg-green-50" };
        return { label: "Delivered", icon: CheckCircle2, color: "text-blue-600 bg-blue-50" };
    }

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4 lg:py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Email Log</h1>
                            <p className="mt-1 text-sm text-gray-600">
                                Track quote email delivery, open rates, and link clicks
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
                <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-4">

                    {/* Summary cards — only shown when data is loaded */}
                    {!isLoading && entries.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Mail className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Shown</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
                                <p className="text-xs text-gray-400 mt-0.5">total emails sent</p>
                            </div>
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Eye className="w-4 h-4 text-green-500" />
                                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Opened</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900">{openedCount}</p>
                                <p className="text-xs text-gray-400 mt-0.5">on this page</p>
                            </div>
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <MousePointerClick className="w-4 h-4 text-purple-500" />
                                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Clicked</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900">{clickedCount}</p>
                                <p className="text-xs text-gray-400 mt-0.5">on this page</p>
                            </div>
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <XCircle className="w-4 h-4 text-red-500" />
                                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Failed</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900">{failedCount}</p>
                                <p className="text-xs text-gray-400 mt-0.5">on this page</p>
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by quote ID or client name..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                />
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Filter className="w-4 h-4 text-gray-400" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => { setStatusFilter(e.target.value as EmailStatusFilter); setPage(1); }}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                >
                                    {STATUS_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                />
                                <span className="text-gray-400 text-sm">to</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                />
                            </div>
                            {(search || statusFilter || dateFrom || dateTo) && (
                                <button
                                    onClick={() => { setSearch(""); setDebouncedSearch(""); setStatusFilter(""); setDateFrom(""); setDateTo(""); setPage(1); }}
                                    className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 flex-shrink-0"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {!isLoading && (
                        <p className="text-sm text-gray-500">{totalCount} {totalCount === 1 ? "email" : "emails"}</p>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                            Failed to load email log. Please try again.
                        </div>
                    )}

                    {isLoading && (
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
                            <div className="p-4 space-y-3">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="h-4 bg-gray-200 rounded w-20" />
                                        <div className="h-4 bg-gray-200 rounded flex-1" />
                                        <div className="h-4 bg-gray-200 rounded w-24" />
                                        <div className="h-4 bg-gray-200 rounded w-16" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!isLoading && entries.length === 0 && !error && (
                        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                            <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No emails found</p>
                            <p className="text-sm text-gray-400 mt-1">
                                {search || statusFilter || dateFrom || dateTo
                                    ? "Try adjusting your filters."
                                    : "Emails will appear here once quotes are sent to customers."}
                            </p>
                        </div>
                    )}

                    {!isLoading && entries.length > 0 && (
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50">
                                        <th className="text-left px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wide">Quote</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wide">Client</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wide hidden md:table-cell">Sent At</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wide">Status</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wide hidden lg:table-cell">Opened</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wide hidden lg:table-cell">Clicked</th>
                                        <th className="px-4 py-3 w-8" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {entries.map((entry) => {
                                        const ds = getDeliveryStatus(entry);
                                        const Icon = ds.icon;
                                        const isExpanded = expandedId === entry.id;
                                        return (
                                            <Fragment key={entry.id}>
                                                <tr
                                                    className="hover:bg-gray-50 cursor-pointer"
                                                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                                                >
                                                    <td className="px-4 py-3 font-mono font-medium text-brand-blue">
                                                        {entry.quote_id}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-900 font-medium">{entry.client_name || "—"}</td>
                                                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                                                        {formatDate(entry.email_sent_at)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ds.color}`}>
                                                            <Icon className="w-3 h-3" />
                                                            {ds.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 hidden lg:table-cell">
                                                        {entry.email_opened ? (
                                                            <span className="inline-flex items-center gap-1 text-green-600 text-xs">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                {formatShortDate(entry.email_opened_at)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-300 text-xs">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 hidden lg:table-cell">
                                                        {entry.email_clicked ? (
                                                            <span className="inline-flex items-center gap-1 text-purple-600 text-xs">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                {formatShortDate(entry.email_clicked_at)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-300 text-xs">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-400 text-xs">
                                                        {isExpanded ? "▲" : "▼"}
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr className="bg-gray-50">
                                                        <td colSpan={7} className="px-4 py-4">
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                                <div>
                                                                    <p className="text-xs text-gray-400 font-medium uppercase mb-1">Quote Status</p>
                                                                    <p className="text-gray-700">{entry.status}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-400 font-medium uppercase mb-1 flex items-center gap-1">
                                                                        <Clock className="w-3 h-3" /> Sent At
                                                                    </p>
                                                                    <p className="text-gray-700">{formatDate(entry.email_sent_at)}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-400 font-medium uppercase mb-1 flex items-center gap-1">
                                                                        <Eye className="w-3 h-3" /> Opened
                                                                    </p>
                                                                    <p className="text-gray-700">
                                                                        {entry.email_opened ? formatDate(entry.email_opened_at) : "Not opened"}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-400 font-medium uppercase mb-1 flex items-center gap-1">
                                                                        <MousePointerClick className="w-3 h-3" /> Clicked
                                                                    </p>
                                                                    <p className="text-gray-700">
                                                                        {entry.email_clicked ? formatDate(entry.email_clicked_at) : "No click recorded"}
                                                                    </p>
                                                                </div>
                                                                {entry.email_failed && (
                                                                    <div className="col-span-2 md:col-span-4">
                                                                        <p className="text-xs text-red-500 font-medium uppercase mb-1 flex items-center gap-1">
                                                                            <AlertTriangle className="w-3 h-3" /> Failure Reason
                                                                        </p>
                                                                        <p className="text-red-700 bg-red-50 rounded px-3 py-2 text-sm">
                                                                            {entry.email_failed_reason || "Unknown error"}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                                    <button
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </AdminLayout>
    );
}
