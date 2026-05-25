"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircleIcon, X } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/admin-layout";
import { createPayment, deletePayment, fetchPayments, updatePayment } from "@/services/payments";
import {
    Payment,
    PaymentMethod,
    PaymentStatus,
    PaymentsSummary,
} from "@/types/payments";
import PaymentsSummaryStrip from "@/features/payments/components/PaymentsSummaryStrip";
import PaymentsFilters from "@/features/payments/components/PaymentsFilters";
import PaymentsTable from "@/features/payments/components/PaymentsTable";
import PaymentsPagination from "@/features/payments/components/PaymentsPagination";
import PaymentsSkeleton from "@/features/payments/components/PaymentsSkeleton";
import PaymentsEmptyState from "@/features/payments/components/PaymentsEmptyState";
import PaymentDetailsPanel from "@/features/payments/components/PaymentDetailsPanel";

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
    const [search, setSearch] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");
    const [status, setStatus] = useState<PaymentStatus | "all">("all");
    const [method, setMethod] = useState<PaymentMethod | "all">("all");
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(20);
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
    const [formState, setFormState] = useState<PaymentFormState>(emptyForm);
    const [editingId, setEditingId] = useState<number | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 3000);

        return () => clearTimeout(timer);
    }, [search]);

    const queryParams = useMemo(
        () => ({
            page,
            pageSize,
            search: debouncedSearch,
            status,
            method,
            dateFrom,
            dateTo,
            ordering: "-payment_date",
        }),
        [page, pageSize, debouncedSearch, status, method, dateFrom, dateTo]
    );

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

    const { data, isLoading, error } = useQuery({
        queryKey: ["payments", queryParams],
        queryFn: () => fetchPayments(queryParams),
    });

    const summaryFallback: PaymentsSummary = {
        total_amount: 0,
        completed_amount: 0,
        pending_amount: 0,
        total_count: 0,
        completed_count: 0,
        pending_count: 0,
        failed_count: 0,
        refunded_count: 0,
    };

    const summary = data?.summary ?? summaryFallback;
    const payments = data?.results ?? [];
    const totalCount = data?.count ?? 0;

    const handleSearchChange = (value: string) => {
        setSearch(value);
        setPage(1);
    };

    const handleStatusChange = (value: PaymentStatus | "all") => {
        setStatus(value);
        setPage(1);
    };

    const handleMethodChange = (value: PaymentMethod | "all") => {
        setMethod(value);
        setPage(1);
    };

    const handleDateFromChange = (value: string) => {
        setDateFrom(value);
        setPage(1);
    };

    const handleDateToChange = (value: string) => {
        setDateTo(value);
        setPage(1);
    };

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
        const payload: Partial<Payment> = { lpo: Number(formState.lpo) || undefined, amount: Number(formState.amount), payment_method: formState.payment_method, status: formState.status, payment_date: formState.payment_date, reference_number: formState.reference_number, notes: formState.notes || undefined } as Partial<Payment>;
        if (formMode === "edit" && editingId !== null) updateMutation.mutate({ id: editingId, payload });
        else createMutation.mutate(payload);
    };

    const handleResetFilters = () => {
        setSearch("");
        setStatus("all");
        setMethod("all");
        setDateFrom("");
        setDateTo("");
        setPage(1);
    };

    const handlePageChange = (nextPage: number) => {
        setPage(nextPage);
    };

    const handlePageSizeChange = (size: number) => {
        setPageSize(size);
        setPage(1);
    };

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                        <a href="/staff" className="hover:text-brand-blue">
                            Staff Portal
                        </a>
                        <span>/</span>
                        <span className="text-gray-900">Payments</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
                            <p className="mt-2 text-sm text-gray-600">Track incoming payments, status, and payment methods</p>
                        </div>
                        <button type="button" onClick={openCreate} className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90">+ Record Payment</button>
                    </div>
                </div>
            </header>
            <main className="bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 lg:py-6 space-y-6">
                    {isLoading && <PaymentsSkeleton />}

                    {!isLoading && (error || !data) && (
                        <div className="bg-brand-red/10 border border-brand-red/20 rounded-lg p-6">
                            <div className="flex items-center gap-3">
                                <AlertCircleIcon className="h-6 w-6 text-brand-red" />
                                <div>
                                    <h3 className="font-semibold text-brand-red">Failed to load payments</h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Unable to fetch payment data. Please try again later.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {!isLoading && data && (
                        <>
                            <PaymentsSummaryStrip summary={summary} />

                            <PaymentsFilters
                                search={search}
                                status={status}
                                method={method}
                                dateFrom={dateFrom}
                                dateTo={dateTo}
                                onSearchChange={handleSearchChange}
                                onStatusChange={handleStatusChange}
                                onMethodChange={handleMethodChange}
                                onDateFromChange={handleDateFromChange}
                                onDateToChange={handleDateToChange}
                                onReset={handleResetFilters}
                            />

                            {payments.length > 0 ? (
                                <>
                                    <PaymentsTable
                                        payments={payments}
                                        onView={(payment) => setSelectedPayment(payment)}
                                        onEdit={openEdit}
                                        onDelete={handleDelete}
                                    />
                                    <PaymentsPagination
                                        count={totalCount}
                                        page={page}
                                        pageSize={pageSize}
                                        onPageChange={handlePageChange}
                                        onPageSizeChange={handlePageSizeChange}
                                    />
                                </>
                            ) : (
                                <PaymentsEmptyState
                                    title="No payments found"
                                    description="Try adjusting your filters or date range."
                                />
                            )}
                        </>
                    )}
                </div>
            </main>
            <PaymentDetailsPanel
                payment={selectedPayment}
                onClose={() => setSelectedPayment(null)}
            />

            {formMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">{formMode === "create" ? "Record Payment" : "Edit Payment"}</h2>
                            <button type="button" onClick={() => setFormMode(null)}><X className="w-5 h-5 text-gray-500" /></button>
                        </div>
                        <form onSubmit={handleFormSubmit} className="px-6 py-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">LPO ID</label>
                                    <input type="number" value={formState.lpo} onChange={e => setFormState(s => ({ ...s, lpo: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="LPO number" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Amount (KES) *</label>
                                    <input type="number" required value={formState.amount} onChange={e => setFormState(s => ({ ...s, amount: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method *</label>
                                    <select required value={formState.payment_method} onChange={e => setFormState(s => ({ ...s, payment_method: e.target.value as PaymentMethod }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                                        <option value="mpesa">M-Pesa</option>
                                        <option value="cash">Cash</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="cheque">Cheque</option>
                                        <option value="credit_card">Credit Card</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Status *</label>
                                    <select required value={formState.status} onChange={e => setFormState(s => ({ ...s, status: e.target.value as PaymentStatus }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                                        <option value="pending">Pending</option>
                                        <option value="completed">Completed</option>
                                        <option value="failed">Failed</option>
                                        <option value="refunded">Refunded</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Payment Date *</label>
                                    <input type="date" required value={formState.payment_date} onChange={e => setFormState(s => ({ ...s, payment_date: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Reference Number</label>
                                    <input type="text" value={formState.reference_number} onChange={e => setFormState(s => ({ ...s, reference_number: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                                <textarea rows={2} value={formState.notes} onChange={e => setFormState(s => ({ ...s, notes: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setFormMode(null)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-brand-blue rounded-md hover:bg-brand-blue/90 disabled:opacity-50">
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
