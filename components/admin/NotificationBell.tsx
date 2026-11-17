"use client";

import { useState, useRef, useEffect, type ReactElement } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/api/notifications";
import type { UserNotification } from "@/types/notifications";

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

export default function NotificationBell(): ReactElement {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ["notification-bell"],
        queryFn: () => fetchNotifications({}),
        refetchInterval: 60_000,
        staleTime: 30_000,
    });

    const notifications = data?.results ?? [];
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    const recent = notifications.slice(0, 8);

    // Announce notifications that arrive while the page is open, so new
    // items aren't missed. The first load only records what's already there.
    const seenIdsRef = useRef<Set<number> | null>(null);
    useEffect(() => {
        if (!data) return;
        if (seenIdsRef.current === null) {
            seenIdsRef.current = new Set(notifications.map((n) => n.id));
            return;
        }
        const fresh = notifications.filter((n) => !n.is_read && !seenIdsRef.current!.has(n.id));
        notifications.forEach((n) => seenIdsRef.current!.add(n.id));
        if (fresh.length === 1) {
            const n = fresh[0];
            toast(n.title, {
                description: n.message || undefined,
                action: { label: "View", onClick: () => { window.location.href = n.action_url || "/admin/notifications"; } },
            });
        } else if (fresh.length > 1) {
            toast(`${fresh.length} new notifications`, {
                action: { label: "Open", onClick: () => setOpen(true) },
            });
        }
    }, [data, notifications]);

    const markReadMutation = useMutation({
        mutationFn: (id: number) => markNotificationRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notification-bell"] });
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });

    const markAllReadMutation = useMutation({
        mutationFn: () => markAllNotificationsRead(notifications.filter((n) => !n.is_read).map((n) => n.id)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notification-bell"] });
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
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

    function handleOpenNotification(n: UserNotification) {
        if (!n.is_read) markReadMutation.mutate(n.id);
        setOpen(false);
    }

    return (
        <div ref={containerRef} className="fixed top-4 right-5 z-40">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="relative flex items-center justify-center w-12 h-12 rounded-full bg-brand-blue text-white shadow-xl ring-4 ring-white transition-all hover:scale-105 hover:bg-brand-blue/90"
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
            >
                {unreadCount > 0 && (
                    <span className="absolute inset-0 rounded-full bg-brand-blue/40 animate-ping" aria-hidden="true" />
                )}
                <Bell className={`relative w-5 h-5 ${unreadCount > 0 ? "origin-top animate-[bell-ring_2.5s_ease-in-out_infinite]" : ""}`} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-brand-red text-white text-xs font-bold ring-2 ring-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>
            <style>{`@keyframes bell-ring{0%,60%,100%{transform:rotate(0)}10%,30%{transform:rotate(14deg)}20%,40%{transform:rotate(-14deg)}50%{transform:rotate(6deg)}}`}</style>

            {open && (
                <div className="absolute right-0 mt-3 w-96 max-w-[calc(100vw-2.5rem)] bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <span className="text-sm font-semibold text-gray-900">
                            Notifications
                            {unreadCount > 0 && (
                                <span className="ml-2 rounded-full bg-brand-red/10 px-2 py-0.5 text-xs font-semibold text-brand-red">{unreadCount} unread</span>
                            )}
                        </span>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={() => markAllReadMutation.mutate()}
                                disabled={markAllReadMutation.isPending}
                                className="text-xs text-brand-blue hover:underline disabled:opacity-50"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {isLoading && (
                            <div className="flex items-center justify-center py-10 text-gray-400">
                                <Loader2 className="w-5 h-5 animate-spin" />
                            </div>
                        )}
                        {!isLoading && recent.length === 0 && (
                            <p className="py-10 text-center text-sm text-gray-400">No notifications yet.</p>
                        )}
                        {recent.map((n) => (
                            <Link
                                key={n.id}
                                href={n.action_url || "/admin/notifications"}
                                onClick={() => handleOpenNotification(n)}
                                className={`block px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${
                                    !n.is_read ? "bg-brand-blue/5 border-l-4 border-l-brand-blue" : ""
                                }`}
                            >
                                <div className="flex items-start gap-2">
                                    <p className={`flex-1 text-sm ${!n.is_read ? "font-semibold text-gray-900" : "text-gray-600"}`}>
                                        {n.title}
                                    </p>
                                    {!n.is_read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-red" />}
                                </div>
                                {n.message && (
                                    <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">{n.message}</p>
                                )}
                                <p className="mt-1 text-[11px] text-gray-500">{formatTime(n.created_at)}</p>
                            </Link>
                        ))}
                    </div>

                    <Link
                        href="/admin/notifications"
                        onClick={() => setOpen(false)}
                        className="block px-4 py-2.5 text-center text-xs font-semibold text-brand-blue hover:bg-gray-50 border-t border-gray-100 transition-colors"
                    >
                        View all notifications
                    </Link>
                </div>
            )}
        </div>
    );
}
