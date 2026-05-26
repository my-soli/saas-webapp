"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircleIcon, X, BookOpen, ExternalLink, RefreshCw, Plus, Search, Filter, CreditCard, TrendingUp, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/admin-layout";
import { createPayment, deletePayment, fetchPayments, updatePayment } from "@/services/payments";
import {
    Payment,
    PaymentMethod,
    PaymentStatus,
} from "@/types/payments";

type PaymentsTab = "payments" | "zoho-invoices";

const METHOD_LABELS: Record<PaymentMethod, string> = {
    cash: "Cash",
    mpesa: "M-Pesa",
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
    credit_card: "Credit Card",
};

const STATUS_STYLES: Record<PaymentStatus, string> = {
    completed: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    failed: "bg-red-100 text-red-700",
    refunded: "bg-gray-100 text-gray-600",
};

function formatKES(amount: number) {
    return `KES ${Number(amount).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

interface PaymentFormState {
    lpo: string;
    amount: string;
    payment_method: PaymentMethod;
    status: PaymentStatus;
    payment_date: string;
    reference_number: string;
    notes: string;
}

const emptyForm: PaymentFormState = {
    lpo: "",
    amount: "",
    payment_method: "mpesa",
    status: "pending",
    payment_date: new Date().toISOString().split("T")[0],
    reference_number: "",
    notes: "",
};

export default function PaymentsPage() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<PaymentsTab>("payments");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [status, setStatus] = useState<PaymentStatus | "all">("all");
    const [method, setMethod] = useState<PaymentMethod | "all">("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
    const [formState, setFormState] = useState<PaymentFormState>(emptyForm);
    const [editingId, setEditingId] = useState<number | null>(null);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(t);
    }, [search]);

    const queryParams = useMemo(() => ({
        page, pageSize, search: debouncedSearch, status, method, dateFrom, dateTo, ordering: "-payment_date",
    }), [page, pageSize, debouncedSearch, status, method, dateFrom, dateTo]);

    const { data, isLoading, error } = useQuery({
        queryKey: ["payments", queryParams],
        queryFn: () => fetchPayments(queryParams),
    });

    const createMutation = useMutation({
        mutationFn: (payload: Partial<Payment>) => createPayment(payload),
        onSuccess: () => { toast.success("Payment recorded."); setFormMode(null); queryClient.invalidateQueries({ queryKey: ["payments"] }); },
        onError: () => toast.error("Unable to record payment."),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: Partial<Payment> }) => updatePayment(id, payload),
        onSuccess: () => { toast.success("Payment updated."); setFormMode(null); queryClient.invalidateQueries({ queryKey: ["payments"] }); },
        onError: () => toast.error("Unable to update payment."),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => deletePayment(id),
        onSuccess: () => { toast.success("Payment deleted."); queryClient.invalidateQueries({ queryKey: ["payments"] }); },
        onError: () => toast.error("Unable to delete payment."),
    });

    const summary = data?.summary;
    const payments = data?.results ?? [];
    const totalCount = data?.count ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    const openCreate = () => { setFormState(emptyForm); setEditingId(null); setFormMode("create"); };
    const openEdit = (p: Payment) => {
        setFormState({ lpo: String(p.lpo ?? ""), amount: String(p.amount), payment_method: p.payment_method, status: p.status, payment_date: p.payment_date?.split("T")[0] ?? "", reference_number: p.reference_number ?? "", notes: p.notes ?? "" });
        setEditingId(p.id);
        setFormMode("edit");
    };
    const handleDelete = (p: Payment) => {
        if (!window.confirm(`Delete payment ${p.reference_number || p.id}? This cannot be undone.`)) return;
        deleteMutation.mutate(p.id);
    };
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: Partial<Payment> = {
            lpo: Number(formState.lpo) || undefined,
            amount: Number(formState.amount),
            payment_method: formState.payment_method,
            status: formState.status,
            payment_date: formState.payment_date,
            reference_number: formState.reference_number,
            notes: formState.notes || undefined,
        } as Partial<Payment>;
        if (formMode === "edit" && editingId !== null) updateMutation.mutate({ id: editingId, payload });
        else createMutation.mutate(payload);
    };

    return (
        <AdminLayout>
            {/* Header */}
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
                            <p className="mt-1 text-sm text-gray-500">Track internal payments and Zoho Books invoices</p>
                        </div>
                        {activeTab === "payments" && (
                            <button
                                type="button"
                                onClick={openCreate}
                                className="flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Record Payment
                            </button>
                        )}
                    </div>
                    {/* Tab nav */}
                    <div className="flex gap-1">
                        {(["payments", "zoho-invoices"] as PaymentsTab[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                                    activeTab === tab
                                        ? "border-brand-blue text-brand-blue bg-blue-50/50"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                }`}
                            >
                                {tab === "payments" ? "Internal Payments" : "Zoho Invoices"}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="bg-gray-50 min-h-screen">
                <div className="px-4 lg:px-8 py-6 space-y-6">

                    {/* ── ZOHO TAB ── */}
                    {activeTab === "zoho-invoices" && <ZohoInvoicesPanel />}

                    {/* ── INTERNAL PAYMENTS TAB ── */}
                    {activeTab === "payments" && (
                        <>
                            {/* Summary cards */}
                            {summary && (
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                                <TrendingUp className="w-4 h-4 text-green-600" />
                                            </div>
                                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Collected</span>
                                        </div>
                                        <p className="text-xl font-bold text-gray-900">{formatKES(summary.completed_amount)}</p>
                                        <p className="text-xs text-gray-400 mt-1">{summary.completed_count} completed</p>
                                    </div>
                                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                                                <Clock className="w-4 h-4 text-yellow-600" />
                                            </div>
                                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending</span>
                                        </div>
                                        <p className="text-xl font-bold text-gray-900">{formatKES(summary.pending_amount)}</p>
                                        <p className="text-xs text-gray-400 mt-1">{summary.pending_count} pending</p>
                                    </div>
                                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                <CreditCard className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</span>
                                        </div>
                                        <p className="text-xl font-bold text-gray-900">{formatKES(summary.total_amount)}</p>
                                        <p className="text-xs text-gray-400 mt-1">{summary.total_count} records</p>
                                    </div>
                                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                                                <AlertCircle className="w-4 h-4 text-red-500" />
                                            </div>
                                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Failed / Refunded</span>
                                        </div>
                                        <p className="text-xl font-bold text-gray-900">{summary.failed_count + summary.refunded_count}</p>
                                        <p className="text-xs text-gray-400 mt-1">{summary.failed_count} failed, {summary.refunded_count} refunded</p>
                                    </div>
                                </div>
                            )}

                            {/* Filters */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                                <div className="flex flex-wrap gap-3 items-center">
                                    <div className="flex-1 min-w-[200px] relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                                            placeholder="Search by reference, client, LPO..."
                                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Filter className="w-4 h-4 text-gray-400" />
                                        <select value={status} onChange={e => { setStatus(e.target.value as PaymentStatus | "all"); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue">
                                            <option value="all">All Status</option>
                                            <option value="completed">Completed</option>
                                            <option value="pending">Pending</option>
                                            <option value="failed">Failed</option>
                                            <option value="refunded">Refunded</option>
                                        </select>
                                        <select value={method} onChange={e => { setMethod(e.target.value as PaymentMethod | "all"); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue">
                                            <option value="all">All Methods</option>
                                            <option value="mpesa">M-Pesa</option>
                                            <option value="cash">Cash</option>
                                            <option value="bank_transfer">Bank Transfer</option>
                                            <option value="cheque">Cheque</option>
                                            <option value="credit_card">Credit Card</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
                                        <span className="text-gray-400 text-sm">–</span>
                                        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
                                    </div>
                                    {(search || status !== "all" || method !== "all" || dateFrom || dateTo) && (
                                        <button onClick={() => { setSearch(""); setDebouncedSearch(""); setStatus("all"); setMethod("all"); setDateFrom(""); setDateTo(""); setPage(1); }} className="text-sm text-gray-500 hover:text-gray-700 underline">
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Error */}
                            {!isLoading && error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                                    <AlertCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
                                    <p className="text-sm text-red-700">Failed to load payments. Please try again.</p>
                                </div>
                            )}

                            {/* Loading */}
                            {isLoading && (
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 animate-pulse space-y-3">
                                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-gray-100 rounded" />)}
                                </div>
                            )}

                            {/* Table */}
                            {!isLoading && !error && (
                                <>
                                    <div className="text-sm text-gray-500 -mb-2">
                                        {totalCount} {totalCount === 1 ? "payment" : "payments"}
                                    </div>
                                    {payments.length === 0 ? (
                                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                                            <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                            <p className="text-gray-500 font-medium">No payments found</p>
                                            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or record a new payment.</p>
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="w-full">
                                                    <thead className="bg-gray-50 border-b border-gray-200">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Client</th>
                                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reference</th>
                                                            <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">LPO</th>
                                                            <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Method</th>
                                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {payments.map(payment => (
                                                            <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                                                                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(payment.payment_date)}</td>
                                                                <td className="px-4 py-3">
                                                                    <p className="text-sm font-medium text-gray-900">{payment.client_name || "—"}</p>
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-gray-700 font-mono">{payment.reference_number || "—"}</td>
                                                                <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-500">{payment.lpo_number || "—"}</td>
                                                                <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-500">{METHOD_LABELS[payment.payment_method]}</td>
                                                                <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">{formatKES(payment.amount)}</td>
                                                                <td className="px-4 py-3">
                                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[payment.status]}`}>
                                                                        {payment.status}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        <button onClick={() => setSelectedPayment(payment)} className="text-xs text-brand-blue hover:underline">View</button>
                                                                        <button onClick={() => openEdit(payment)} className="text-xs text-gray-500 hover:text-gray-700 hover:underline">Edit</button>
                                                                        <button onClick={() => handleDelete(payment)} className="text-xs text-red-500 hover:text-red-700 hover:underline">Delete</button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Pagination */}
                                            {totalPages > 1 && (
                                                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                                                    <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">Previous</button>
                                                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* Payment detail slide-out */}
            {selectedPayment && (
                <div className="fixed inset-0 z-40 flex">
                    <div className="flex-1 bg-black/30" onClick={() => setSelectedPayment(null)} />
                    <div className="w-full max-w-md bg-white shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h3 className="text-base font-semibold text-gray-900">Payment Detail</h3>
                            <button onClick={() => setSelectedPayment(null)}>
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                            <div className="flex items-center justify-between">
                                <span className="text-2xl font-bold text-gray-900">{formatKES(selectedPayment.amount)}</span>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[selectedPayment.status]}`}>
                                    {selectedPayment.status}
                                </span>
                            </div>
                            {[
                                { label: "Client", value: selectedPayment.client_name || "—" },
                                { label: "Reference", value: selectedPayment.reference_number || "—" },
                                { label: "LPO", value: selectedPayment.lpo_number || "—" },
                                { label: "Method", value: METHOD_LABELS[selectedPayment.payment_method] },
                                { label: "Date", value: formatDate(selectedPayment.payment_date) },
                                ...(selectedPayment.notes ? [{ label: "Notes", value: selectedPayment.notes }] : []),
                            ].map(row => (
                                <div key={row.label} className="flex justify-between py-2 border-b border-gray-100">
                                    <span className="text-sm text-gray-500">{row.label}</span>
                                    <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">{row.value}</span>
                                </div>
                            ))}
                        </div>
                        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
                            <button onClick={() => { openEdit(selectedPayment); setSelectedPayment(null); }} className="flex-1 py-2 text-sm font-medium text-brand-blue border border-brand-blue rounded-lg hover:bg-blue-50">Edit</button>
                            <button onClick={() => setSelectedPayment(null)} className="flex-1 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create / Edit modal */}
            {formMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">{formMode === "create" ? "Record Payment" : "Edit Payment"}</h2>
                            <button onClick={() => setFormMode(null)}><X className="w-5 h-5 text-gray-500" /></button>
                        </div>
                        <form onSubmit={handleFormSubmit} className="px-6 py-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Amount (KES) *</label>
                                    <input type="number" required value={formState.amount} onChange={e => setFormState(s => ({ ...s, amount: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Payment Date *</label>
                                    <input type="date" required value={formState.payment_date} onChange={e => setFormState(s => ({ ...s, payment_date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method *</label>
                                    <select required value={formState.payment_method} onChange={e => setFormState(s => ({ ...s, payment_method: e.target.value as PaymentMethod }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
                                        <option value="mpesa">M-Pesa</option>
                                        <option value="cash">Cash</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="cheque">Cheque</option>
                                        <option value="credit_card">Credit Card</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Status *</label>
                                    <select required value={formState.status} onChange={e => setFormState(s => ({ ...s, status: e.target.value as PaymentStatus }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue">
                                        <option value="pending">Pending</option>
                                        <option value="completed">Completed</option>
                                        <option value="failed">Failed</option>
                                        <option value="refunded">Refunded</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Reference Number</label>
                                    <input type="text" value={formState.reference_number} onChange={e => setFormState(s => ({ ...s, reference_number: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" placeholder="e.g. MPESA ref" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">LPO Number</label>
                                    <input type="number" value={formState.lpo} onChange={e => setFormState(s => ({ ...s, lpo: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" placeholder="LPO ID" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                                <textarea rows={2} value={formState.notes} onChange={e => setFormState(s => ({ ...s, notes: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" placeholder="Optional notes..." />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setFormMode(null)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 disabled:opacity-50">
                                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : formMode === "create" ? "Record Payment" : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

/* ─── Zoho Invoices Panel ──────────────────────────────────────────────────── */

interface ZohoInvoice {
    invoice_id: string;
    invoice_number: string;
    customer_name: string;
    status: string;
    date: string;
    due_date: string;
    total: number;
    balance: number;
    currency_code: string;
}

const ZOHO_STATUS_STYLES: Record<string, string> = {
    paid: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
    sent: "bg-blue-100 text-blue-700",
    draft: "bg-gray-100 text-gray-500",
    void: "bg-gray-100 text-gray-400",
};

function ZohoInvoicesPanel() {
    const { data, isLoading, error, refetch, isFetching } = useQuery<{ invoices: ZohoInvoice[] }>({
        queryKey: ["zoho-invoices"],
        queryFn: async () => {
            const res = await fetch("/api/proxy/api/v1/zoho-invoices/", { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch Zoho invoices");
            return res.json();
        },
        retry: false,
    });

    if (error) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-base font-semibold text-gray-700 mb-2">Zoho Books not connected</h3>
                <p className="text-sm text-gray-500 mb-2 max-w-md mx-auto">
                    To view Zoho invoices, configure ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, and ZOHO_ORGANIZATION_ID in the server environment.
                </p>
                <p className="text-xs text-gray-400 mb-6">Once connected, invoices synced by your Account Managers will appear here automatically.</p>
                <a href="https://books.zoho.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-brand-blue hover:underline">
                    Open Zoho Books <ExternalLink className="w-3.5 h-3.5" />
                </a>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 animate-pulse space-y-3">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-gray-100 rounded" />)}
            </div>
        );
    }

    const invoices = data?.invoices ?? [];

    const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const totalBalance = invoices.reduce((sum, inv) => sum + Number(inv.balance), 0);
    const paidCount = invoices.filter(inv => inv.status === "paid").length;
    const overdueCount = invoices.filter(inv => inv.status === "overdue").length;

    return (
        <div className="space-y-6">
            {invoices.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Total Invoiced</p>
                        <p className="text-xl font-bold text-gray-900">KES {totalInvoiced.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs text-gray-400 mt-1">{invoices.length} invoices</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Outstanding</p>
                        <p className="text-xl font-bold text-gray-900">KES {totalBalance.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs text-gray-400 mt-1">Balance due</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Paid</p>
                        <p className="text-xl font-bold text-green-600">{paidCount}</p>
                        <p className="text-xs text-gray-400 mt-1">Fully paid</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Overdue</p>
                        <p className="text-xl font-bold text-red-600">{overdueCount}</p>
                        <p className="text-xs text-gray-400 mt-1">Past due date</p>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""} from Zoho Books</p>
                <button onClick={() => refetch()} disabled={isFetching} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 transition-colors bg-white shadow-sm">
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {invoices.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                    <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No invoices yet</p>
                    <p className="text-sm text-gray-400 mt-1">Sync a job to Zoho Books from the Control Tower to create invoices.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                                    <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Issue Date</th>
                                    <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Due Date</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Balance</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {invoices.map(inv => (
                                    <tr key={inv.invoice_id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900 font-mono">{inv.invoice_number}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{inv.customer_name}</td>
                                        <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-500">{inv.date}</td>
                                        <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-500">{inv.due_date}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
                                            {inv.currency_code} {Number(inv.total).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right whitespace-nowrap" style={{ color: Number(inv.balance) > 0 ? "#dc2626" : "#16a34a" }}>
                                            {inv.currency_code} {Number(inv.balance).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ZOHO_STATUS_STYLES[inv.status] || "bg-gray-100 text-gray-600"}`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
