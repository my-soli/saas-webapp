"use client";

import { useMemo, useRef, useState, type ReactElement } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import AdminLayout from "@/components/admin/admin-layout";
import StatusPill, { type StatusPillTone } from "@/components/admin/status-pill";
import { Plus, Receipt, Settings, RefreshCw, Ban, Pencil, Download, Search, Loader2, X, Wallet } from "lucide-react";
import { fetchInvoices, queueForEtims, voidInvoice, getInvoicePdfUrl, type FinancialInvoice } from "@/services/financial-invoices";
import {
    createInvoicePayment,
    INVOICE_PAYMENT_METHOD_OPTIONS,
    type FinancialInvoicePaymentPayload,
} from "@/services/financial-invoice-payments";

const INVOICE_STATUS_TONE: Record<string, StatusPillTone> = {
    draft: "neutral",
    sent: "warning",
    paid: "success",
    overdue: "danger",
    void: "neutral",
    partially_paid: "warning",
};

/** Status shown in the list: a part-paid invoice reads "Partially Paid" (Zoho-style). */
function displayStatus(inv: FinancialInvoice): string {
    if (inv.status !== "void" && inv.payment_status === "partially_paid") return "partially_paid";
    return inv.effective_status;
}

const ETIMS_STATUS_TONE: Record<string, StatusPillTone> = {
    not_submitted: "neutral",
    pending: "warning",
    signed: "success",
    failed: "danger",
};

const ETIMS_STATUS_LABEL: Record<string, string> = {
    not_submitted: "Not Submitted",
    pending: "Pending",
    signed: "Signed",
    failed: "Failed",
};

const STATUS_LABEL: Record<string, string> = {
    draft: "Draft",
    sent: "Sent",
    paid: "Paid",
    overdue: "Overdue",
    void: "Void",
    partially_paid: "Partially Paid",
};

function RecordPaymentModal({ invoice, onClose }: { invoice: FinancialInvoice; onClose: () => void }): ReactElement {
    const queryClient = useQueryClient();
    const [form, setForm] = useState<FinancialInvoicePaymentPayload>({
        invoice: invoice.id,
        payment_date: new Date().toISOString().slice(0, 10),
        // Deliberately left blank rather than pre-filled with the full balance —
        // a pre-filled amount is too easy to leave untouched when recording a
        // partial payment, silently marking the invoice fully paid.
        amount: "",
        payment_method: "bank_transfer",
        reference_number: "",
        notes: "",
    });

    function set<K extends keyof FinancialInvoicePaymentPayload>(key: K, value: FinancialInvoicePaymentPayload[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    const saveMutation = useMutation({
        mutationFn: () => createInvoicePayment(form),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["financial-invoices"] });
            toast.success("Payment recorded");
            onClose();
        },
        onError: (e: Error) => toast.error(e.message),
    });

    return (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Record Payment</h2>
                        <p className="text-xs text-gray-400">{invoice.invoice_number} — {invoice.client_name}</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="p-6 space-y-4">
                    <div className="rounded-lg bg-gray-50 p-3 space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Invoice total</span>
                            <span className="text-gray-900">KES {Number(invoice.total).toLocaleString()}</span>
                        </div>
                        {invoice.amount_paid > 0 && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">Already paid</span>
                                <span className="text-brand-red">(-) KES {invoice.amount_paid.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-semibold">
                            <span className="text-gray-700">Balance Due</span>
                            <span className="text-gray-900">KES {invoice.balance_due.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700">Amount (KES) <span className="text-red-500">*</span></label>
                                <button
                                    type="button"
                                    onClick={() => set("amount", String(invoice.balance_due || 0))}
                                    className="text-xs text-brand-blue hover:underline"
                                >
                                    Use full balance
                                </button>
                            </div>
                            <input required type="number" min={0} step="0.01" value={form.amount} placeholder="0.00"
                                onChange={(e) => set("amount", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Date <span className="text-red-500">*</span></label>
                            <input required type="date" value={form.payment_date} onChange={(e) => set("payment_date", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Payment Method</label>
                            <select value={form.payment_method} onChange={(e) => set("payment_method", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent bg-white">
                                {INVOICE_PAYMENT_METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Reference Number</label>
                            <input type="text" value={form.reference_number} onChange={(e) => set("reference_number", e.target.value)}
                                placeholder="Transaction ID, cheque #…"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                        </div>
                    </div>
                    {(() => {
                        const amt = parseFloat(String(form.amount)) || 0;
                        if (amt <= 0) return null;
                        if (amt > invoice.balance_due) {
                            return (
                                <p className="rounded-lg border border-brand-green/30 bg-brand-green/5 px-3 py-2 text-xs text-gray-700">
                                    This is <span className="font-semibold">KES {(amt - invoice.balance_due).toLocaleString()}</span> more than the
                                    balance. The invoice will be marked Paid and the extra kept as credit on the client&apos;s account for their next invoice.
                                </p>
                            );
                        }
                        if (amt < invoice.balance_due) {
                            return (
                                <p className="rounded-lg border border-brand-orange/30 bg-brand-orange/5 px-3 py-2 text-xs text-gray-700">
                                    Part payment: <span className="font-semibold">KES {(invoice.balance_due - amt).toLocaleString()}</span> will still be due.
                                </p>
                            );
                        }
                        return null;
                    })()}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Notes</label>
                        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-none" />
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={saveMutation.isPending}
                            className="flex items-center gap-2 px-5 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">
                            {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Record Payment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function FinancialInvoicesPage(): ReactElement {
    const queryClient = useQueryClient();
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [payingInvoice, setPayingInvoice] = useState<FinancialInvoice | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    function handleSearchChange(value: string) {
        setSearchInput(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setSearch(value), 350);
    }

    const {
        data, isLoading, isError, isFetchingNextPage, hasNextPage, fetchNextPage,
    } = useInfiniteQuery({
        queryKey: ["financial-invoices", search],
        queryFn: ({ pageParam }) => fetchInvoices({ search: search || undefined, page: pageParam }),
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            const loaded = allPages.reduce((sum, p) => sum + p.results.length, 0);
            return loaded < lastPage.count ? allPages.length + 1 : undefined;
        },
    });

    const invoices = useMemo(() => data?.pages.flatMap((p) => p.results) ?? [], [data]);

    const queueMutation = useMutation({
        mutationFn: queueForEtims,
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ["financial-invoices"] });
            if (result.status === "failed") {
                toast.error(result.error_message || "eTIMS submission failed");
            } else {
                toast.success("Queued for eTIMS");
            }
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const voidMutation = useMutation({
        mutationFn: voidInvoice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["financial-invoices"] });
            toast.success("Invoice voided");
        },
        onError: (e: Error) => toast.error(e.message),
    });

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 lg:px-8 py-4 lg:py-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
                        <p className="mt-1 text-sm text-gray-500">Create and track invoices, and submit them to eTIMS</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/admin/financial/etims-settings"
                            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                            <Settings className="w-4 h-4" /> eTIMS Settings
                        </Link>
                        <Link href="/admin/financial/new"
                            className="flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
                            <Plus className="w-4 h-4" /> New Invoice
                        </Link>
                    </div>
                </div>
            </header>

            <div className="p-4 lg:p-8 space-y-4">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Search by invoice # or client…"
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                    />
                </div>

                {isLoading && <div className="text-center py-16 text-gray-400 text-sm">Loading invoices…</div>}
                {isError && <div className="text-center py-16 text-gray-500 text-sm">Failed to load invoices. Please refresh.</div>}

                {!isLoading && !isError && invoices.length === 0 && (
                    <div className="text-center py-20">
                        <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">{search ? "No invoices match your search" : "No invoices yet"}</p>
                        {!search && (
                            <>
                                <p className="text-sm text-gray-400 mt-1">Create your first invoice to get started.</p>
                                <Link href="/admin/financial/new"
                                    className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
                                    <Plus className="w-4 h-4" /> Create first invoice
                                </Link>
                            </>
                        )}
                    </div>
                )}

                {!isLoading && invoices.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
                                    <th className="px-4 py-3 font-medium">Invoice #</th>
                                    <th className="px-4 py-3 font-medium">Client</th>
                                    <th className="px-4 py-3 font-medium">Date</th>
                                    <th className="px-4 py-3 font-medium text-right">Total</th>
                                    <th className="px-4 py-3 font-medium text-right">Balance Due</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium">eTIMS</th>
                                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{inv.invoice_number}</td>
                                        <td className="px-4 py-3 text-gray-900">{inv.client_name}</td>
                                        <td className="px-4 py-3 text-gray-500">{inv.invoice_date}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-900">KES {Number(inv.total).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right text-gray-700">
                                            {inv.status === "void" ? "—" : `KES ${inv.balance_due.toLocaleString()}`}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusPill label={STATUS_LABEL[displayStatus(inv)] ?? inv.status_display} tone={INVOICE_STATUS_TONE[displayStatus(inv)] ?? "neutral"} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusPill label={ETIMS_STATUS_LABEL[inv.etims_status] ?? inv.etims_status} tone={ETIMS_STATUS_TONE[inv.etims_status] ?? "neutral"} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/admin/financial/${inv.id}/edit`} title="Edit invoice"
                                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                                    <Pencil className="w-3 h-3" /> Edit
                                                </Link>
                                                <a href={getInvoicePdfUrl(inv.id)} target="_blank" rel="noopener noreferrer" title="Download PDF"
                                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                                    <Download className="w-3 h-3" /> Download
                                                </a>
                                                {inv.status !== "void" && inv.status !== "paid" && inv.balance_due > 0 && (
                                                    <button type="button" onClick={() => setPayingInvoice(inv)}
                                                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-700 border border-green-200 rounded-lg hover:bg-green-50 transition-colors">
                                                        <Wallet className="w-3 h-3" /> Record Payment
                                                    </button>
                                                )}
                                                {(inv.etims_status === "not_submitted" || inv.etims_status === "failed") && inv.status !== "void" && (
                                                    <button type="button" onClick={() => queueMutation.mutate(inv.id)}
                                                        disabled={queueMutation.isPending}
                                                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-brand-blue border border-brand-blue/30 rounded-lg hover:bg-brand-blue/5 transition-colors disabled:opacity-60">
                                                        <RefreshCw className="w-3 h-3" /> {inv.etims_status === "failed" ? "Retry" : "Queue"}
                                                    </button>
                                                )}
                                                {inv.status !== "void" && (
                                                    <button type="button" onClick={() => voidMutation.mutate(inv.id)}
                                                        disabled={voidMutation.isPending}
                                                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 border border-red-100 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60">
                                                        <Ban className="w-3 h-3" /> Void
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {hasNextPage && (
                    <div className="text-center">
                        <button type="button" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}
                            className="flex items-center gap-2 mx-auto px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60">
                            {isFetchingNextPage && <Loader2 className="w-4 h-4 animate-spin" />}
                            Load More
                        </button>
                    </div>
                )}
            </div>

            {payingInvoice && <RecordPaymentModal invoice={payingInvoice} onClose={() => setPayingInvoice(null)} />}
        </AdminLayout>
    );
}
