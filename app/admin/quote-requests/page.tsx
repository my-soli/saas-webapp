"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    Archive, ChevronDown, ChevronUp, FilePlus2, Inbox, Loader2, Mail, Paperclip, Phone, RotateCcw, Search, CheckCircle2,
} from "lucide-react";
import AdminLayout from "@/components/admin/admin-layout";
import {
    createLeadFromQuoteRequest,
    fetchQuoteRequests,
    updateQuoteRequestStatus,
} from "@/services/quote-requests-admin";
import type { QuoteRequest, QuoteRequestFilter, QuoteRequestStatus } from "@/services/quote-requests-admin";

const FILTERS: Array<{ value: QuoteRequestFilter; label: string }> = [
    { value: "open", label: "Open" },
    { value: "converted_to_quote", label: "Quoted" },
    { value: "archived", label: "Archived" },
    { value: "all", label: "All" },
];

const STATUS_BADGE: Record<QuoteRequestStatus, { label: string; cls: string }> = {
    draft_unsaved: { label: "New", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    shared_with_am: { label: "In progress", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    converted_to_quote: { label: "Quoted", cls: "bg-green-50 text-green-700 border-green-200" },
    archived: { label: "Archived", cls: "bg-gray-100 text-gray-600 border-gray-200" },
};

const fmtDate = (iso: string): string =>
    new Date(iso).toLocaleString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const whatsappLink = (phone: string): string => {
    let digits = phone.replace(/\D/g, "");
    if (digits.startsWith("0")) digits = `254${digits.slice(1)}`;
    return `https://wa.me/${digits}`;
};

export default function AdminQuoteRequestsPage(): ReactElement {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState<QuoteRequestFilter>("open");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [expanded, setExpanded] = useState<number | null>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ["admin-quote-requests", filter, search, page],
        queryFn: () => fetchQuoteRequests({ status: filter, search, page }),
    });
    const requests = data?.results ?? [];
    const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / 25));

    const refresh = (): void => {
        void queryClient.invalidateQueries({ queryKey: ["admin-quote-requests"] });
    };

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: QuoteRequestStatus }) => updateQuoteRequestStatus(id, status),
        onSuccess: (_d, v) => {
            toast.success(v.status === "archived" ? "Request archived." : v.status === "converted_to_quote" ? "Marked as quoted." : "Request reopened.");
            refresh();
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const createQuoteMutation = useMutation({
        mutationFn: (req: QuoteRequest) => createLeadFromQuoteRequest(req.id),
        onSuccess: (res, req) => {
            toast.success(res.created ? `Lead ${res.lead_code} created for ${res.lead_name}.` : `Using existing lead ${res.lead_code}.`);
            refresh();
            router.push(`/admin/quotes/create?lead=${res.lead_id}&ref=${encodeURIComponent(req.estimate_id)}`);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    return (
        <AdminLayout>
            <div className="bg-gray-50 min-h-screen">
                <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 lg:py-6">
                    <div className="mb-6">
                        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Quote Requests</h1>
                        <p className="text-sm text-gray-600">
                            Requests customers submit from the online store. Turn each one into a quote, or archive it.
                        </p>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Search by reference, name, email, phone or company..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent text-sm"
                            />
                        </div>
                        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                            {FILTERS.map((f) => (
                                <button
                                    key={f.value}
                                    type="button"
                                    onClick={() => { setFilter(f.value); setPage(1); setExpanded(null); }}
                                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${filter === f.value ? "bg-white text-gray-900 shadow-sm font-medium" : "text-gray-600 hover:text-gray-900"}`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                    ) : error ? (
                        <div className="bg-white rounded-lg border border-red-200 p-6 text-sm text-red-700">{(error as Error).message}</div>
                    ) : requests.length === 0 ? (
                        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                            <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-600">No quote requests here.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {requests.map((req) => {
                                const open = expanded === req.id;
                                const badge = STATUS_BADGE[req.status] ?? STATUS_BADGE.draft_unsaved;
                                const items = Array.isArray(req.line_items) ? req.line_items : [];
                                const busy = (statusMutation.isPending && statusMutation.variables?.id === req.id)
                                    || (createQuoteMutation.isPending && createQuoteMutation.variables?.id === req.id);
                                return (
                                    <div key={req.id} className="bg-white rounded-lg border border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => setExpanded(open ? null : req.id)}
                                            className="w-full flex items-center gap-4 p-4 text-left"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-semibold text-gray-900">{req.customer_name}</span>
                                                    {req.customer_company && <span className="text-sm text-gray-500">· {req.customer_company}</span>}
                                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.label}</span>
                                                </div>
                                                <p className="text-sm text-gray-600 truncate mt-0.5">
                                                    {items.map((i) => `${i.product_name ?? "Item"} × ${i.quantity ?? 1}`).join(", ") || "No items"}
                                                </p>
                                            </div>
                                            <div className="hidden sm:flex flex-col items-end text-xs text-gray-500 shrink-0">
                                                <span className="font-medium text-gray-700">{req.estimate_id}</span>
                                                <span>{fmtDate(req.created_at)}</span>
                                            </div>
                                            {req.attachments.length > 0 && <Paperclip className="w-4 h-4 text-gray-400 shrink-0" aria-label="Has attachments" />}
                                            {open ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                                        </button>

                                        {open && (
                                            <div className="border-t border-gray-100 p-4 space-y-4">
                                                <p className="sm:hidden text-xs text-gray-500">{req.estimate_id} · {fmtDate(req.created_at)}</p>

                                                <div className="flex flex-wrap gap-2 text-sm">
                                                    {req.customer_email && (
                                                        <a href={`mailto:${req.customer_email}?subject=${encodeURIComponent(`Your quote request ${req.estimate_id}`)}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                                                            <Mail className="w-4 h-4" />{req.customer_email}
                                                        </a>
                                                    )}
                                                    {req.customer_phone && (
                                                        <>
                                                            <a href={`tel:${req.customer_phone}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                                                                <Phone className="w-4 h-4" />{req.customer_phone}
                                                            </a>
                                                            <a href={whatsappLink(req.customer_phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                                                                WhatsApp
                                                            </a>
                                                        </>
                                                    )}
                                                </div>

                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-100">
                                                                <th className="py-2 pr-4 font-medium">Product</th>
                                                                <th className="py-2 pr-4 font-medium w-20">Qty</th>
                                                                <th className="py-2 font-medium">Details / notes</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {items.map((item, idx) => (
                                                                <tr key={idx} className="border-b border-gray-50 align-top">
                                                                    <td className="py-2 pr-4 text-gray-900">
                                                                        {item.product_id ? (
                                                                            <a href={`/store/${item.product_id}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{item.product_name}</a>
                                                                        ) : item.product_name}
                                                                    </td>
                                                                    <td className="py-2 pr-4 text-gray-900">{item.quantity ?? 1}</td>
                                                                    <td className="py-2 text-gray-600 whitespace-pre-line">{item.notes || "—"}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {req.special_notes && (
                                                    <div>
                                                        <p className="text-xs font-medium uppercase text-gray-500 mb-1">Customer note</p>
                                                        <p className="text-sm text-gray-700 whitespace-pre-line">{req.special_notes}</p>
                                                    </div>
                                                )}

                                                {req.attachments.length > 0 && (
                                                    <div>
                                                        <p className="text-xs font-medium uppercase text-gray-500 mb-1">Logo / artwork</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {req.attachments.map((att) => att.url ? (
                                                                <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-brand-blue hover:bg-gray-50">
                                                                    <Paperclip className="w-4 h-4" />{att.filename}
                                                                </a>
                                                            ) : (
                                                                <span key={att.id} className="text-sm text-gray-500">{att.filename} (unavailable)</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {req.converted_quote_id && (
                                                    <p className="text-sm text-gray-600">Quote: <span className="font-medium">{req.converted_quote_id}</span></p>
                                                )}

                                                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                                                    {req.status !== "converted_to_quote" && req.status !== "archived" && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => createQuoteMutation.mutate(req)}
                                                                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue/90 disabled:opacity-50"
                                                            >
                                                                <FilePlus2 className="w-4 h-4" />Create quote
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => statusMutation.mutate({ id: req.id, status: "converted_to_quote" })}
                                                                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                                                            >
                                                                <CheckCircle2 className="w-4 h-4" />Mark as quoted
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={busy}
                                                                onClick={() => statusMutation.mutate({ id: req.id, status: "archived" })}
                                                                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                                                            >
                                                                <Archive className="w-4 h-4" />Archive
                                                            </button>
                                                        </>
                                                    )}
                                                    {(req.status === "converted_to_quote" || req.status === "archived") && (
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => statusMutation.mutate({ id: req.id, status: "shared_with_am" })}
                                                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                                                        >
                                                            <RotateCcw className="w-4 h-4" />Reopen
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 text-sm">
                            <span className="text-gray-600">{data?.count} requests</span>
                            <div className="flex gap-2">
                                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white disabled:opacity-50">Previous</button>
                                <span className="px-2 py-1.5 text-gray-600">Page {page} of {totalPages}</span>
                                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white disabled:opacity-50">Next</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
