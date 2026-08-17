"use client";

import { useMemo, useRef, useState, type ReactElement } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import AdminLayout from "@/components/admin/admin-layout";
import SearchableSelect from "@/components/admin/searchable-select";
import { Plus, Trash2, Pencil, Loader2, X, ArrowLeft, Wallet, Search, Paperclip } from "lucide-react";
import {
    fetchExpenses,
    fetchExpenseSummary,
    fetchVendorOptions,
    createExpense,
    updateExpense,
    deleteExpense,
    EXPENSE_CATEGORY_OPTIONS,
    EXPENSE_PAYMENT_METHOD_OPTIONS,
    type Expense,
    type ExpensePayload,
} from "@/services/expenses";

const EMPTY_FORM: ExpensePayload = {
    category: "other",
    description: "",
    amount: "0",
    expense_date: new Date().toISOString().slice(0, 10),
    payment_method: "cash",
    vendor: null,
    notes: "",
};

function ExpenseModal({ initial, vendorOptions, onSave, onClose, saving }: {
    initial: ExpensePayload | null;
    vendorOptions: { value: number; label: string }[];
    onSave: (payload: ExpensePayload) => void;
    onClose: () => void;
    saving: boolean;
}): ReactElement {
    const [form, setForm] = useState<ExpensePayload>(initial ?? EMPTY_FORM);
    const isEdit = initial !== null;

    function set<K extends keyof ExpensePayload>(key: K, value: ExpensePayload[K]) {
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
                    <h2 className="text-lg font-semibold text-gray-900">{isEdit ? "Edit Expense" : "Add Expense"}</h2>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Description <span className="text-red-500">*</span></label>
                        <input required type="text" value={form.description} onChange={(e) => set("description", e.target.value)}
                            placeholder="e.g. Office rent - July"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Category</label>
                            <select value={form.category} onChange={(e) => set("category", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent bg-white">
                                {EXPENSE_CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Amount (KES) <span className="text-red-500">*</span></label>
                            <input required type="number" min={0} step="0.01" value={form.amount}
                                onChange={(e) => set("amount", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Date <span className="text-red-500">*</span></label>
                            <input required type="date" value={form.expense_date} onChange={(e) => set("expense_date", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Payment Method</label>
                            <select value={form.payment_method} onChange={(e) => set("payment_method", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent bg-white">
                                {EXPENSE_PAYMENT_METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Vendor (optional)</label>
                        <SearchableSelect
                            options={vendorOptions}
                            value={form.vendor ?? null}
                            onChange={(v) => set("vendor", Number(v))}
                            placeholder="No vendor"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Notes</label>
                        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Receipt (optional)</label>
                        <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 cursor-pointer hover:border-brand-blue hover:text-brand-blue transition-colors">
                            <Paperclip className="w-4 h-4" />
                            {form.receipt_file ? form.receipt_file.name : (isEdit ? "Replace receipt file…" : "Attach receipt image/PDF…")}
                            <input type="file" accept="image/*,application/pdf" className="hidden"
                                onChange={(e) => set("receipt_file", e.target.files?.[0] ?? null)} />
                        </label>
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isEdit ? "Save Changes" : "Add Expense"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function ExpensesPage(): ReactElement {
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

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
        queryKey: ["expenses", search],
        queryFn: ({ pageParam }) => fetchExpenses({ search: search || undefined, page: pageParam }),
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            const loaded = allPages.reduce((sum, p) => sum + p.results.length, 0);
            return loaded < lastPage.count ? allPages.length + 1 : undefined;
        },
    });
    const expenses = useMemo(() => data?.pages.flatMap((p) => p.results) ?? [], [data]);

    const { data: summary } = useQuery({ queryKey: ["expenses-summary"], queryFn: fetchExpenseSummary });
    const { data: vendors = [] } = useQuery({ queryKey: ["vendor-options"], queryFn: fetchVendorOptions });
    const vendorOptions = vendors.map((v) => ({ value: v.id, label: v.name }));

    const createMutation = useMutation({
        mutationFn: createExpense,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["expenses-summary"] });
            toast.success("Expense added");
            setModalOpen(false);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: Partial<ExpensePayload> }) => updateExpense(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["expenses-summary"] });
            toast.success("Expense updated");
            setEditingExpense(null);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => deleteExpense(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["expenses-summary"] });
            toast.success("Expense removed");
            setDeletingExpense(null);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    function handleSave(payload: ExpensePayload) {
        if (editingExpense) {
            updateMutation.mutate({ id: editingExpense.id, payload });
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
                        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
                        <p className="mt-1 text-sm text-gray-500">Track general business expenses</p>
                    </div>
                    <button type="button" onClick={() => setModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
                        <Plus className="w-4 h-4" /> Add Expense
                    </button>
                </div>
            </header>

            <div className="p-4 lg:p-8 space-y-6">
                {summary && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <p className="text-xs text-gray-400 uppercase tracking-wide">Total This Month</p>
                            <p className="mt-1 text-2xl font-extrabold text-gray-900">
                                KES {summary.total_this_month.toLocaleString()}
                            </p>
                        </div>
                        {summary.by_category.slice(0, 3).map((row) => (
                            <div key={row.category} className="bg-white rounded-xl border border-gray-200 p-5">
                                <p className="text-xs text-gray-400 uppercase tracking-wide">
                                    {EXPENSE_CATEGORY_OPTIONS.find((o) => o.value === row.category)?.label ?? row.category}
                                </p>
                                <p className="mt-1 text-2xl font-extrabold text-gray-900">
                                    KES {row.total.toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Search by description or vendor…"
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                    />
                </div>

                {isLoading && <div className="text-center py-16 text-gray-400 text-sm">Loading expenses…</div>}
                {isError && <div className="text-center py-16 text-gray-500 text-sm">Failed to load expenses. Please refresh.</div>}

                {!isLoading && !isError && expenses.length === 0 && (
                    <div className="text-center py-20">
                        <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">{search ? "No expenses match your search" : "No expenses recorded yet"}</p>
                        {!search && <p className="text-sm text-gray-400 mt-1">Add your first expense to start tracking spend.</p>}
                    </div>
                )}

                {!isLoading && expenses.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
                                    <th className="px-4 py-3 font-medium">Date</th>
                                    <th className="px-4 py-3 font-medium">Description</th>
                                    <th className="px-4 py-3 font-medium">Category</th>
                                    <th className="px-4 py-3 font-medium">Vendor</th>
                                    <th className="px-4 py-3 font-medium">Method</th>
                                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {expenses.map((exp) => (
                                    <tr key={exp.id} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-3 text-gray-500">{exp.expense_date}</td>
                                        <td className="px-4 py-3 text-gray-900">
                                            {exp.description}
                                            {exp.receipt_file && (
                                                <a href={exp.receipt_file} target="_blank" rel="noopener noreferrer" title="View receipt"
                                                    className="ml-1.5 inline-flex align-middle text-gray-400 hover:text-brand-blue transition-colors">
                                                    <Paperclip className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{exp.category_display}</span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">{exp.vendor_name || "—"}</td>
                                        <td className="px-4 py-3 text-gray-500">{exp.payment_method_display}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                            KES {Number(exp.amount).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button type="button" onClick={() => setEditingExpense(exp)}
                                                    className="p-1.5 text-gray-400 hover:text-brand-blue transition-colors">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button type="button" onClick={() => setDeletingExpense(exp)}
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

            {(modalOpen || editingExpense) && (
                <ExpenseModal
                    initial={editingExpense ? {
                        category: editingExpense.category,
                        description: editingExpense.description,
                        amount: editingExpense.amount,
                        expense_date: editingExpense.expense_date,
                        payment_method: editingExpense.payment_method,
                        vendor: editingExpense.vendor,
                        notes: editingExpense.notes,
                    } : null}
                    vendorOptions={vendorOptions}
                    onSave={handleSave}
                    onClose={() => { setModalOpen(false); setEditingExpense(null); }}
                    saving={isSaving}
                />
            )}

            {deletingExpense && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                <Trash2 className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Delete this expense?</h3>
                                <p className="text-sm text-gray-500 mt-0.5">{deletingExpense.description} — this cannot be undone.</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setDeletingExpense(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                                Cancel
                            </button>
                            <button type="button" onClick={() => deleteMutation.mutate(deletingExpense.id)} disabled={deleteMutation.isPending}
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
