"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircleIcon, X } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/admin-layout";
import QuoteDetailDrawer from "@/features/quotes/components/QuoteDetailDrawer";
import QuotesFilters from "@/features/quotes/components/QuotesFilters";
import QuotesMetrics from "@/features/quotes/components/QuotesMetrics";
import QuotesPagination from "@/features/quotes/components/QuotesPagination";
import QuotesTable from "@/features/quotes/components/QuotesTable";
import CreateQuoteModal from "@/features/quotes/components/CreateQuoteModal";
import {
    approveQuote,
    cloneQuote,
    createMultiProductQuote,
    deleteQuote,
    fetchQuote,
    fetchQuoteHistory,
    fetchQuotes,
    patchQuote,
    sendQuoteToCustomer,
    sendQuoteToPT,
} from "@/services/quotes";
import type { CreateQuoteInput, Quote, QuoteHistoryResponse, QuoteStatus, QuotesQueryParams, QuotesResponse } from "@/types/quotes";

interface QuoteEditState {
    quote_date: string;
    valid_until: string;
    payment_terms: string;
    reference_number: string;
    customer_notes: string;
    custom_terms: string;
}

export default function QuotesPage(): ReactElement {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");
    const [status, setStatus] = useState<"all" | QuoteStatus>("all");
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(20);
    const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
    const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
    const [editState, setEditState] = useState<QuoteEditState | null>(null);

    useEffect((): (() => void) => {
        const timer = setTimeout((): void => {
            setDebouncedSearch(search);
        }, 400);

        return (): void => clearTimeout(timer);
    }, [search]);

    const quoteQueryParams = useMemo(
        (): QuotesQueryParams => ({
            page,
            pageSize,
            search: debouncedSearch,
            status,
        }),
        [page, pageSize, debouncedSearch, status]
    );

    const { data, isLoading, error } = useQuery({
        queryKey: ["quotes", quoteQueryParams],
        queryFn: (): Promise<QuotesResponse> => fetchQuotes(quoteQueryParams),
    });

    const { data: detailData, isLoading: isDetailLoading } = useQuery({
        queryKey: ["quote", selectedQuoteId],
        queryFn: (): Promise<Quote> => fetchQuote(selectedQuoteId as number),
        enabled: selectedQuoteId !== null,
    });

    const { data: historyData } = useQuery({
        queryKey: ["quote-history", selectedQuoteId],
        queryFn: (): Promise<QuoteHistoryResponse> => fetchQuoteHistory(selectedQuoteId as number),
        enabled: selectedQuoteId !== null,
    });

    const createMutation = useMutation({
        mutationFn: (payload: CreateQuoteInput) => createMultiProductQuote(payload),
        onSuccess: (): void => {
            toast.success("Quote created.");
            setIsCreateOpen(false);
            queryClient.invalidateQueries({ queryKey: ["quotes"] });
        },
        onError: (): void => {
            toast.error("Unable to create quote.");
        },
    });

    const editMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: Partial<Quote> }) => patchQuote(id, payload),
        onSuccess: (): void => {
            toast.success("Quote updated.");
            setEditingQuote(null);
            setEditState(null);
            queryClient.invalidateQueries({ queryKey: ["quotes"] });
        },
        onError: (): void => {
            toast.error("Unable to update quote.");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (quoteId: number): Promise<void> => deleteQuote(quoteId),
        onSuccess: (): void => {
            toast.success("Quote deleted.");
            queryClient.invalidateQueries({ queryKey: ["quotes"] });
        },
        onError: (): void => {
            toast.error("Unable to delete quote.");
        },
    });

    const sendToPTMutation = useMutation({
        mutationFn: (quoteId: number): Promise<unknown> => sendQuoteToPT(quoteId),
        onSuccess: (): void => {
            toast.success("Quote sent to PT.");
            queryClient.invalidateQueries({ queryKey: ["quotes"] });
            if (selectedQuoteId !== null) {
                queryClient.invalidateQueries({ queryKey: ["quote", selectedQuoteId] });
                queryClient.invalidateQueries({ queryKey: ["quote-history", selectedQuoteId] });
            }
        },
        onError: (): void => {
            toast.error("Unable to send quote to PT.");
        },
    });

    const sendToCustomerMutation = useMutation({
        mutationFn: (quoteId: number): Promise<unknown> => sendQuoteToCustomer(quoteId),
        onSuccess: (): void => {
            toast.success("Quote sent to customer.");
            queryClient.invalidateQueries({ queryKey: ["quotes"] });
            if (selectedQuoteId !== null) {
                queryClient.invalidateQueries({ queryKey: ["quote", selectedQuoteId] });
                queryClient.invalidateQueries({ queryKey: ["quote-history", selectedQuoteId] });
            }
        },
        onError: (): void => {
            toast.error("Unable to send quote to customer.");
        },
    });

    const approveMutation = useMutation({
        mutationFn: (quoteId: number): Promise<unknown> => approveQuote(quoteId),
        onSuccess: (): void => {
            toast.success("Quote approved.");
            queryClient.invalidateQueries({ queryKey: ["quotes"] });
            if (selectedQuoteId !== null) {
                queryClient.invalidateQueries({ queryKey: ["quote", selectedQuoteId] });
                queryClient.invalidateQueries({ queryKey: ["quote-history", selectedQuoteId] });
            }
        },
        onError: (): void => {
            toast.error("Unable to approve quote.");
        },
    });

    const cloneMutation = useMutation({
        mutationFn: (quoteId: number): Promise<unknown> => cloneQuote(quoteId),
        onSuccess: (): void => {
            toast.success("Quote cloned as revision.");
            queryClient.invalidateQueries({ queryKey: ["quotes"] });
            if (selectedQuoteId !== null) {
                queryClient.invalidateQueries({ queryKey: ["quote", selectedQuoteId] });
                queryClient.invalidateQueries({ queryKey: ["quote-history", selectedQuoteId] });
            }
        },
        onError: (): void => {
            toast.error("Unable to clone quote.");
        },
    });

    const handleResetFilters = (): void => {
        setSearch("");
        setStatus("all");
        setPage(1);
    };

    const handleDelete = (quote: Quote): void => {
        const shouldDelete = window.confirm(`Delete ${quote.quote_id}? This cannot be undone.`);
        if (!shouldDelete) {
            return;
        }

        deleteMutation.mutate(quote.id);
    };

    const handleView = (quote: Quote): void => {
        setSelectedQuoteId(quote.id);
    };

    const handleOpenEdit = (quote: Quote): void => {
        setEditingQuote(quote);
        setEditState({
            quote_date: quote.quote_date?.split("T")[0] ?? "",
            valid_until: quote.valid_until?.split("T")[0] ?? "",
            payment_terms: quote.payment_terms ?? "",
            reference_number: quote.reference_number ?? "",
            customer_notes: quote.customer_notes ?? "",
            custom_terms: quote.custom_terms ?? "",
        });
    };

    const handleEditSubmit = (e: React.FormEvent): void => {
        e.preventDefault();
        if (!editingQuote || !editState) return;
        editMutation.mutate({ id: editingQuote.id, payload: editState });
    };

    const handleSendToPT = (quote: Quote): void => {
        sendToPTMutation.mutate(quote.id);
    };

    const handleSendToCustomer = (quote: Quote): void => {
        sendToCustomerMutation.mutate(quote.id);
    };

    const handleApprove = (quote: Quote): void => {
        approveMutation.mutate(quote.id);
    };

    const handleClone = (quote: Quote): void => {
        cloneMutation.mutate(quote.id);
    };

    const quotes = data?.results ?? [];
    const totalCount = data?.count ?? 0;

    return (
        <AdminLayout>
            <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                        <a href="/staff" className="hover:text-brand-blue">
                            Staff Portal
                        </a>
                        <span>/</span>
                        <span className="text-gray-900">Quotes</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
                            <p className="mt-2 text-sm text-gray-600">
                                Track and manage quote records across draft, costing, and approval stages.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={(): void => setIsCreateOpen(true)}
                            className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90"
                        >
                            + New Quote
                        </button>
                    </div>
                </div>
            </header>
            <main className="bg-gray-50 min-h-screen">
                <div className="px-4 lg:px-8 py-4 lg:py-6 space-y-6">
                    {!isLoading && (error || !data) && (
                        <div className="bg-brand-red/10 border border-brand-red/20 rounded-lg p-6">
                            <div className="flex items-center gap-3">
                                <AlertCircleIcon className="h-6 w-6 text-brand-red" />
                                <div>
                                    <h3 className="font-semibold text-brand-red">Failed to load quotes</h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Unable to fetch quote data. Please try again later.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {!error && (
                        <>
                            <QuotesMetrics quotes={quotes} totalCount={totalCount} />

                            <QuotesFilters
                                search={search}
                                status={status}
                                onSearchChange={(value: string): void => {
                                    setSearch(value);
                                    setPage(1);
                                }}
                                onStatusChange={(value: "all" | QuoteStatus): void => {
                                    setStatus(value);
                                    setPage(1);
                                }}
                                onReset={handleResetFilters}
                            />

                            {isLoading ? (
                                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse">
                                    <div className="h-6 bg-gray-200 rounded w-48"></div>
                                    <div className="h-4 bg-gray-200 rounded w-72 mt-3"></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                        {[1, 2, 3, 4].map((item: number): ReactElement => (
                                            <div key={item} className="h-16 bg-gray-100 rounded"></div>
                                        ))}
                                    </div>
                                </div>
                            ) : quotes.length > 0 ? (
                                <>
                                    <QuotesTable
                                        quotes={quotes}
                                        onView={handleView}
                                        onEdit={handleOpenEdit}
                                        onSendToPT={handleSendToPT}
                                        onSendToCustomer={handleSendToCustomer}
                                        onApprove={handleApprove}
                                        onClone={handleClone}
                                        onDelete={handleDelete}
                                    />
                                    <QuotesPagination
                                        count={totalCount}
                                        page={page}
                                        pageSize={pageSize}
                                        onPageChange={setPage}
                                        onPageSizeChange={(size: number): void => {
                                            setPageSize(size);
                                            setPage(1);
                                        }}
                                    />
                                </>
                            ) : (
                                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                                    <h3 className="text-lg font-semibold text-gray-900">No quotes found</h3>
                                    <p className="text-sm text-gray-600 mt-2">
                                        Try changing the search or status filter.
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <QuoteDetailDrawer
                    quote={detailData ?? null}
                    history={historyData?.history ?? []}
                    isOpen={selectedQuoteId !== null}
                    isLoading={isDetailLoading}
                    onClose={(): void => setSelectedQuoteId(null)}
                />
            </main>

            <CreateQuoteModal
                isOpen={isCreateOpen}
                onClose={(): void => setIsCreateOpen(false)}
                onSubmit={(data: CreateQuoteInput): void => { createMutation.mutate(data); }}
                isSubmitting={createMutation.isPending}
            />

            {editingQuote && editState && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">Edit Quote — {editingQuote.quote_id}</h2>
                            <button type="button" onClick={(): void => { setEditingQuote(null); setEditState(null); }}>
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="px-6 py-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Quote Date</label>
                                    <input type="date" value={editState.quote_date} onChange={(e): void => setEditState(s => s ? { ...s, quote_date: e.target.value } : s)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Valid Until</label>
                                    <input type="date" value={editState.valid_until} onChange={(e): void => setEditState(s => s ? { ...s, valid_until: e.target.value } : s)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Payment Terms</label>
                                    <select value={editState.payment_terms} onChange={(e): void => setEditState(s => s ? { ...s, payment_terms: e.target.value } : s)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                                        <option value="Prepaid">Prepaid</option>
                                        <option value="Net 7">Net 7</option>
                                        <option value="Net 15">Net 15</option>
                                        <option value="Net 30">Net 30</option>
                                        <option value="Net 60">Net 60</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Reference Number</label>
                                    <input type="text" value={editState.reference_number} onChange={(e): void => setEditState(s => s ? { ...s, reference_number: e.target.value } : s)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Customer Notes</label>
                                <textarea rows={2} value={editState.customer_notes} onChange={(e): void => setEditState(s => s ? { ...s, customer_notes: e.target.value } : s)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Custom Terms</label>
                                <textarea rows={2} value={editState.custom_terms} onChange={(e): void => setEditState(s => s ? { ...s, custom_terms: e.target.value } : s)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={(): void => { setEditingQuote(null); setEditState(null); }} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={editMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-brand-blue rounded-md hover:bg-brand-blue/90 disabled:opacity-50">
                                    {editMutation.isPending ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
