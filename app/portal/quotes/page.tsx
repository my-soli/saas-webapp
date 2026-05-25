"use client";

import { useState, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    ChevronDown, ChevronUp, Download, ExternalLink,
    CheckCircle2, Clock, XCircle, FileText, Send, AlertCircle,
} from "lucide-react";
import { fetchPortalQuotes, downloadPortalQuotePdf } from "@/services/client-portal-extras";
import type { PortalQuote, PortalQuoteStatus } from "@/types/client-portal-extras";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: string | number): string {
    return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(Number(v));
}

function fmtDate(v: string | null): string {
    if (!v) return "—";
    return new Date(v).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_META: Record<string, { cls: string; Icon: typeof CheckCircle2; label: string }> = {
    Draft:              { cls: "bg-gray-100 text-gray-600",    Icon: FileText,    label: "Draft" },
    "Sent to PT":       { cls: "bg-yellow-100 text-yellow-700", Icon: Clock,       label: "Under Review" },
    Costed:             { cls: "bg-blue-100 text-blue-700",    Icon: Clock,       label: "Costed" },
    "Sent to Customer": { cls: "bg-indigo-100 text-indigo-700", Icon: Send,        label: "Awaiting Approval" },
    Approved:           { cls: "bg-green-100 text-green-700",  Icon: CheckCircle2, label: "Approved" },
    Lost:               { cls: "bg-red-100 text-red-600",      Icon: XCircle,     label: "Declined" },
};

const STATUS_FILTERS = [
    { value: "all",               label: "All" },
    { value: "Sent to Customer",  label: "Awaiting Approval" },
    { value: "Approved",          label: "Approved" },
    { value: "Draft",             label: "Draft" },
    { value: "Lost",              label: "Declined" },
];

function SkeletonRow(): ReactElement {
    return (
        <div className="animate-pulse p-4 border-b border-gray-100 flex items-center gap-4">
            <div className="h-4 w-28 bg-gray-200 rounded" />
            <div className="h-5 w-24 bg-gray-200 rounded-full" />
            <div className="h-4 w-20 bg-gray-200 rounded ml-auto" />
            <div className="h-4 w-16 bg-gray-200 rounded" />
        </div>
    );
}

// ── Quote row ─────────────────────────────────────────────────────────────────

function QuoteRow({ quote }: { quote: PortalQuote }): ReactElement {
    const [expanded, setExpanded] = useState(false);
    const meta = STATUS_META[quote.status] ?? STATUS_META["Draft"];
    const Icon = meta.Icon;

    const handleDownload = async (): Promise<void> => {
        try {
            const blob = await downloadPortalQuotePdf(quote.quote_id);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${quote.quote_id}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error("Could not download PDF. Please try again.");
        }
    };

    const approvalUrl = quote.approval_token
        ? `/quotes/approve/${quote.approval_token}`
        : null;

    return (
        <div className="border border-gray-100 rounded-xl bg-white shadow-sm overflow-hidden mb-3">
            {/* Header row */}
            <button
                type="button"
                onClick={() => setExpanded((p) => !p)}
                className="w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-brand-blue">{quote.quote_id}</span>
                        {quote.project_name && (
                            <span className="text-xs text-gray-500">— {quote.project_name}</span>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {quote.item_count} item{quote.item_count !== 1 ? "s" : ""}
                        {" · "}
                        Issued {fmtDate(quote.created_at)}
                        {quote.valid_until && ` · Valid until ${fmtDate(quote.valid_until)}`}
                    </p>
                </div>
                <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.cls}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {meta.label}
                </span>
                <span className="shrink-0 text-base font-bold text-gray-900">{fmt(quote.total_amount)}</span>
                <span className="shrink-0 text-gray-400">
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
            </button>

            {/* Expanded detail */}
            {expanded && (
                <div className="border-t border-gray-100 px-5 pb-5">
                    {/* Line items */}
                    <div className="mt-4 overflow-x-auto rounded-lg border border-gray-100">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-left">
                                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500">Item</th>
                                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-center">Qty</th>
                                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-right">Unit Price</th>
                                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {quote.line_items.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2.5">
                                            <p className="font-medium text-gray-800">{item.product_name}</p>
                                            {item.description && (
                                                <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 text-center text-gray-600">{item.quantity} {item.unit}</td>
                                        <td className="px-3 py-2.5 text-right text-gray-600">{fmt(item.unit_price)}</td>
                                        <td className="px-3 py-2.5 text-right font-semibold text-gray-900">{fmt(item.line_total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-50 border-t border-gray-200">
                                    <td colSpan={3} className="px-3 py-2.5 text-right text-sm font-semibold text-gray-700">
                                        {quote.include_vat ? "Total (incl. VAT)" : "Total"}
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-sm font-bold text-gray-900">{fmt(quote.total_amount)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex items-center gap-3 flex-wrap">
                        <button
                            type="button"
                            onClick={handleDownload}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Download PDF
                        </button>
                        {approvalUrl && quote.status === "Sent to Customer" && (
                            <a
                                href={approvalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium hover:bg-brand-blue/90 transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Review & Approve
                            </a>
                        )}
                        {quote.status === "Approved" && (
                            <span className="inline-flex items-center gap-1.5 text-sm text-green-700 font-medium">
                                <CheckCircle2 className="w-4 h-4" />
                                Approved — your job is in production
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PortalQuotesPage(): ReactElement {
    const [statusFilter, setStatusFilter] = useState("all");

    const { data, isLoading, isError } = useQuery({
        queryKey: ["portal-quotes", statusFilter],
        queryFn: () => fetchPortalQuotes(statusFilter),
        staleTime: 30_000,
    });

    const quotes = data?.results ?? [];

    return (
        <>
            <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-brand-blue" />
                        <h1 className="text-xl font-bold text-gray-900">My Quotes</h1>
                        {!isLoading && (
                            <span className="ml-1 text-xs font-semibold bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded-full">
                                {data?.count ?? 0}
                            </span>
                        )}
                    </div>

                    {/* Status filter */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {STATUS_FILTERS.map((f) => (
                            <button
                                key={f.value}
                                type="button"
                                onClick={() => setStatusFilter(f.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    statusFilter === f.value
                                        ? "bg-brand-blue text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                {isLoading ? (
                    <div className="space-y-3">
                        {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <AlertCircle className="w-10 h-10 mb-2 opacity-40" />
                        <p className="text-sm">Could not load quotes. Please refresh.</p>
                    </div>
                ) : quotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <FileText className="w-12 h-12 mb-3 opacity-30" />
                        <p className="text-sm font-medium">No quotes yet</p>
                        <p className="text-xs mt-1">Quotes from PrintDuka will appear here once created.</p>
                    </div>
                ) : (
                    <div>
                        {quotes.map((q) => <QuoteRow key={q.id} quote={q} />)}
                    </div>
                )}
            </div>
        </>
    );
}
