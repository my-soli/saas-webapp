"use client";

import { useState, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
    Search, Filter, Eye, Package, ChevronLeft, ChevronRight,
    AlertCircle, Plus, Briefcase, Clock, CheckCircle, Loader2,
} from "lucide-react";
import { fetchClientOrders } from "@/services/client-orders";
import { fetchPortalJobs } from "@/services/client-portal-extras";
import type { PortalJob } from "@/services/client-portal-extras";
import type { ClientOrder, OrderStatus } from "@/types/client-orders";

// ── Cart orders ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: "all", label: "All Statuses" },
    { value: "draft", label: "Draft" },
    { value: "submitted", label: "Submitted" },
    { value: "acknowledged", label: "Acknowledged" },
    { value: "in_production", label: "In Production" },
    { value: "ready", label: "Ready for Shipment" },
    { value: "shipped", label: "Shipped" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
];

const STATUS_STYLES: Record<OrderStatus, string> = {
    draft: "bg-gray-100 text-gray-700",
    submitted: "bg-blue-100 text-blue-700",
    acknowledged: "bg-indigo-100 text-indigo-700",
    in_production: "bg-yellow-100 text-yellow-700",
    ready: "bg-purple-100 text-purple-700",
    shipped: "bg-orange-100 text-orange-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
    draft: "Draft",
    submitted: "Submitted",
    acknowledged: "Acknowledged",
    in_production: "In Production",
    ready: "Ready",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
};

// ── Job statuses ──────────────────────────────────────────────────────────────

const JOB_STATUS_STYLES: Record<string, string> = {
    pending:     "bg-amber-100 text-amber-700",
    in_progress: "bg-blue-100 text-blue-700",
    on_hold:     "bg-gray-100 text-gray-600",
    completed:   "bg-green-100 text-green-700",
};

const JOB_PRIORITY_STYLES: Record<string, string> = {
    normal: "bg-gray-100 text-gray-600",
    high:   "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: string | number | null): string {
    if (!value) return "—";
    return new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency: "KES",
        minimumFractionDigits: 0,
    }).format(parseFloat(String(value)));
}

function formatDate(value: string | null): string {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-KE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function OrderRowSkeleton(): ReactElement {
    return (
        <tr className="border-b border-gray-100">
            {[120, 80, 60, 80, 70, 80, 40].map((w, i) => (
                <td key={i} className="px-4 py-3">
                    <div className="h-4 rounded bg-gray-200 animate-pulse" style={{ width: w }} />
                </td>
            ))}
        </tr>
    );
}

function JobRowSkeleton(): ReactElement {
    return (
        <tr className="border-b border-gray-100">
            {[120, 100, 80, 80, 80, 80].map((w, i) => (
                <td key={i} className="px-4 py-3">
                    <div className="h-4 rounded bg-gray-200 animate-pulse" style={{ width: w }} />
                </td>
            ))}
        </tr>
    );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ hasFilters, label }: { hasFilters: boolean; label: string }): ReactElement {
    return (
        <tr>
            <td colSpan={7}>
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Package className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm font-medium text-gray-500">No {label} found</p>
                    {hasFilters && <p className="text-xs mt-1">Try adjusting your filters</p>}
                </div>
            </td>
        </tr>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OrdersPage(): ReactElement {
    // Cart orders state
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);

    // Jobs state
    const [jobStatusFilter, setJobStatusFilter] = useState("all");

    const { data: ordersData, isLoading: ordersLoading, isError: ordersError } = useQuery({
        queryKey: ["client-orders", page, statusFilter, debouncedSearch],
        queryFn: () =>
            fetchClientOrders({ page, status: statusFilter, search: debouncedSearch }),
        staleTime: 30_000,
        retry: 1,
    });

    const { data: jobsData, isLoading: jobsLoading, isError: jobsError } = useQuery({
        queryKey: ["portal-jobs", jobStatusFilter],
        queryFn: () => fetchPortalJobs(jobStatusFilter),
        staleTime: 30_000,
        retry: 1,
    });

    const orders: ClientOrder[] = ordersData?.results ?? [];
    const totalCount = ordersData?.count ?? 0;
    const pageSize = 20;
    const totalPages = Math.ceil(totalCount / pageSize);

    const jobs: PortalJob[] = jobsData?.results ?? [];

    function handleSearchSubmit(e: React.FormEvent): void {
        e.preventDefault();
        setDebouncedSearch(search);
        setPage(1);
    }

    function handleStatusChange(value: string): void {
        setStatusFilter(value);
        setPage(1);
    }

    return (
        <>
            <div className="p-4 lg:p-8 space-y-8">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-3xl font-bold text-brand-black">Orders & Jobs</h1>
                        <p className="text-gray-500 mt-1">
                            Track your cart orders and production jobs
                        </p>
                    </div>
                    <Link
                        href="/portal/cart"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-semibold rounded-lg hover:bg-brand-blue/90 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Order
                    </Link>
                </div>

                {/* ── Production Jobs Section ─────────────────────────────── */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Briefcase className="w-5 h-5 text-brand-blue" />
                        <h2 className="text-lg font-semibold text-gray-900">Production Jobs</h2>
                        {!jobsLoading && (
                            <span className="ml-1 text-xs font-semibold bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded-full">
                                {jobsData?.count ?? 0}
                            </span>
                        )}
                        <div className="ml-auto flex gap-1.5 flex-wrap">
                            {[
                                { value: "all", label: "All" },
                                { value: "pending", label: "Pending" },
                                { value: "in_progress", label: "In Progress" },
                                { value: "on_hold", label: "On Hold" },
                                { value: "completed", label: "Completed" },
                            ].map((f) => (
                                <button
                                    key={f.value}
                                    type="button"
                                    onClick={() => setJobStatusFilter(f.value)}
                                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                                        jobStatusFilter === f.value
                                            ? "bg-brand-blue text-white"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {jobsError && (
                        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            Could not load production jobs. Please try again.
                        </div>
                    )}

                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-left">
                                        <th className="px-4 py-3 font-semibold text-gray-700">Job #</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">Description</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">Priority</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">Amount</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">Due Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {jobsLoading ? (
                                        [...Array(4)].map((_, i) => <JobRowSkeleton key={i} />)
                                    ) : jobs.length === 0 ? (
                                        <EmptyState hasFilters={jobStatusFilter !== "all"} label="production jobs" />
                                    ) : (
                                        jobs.map((job) => (
                                            <tr key={job.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 font-mono font-medium text-brand-blue whitespace-nowrap">
                                                    {job.job_number}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-gray-900 text-sm">{job.job_name}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {job.product}
                                                        {job.quantity ? ` · ${job.quantity} pcs` : ""}
                                                        {job.quote_id ? ` · Quote ${job.quote_id}` : ""}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${JOB_STATUS_STYLES[job.status] ?? "bg-gray-100 text-gray-600"}`}>
                                                        {job.status === "completed" ? (
                                                            <CheckCircle className="w-3 h-3" />
                                                        ) : job.status === "in_progress" ? (
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            <Clock className="w-3 h-3" />
                                                        )}
                                                        {job.status_label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${JOB_PRIORITY_STYLES[job.priority] ?? "bg-gray-100 text-gray-600"}`}>
                                                        {job.priority}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                                                    {formatCurrency(job.total_amount)}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                                    {formatDate(job.expected_completion)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* ── Cart Orders Section ─────────────────────────────────── */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Package className="w-5 h-5 text-brand-blue" />
                        <h2 className="text-lg font-semibold text-gray-900">Cart Orders</h2>
                        {!ordersLoading && (
                            <span className="ml-1 text-xs font-semibold bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded-full">
                                {totalCount}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by order number…"
                                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                            />
                        </form>

                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                            <select
                                value={statusFilter}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                className="pl-9 pr-8 py-2.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent bg-white appearance-none"
                            >
                                {STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {ordersError && (
                        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            Could not load orders. Please try again.
                        </div>
                    )}

                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-left">
                                        <th className="px-4 py-3 font-semibold text-gray-700">Order #</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">Items</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">Total</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">Placed</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">Est. Delivery</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ordersLoading ? (
                                        [...Array(5)].map((_, i) => <OrderRowSkeleton key={i} />)
                                    ) : orders.length === 0 ? (
                                        <tr>
                                            <td colSpan={7}>
                                                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                                    <Package className="w-10 h-10 mb-3 opacity-30" />
                                                    <p className="text-sm font-medium text-gray-500">No cart orders yet</p>
                                                    <a href="/portal/cart" className="mt-2 text-xs text-brand-blue hover:underline font-medium">
                                                        Go to Cart →
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        orders.map((order) => (
                                            <tr
                                                key={order.id}
                                                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                            >
                                                <td className="px-4 py-3 font-mono font-medium text-brand-blue">
                                                    {order.order_number}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[order.status]}`}>
                                                        {STATUS_LABELS[order.status]}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-900">
                                                    {formatCurrency(order.total_amount)}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500">
                                                    {formatDate(order.created_at)}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500">
                                                    {formatDate(order.delivery_date)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Link
                                                        href={`/portal/orders/${order.id}`}
                                                        className="inline-flex items-center gap-1.5 text-brand-blue hover:underline font-medium text-xs"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        View
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                                <span>{totalCount} order{totalCount !== 1 ? "s" : ""} total</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span>Page {page} of {totalPages}</span>
                                    <button
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </>
    );
}
