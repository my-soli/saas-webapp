"use client";

import { useState, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    TrendingUp, FileText, Receipt, CheckCircle2, AlertCircle,
    CreditCard, ArrowRight,
} from "lucide-react";
import { fetchFinancials } from "@/services/client-portal-extras";
import type { FinancialInvoice, FinancialPayment, FinancialQuote } from "@/types/client-portal-extras";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: string | number | null | undefined): string {
    if (v === null || v === undefined) return "KES 0";
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(Number(v));
}

function fmtDate(v: string | null): string {
    if (!v) return "—";
    return new Date(v).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

function SkeletonCard(): ReactElement {
    return (
        <div className="animate-pulse bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-8 w-32 bg-gray-200 rounded" />
        </div>
    );
}

type Tab = "quotes" | "invoices" | "payments";

const QUOTE_STATUS_CLS: Record<string, string> = {
    Draft:              "bg-gray-100 text-gray-600",
    "Sent to PT":       "bg-yellow-100 text-yellow-700",
    Costed:             "bg-blue-100 text-blue-700",
    "Sent to Customer": "bg-indigo-100 text-indigo-700",
    Approved:           "bg-green-100 text-green-700",
    Lost:               "bg-red-100 text-red-600",
};

const INVOICE_STATUS_CLS: Record<string, string> = {
    draft:     "bg-gray-100 text-gray-600",
    issued:    "bg-blue-100 text-blue-700",
    overdue:   "bg-red-100 text-red-700",
    paid:      "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-400",
};

const PAYMENT_STATUS_CLS: Record<string, string> = {
    pending:    "bg-yellow-100 text-yellow-700",
    processing: "bg-blue-100 text-blue-700",
    completed:  "bg-green-100 text-green-700",
    failed:     "bg-red-100 text-red-700",
    refunded:   "bg-gray-100 text-gray-600",
};

export default function FinancialsPage(): ReactElement {
    const [tab, setTab] = useState<Tab>("invoices");

    const { data, isLoading, isError } = useQuery({
        queryKey: ["portal-financials"],
        queryFn: fetchFinancials,
        staleTime: 30_000,
    });

    const summary = data?.summary;
    const quotes: FinancialQuote[] = data?.recent_quotes ?? [];
    const invoices: FinancialInvoice[] = data?.recent_invoices ?? [];
    const payments: FinancialPayment[] = data?.recent_payments ?? [];

    return (
        <>
            <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-7">
                {/* Header */}
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-brand-blue" />
                    <h1 className="text-xl font-bold text-gray-900">Financials</h1>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {isLoading ? (
                        [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
                    ) : (
                        <>
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                        <TrendingUp className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <p className="text-xs font-medium text-gray-500">Total Quoted</p>
                                </div>
                                <p className="text-xl font-bold text-gray-900">{fmt(summary?.total_quoted)}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {(summary?.quotes_by_status.approved ?? 0)} approved
                                </p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                                        <FileText className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <p className="text-xs font-medium text-gray-500">Total Invoiced</p>
                                </div>
                                <p className="text-xl font-bold text-gray-900">{fmt(summary?.total_invoiced)}</p>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    </div>
                                    <p className="text-xs font-medium text-gray-500">Total Paid</p>
                                </div>
                                <p className="text-xl font-bold text-gray-900">{fmt(summary?.total_paid)}</p>
                            </div>
                            <div className={`rounded-xl border p-5 shadow-sm ${(summary?.overdue_invoices ?? 0) > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${(summary?.overdue_invoices ?? 0) > 0 ? "bg-red-100" : "bg-orange-50"}`}>
                                        <AlertCircle className={`w-4 h-4 ${(summary?.overdue_invoices ?? 0) > 0 ? "text-red-600" : "text-orange-500"}`} />
                                    </div>
                                    <p className="text-xs font-medium text-gray-500">Outstanding</p>
                                </div>
                                <p className={`text-xl font-bold ${(summary?.overdue_invoices ?? 0) > 0 ? "text-red-700" : "text-gray-900"}`}>
                                    {fmt(summary?.outstanding_balance)}
                                </p>
                                {(summary?.overdue_invoices ?? 0) > 0 && (
                                    <p className="text-xs text-red-600 mt-1 font-medium">
                                        {summary?.overdue_invoices} overdue
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex border-b border-gray-100">
                        {(["invoices", "quotes", "payments"] as Tab[]).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTab(t)}
                                className={`flex-1 py-3 text-sm font-medium transition-colors capitalize ${
                                    tab === t
                                        ? "text-brand-blue border-b-2 border-brand-blue -mb-px"
                                        : "text-gray-500 hover:text-gray-800"
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    {isLoading ? (
                        <div className="p-4 space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="animate-pulse flex items-center gap-3">
                                    <div className="h-4 w-32 bg-gray-200 rounded" />
                                    <div className="h-5 w-20 bg-gray-200 rounded-full" />
                                    <div className="h-4 w-24 bg-gray-200 rounded ml-auto" />
                                </div>
                            ))}
                        </div>
                    ) : isError ? (
                        <div className="flex flex-col items-center py-12 text-gray-400">
                            <AlertCircle className="w-8 h-8 mb-2 opacity-40" />
                            <p className="text-sm">Could not load data. Please refresh.</p>
                        </div>
                    ) : (
                        <>
                            {/* Invoices tab */}
                            {tab === "invoices" && (
                                invoices.length === 0 ? (
                                    <div className="flex flex-col items-center py-12 text-gray-400">
                                        <FileText className="w-10 h-10 mb-2 opacity-30" />
                                        <p className="text-sm">No invoices yet</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-50 text-left border-b border-gray-100">
                                                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">Invoice #</th>
                                                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                                                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">Issued</th>
                                                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">Due</th>
                                                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-right">Total</th>
                                                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-right">Balance Due</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {invoices.map((inv) => (
                                                    <tr key={inv.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-blue">{inv.invoice_number}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${INVOICE_STATUS_CLS[inv.status] ?? "bg-gray-100 text-gray-600"}`}>
                                                                {inv.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(inv.issue_date)}</td>
                                                        <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(inv.due_date)}</td>
                                                        <td className="px-4 py-3 text-right text-gray-700">{fmt(inv.total_amount)}</td>
                                                        <td className={`px-4 py-3 text-right font-semibold ${Number(inv.balance_due) > 0 ? "text-red-600" : "text-green-600"}`}>
                                                            {Number(inv.balance_due) > 0 ? fmt(inv.balance_due) : "Paid"}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            )}

                            {/* Quotes tab */}
                            {tab === "quotes" && (
                                quotes.length === 0 ? (
                                    <div className="flex flex-col items-center py-12 text-gray-400">
                                        <TrendingUp className="w-10 h-10 mb-2 opacity-30" />
                                        <p className="text-sm">No quotes yet</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-50">
                                        {quotes.map((q) => (
                                            <div key={q.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-mono text-xs font-semibold text-brand-blue">{q.quote_id}</p>
                                                    {q.project_name && <p className="text-xs text-gray-400 mt-0.5">{q.project_name}</p>}
                                                </div>
                                                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${QUOTE_STATUS_CLS[q.status] ?? "bg-gray-100 text-gray-600"}`}>
                                                    {q.status}
                                                </span>
                                                <p className="shrink-0 text-xs text-gray-400">{fmtDate(q.created_at)}</p>
                                                <p className="shrink-0 font-semibold text-gray-900 text-sm">{fmt(q.total_amount)}</p>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}

                            {/* Payments tab */}
                            {tab === "payments" && (
                                payments.length === 0 ? (
                                    <div className="flex flex-col items-center py-12 text-gray-400">
                                        <CreditCard className="w-10 h-10 mb-2 opacity-30" />
                                        <p className="text-sm">No payment records yet</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-50">
                                        {payments.map((pay) => (
                                            <div key={pay.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                                                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                                                    <Receipt className="w-4 h-4 text-green-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-800 capitalize">{pay.method?.replace(/_/g, " ")}</p>
                                                    {pay.reference && <p className="text-xs text-gray-400 mt-0.5">Ref: {pay.reference}</p>}
                                                    {pay.invoice_number && <p className="text-xs text-gray-400">Invoice: {pay.invoice_number}</p>}
                                                </div>
                                                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PAYMENT_STATUS_CLS[pay.status] ?? "bg-gray-100 text-gray-600"}`}>
                                                    {pay.status}
                                                </span>
                                                <p className="shrink-0 text-xs text-gray-400">{fmtDate(pay.payment_date)}</p>
                                                <p className="shrink-0 font-bold text-green-700 text-sm">{fmt(pay.amount)}</p>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </>
                    )}
                </div>

                <p className="text-center text-xs text-gray-400">
                    Showing last 10 records per category. Contact us for full statements.{" "}
                    <a href="/portal/support" className="text-brand-blue hover:underline inline-flex items-center gap-0.5">
                        Get help <ArrowRight className="w-3 h-3" />
                    </a>
                </p>
            </div>
        </>
    );
}
