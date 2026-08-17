"use client";

import { useState, type ReactElement } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus, X, ChevronDownIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/admin-layout";
import { fetchAnnouncements, createAnnouncement, type Announcement } from "@/services/announcements";

function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) +
        " · " + d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
}

function NewAnnouncementModal({ onClose }: { onClose: () => void }): ReactElement {
    const queryClient = useQueryClient();
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");

    const mutation = useMutation({
        mutationFn: () => createAnnouncement({ title, body }),
        onSuccess: () => {
            toast.success("Announcement posted — every active staff member has been notified.");
            queryClient.invalidateQueries({ queryKey: ["announcements"] });
            onClose();
        },
        onError: (err: Error) => toast.error(err.message || "Failed to post announcement."),
    });

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">New Announcement</h2>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. New Orchestration Schedule + tenant fixes"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Full details</label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={12}
                            placeholder="Write the full update — this is never truncated, unlike a plain notification."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-y"
                        />
                    </div>
                    <p className="text-xs text-gray-400">
                        Every active staff member in your team will get a notification linking to this.
                    </p>
                </div>
                <div className="border-t border-gray-200 p-4 flex items-center justify-end gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={mutation.isPending}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => mutation.mutate()}
                        disabled={mutation.isPending || !title.trim() || !body.trim()}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-blue rounded-md hover:bg-brand-blue/90 disabled:opacity-50 transition-colors"
                    >
                        {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        {mutation.isPending ? "Posting…" : "Post & Notify Everyone"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function AnnouncementCard({ announcement }: { announcement: Announcement }): ReactElement {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
            >
                <div className="w-9 h-9 rounded-lg bg-brand-blue/10 flex items-center justify-center shrink-0">
                    <Megaphone className="w-4.5 h-4.5 text-brand-blue" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{announcement.title}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                        {announcement.created_by_name || "System"} · {formatTime(announcement.created_at)}
                    </p>
                    {!expanded && (
                        <p className="mt-1.5 text-sm text-gray-500 line-clamp-1">{announcement.body}</p>
                    )}
                </div>
                <ChevronDownIcon className={`h-4 w-4 shrink-0 text-gray-300 transition-transform mt-1 ${expanded ? "rotate-180" : ""}`} />
            </button>
            {expanded && (
                <div className="px-5 pb-5 pt-1 border-t border-gray-100">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{announcement.body}</p>
                </div>
            )}
        </div>
    );
}

export default function AnnouncementsPage(): ReactElement {
    const [showNew, setShowNew] = useState(false);

    const { data: announcements = [], isLoading } = useQuery({
        queryKey: ["announcements"],
        queryFn: fetchAnnouncements,
    });

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 lg:px-8 py-4 lg:py-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
                        <p className="mt-1 text-sm text-gray-500">System updates and changes, in full — not truncated like a notification.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowNew(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                    >
                        <Plus className="w-4 h-4" /> New Announcement
                    </button>
                </div>
            </header>

            <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-3">
                {isLoading && (
                    <div className="flex items-center justify-center py-20 text-gray-400">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                )}
                {!isLoading && announcements.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                        <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600 text-sm font-medium">No announcements yet</p>
                        <p className="text-xs text-gray-400 mt-1">Post one to notify your whole team about a system update.</p>
                    </div>
                )}
                {announcements.map((a) => (
                    <AnnouncementCard key={a.id} announcement={a} />
                ))}
            </div>

            {showNew && <NewAnnouncementModal onClose={() => setShowNew(false)} />}
        </AdminLayout>
    );
}
