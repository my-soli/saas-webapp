"use client";

import { useState, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    FileText, Search, Filter, ChevronLeft, ChevronRight,
    AlertCircle, ExternalLink,
} from "lucide-react";
import { fetchClientInvoices } from "@/services/client-orders";
import type { ClientInvoice, InvoiceStatus } from "@/types/client-orders";

const STATUS_OPTIONS = [
    { value: "all", label: "All Statuses" },
    { value: "draft", label: "Draft" },
    { value: "issued", label: "Issued" },
    { value: "overdue", label: "Overdue" },
    { value: "paid", label: "Paid" },
    { value: "cancelled", label: "Cancelled" },
];

const STATUS_STYLES: Record<InvoiceStatus, string> = {
    draft: "bg-gray-100 text-gray-600",
    issued: "bg-blue-100 text-blue-700",
    overdue: "bg-red-100 text-red-700",
    paid: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-400",
};

function fmt(v: string | number): string {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(Number(v));
}

function fmtDate(v: string | null): string {
    if (!v) return "—";
    return new Date(v).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

function RowSkeleton(): ReactElement {
    return (
        <tr className="border-b border-gray-100">
            {[100, 80, 90, 80, 80, 70, 60].map((w, i) => (
                <td key={i} className="px-4 py-3">
                    <div className="h-4 rounded bg-gray-200 animate-pulse" style={{ width: w }} />
                </td>
            ))}
        </tr>
    );
}

export default function InvoicesPage(): ReactElement {
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["client-invoices", page, statusFilter],
        queryFn: () => fetchClientInvoices({ page, status: statusFilter !== "all" ? statusFilter : undefined }),
        staleTime: 30_000,
        retry: 1,
    });

    const invoices: ClientInvoice[] = data?.results ?? [];
    const totalCount = data?.count ?? 0;
    const totalPages = Math.ceil(totalCount / 20);

    return (
        <>
            <div className="p-4 lg:p-8 space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-brand-black">Invoices</h1>
                    <p className="text-gray-500 mt-1">View and pay your invoices</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="pl-9 pr-8 py-2.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent bg-white appearance-none"
                        >
                            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                </div>

                {isError && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        <AlertCircle className="w-5 h-5 shrink-0" /> Could not load invoices. Please try again.
                    </div>
                )}

                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                                    <th className="px-4 py-3 font-semibold text-gray-700">Invoice #</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Order #</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Total</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Balance Due</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Due Date</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Issued</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    [...Array(6)].map((_, i) => <RowSkeleton key={i} />)
                                ) : invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={7}>
                                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                                <FileText className="w-12 h-12 mb-3 opacity-30" />
                                                <p className="text-sm font-medium">No invoices found</p>
                                                <p className="text-xs mt-1">Invoices will appear here once your orders are processed</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    invoices.map((inv) => (
                                        <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 font-mono font-medium text-brand-blue">{inv.invoice_number}</td>
                                            <td className="px-4 py-3 text-gray-600 font-mono text-xs">{inv.order_number ?? "—"}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[inv.status]}`}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-gray-900">{fmt(inv.total_amount)}</td>
                                            <td className={`px-4 py-3 font-medium ${parseFloat(inv.balance_due) > 0 ? "text-red-600" : "text-green-600"}`}>
                                                {fmt(inv.balance_due)}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">{fmtDate(inv.due_date)}</td>
                                            <td className="px-4 py-3 text-gray-500">{fmtDate(inv.issued_at)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                            <span>{totalCount} invoice{totalCount !== 1 ? "s" : ""} total</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span>Page {page} of {totalPages}</span>
                                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
