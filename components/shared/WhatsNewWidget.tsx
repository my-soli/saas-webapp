"use client";

import { useState, useRef, useEffect, type ReactElement } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, X } from "lucide-react";
import { fetchWhatsNew, markAnnouncementRead } from "@/lib/api/announcements";

function formatTime(iso: string): string {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.round(diffMs / 60_000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString("en-KE", { day: "2-digit", month: "short" });
}

export default function WhatsNewWidget(): ReactElement | null {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    const { data } = useQuery({
        queryKey: ["whats-new"],
        queryFn: fetchWhatsNew,
        refetchInterval: 120_000,
        staleTime: 60_000,
    });

    const items = data ?? [];
    const unreadCount = items.length;

    const markReadMutation = useMutation({
        mutationFn: (id: number) => markAnnouncementRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["whats-new"] });
        },
    });

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Nothing to say — stay invisible rather than clutter every page with an
    // empty launcher button.
    if (unreadCount === 0 && !open) return null;

    return (
        <div ref={containerRef} className="fixed bottom-5 right-5 z-40">
            {open && (
                <div className="absolute bottom-14 right-0 w-80 max-w-[calc(100vw-2.5rem)] bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-brand-blue text-white">
                        <span className="text-sm font-semibold flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> What's New
                        </span>
                        <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                            <X className="w-4 h-4 opacity-80 hover:opacity-100" />
                        </button>
                    </div>

                    <div className="max-h-96 overflow-y-auto p-3 space-y-2 bg-gray-50">
                        {items.length === 0 && (
                            <p className="py-8 text-center text-sm text-gray-400">You're all caught up.</p>
                        )}
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white rounded-xl rounded-tl-sm border border-gray-200 px-3.5 py-3 shadow-sm"
                            >
                                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                                <p className="mt-1 text-xs text-gray-600 whitespace-pre-line">{item.body}</p>
                                <div className="mt-2 flex items-center justify-between">
                                    <span className="text-[11px] text-gray-400">{formatTime(item.created_at)}</span>
                                    <button
                                        type="button"
                                        onClick={() => markReadMutation.mutate(item.id)}
                                        disabled={markReadMutation.isPending}
                                        className="text-[11px] font-semibold text-brand-blue hover:underline disabled:opacity-50"
                                    >
                                        Got it
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="relative flex items-center justify-center w-12 h-12 rounded-full bg-brand-blue text-white shadow-lg hover:bg-brand-blue/90 transition-colors"
                aria-label="What's New"
            >
                <Sparkles className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand-red text-white text-[10px] font-bold">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>
        </div>
    );
}
