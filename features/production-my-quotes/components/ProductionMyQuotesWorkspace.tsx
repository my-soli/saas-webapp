"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    AlertCircleIcon,
    ArrowLeftIcon,
    LoaderCircleIcon,
    SendIcon,
    XIcon,
    FileTextIcon,
    CalendarIcon,
    UserIcon,
    TagIcon,
} from "lucide-react";
import { toast } from "sonner";
import QuotesPagination from "@/features/quotes/components/QuotesPagination";
import {
    fetchQuote,
    fetchQuotes,
    sendQuoteBackToAM,
    updateLineItemPTCost,
} from "@/services/quotes";
import type {
    Quote,
    QuoteLineItem,
    QuoteProductionStatus,
    QuotesQueryParams,
    QuotesResponse,
} from "@/types/quotes";

type QueueFilter = "all" | QuoteProductionStatus;

const queueFilterOptions: Array<{ value: QueueFilter; label: string }> = [
    { value: "all", label: "All Queue Items" },
    { value: "pending", label: "Awaiting Costing" },
    { value: "in_progress", label: "In Costing" },
    { value: "costed", label: "Costed" },
];

const isQuoteInProductionQueue = (quote: Quote): boolean => {
    const ps = quote.production_status.toLowerCase();
    return (
        quote.status === "Sent to PT" ||
        quote.status === "Costed" ||
        ["pending", "in_progress", "costed"].includes(ps)
    );
};

const canCostQuote = (quote: Quote): boolean => {
    const ps = quote.production_status.toLowerCase();
    return quote.status === "Sent to PT" && (ps === "pending" || ps === "in_progress");
};

const getQueueBadgeClass = (ps: string): string => {
    if (ps === "pending") return "bg-brand-yellow/20 text-brand-black";
    if (ps === "in_progress") return "bg-brand-blue/10 text-brand-blue";
    if (ps === "costed") return "bg-brand-green/10 text-brand-green";
    return "bg-gray-100 text-gray-700";
};

const fmt = (v: number | null | undefined) =>
    v == null ? "—" : `KES ${Number(v).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (v: string | null | undefined) =>
    v ? new Date(v).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "—";

const validityLabel = (validUntil: string): { label: string; className: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(validUntil);
    target.setHours(0, 0, 0, 0);
    const days = Math.floor((target.getTime() - today.getTime()) / 86_400_000);
    if (days < 0) return { label: `Overdue by ${Math.abs(days)}d`, className: "text-brand-red" };
    if (days === 0) return { label: "Due today", className: "text-brand-orange" };
    return { label: `${days}d left`, className: "text-gray-600" };
};

// ── Full-screen PT Costing View ───────────────────────────────────────────────

interface PTQuoteCostingViewProps {
    quoteId: number;
    onClose: () => void;
    onSuccess: () => void;
}

function PTQuoteCostingView({ quoteId, onClose, onSuccess }: PTQuoteCostingViewProps): ReactElement {
    const { data: quote, isLoading } = useQuery({
        queryKey: ["pt-costing-quote", quoteId],
        queryFn: () => fetchQuote(quoteId),
    });

    const lineItems: QuoteLineItem[] = quote?.line_items ?? [];
    const canEdit = quote ? canCostQuote(quote) : false;

    const [costs, setCosts] = useState<Record<number, string>>({});
    const [ptItemNotes, setPtItemNotes] = useState<Record<number, string>>({});
    const [showConfirm, setShowConfirm] = useState(false);
    const [sendBackNotes, setSendBackNotes] = useState(quote?.pt_send_back_notes ?? "");
    const [saving, setSaving] = useState(false);

    // Populate state once quote loads
    useEffect(() => {
        if (!quote) return;
        const initCosts: Record<number, string> = {};
        const initNotes: Record<number, string> = {};
        for (const li of (quote.line_items ?? [])) {
            initCosts[li.id] = li.pt_unit_cost != null ? String(li.pt_unit_cost) : "";
            initNotes[li.id] = li.pt_notes ?? "";
        }
        setCosts(initCosts);
        setPtItemNotes(initNotes);
        setSendBackNotes(quote.pt_send_back_notes ?? "");
    }, [quote]);

    const ptRunningTotal = useMemo(() => {
        return lineItems.reduce((sum, li) => {
            const c = parseFloat(costs[li.id] ?? "");
            return sum + (Number.isFinite(c) && c > 0 ? c * li.quantity : 0);
        }, 0);
    }, [costs, lineItems]);

    const amSubtotal = useMemo(() => {
        return lineItems.reduce((sum, li) => {
            const t = Number(li.line_total ?? 0);
            return sum + (Number.isFinite(t) ? t : 0);
        }, 0);
    }, [lineItems]);

    const handleSendBack = async () => {
        setSaving(true);
        try {
            for (const li of lineItems) {
                const c = parseFloat(costs[li.id] ?? "");
                const ptCost = Number.isFinite(c) && c > 0 ? c : null;
                await updateLineItemPTCost(li.id, {
                    pt_unit_cost: ptCost,
                    pt_notes: ptItemNotes[li.id] ?? "",
                });
            }
            await sendQuoteBackToAM(quoteId, sendBackNotes.trim() || undefined);
            toast.success("Quote costed and sent back to AM.");
            onSuccess();
        } catch {
            toast.error("Failed to send quote back. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (isLoading || !quote) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
                <LoaderCircleIcon className="h-10 w-10 animate-spin text-brand-blue" />
            </div>
        );
    }

    const statusBadgeClass =
        quote.status === "Sent to PT" ? "bg-brand-yellow/20 text-brand-black" :
        quote.status === "Costed" ? "bg-brand-green/10 text-brand-green" :
        "bg-gray-100 text-gray-600";

    return (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">

            {/* Sticky top bar */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
                <div className="mx-auto max-w-6xl px-6 py-4 flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        My Quotes
                    </button>
                    <span className="text-gray-300">/</span>
                    <span className="text-sm font-semibold text-gray-700">{quote.quote_id}</span>
                    <span className={`ml-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass}`}>
                        {quote.status}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                        {canEdit && (
                            <button
                                onClick={() => setShowConfirm(true)}
                                className="flex items-center gap-2 rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 transition-colors"
                            >
                                <SendIcon className="h-4 w-4" />
                                Send Back to AM
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="rounded-md border border-gray-200 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <XIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Page body */}
            <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">

                {/* Quote header info */}
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-3">
                        <FileTextIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-semibold text-gray-800">Quote Details</span>
                    </div>
                    <div className="grid grid-cols-2 gap-0 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-gray-100">
                        {[
                            { label: "Quote ID",       value: quote.quote_id },
                            { label: "Client / Lead",  value: quote.client_name ?? quote.lead_name ?? "—" },
                            { label: "Created By",     value: quote.created_by_name ?? "—" },
                            { label: "Quote Date",     value: fmtDate(quote.quote_date) },
                            { label: "Valid Until",    value: fmtDate(quote.valid_until) },
                            { label: "Payment Terms",  value: quote.payment_terms || "—" },
                        ].map((f) => (
                            <div key={f.label} className="px-5 py-4">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{f.label}</p>
                                <p className="mt-1 text-sm font-semibold text-gray-800 truncate" title={f.value}>{f.value}</p>
                            </div>
                        ))}
                    </div>
                    {(quote.reference_number || quote.project_name) && (
                        <div className="flex items-center gap-8 border-t border-gray-100 px-6 py-3">
                            {quote.reference_number && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <TagIcon className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-400">Ref:</span>
                                    <span className="font-medium">{quote.reference_number}</span>
                                </div>
                            )}
                            {quote.project_name && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <UserIcon className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-400">Project:</span>
                                    <span className="font-medium">{quote.project_name}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Line items + PT costing */}
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3">
                        <span className="text-sm font-semibold text-gray-800">Line Items</span>
                        {canEdit && (
                            <p className="text-xs text-gray-400">Enter your production cost per unit for each item</p>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Product</th>
                                    {lineItems.some((li) => li.description) && (
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Description</th>
                                    )}
                                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Qty</th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">AM Unit Price</th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">AM Line Total</th>
                                    {/* PT costing columns */}
                                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-brand-blue bg-brand-blue/5 border-l border-brand-blue/20">
                                        PT Unit Cost
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-brand-blue bg-brand-blue/5">
                                        PT Notes
                                    </th>
                                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-brand-blue bg-brand-blue/5 border-r border-brand-blue/20">
                                        PT Line Total
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {lineItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-8 text-center text-sm text-gray-400">
                                            No line items on this quote
                                        </td>
                                    </tr>
                                ) : lineItems.map((li) => {
                                    const c = parseFloat(costs[li.id] ?? "");
                                    const ptLineTotal = Number.isFinite(c) && c > 0 ? c * li.quantity : null;
                                    const hasDesc = lineItems.some((l) => l.description);
                                    return (
                                        <tr key={li.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-gray-900">{li.product_name}</p>
                                            </td>
                                            {hasDesc && (
                                                <td className="px-5 py-4 text-sm text-gray-500 max-w-xs">
                                                    {li.description || "—"}
                                                </td>
                                            )}
                                            <td className="px-5 py-4 text-right text-gray-700">{li.quantity}</td>
                                            <td className="px-5 py-4 text-right text-gray-700">
                                                {fmt(Number(li.unit_price ?? 0))}
                                            </td>
                                            <td className="px-5 py-4 text-right font-medium text-gray-800">
                                                {fmt(Number(li.line_total ?? 0))}
                                            </td>
                                            {/* PT Unit Cost */}
                                            <td className="px-5 py-4 text-right bg-brand-blue/5 border-l border-brand-blue/10">
                                                {canEdit ? (
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={costs[li.id] ?? ""}
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                            setCosts((prev) => ({ ...prev, [li.id]: e.target.value }))
                                                        }
                                                        placeholder="0.00"
                                                        className="w-32 rounded-md border border-brand-blue/30 bg-white px-2 py-1.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                                    />
                                                ) : (
                                                    <span className="font-medium text-brand-blue">
                                                        {li.pt_unit_cost != null ? fmt(Number(li.pt_unit_cost)) : "—"}
                                                    </span>
                                                )}
                                            </td>
                                            {/* PT Notes */}
                                            <td className="px-5 py-4 bg-brand-blue/5">
                                                {canEdit ? (
                                                    <input
                                                        type="text"
                                                        value={ptItemNotes[li.id] ?? ""}
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                            setPtItemNotes((prev) => ({ ...prev, [li.id]: e.target.value }))
                                                        }
                                                        placeholder="Optional note…"
                                                        className="w-44 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                                    />
                                                ) : (
                                                    <span className="text-sm text-gray-500">{li.pt_notes || "—"}</span>
                                                )}
                                            </td>
                                            {/* PT Line Total */}
                                            <td className="px-5 py-4 text-right bg-brand-blue/5 border-r border-brand-blue/10">
                                                <span className={`font-semibold ${ptLineTotal != null ? "text-brand-blue" : "text-gray-300"}`}>
                                                    {ptLineTotal != null ? fmt(ptLineTotal) : "—"}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-gray-200 bg-gray-50">
                                    <td colSpan={lineItems.some((li) => li.description) ? 4 : 3} className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Totals
                                    </td>
                                    <td className="px-5 py-3 text-right font-bold text-gray-800">{fmt(amSubtotal)}</td>
                                    <td className="px-5 py-3 text-right font-bold text-brand-blue bg-brand-blue/5 border-l border-brand-blue/10">
                                        {ptRunningTotal > 0 ? fmt(ptRunningTotal) : "—"}
                                    </td>
                                    <td className="bg-brand-blue/5" />
                                    <td className="px-5 py-3 text-right font-bold text-brand-blue bg-brand-blue/5 border-r border-brand-blue/10">
                                        {ptRunningTotal > 0 ? fmt(ptRunningTotal) : "—"}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* AM Totals summary */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                    {/* AM quoted totals */}
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="border-b border-gray-100 px-6 py-3">
                            <span className="text-sm font-semibold text-gray-800">Quote Summary (AM)</span>
                        </div>
                        <div className="p-5 space-y-2 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span className="font-medium text-gray-900">{fmt(amSubtotal)}</span>
                            </div>
                            {Number(quote.total_amount ?? 0) > 0 && (
                                <>
                                    {quote.include_vat && (
                                        <div className="flex justify-between text-gray-600">
                                            <span>VAT ({quote.tax_rate ?? 16}%)</span>
                                            <span className="font-medium text-gray-900">
                                                {fmt(amSubtotal * ((Number(quote.tax_rate ?? 16)) / 100))}
                                            </span>
                                        </div>
                                    )}
                                    {Number(quote.shipping_charges ?? 0) > 0 && (
                                        <div className="flex justify-between text-gray-600">
                                            <span>Shipping</span>
                                            <span className="font-medium text-gray-900">{fmt(Number(quote.shipping_charges))}</span>
                                        </div>
                                    )}
                                </>
                            )}
                            <div className="border-t border-gray-100 pt-2 flex justify-between">
                                <span className="font-bold text-gray-900">Grand Total (AM)</span>
                                <span className="text-lg font-extrabold text-gray-900">{fmt(Number(quote.total_amount ?? 0))}</span>
                            </div>
                        </div>
                    </div>

                    {/* PT cost summary */}
                    <div className="rounded-xl border border-brand-blue/20 bg-brand-blue/5 shadow-sm">
                        <div className="border-b border-brand-blue/20 px-6 py-3">
                            <span className="text-sm font-semibold text-brand-blue">PT Production Cost Summary</span>
                        </div>
                        <div className="p-5 space-y-2 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>PT Total Cost</span>
                                <span className="font-bold text-brand-blue text-lg">{ptRunningTotal > 0 ? fmt(ptRunningTotal) : "—"}</span>
                            </div>
                            {ptRunningTotal > 0 && amSubtotal > 0 && (
                                <div className="flex justify-between text-gray-600">
                                    <span>Implied Margin</span>
                                    <span className={`font-semibold ${((amSubtotal - ptRunningTotal) / amSubtotal) * 100 < 20 ? "text-brand-red" : "text-brand-green"}`}>
                                        {(((amSubtotal - ptRunningTotal) / amSubtotal) * 100).toFixed(1)}%
                                    </span>
                                </div>
                            )}
                            {quote.production_cost != null && !canEdit && (
                                <div className="flex justify-between text-gray-600 border-t border-brand-blue/20 pt-2">
                                    <span>Submitted PT Cost</span>
                                    <span className="font-bold text-brand-green">{fmt(Number(quote.production_cost))}</span>
                                </div>
                            )}
                            {!canEdit && (
                                <p className="mt-3 rounded-md bg-brand-green/10 px-3 py-2 text-xs font-semibold text-brand-green">
                                    ✓ This quote has been costed and sent back to AM
                                </p>
                            )}
                            {canEdit && ptRunningTotal === 0 && (
                                <p className="mt-3 text-xs text-gray-400 italic">
                                    Enter PT unit costs for each line item above
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* AM Notes & Terms */}
                {(quote.notes || quote.customer_notes || quote.custom_terms) && (
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="border-b border-gray-100 px-6 py-3">
                            <span className="text-sm font-semibold text-gray-800">Notes & Terms from AM</span>
                        </div>
                        <div className="p-5 space-y-4">
                            {quote.notes && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Internal Notes</p>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-md px-3 py-2">{quote.notes}</p>
                                </div>
                            )}
                            {quote.customer_notes && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Customer Notes</p>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-md px-3 py-2">{quote.customer_notes}</p>
                                </div>
                            )}
                            {quote.custom_terms && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Terms &amp; Conditions</p>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-md px-3 py-2">{quote.custom_terms}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* PT send-back notes (read-only if already costed) */}
                {!canEdit && quote.pt_send_back_notes && (
                    <div className="rounded-xl border border-brand-green/20 bg-brand-green/5 shadow-sm">
                        <div className="border-b border-brand-green/20 px-6 py-3">
                            <span className="text-sm font-semibold text-brand-green">PT Instructions sent to AM</span>
                        </div>
                        <div className="p-5">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.pt_send_back_notes}</p>
                        </div>
                    </div>
                )}

                {/* Bottom action bar */}
                {canEdit && (
                    <div className="flex justify-end gap-3 pt-2 pb-8">
                        <button
                            onClick={onClose}
                            className="rounded-md border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => setShowConfirm(true)}
                            className="flex items-center gap-2 rounded-md bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue/90 transition-colors"
                        >
                            <SendIcon className="h-4 w-4" />
                            Send Back to AM
                        </button>
                    </div>
                )}
            </main>

            {/* Confirmation popup */}
            {showConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl">
                        <div className="border-b border-gray-100 px-6 py-4">
                            <h3 className="text-base font-bold text-gray-900">Confirm Send Back to AM</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                This will submit your PT costs for <span className="font-semibold">{quote.quote_id}</span> and notify the Account Manager.
                            </p>
                        </div>
                        <div className="p-6 space-y-4">
                            {ptRunningTotal > 0 && (
                                <div className="flex items-center justify-between rounded-lg bg-brand-blue/5 border border-brand-blue/20 px-4 py-3">
                                    <span className="text-sm font-semibold text-gray-700">PT Total Cost being submitted</span>
                                    <span className="text-lg font-extrabold text-brand-blue">{fmt(ptRunningTotal)}</span>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                                    Instructions / Notes to AM <span className="font-normal normal-case">(optional)</span>
                                </label>
                                <textarea
                                    value={sendBackNotes}
                                    onChange={(e) => setSendBackNotes(e.target.value)}
                                    rows={4}
                                    placeholder="Any instructions, clarifications, or context for the Account Manager..."
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                            <button
                                onClick={() => setShowConfirm(false)}
                                disabled={saving}
                                className="rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSendBack}
                                disabled={saving}
                                className="flex items-center gap-2 rounded-md bg-brand-blue px-5 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-60 transition-colors"
                            >
                                {saving
                                    ? <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                                    : <SendIcon className="h-4 w-4" />
                                }
                                {saving ? "Sending…" : "Now Send"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main workspace ────────────────────────────────────────────────────────────

export default function ProductionMyQuotesWorkspace(): ReactElement {
    const queryClient = useQueryClient();

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [queueFilter, setQueueFilter] = useState<QueueFilter>("pending");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [openQuoteId, setOpenQuoteId] = useState<number | null>(null);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(t);
    }, [search]);

    const quoteQueryParams = useMemo(
        (): QuotesQueryParams => ({
            page,
            pageSize,
            search: debouncedSearch,
            status: "all",
            productionStatus: queueFilter,
        }),
        [page, pageSize, debouncedSearch, queueFilter]
    );

    const { data, isLoading, error } = useQuery({
        queryKey: ["production-my-quotes", quoteQueryParams],
        queryFn: (): Promise<QuotesResponse> => fetchQuotes(quoteQueryParams),
    });

    const filteredQuotes = useMemo((): Quote[] => {
        const quotes = data?.results ?? [];
        return queueFilter === "all" ? quotes.filter(isQuoteInProductionQueue) : quotes;
    }, [data?.results, queueFilter]);

    const totalCount = data?.count ?? 0;
    const pendingCount = filteredQuotes.filter((q) => q.production_status.toLowerCase() === "pending").length;
    const inProgressCount = filteredQuotes.filter((q) => q.production_status.toLowerCase() === "in_progress").length;
    const overdueCount = filteredQuotes.filter((q) => validityLabel(q.valid_until).className === "text-brand-red").length;

    const handleCostingSuccess = () => {
        setOpenQuoteId(null);
        queryClient.invalidateQueries({ queryKey: ["production-my-quotes"] });
    };

    return (
        <main className="bg-gray-50 min-h-screen p-8 space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-gray-900">My Quotes</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Quotes sent to you by Account Management for costing. Review each quote, enter your production costs per line item, and send it back.
                </p>
            </header>

            {!isLoading && (error || !data) && (
                <div className="bg-brand-red/10 border border-brand-red/20 rounded-lg p-6 flex items-center gap-3">
                    <AlertCircleIcon className="h-6 w-6 text-brand-red" />
                    <div>
                        <h3 className="font-semibold text-brand-red">Failed to load costing queue</h3>
                        <p className="text-sm text-gray-600 mt-1">Unable to fetch quote records right now.</p>
                    </div>
                </div>
            )}

            {!error && (
                <>
                    <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                            { label: "Queue Total",       value: totalCount,      sub: "Records matching filters" },
                            { label: "Awaiting Costing",  value: pendingCount,    sub: "Need PT unit costs" },
                            { label: "In Costing",        value: inProgressCount, sub: "Currently being costed" },
                            { label: "Overdue Validity",  value: overdueCount,    sub: "Quotes past valid-until date" },
                        ].map((s) => (
                            <article key={s.label} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
                                <p className="mt-2 text-2xl font-bold text-gray-900">{s.value.toLocaleString()}</p>
                                <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
                            </article>
                        ))}
                    </section>

                    <section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-3">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Search</label>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); }}
                                    placeholder="Quote ID, product, client, lead, or reference…"
                                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Filter by Status</label>
                                <select
                                    value={queueFilter}
                                    onChange={(e: ChangeEvent<HTMLSelectElement>) => { setQueueFilter(e.target.value as QueueFilter); setPage(1); }}
                                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                >
                                    {queueFilterOptions.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    {isLoading ? (
                        <section className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm flex items-center gap-2 text-gray-600">
                            <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Loading quote queue…</span>
                        </section>
                    ) : filteredQuotes.length > 0 ? (
                        <>
                            <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr className="border-b border-gray-200">
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Quote</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client / Lead</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product &amp; Items</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">AM Amount</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">PT Cost</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Valid Until</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredQuotes.map((quote: Quote): ReactElement => {
                                            const ps = quote.production_status.toLowerCase();
                                            const vl = validityLabel(quote.valid_until);
                                            const lineCount = quote.line_items?.length ?? 0;
                                            const customer =
                                                quote.client_name ??
                                                quote.lead_name ??
                                                (quote.client != null ? `Client #${quote.client}` : quote.lead != null ? `Lead #${quote.lead}` : "—");

                                            return (
                                                <tr
                                                    key={quote.id}
                                                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                                                    onClick={() => setOpenQuoteId(quote.id)}
                                                >
                                                    <td className="py-3 px-4 text-sm font-semibold text-brand-blue hover:underline">{quote.quote_id}</td>
                                                    <td className="py-3 px-4 text-sm text-gray-700">{customer}</td>
                                                    <td className="py-3 px-4 text-sm text-gray-700">
                                                        <p className="font-medium text-gray-900">{quote.product_name}</p>
                                                        <p className="text-xs text-gray-500 mt-0.5">
                                                            {lineCount > 0 ? `${lineCount} line item${lineCount === 1 ? "" : "s"}` : "Single item"}
                                                        </p>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-gray-700">{fmt(quote.total_amount)}</td>
                                                    <td className="py-3 px-4 text-sm">
                                                        {quote.production_cost != null
                                                            ? <span className="font-semibold text-brand-green">{fmt(quote.production_cost)}</span>
                                                            : <span className="text-gray-300 italic text-xs">Not costed</span>
                                                        }
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-gray-700">
                                                        <p>{fmtDate(quote.valid_until)}</p>
                                                        <p className={`text-xs mt-0.5 ${vl.className}`}>{vl.label}</p>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getQueueBadgeClass(ps)}`}>
                                                            {ps === "pending" ? "Awaiting Costing" : ps === "in_progress" ? "In Costing" : ps === "costed" ? "Costed" : ps}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setOpenQuoteId(quote.id)}
                                                            className={`text-sm font-semibold transition-colors ${
                                                                canCostQuote(quote)
                                                                    ? "text-brand-blue hover:text-brand-blue/80"
                                                                    : "text-gray-500 hover:text-gray-700"
                                                            }`}
                                                        >
                                                            {canCostQuote(quote) ? "Cost & Send →" : "View →"}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </section>

                            <QuotesPagination
                                count={totalCount}
                                page={page}
                                pageSize={pageSize}
                                onPageChange={setPage}
                                onPageSizeChange={(size: number) => { setPageSize(size); setPage(1); }}
                            />
                        </>
                    ) : (
                        <section className="bg-white rounded-lg border border-gray-200 p-10 shadow-sm text-center">
                            <FileTextIcon className="mx-auto h-10 w-10 text-gray-200 mb-3" />
                            <h3 className="text-base font-semibold text-gray-700">No quotes in queue</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Quotes sent to Production Team by Account Management will appear here.
                            </p>
                        </section>
                    )}
                </>
            )}

            {/* Full-screen PT costing view */}
            {openQuoteId !== null && (
                <PTQuoteCostingView
                    quoteId={openQuoteId}
                    onClose={() => setOpenQuoteId(null)}
                    onSuccess={handleCostingSuccess}
                />
            )}
        </main>
    );
}
