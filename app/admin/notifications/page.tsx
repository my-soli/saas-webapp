"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Check, CheckCheck, Filter, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/admin-layout";
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/api/notifications";
import type { UserNotification } from "@/types/notifications";

const NOTIFICATION_TYPES = [
    { value: "", label: "All Types" },
    { value: "quote", label: "Quotes" },
    { value: "job", label: "Jobs" },
    { value: "payment", label: "Payments" },
    { value: "lead", label: "Leads" },
    { value: "system", label: "System" },
];

function getTypeColor(type: string): string {
    if (type.includes("quote")) return "bg-blue-100 text-blue-700";
    if (type.includes("job")) return "bg-purple-100 text-purple-700";
    if (type.includes("payment")) return "bg-green-100 text-green-700";
    if (type.includes("lead")) return "bg-orange-100 text-orange-700";
    return "bg-gray-100 text-gray-700";
}

function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export default function NotificationsPage() {
    const queryClient = useQueryClient();
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [notificationType, setNotificationType] = useState("");
    const [search, setSearch] = useState("");

    const { data, isLoading, error, refetch, isFetching } = useQuery({
        queryKey: ["notifications", { unreadOnly, notificationType, search }],
        queryFn: () => fetchNotifications({ unreadOnly, notificationType: notificationType || undefined, search: search || undefined }),
    });

    const markReadMutation = useMutation({
        mutationFn: markNotificationRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
        onError: () => toast.error("Failed to mark notification as read."),
    });

    const markAllReadMutation = useMutation({
        mutationFn: () => markAllNotificationsRead([]),
        onSuccess: () => {
            toast.success("All notifications marked as read.");
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
        onError: () => toast.error("Failed to mark all as read."),
    });

    const notifications = data?.results ?? [];
    const totalCount = data?.count ?? 0;
    const unreadCount = notifications.filter(n => !n.is_read).length;

    const handleMarkRead = (notification: UserNotification) => {
        if (!notification.is_read) {
            markReadMutation.mutate(notification.id);
        }
    };

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4 lg:py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                                {unreadCount > 0 && (
                                    <span className="px-2 py-0.5 bg-brand-blue text-white text-xs font-semibold rounded-full">
                                        {unreadCount} unread
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-sm text-gray-600">
                                System alerts and activity notifications
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllReadMutation.mutate()}
                                    disabled={markAllReadMutation.isPending}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                >
                                    <CheckCheck className="w-4 h-4" />
                                    Mark all read
                                </button>
                            )}
                            <button
                                onClick={() => refetch()}
                                disabled={isFetching}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="bg-gray-50 min-h-screen">
                <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 space-y-4">
                    {/* Filters */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
                        <div className="flex-1 min-w-[160px]">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search notifications..."
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-400" />
                            <select
                                value={notificationType}
                                onChange={(e) => setNotificationType(e.target.value)}
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                            >
                                {NOTIFICATION_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={unreadOnly}
                                onChange={(e) => setUnreadOnly(e.target.checked)}
                                className="h-4 w-4 text-brand-blue border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-600">Unread only</span>
                        </label>
                    </div>

                    {!isLoading && (
                        <p className="text-sm text-gray-500">
                            {totalCount} {totalCount === 1 ? "notification" : "notifications"}
                        </p>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                            Failed to load notifications. Please try again.
                        </div>
                    )}

                    {isLoading && (
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                                    <div className="flex gap-3">
                                        <div className="w-9 h-9 bg-gray-200 rounded-full flex-shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-gray-200 rounded w-2/3" />
                                            <div className="h-3 bg-gray-200 rounded w-1/2" />
                                        </div>
                                        <div className="h-3 bg-gray-200 rounded w-12" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!isLoading && notifications.length === 0 && !error && (
                        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                            <BellOff className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No notifications</p>
                            <p className="text-sm text-gray-400 mt-1">
                                {unreadOnly ? "No unread notifications." : "You're all caught up!"}
                            </p>
                        </div>
                    )}

                    {!isLoading && notifications.length > 0 && (
                        <div className="space-y-2">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`bg-white rounded-lg border p-4 transition-all ${
                                        notification.is_read
                                            ? "border-gray-200"
                                            : "border-brand-blue/30 bg-blue-50/30"
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${getTypeColor(notification.notification_type)}`}>
                                            <Bell className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm font-medium ${notification.is_read ? "text-gray-700" : "text-gray-900"}`}>
                                                    {notification.title}
                                                </p>
                                                {!notification.is_read && (
                                                    <span className="w-2 h-2 bg-brand-blue rounded-full flex-shrink-0 mt-1" />
                                                )}
                                            </div>
                                            {notification.message && (
                                                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-3 mt-2">
                                                <time className="text-xs text-gray-400">
                                                    {formatTime(notification.created_at)}
                                                </time>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(notification.notification_type)}`}>
                                                    {notification.notification_type.replace(/_/g, " ")}
                                                </span>
                                                {notification.action_url && (
                                                    <a
                                                        href={notification.action_url}
                                                        className="text-xs text-brand-blue hover:underline flex items-center gap-1"
                                                    >
                                                        {notification.action_label || "View"}
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        {!notification.is_read && (
                                            <button
                                                onClick={() => handleMarkRead(notification)}
                                                disabled={markReadMutation.isPending}
                                                title="Mark as read"
                                                className="p-1.5 text-gray-400 hover:text-brand-blue rounded hover:bg-gray-100 transition-colors flex-shrink-0"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </AdminLayout>
    );
}
