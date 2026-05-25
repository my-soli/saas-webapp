"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import { useState } from "react";
import AccountManagerLayout from "@/components/account-manager/account-manager-layout";
import DashboardKPICards from "@/features/dashboard/components/DashboardKPICards";
import RevenueTrendChart from "@/features/dashboard/components/RevenueTrendChart";
import ClientGrowthChart from "@/features/dashboard/components/ClientGrowthChart";
import RecentQuotesTable from "@/features/dashboard/components/RecentQuotesTable";
import { fetchAccountManagerDashboard } from "@/services/dashboard";
import { fetchNotifications } from "@/lib/api/notifications";

export default function AccountManagerDashboardPage(): ReactElement {
    const router = useRouter();
    const [alertDismissed, setAlertDismissed] = useState(false);

    const { data, isLoading, error } = useQuery({
        queryKey: ["dashboard", "account-manager"],
        queryFn: fetchAccountManagerDashboard,
        staleTime: 5 * 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
    });

    const { data: unreadData } = useQuery({
        queryKey: ["unread-notifications-count"],
        queryFn: () => fetchNotifications({ unreadOnly: true }),
        staleTime: 0,
        refetchInterval: 30_000,
    });

    const unreadCount = unreadData?.count ?? 0;
    const latestNotif = unreadData?.results?.[0];

    return (
        <AccountManagerLayout>
            <header className="bg-white shadow">
                <div className="px-4 lg:px-8 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-brand-black">My Dashboard</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            Personal performance metrics and analytics
                        </p>
                    </div>
                    <a
                        href="/account-manager/quotes/create"
                        className="rounded-md bg-brand-blue text-white px-4 py-2 text-sm font-semibold hover:bg-brand-blue/90"
                    >
                        Create Quote
                    </a>
                </div>
            </header>

            <main className="p-4 lg:p-8 space-y-6">
                {/* Notification alert banner */}
                {unreadCount > 0 && !alertDismissed && (
                    <div className="flex items-start gap-3 bg-brand-blue/10 border border-brand-blue/30 rounded-lg px-4 py-3">
                        <Bell className="w-5 h-5 text-brand-blue flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-brand-blue">
                                {unreadCount === 1 ? "You have 1 new notification" : `You have ${unreadCount} unread notifications`}
                            </p>
                            {latestNotif && (
                                <p className="text-xs text-gray-600 mt-0.5 truncate">{latestNotif.title}: {latestNotif.message}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                type="button"
                                onClick={() => router.push("/account-manager/notifications")}
                                className="text-xs font-medium text-brand-blue hover:underline"
                            >
                                View all
                            </button>
                            <button
                                type="button"
                                onClick={() => setAlertDismissed(true)}
                                className="p-0.5 rounded hover:bg-brand-blue/10 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-700">
                            Failed to load dashboard data. Please refresh the page.
                        </p>
                    </div>
                )}

                <DashboardKPICards
                    kpis={data?.kpis || {
                        my_revenue_this_month: 0,
                        my_quotes_this_month: 0,
                        active_jobs_count: 0,
                        new_clients_this_month: 0,
                    }}
                    isLoading={isLoading}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <RevenueTrendChart
                        data={data?.revenue_trend || []}
                        isLoading={isLoading}
                    />
                    <ClientGrowthChart
                        data={data?.client_growth || []}
                        isLoading={isLoading}
                    />
                </div>

                <RecentQuotesTable
                    quotes={data?.recent_quotes || []}
                    isLoading={isLoading}
                />
            </main>
        </AccountManagerLayout>
    );
}
