"use client";

import { useState, useRef, useEffect, type ReactElement } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Loader2 } from "lucide-react";
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
                className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200 shadow-lg hover:border-brand-blue transition-colors"
                aria-label="Notifications"
            >
                <Bell className="w-4.5 h-4.5 text-gray-600" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand-red text-white text-[10px] font-bold">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2.5rem)] bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <span className="text-sm font-semibold text-gray-900">Notifications</span>
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
                                    !n.is_read ? "bg-brand-blue/[0.03]" : ""
                                }`}
                            >
                                <div className="flex items-start gap-2">
                                    <p className={`flex-1 text-sm ${!n.is_read ? "font-semibold text-gray-900" : "text-gray-600"}`}>
                                        {n.title}
                                    </p>
                                    {!n.is_read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-blue" />}
                                </div>
                                {n.message && (
                                    <p className="mt-0.5 text-xs text-gray-400 line-clamp-2">{n.message}</p>
                                )}
                                <p className="mt-1 text-[11px] text-gray-300">{formatTime(n.created_at)}</p>
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
