"use client";

import { useMemo, useRef, useState, type ReactElement } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import AdminLayout from "@/components/admin/admin-layout";
import SearchableSelect from "@/components/admin/searchable-select";
import { Plus, Trash2, Pencil, Loader2, X, ArrowLeft, Banknote, Search } from "lucide-react";
import {
    fetchVendorPayments,
    fetchVendorPaymentSummary,
    fetchVendorOptions,
    fetchVendorInvoiceOptions,
    createVendorPayment,
    updateVendorPayment,
    deleteVendorPayment,
    VENDOR_PAYMENT_METHOD_OPTIONS,
    type VendorPayment,
    type VendorPaymentPayload,
} from "@/services/vendor-payments";

const EMPTY_FORM: VendorPaymentPayload = {
    vendor: 0,
    vendor_invoice: null,
    payment_date: new Date().toISOString().slice(0, 10),
    amount: "0",
    payment_method: "bank_transfer",
    reference_number: "",
    notes: "",
};

function VendorPaymentModal({ initial, vendorOptions, onSave, onClose, saving }: {
    initial: VendorPaymentPayload | null;
    vendorOptions: { value: number; label: string }[];
    onSave: (payload: VendorPaymentPayload) => void;
    onClose: () => void;
    saving: boolean;
}): ReactElement {
    const [form, setForm] = useState<VendorPaymentPayload>(initial ?? EMPTY_FORM);
    const isEdit = initial !== null;

    const { data: invoices = [] } = useQuery({
        queryKey: ["vendor-invoice-options", form.vendor],
        queryFn: () => fetchVendorInvoiceOptions(form.vendor),
        enabled: form.vendor > 0,
    });
    const invoiceOptions = invoices
        .filter((inv) => inv.status !== 'paid' || inv.id === form.vendor_invoice)
        .map((inv) => ({ value: inv.id, label: `${inv.invoice_number} — KES ${Number(inv.total_amount).toLocaleString()} (${inv.status})` }));

    function set<K extends keyof VendorPaymentPayload>(key: K, value: VendorPaymentPayload[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        onSave(form);
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">{isEdit ? "Edit Vendor Payment" : "Record Vendor Payment"}</h2>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Vendor <span className="text-red-500">*</span></label>
                        <SearchableSelect
                            options={vendorOptions}
                            value={form.vendor || null}
                            onChange={(v) => setForm((prev) => ({ ...prev, vendor: Number(v), vendor_invoice: null }))}
                            placeholder="Select a vendor…"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Vendor Invoice (optional)</label>
                        <SearchableSelect
                            options={invoiceOptions}
                            value={form.vendor_invoice ?? null}
                            onChange={(v) => set("vendor_invoice", Number(v))}
                            placeholder={form.vendor ? "No specific invoice (advance payment)" : "Select a vendor first"}
                            disabled={!form.vendor}
                        />
                        <p className="text-xs text-gray-400">If this payment fully covers the invoice, it&apos;ll be marked paid automatically.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Amount (KES) <span className="text-red-500">*</span></label>
                            <input required type="number" min={0} step="0.01" value={form.amount}
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
                                {VENDOR_PAYMENT_METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Reference Number</label>
                            <input type="text" value={form.reference_number} onChange={(e) => set("reference_number", e.target.value)}
                                placeholder="Transaction ID, cheque #…"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Notes</label>
                        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-none" />
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving || !form.vendor}
                            className="flex items-center gap-2 px-5 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isEdit ? "Save Changes" : "Record Payment"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function VendorPaymentsPage(): ReactElement {
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<VendorPayment | null>(null);
    const [deletingPayment, setDeletingPayment] = useState<VendorPayment | null>(null);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    function handleSearchChange(value: string) {
        setSearchInput(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setSearch(value), 350);
    }

    const {
        data, isLoading, isError, isFetchingNextPage, hasNextPage, fetchNextPage,
    } = useInfiniteQuery({
        queryKey: ["vendor-payments", search],
        queryFn: ({ pageParam }) => fetchVendorPayments({ search: search || undefined, page: pageParam }),
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            const loaded = allPages.reduce((sum, p) => sum + p.results.length, 0);
            return loaded < lastPage.count ? allPages.length + 1 : undefined;
        },
    });
    const payments = useMemo(() => data?.pages.flatMap((p) => p.results) ?? [], [data]);

    const { data: summary } = useQuery({ queryKey: ["vendor-payments-summary"], queryFn: fetchVendorPaymentSummary });
    const { data: vendors = [] } = useQuery({ queryKey: ["vendor-options"], queryFn: fetchVendorOptions });
    const vendorOptions = vendors.map((v) => ({ value: v.id, label: v.name }));

    const createMutation = useMutation({
        mutationFn: createVendorPayment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["vendor-payments"] });
            queryClient.invalidateQueries({ queryKey: ["vendor-payments-summary"] });
            toast.success("Payment recorded");
            setModalOpen(false);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: Partial<VendorPaymentPayload> }) => updateVendorPayment(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["vendor-payments"] });
            queryClient.invalidateQueries({ queryKey: ["vendor-payments-summary"] });
            toast.success("Payment updated");
            setEditingPayment(null);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => deleteVendorPayment(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["vendor-payments"] });
            queryClient.invalidateQueries({ queryKey: ["vendor-payments-summary"] });
            toast.success("Payment removed");
            setDeletingPayment(null);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    function handleSave(payload: VendorPaymentPayload) {
        if (editingPayment) {
            updateMutation.mutate({ id: editingPayment.id, payload });
        } else {
            createMutation.mutate(payload);
        }
    }

    const isSaving = createMutation.isPending || updateMutation.isPending;

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 lg:px-8 py-4 lg:py-6">
                    <div>
                        <Link href="/admin/financial" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-1">
                            <ArrowLeft className="w-3.5 h-3.5" /> Invoices
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">Vendor Payments</h1>
                        <p className="mt-1 text-sm text-gray-500">Track payments made to vendors and suppliers</p>
                    </div>
                    <button type="button" onClick={() => setModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
                        <Plus className="w-4 h-4" /> Record Payment
                    </button>
                </div>
            </header>

            <div className="p-4 lg:p-8 space-y-6">
                {summary && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Total This Month</p>
                            <p className="mt-1 text-2xl font-extrabold text-gray-900">KES {summary.total_this_month.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Payments This Month</p>
                            <p className="mt-1 text-2xl font-extrabold text-gray-900">{summary.count_this_month}</p>
                        </div>
                    </div>
                )}

                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Search by vendor, invoice # or reference…"
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                    />
                </div>

                {isLoading && <div className="text-center py-16 text-gray-400 text-sm">Loading vendor payments…</div>}
                {isError && <div className="text-center py-16 text-gray-500 text-sm">Failed to load vendor payments. Please refresh.</div>}

                {!isLoading && !isError && payments.length === 0 && (
                    <div className="text-center py-20">
                        <Banknote className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">{search ? "No payments match your search" : "No vendor payments recorded yet"}</p>
                        {!search && <p className="text-sm text-gray-400 mt-1">Record a payment to start tracking what you&apos;ve paid vendors.</p>}
                    </div>
                )}

                {!isLoading && payments.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
                                    <th className="px-4 py-3 font-medium">Date</th>
                                    <th className="px-4 py-3 font-medium">Vendor</th>
                                    <th className="px-4 py-3 font-medium">Invoice</th>
                                    <th className="px-4 py-3 font-medium">Method</th>
                                    <th className="px-4 py-3 font-medium">Reference</th>
                                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {payments.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-3 text-gray-500">{p.payment_date}</td>
                                        <td className="px-4 py-3 text-gray-900">{p.vendor_name}</td>
                                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.vendor_invoice_number || "—"}</td>
                                        <td className="px-4 py-3 text-gray-500">{p.payment_method_display}</td>
                                        <td className="px-4 py-3 text-gray-500">{p.reference_number || "—"}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                            KES {Number(p.amount).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button type="button" onClick={() => setEditingPayment(p)}
                                                    className="p-1.5 text-gray-400 hover:text-brand-blue transition-colors">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button type="button" onClick={() => setDeletingPayment(p)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
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

            {(modalOpen || editingPayment) && (
                <VendorPaymentModal
                    initial={editingPayment ? {
                        vendor: editingPayment.vendor,
                        vendor_invoice: editingPayment.vendor_invoice,
                        payment_date: editingPayment.payment_date,
                        amount: editingPayment.amount,
                        payment_method: editingPayment.payment_method,
                        reference_number: editingPayment.reference_number,
                        notes: editingPayment.notes,
                    } : null}
                    vendorOptions={vendorOptions}
                    onSave={handleSave}
                    onClose={() => { setModalOpen(false); setEditingPayment(null); }}
                    saving={isSaving}
                />
            )}

            {deletingPayment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                <Trash2 className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Delete this payment record?</h3>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    KES {Number(deletingPayment.amount).toLocaleString()} to {deletingPayment.vendor_name} — this cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setDeletingPayment(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                                Cancel
                            </button>
                            <button type="button" onClick={() => deleteMutation.mutate(deletingPayment.id)} disabled={deleteMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60">
                                {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
