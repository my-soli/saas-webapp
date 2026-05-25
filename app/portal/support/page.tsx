"use client";

import { useState, type ReactElement } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    MessageSquare, Plus, Filter, ChevronLeft, ChevronRight,
    AlertCircle, Loader2, X, Send, ChevronDown, ChevronUp,
} from "lucide-react";
import { fetchSupportTickets, createSupportTicket, replyToTicket, fetchPTMembers } from "@/services/client-support";
import { fetchAMs } from "@/services/client-portal-extras";
import type { SupportTicket, TicketCategory, TicketPriority, TicketStatus, TicketAssignToType } from "@/types/client-support";
import type { AMUser } from "@/types/client-portal-extras";

const PRIORITY_STYLES: Record<TicketPriority, string> = {
    low:    "bg-gray-100 text-gray-600",
    medium: "bg-blue-100 text-blue-700",
    high:   "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700",
};
const STATUS_STYLES: Record<TicketStatus, string> = {
    open:            "bg-green-100 text-green-700",
    in_progress:     "bg-blue-100 text-blue-700",
    awaiting_client: "bg-yellow-100 text-yellow-700",
    resolved:        "bg-gray-100 text-gray-600",
    closed:          "bg-gray-100 text-gray-400",
};
const STATUS_LABELS: Record<TicketStatus, string> = {
    open:            "Open",
    in_progress:     "In Progress",
    awaiting_client: "Awaiting You",
    resolved:        "Resolved",
    closed:          "Closed",
};

function fmtDate(v: string): string {
    return new Date(v).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── New Ticket Modal ────────────────────────────────────────────────────────

const ASSIGN_OPTIONS: { value: TicketAssignToType; label: string; desc: string }[] = [
    { value: "admin",  label: "Admin",               desc: "Sent directly to the PrintDuka admin team." },
    { value: "am",     label: "Account Manager",     desc: "Assign to your account manager. Admin is also notified." },
    { value: "pt",     label: "Production Team",     desc: "Assign to a production team member. Admin is also notified." },
];

function NewTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }): ReactElement {
    const [form, setForm] = useState({
        title: "", description: "",
        category: "order" as TicketCategory,
        priority: "medium" as TicketPriority,
    });
    const [assignToType, setAssignToType] = useState<TicketAssignToType>("admin");
    const [assigneeId, setAssigneeId] = useState<number | "">("");

    const { data: ams = [] } = useQuery<AMUser[]>({
        queryKey: ["portal-ams"],
        queryFn: fetchAMs,
        enabled: assignToType === "am",
        staleTime: 300_000,
    });

    const { data: ptMembers = [] } = useQuery<AMUser[]>({
        queryKey: ["portal-pt-members"],
        queryFn: fetchPTMembers,
        enabled: assignToType === "pt",
        staleTime: 300_000,
    });

    const memberList = assignToType === "am" ? ams : assignToType === "pt" ? ptMembers : [];

    const mutation = useMutation({
        mutationFn: () => createSupportTicket({
            ...form,
            assign_to_type: assignToType,
            assignee_id: assigneeId !== "" ? assigneeId : undefined,
        }),
        onSuccess: () => { onCreated(); onClose(); },
    });

    const canSubmit = assignToType === "admin" || assigneeId !== "";

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <h2 className="text-lg font-semibold text-gray-900">New Support Ticket</h2>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); if (canSubmit) mutation.mutate(); }} className="p-6 space-y-4">
                    {mutation.isError && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                            {mutation.error instanceof Error ? mutation.error.message : "Failed to create ticket"}
                        </div>
                    )}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Subject <span className="text-red-500">*</span></label>
                        <input required type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="Briefly describe your issue"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Category</label>
                            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as TicketCategory })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue bg-white">
                                {["order","invoice","delivery","quality","technical","other"].map((c) => (
                                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Priority</label>
                            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TicketPriority })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue bg-white">
                                {["low","medium","high","urgent"].map((p) => (
                                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Description <span className="text-red-500">*</span></label>
                        <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                            rows={4} placeholder="Provide as much detail as possible…"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-none" />
                    </div>

                    {/* Assignee */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Who should handle this?</label>
                        <div className="space-y-2">
                            {ASSIGN_OPTIONS.map((opt) => (
                                <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${assignToType === opt.value ? "border-brand-blue bg-brand-blue/5" : "border-gray-200 hover:bg-gray-50"}`}>
                                    <input type="radio" name="assign_to" value={opt.value} checked={assignToType === opt.value}
                                        onChange={() => { setAssignToType(opt.value); setAssigneeId(""); }}
                                        className="mt-0.5 accent-brand-blue" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Person picker — shown when AM or PT selected */}
                    {(assignToType === "am" || assignToType === "pt") && (
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">
                                Select {assignToType === "am" ? "Account Manager" : "Production Team Member"} <span className="text-red-500">*</span>
                            </label>
                            {memberList.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">No members found — ticket will go to admin.</p>
                            ) : (
                                <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : "")}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue bg-white">
                                    <option value="">Choose a person…</option>
                                    {memberList.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-1">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
                        <button type="submit" disabled={mutation.isPending || !canSubmit}
                            className="flex items-center gap-2 px-5 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-60">
                            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Submit Ticket
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Ticket Row (expandable) ─────────────────────────────────────────────────

function TicketRow({ ticket }: { ticket: SupportTicket }): ReactElement {
    const [expanded, setExpanded] = useState(false);
    const [reply, setReply] = useState("");
    const queryClient = useQueryClient();

    const replyMutation = useMutation({
        mutationFn: () => replyToTicket(ticket.id, reply),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
            setReply("");
        },
    });

    return (
        <>
            <tr
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setExpanded((e) => !e)}
            >
                <td className="px-4 py-3 font-mono font-medium text-brand-blue">{ticket.ticket_number}</td>
                <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{ticket.title}</td>
                <td className="px-4 py-3 capitalize text-gray-600">{ticket.category}</td>
                <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_STYLES[ticket.priority]}`}>
                        {ticket.priority}
                    </span>
                </td>
                <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[ticket.status]}`}>
                        {STATUS_LABELS[ticket.status]}
                    </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{fmtDate(ticket.updated_at)}</td>
                <td className="px-4 py-3 text-gray-400">
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </td>
            </tr>
            {expanded && (
                <tr className="bg-gray-50 border-b border-gray-200">
                    <td colSpan={7} className="px-6 py-4 space-y-4">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
                        {ticket.replies.filter((r) => !r.is_internal).length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Conversation</p>
                                {ticket.replies.filter((r) => !r.is_internal).map((r) => (
                                    <div key={r.id} className="flex gap-3">
                                        <div className="w-7 h-7 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0 text-xs font-bold text-brand-blue">
                                            {r.user_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 bg-white rounded-lg border border-gray-200 px-3 py-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-medium text-gray-800">{r.user_name}</span>
                                                <span className="text-xs text-gray-400">{fmtDate(r.created_at)}</span>
                                            </div>
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {ticket.status !== "resolved" && ticket.status !== "closed" && (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={reply}
                                    onChange={(e) => setReply(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter" && reply.trim()) replyMutation.mutate(); }}
                                    placeholder="Reply to this ticket…"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                />
                                <button
                                    type="button"
                                    onClick={() => replyMutation.mutate()}
                                    disabled={!reply.trim() || replyMutation.isPending}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue text-white text-sm rounded-lg hover:opacity-90 disabled:opacity-50"
                                >
                                    {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </div>
                        )}
                    </td>
                </tr>
            )}
        </>
    );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SupportPage(): ReactElement {
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [showNewModal, setShowNewModal] = useState(false);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["support-tickets", page, statusFilter],
        queryFn: () => fetchSupportTickets({ page, status: statusFilter }),
        staleTime: 30_000,
        retry: 1,
    });

    const tickets: SupportTicket[] = data?.results ?? [];
    const totalCount = data?.count ?? 0;
    const totalPages = Math.ceil(totalCount / 20);

    return (
        <>
            <div className="p-4 lg:p-8 space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-brand-black">Support</h1>
                        <p className="text-gray-500 mt-1">Raise issues, track responses, and get help</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowNewModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-lg hover:opacity-90 shrink-0"
                    >
                        <Plus className="w-4 h-4" /> New Ticket
                    </button>
                </div>

                <div className="flex gap-3">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="pl-9 pr-8 py-2.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-brand-blue bg-white appearance-none">
                            <option value="all">All Statuses</option>
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="awaiting_client">Awaiting You</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>
                </div>

                {isError && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        <AlertCircle className="w-5 h-5 shrink-0" /> Could not load tickets. Please try again.
                    </div>
                )}

                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                                    <th className="px-4 py-3 font-semibold text-gray-700">Ticket #</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Subject</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Category</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Priority</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Last Updated</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="border-b border-gray-100">
                                            {[100, 180, 80, 70, 80, 80, 20].map((w, j) => (
                                                <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-gray-200 animate-pulse" style={{ width: w }} /></td>
                                            ))}
                                        </tr>
                                    ))
                                ) : tickets.length === 0 ? (
                                    <tr>
                                        <td colSpan={7}>
                                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                                <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
                                                <p className="text-sm font-medium">No support tickets yet</p>
                                                <p className="text-xs mt-1">Click &quot;New Ticket&quot; to get help from our team</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    tickets.map((t) => <TicketRow key={t.id} ticket={t} />)
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                            <span>{totalCount} ticket{totalCount !== 1 ? "s" : ""}</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                                <span>Page {page} of {totalPages}</span>
                                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showNewModal && (
                <NewTicketModal
                    onClose={() => setShowNewModal(false)}
                    onCreated={() => queryClient.invalidateQueries({ queryKey: ["support-tickets"] })}
                />
            )}
        </>
    );
}
