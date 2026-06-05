"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/admin-layout";
import QuotesStatsCards from "@/features/quotes/components/QuotesStatsCards";
import MultiProductQuotesTable from "@/features/quotes/components/MultiProductQuotesTable";
import QuoteDetailModal from "@/features/quotes/components/QuoteDetailModal";
import SelectProductionMemberModal from "@/features/quotes/components/SelectProductionMemberModal";
import MarkLostModal from "@/features/quotes/components/MarkLostModal";
import ConfirmModal from "@/features/quotes/components/ConfirmModal";
import ConvertToJobModal from "@/features/quotes/components/ConvertToJobModal";
import type { MultiProductQuote, QuoteStatus } from "@/types/quotes";
import {
    fetchMultiProductQuotes,
    fetchQuoteStats,
    downloadQuotePdf,
    cloneQuote,
    sendQuoteToPT,
    sendQuoteToCustomer,
    markQuoteLost,
    convertQuoteToJob,
    deleteQuote,
    fetchMultiProductQuoteDetail,
} from "@/services/quotes";
import type { LineItemAssignment, SendEmailFields } from "@/services/quotes";

export default function AdminQuotesPage() {
    const router = useRouter();
    const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedQuote, setSelectedQuote] = useState<MultiProductQuote | null>(null);
    const [selectPTModalQuoteId, setSelectPTModalQuoteId] = useState<number | null>(null);
    const [markLostModalQuoteId, setMarkLostModalQuoteId] = useState<number | null>(null);
    const [cloneConfirmQuoteId, setCloneConfirmQuoteId] = useState<number | null>(null);
    const [convertToJobQuote, setConvertToJobQuote] = useState<MultiProductQuote | null>(null);
    const [deleteConfirmQuoteId, setDeleteConfirmQuoteId] = useState<number | null>(null);
    const queryClient = useQueryClient();

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ["quote-stats"],
        queryFn: fetchQuoteStats,
    });

    const { data: quotes = [], isLoading: quotesLoading } = useQuery({
        queryKey: ["multi-product-quotes", statusFilter, searchQuery],
        queryFn: () => fetchMultiProductQuotes(statusFilter, searchQuery),
    });

    const cloneMutation = useMutation({
        mutationFn: cloneQuote,
        onSuccess: () => {
            toast.success("Quote cloned successfully!");
            queryClient.invalidateQueries({ queryKey: ["multi-product-quotes"] });
            queryClient.invalidateQueries({ queryKey: ["quote-stats"] });
            setCloneConfirmQuoteId(null);
        },
        onError: () => toast.error("Failed to clone quote."),
    });

    const sendToPTMutation = useMutation({
        mutationFn: ({ quoteId, assignedTo }: { quoteId: number; assignedTo?: number }) =>
            sendQuoteToPT(quoteId, assignedTo),
        onSuccess: () => {
            toast.success("Quote sent to production team!");
            queryClient.invalidateQueries({ queryKey: ["multi-product-quotes"] });
            queryClient.invalidateQueries({ queryKey: ["quote-stats"] });
            setSelectedQuote(null);
            setSelectPTModalQuoteId(null);
        },
        onError: () => toast.error("Failed to send quote to production team."),
    });

    const sendToCustomerMutation = useMutation({
        mutationFn: ({ quoteId, emailFields }: { quoteId: number; emailFields: SendEmailFields }) =>
            sendQuoteToCustomer(quoteId, emailFields),
        onSuccess: (data) => {
            if (data.email_sent === false) {
                toast.warning("Quote status updated, but email could not be delivered.");
            } else {
                toast.success("Quote sent to customer!");
            }
            queryClient.invalidateQueries({ queryKey: ["multi-product-quotes"] });
            queryClient.invalidateQueries({ queryKey: ["quote-stats"] });
            setSelectedQuote(null);
        },
        onError: () => toast.error("Failed to send quote to customer."),
    });

    const markLostMutation = useMutation({
        mutationFn: ({ quoteId, reason }: { quoteId: number; reason: string }) =>
            markQuoteLost(quoteId, reason),
        onSuccess: () => {
            toast.success("Quote marked as lost.");
            queryClient.invalidateQueries({ queryKey: ["multi-product-quotes"] });
            queryClient.invalidateQueries({ queryKey: ["quote-stats"] });
            setSelectedQuote(null);
            setMarkLostModalQuoteId(null);
        },
        onError: () => toast.error("Failed to mark quote as lost."),
    });

    const convertToJobMutation = useMutation({
        mutationFn: ({ quoteId, ownerUserId, assignments }: { quoteId: number; ownerUserId: number | null; assignments: LineItemAssignment[] }) =>
            convertQuoteToJob(quoteId, ownerUserId, assignments),
        onSuccess: () => {
            toast.success("Quote converted to job!");
            queryClient.invalidateQueries({ queryKey: ["multi-product-quotes"] });
            queryClient.invalidateQueries({ queryKey: ["quote-stats"] });
            setSelectedQuote(null);
            setConvertToJobQuote(null);
        },
        onError: () => toast.error("Failed to convert quote to job."),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteQuote,
        onSuccess: () => {
            toast.success("Quote deleted.");
            queryClient.invalidateQueries({ queryKey: ["multi-product-quotes"] });
            queryClient.invalidateQueries({ queryKey: ["quote-stats"] });
            setDeleteConfirmQuoteId(null);
        },
        onError: () => toast.error("Failed to delete quote."),
    });

    const handleViewDetail = (quote: MultiProductQuote) => setSelectedQuote(quote);

    const handleDownloadPdf = async (quoteId: string) => {
        try {
            const blob = await downloadQuotePdf(quoteId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `quote-${quoteId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch {
            toast.error("Failed to download PDF.");
        }
    };

    const handleClone = (quoteId: number) => setCloneConfirmQuoteId(quoteId);

    const handleEdit = (quoteId: number) => {
        router.push(`/admin/quotes/create?edit=${quoteId}`);
    };

    const handleConfirmClone = () => {
        if (cloneConfirmQuoteId) cloneMutation.mutate(cloneConfirmQuoteId);
    };

    const handleSendToPT = (quoteId: number) => setSelectPTModalQuoteId(quoteId);

    const handleConfirmSendToPT = async (memberId: number) => {
        if (selectPTModalQuoteId) {
            try {
                await sendToPTMutation.mutateAsync({ quoteId: selectPTModalQuoteId, assignedTo: memberId });
            } catch {
                toast.error("Failed to send quote to production team.");
            }
        }
    };

    const handleSendToCustomer = (quoteId: number, emailFields: SendEmailFields) => {
        sendToCustomerMutation.mutate({ quoteId, emailFields });
    };

    const handleMarkLost = (quoteId: number) => setMarkLostModalQuoteId(quoteId);

    const handleConfirmMarkLost = async (reason: string) => {
        if (markLostModalQuoteId) {
            try {
                await markLostMutation.mutateAsync({ quoteId: markLostModalQuoteId, reason });
            } catch {
                toast.error("Failed to mark quote as lost.");
            }
        }
    };

    const handleConvertToJob = async (quoteId: number) => {
        const found = quotes.find((q) => q.id === quoteId);
        if (!found) return;
        try {
            const detail = await fetchMultiProductQuoteDetail(String(found.id));
            setConvertToJobQuote(detail);
        } catch {
            setConvertToJobQuote(found);
        }
    };

    const handleConfirmConvertToJob = async (ownerUserId: number | null, assignments: LineItemAssignment[]) => {
        if (convertToJobQuote) {
            try {
                await convertToJobMutation.mutateAsync({ quoteId: convertToJobQuote.id, ownerUserId, assignments });
            } catch {
                toast.error("Failed to convert quote to job.");
            }
        }
    };

    const handleDelete = (quoteId: number) => setDeleteConfirmQuoteId(quoteId);

    const handleConfirmDelete = async () => {
        if (deleteConfirmQuoteId) {
            await deleteMutation.mutateAsync(deleteConfirmQuoteId);
        }
    };

    return (
        <AdminLayout>
            <div className="bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 lg:py-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Quotes</h1>
                            <p className="text-sm text-gray-600">
                                Manage quotes with multiple products and line items
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => router.push("/admin/quotes/create")}
                            className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            New Quote
                        </button>
                    </div>

                    {statsLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse">
                                    <div className="h-10 bg-gray-200 rounded mb-3"></div>
                                    <div className="h-8 bg-gray-200 rounded mb-2"></div>
                                    <div className="h-4 bg-gray-200 rounded"></div>
                                </div>
                            ))}
                        </div>
                    ) : stats ? (
                        <div className="mb-6">
                            <QuotesStatsCards stats={stats} />
                        </div>
                    ) : null}

                    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                        <div className="flex gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by quote number or client name..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent text-sm"
                                />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as QuoteStatus | "all")}
                                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent text-sm bg-white"
                            >
                                <option value="all">All Status</option>
                                <option value="Draft">Draft</option>
                                <option value="Sent to PT">Sent to PT</option>
                                <option value="Costed">Costed</option>
                                <option value="Sent to Customer">Sent to Customer</option>
                                <option value="Approved">Approved</option>
                                <option value="Lost">Lost</option>
                            </select>
                        </div>
                    </div>

                    <div className="mb-4">
                        <p className="text-sm text-gray-600">
                            Showing {quotes.length} {quotes.length === 1 ? "quote" : "quotes"}
                        </p>
                    </div>

                    {quotesLoading ? (
                        <div className="bg-white rounded-lg border border-gray-200 p-8">
                            <div className="animate-pulse space-y-4">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <MultiProductQuotesTable
                            quotes={quotes}
                            onViewDetail={handleViewDetail}
                            onDownloadPdf={handleDownloadPdf}
                            onClone={handleClone}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    )}
                </div>
            </div>

            <QuoteDetailModal
                quote={selectedQuote}
                onClose={() => setSelectedQuote(null)}
                onSendToPT={handleSendToPT}
                onSendToCustomer={handleSendToCustomer}
                isSendingToCustomer={sendToCustomerMutation.isPending}
                onMarkLost={handleMarkLost}
                onConvertToJob={handleConvertToJob}
                onDownloadPdf={handleDownloadPdf}
                onEdit={handleEdit}
            />

            {selectPTModalQuoteId && (
                <SelectProductionMemberModal
                    quoteId={quotes.find(q => q.id === selectPTModalQuoteId)?.quote_id || String(selectPTModalQuoteId)}
                    onClose={() => setSelectPTModalQuoteId(null)}
                    onConfirm={handleConfirmSendToPT}
                />
            )}

            {markLostModalQuoteId && (
                <MarkLostModal
                    quoteId={quotes.find(q => q.id === markLostModalQuoteId)?.quote_id || String(markLostModalQuoteId)}
                    onClose={() => setMarkLostModalQuoteId(null)}
                    onConfirm={handleConfirmMarkLost}
                />
            )}

            {cloneConfirmQuoteId && (
                <ConfirmModal
                    title="Clone Quote"
                    message="Are you sure you want to clone this quote? This will create a new draft quote with the same items and details."
                    confirmText="Clone Quote"
                    confirmColor="blue"
                    onClose={() => setCloneConfirmQuoteId(null)}
                    onConfirm={handleConfirmClone}
                />
            )}

            {convertToJobQuote && (
                <ConvertToJobModal
                    quote={convertToJobQuote}
                    onClose={() => setConvertToJobQuote(null)}
                    onConfirm={handleConfirmConvertToJob}
                    isLoading={convertToJobMutation.isPending}
                />
            )}

            {deleteConfirmQuoteId && (
                <ConfirmModal
                    title="Delete Quote"
                    message="Are you sure you want to delete this quote? This action cannot be undone."
                    confirmText="Delete Quote"
                    confirmColor="red"
                    onClose={() => setDeleteConfirmQuoteId(null)}
                    onConfirm={handleConfirmDelete}
                />
            )}
        </AdminLayout>
    );
}
