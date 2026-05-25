"use client";

import type { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    AlertCircleIcon, TrendingUpIcon, UsersIcon, FileTextIcon, TargetIcon,
    BriefcaseIcon, UserCheckIcon, AlertTriangleIcon,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import AccountManagerLayout from "@/components/account-manager/account-manager-layout";
import JobStatusDonutChart from "@/features/analytics/components/JobStatusDonutChart";
import QuoteBreakdownBarChart from "@/features/analytics/components/QuoteBreakdownBarChart";
import { fetchAccountManagerPerformance, fetchJobCompletionStats } from "@/services/analytics";

export default function AnalyticsPage(): ReactElement {
    const performanceQuery = useQuery({
        queryKey: ["am-performance"],
        queryFn: fetchAccountManagerPerformance,
    });

    const completionQuery = useQuery({
        queryKey: ["job-completion"],
        queryFn: fetchJobCompletionStats,
    });

    const isLoading = performanceQuery.isLoading || completionQuery.isLoading;
    const hasError = performanceQuery.error || completionQuery.error;
    const performance = performanceQuery.data;

    const quoteStatusData = performance ? [
        { name: "Approved", value: performance.quotes.approved, fill: "#009444" },
        { name: "Pending", value: performance.quotes.pending, fill: "#F6B619" },
        { name: "Lost", value: performance.quotes.lost, fill: "#dc2626" },
    ].filter(d => d.value > 0) : [];

    const leadsStatusData = performance ? Object.entries(performance.leads.by_status ?? {}).map(([status, count]) => ({
        name: status,
        value: count as number,
    })) : [];

    const clientTypeData = performance ? [
        { name: "B2B", value: performance.clients.b2b ?? 0, fill: "#093756" },
        { name: "B2C", value: performance.clients.b2c ?? 0, fill: "#F6B619" },
        { name: "Other", value: performance.clients.other ?? 0, fill: "#9ca3af" },
    ].filter(d => d.value > 0) : [];

    const jobStatusData = performance?.jobs ? [
        { name: "Pending", value: performance.jobs.pending, fill: "#F6B619" },
        { name: "In Progress", value: performance.jobs.in_progress, fill: "#093756" },
        { name: "On Hold", value: performance.jobs.on_hold, fill: "#9ca3af" },
        { name: "Completed", value: performance.jobs.completed, fill: "#009444" },
    ].filter(d => d.value > 0) : [];

    return (
        <AccountManagerLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4">
                    <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
                    <p className="mt-2 text-sm text-gray-600">Your performance metrics and insights</p>
                </div>
            </header>

            <main className="bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 lg:py-6 space-y-6">
                    {hasError && (
                        <div className="bg-brand-red/10 border border-brand-red/20 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                                <AlertCircleIcon className="h-5 w-5 text-brand-red" />
                                <div>
                                    <h3 className="font-semibold text-brand-red">Failed to load analytics</h3>
                                    <p className="text-sm text-gray-600 mt-1">Unable to fetch analytics data. Please try again later.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {isLoading && !performance ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-200"></div>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="h-96 animate-pulse rounded-lg bg-gray-200"></div>
                                <div className="h-96 animate-pulse rounded-lg bg-gray-200"></div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* KPI Summary Cards */}
                            {performance && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Quote Conversion</p>
                                            <FileTextIcon className="h-5 w-5 text-brand-blue" />
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900">{performance.quotes.conversion_rate_percent.toFixed(1)}%</p>
                                        <p className="mt-2 text-xs text-gray-500">{performance.quotes.approved} of {performance.quotes.total} approved</p>
                                    </div>

                                    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Revenue</p>
                                            <TrendingUpIcon className="h-5 w-5 text-brand-blue" />
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900">KES {performance.quotes.total_revenue.toLocaleString()}</p>
                                        <p className="mt-2 text-xs text-gray-500">KES {performance.quotes.average_quote_value.toLocaleString()} avg per quote</p>
                                    </div>

                                    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Lead Conversion</p>
                                            <TargetIcon className="h-5 w-5 text-brand-blue" />
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900">{performance.leads.conversion_rate_percent.toFixed(1)}%</p>
                                        <p className="mt-2 text-xs text-gray-500">{performance.leads.converted} of {performance.leads.total} converted</p>
                                    </div>

                                    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Active Clients</p>
                                            <UsersIcon className="h-5 w-5 text-brand-blue" />
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900">{performance.clients.managed}</p>
                                        <p className="mt-2 text-xs text-gray-500">Under your management</p>
                                    </div>
                                </div>
                            )}

                            {/* Job Status + Quote Breakdown */}
                            {performance && completionQuery.data && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <JobStatusDonutChart stats={completionQuery.data} />
                                    <QuoteBreakdownBarChart performance={performance} />
                                </div>
                            )}

                            {/* Lead Intake Analytics */}
                            {performance && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <TargetIcon className="w-5 h-5 text-brand-blue" />
                                            <div>
                                                <h2 className="text-sm font-semibold text-gray-900">Lead Intake</h2>
                                                <p className="text-xs text-gray-500 mt-0.5">Breakdown of leads by stage</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-gray-900">{performance.leads.total}</p>
                                                <p className="text-xs text-gray-500 mt-1">Total Leads</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-green-600">{performance.leads.converted}</p>
                                                <p className="text-xs text-gray-500 mt-1">Converted</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-brand-blue">{performance.leads.conversion_rate_percent.toFixed(1)}%</p>
                                                <p className="text-xs text-gray-500 mt-1">Conv. Rate</p>
                                            </div>
                                        </div>
                                        {leadsStatusData.length > 0 && (
                                            <ResponsiveContainer width="100%" height={180}>
                                                <BarChart data={leadsStatusData} layout="vertical">
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                                                    <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} stroke="#d1d5db" />
                                                    <YAxis type="category" dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} stroke="#d1d5db" width={80} />
                                                    <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }} />
                                                    <Bar dataKey="value" fill="#093756" radius={[0, 4, 4, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>

                                    {/* Client List Analytics */}
                                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <UserCheckIcon className="w-5 h-5 text-brand-blue" />
                                            <div>
                                                <h2 className="text-sm font-semibold text-gray-900">Client Portfolio</h2>
                                                <p className="text-xs text-gray-500 mt-0.5">B2B vs B2C breakdown</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-gray-900">{performance.clients.managed}</p>
                                                <p className="text-xs text-gray-500 mt-1">Total</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-brand-blue">{performance.clients.b2b}</p>
                                                <p className="text-xs text-gray-500 mt-1">B2B</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-amber-600">{performance.clients.b2c}</p>
                                                <p className="text-xs text-gray-500 mt-1">B2C</p>
                                            </div>
                                        </div>
                                        {clientTypeData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={180}>
                                                <PieChart>
                                                    <Pie data={clientTypeData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                                                        {clientTypeData.map((entry, i) => (
                                                            <Cell key={i} fill={entry.fill} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(v) => [`${v} clients`, ""]} contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No client data</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Quotes & Jobs Analytics */}
                            {performance && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Quotes by Status */}
                                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <FileTextIcon className="w-5 h-5 text-brand-blue" />
                                            <div>
                                                <h2 className="text-sm font-semibold text-gray-900">Quotes</h2>
                                                <p className="text-xs text-gray-500 mt-0.5">Distribution by status</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                                            <div className="text-center">
                                                <p className="text-xl font-bold text-gray-900">{performance.quotes.total}</p>
                                                <p className="text-xs text-gray-500 mt-1">Total</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xl font-bold text-amber-600">{performance.quotes.pending}</p>
                                                <p className="text-xs text-gray-500 mt-1">Pending</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xl font-bold text-green-600">{performance.quotes.approved}</p>
                                                <p className="text-xs text-gray-500 mt-1">Approved</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xl font-bold text-red-600">{performance.quotes.lost}</p>
                                                <p className="text-xs text-gray-500 mt-1">Lost</p>
                                            </div>
                                        </div>
                                        {quoteStatusData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={180}>
                                                <PieChart>
                                                    <Pie data={quoteStatusData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                                                        {quoteStatusData.map((entry, i) => (
                                                            <Cell key={i} fill={entry.fill} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(v) => [`${v} quotes`, ""]} contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No quote data</div>
                                        )}
                                    </div>

                                    {/* Jobs by Status */}
                                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <BriefcaseIcon className="w-5 h-5 text-brand-blue" />
                                            <div>
                                                <h2 className="text-sm font-semibold text-gray-900">Jobs</h2>
                                                <p className="text-xs text-gray-500 mt-0.5">Production status for your clients</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            <div className="text-center">
                                                <p className="text-xl font-bold text-gray-900">{performance.jobs?.total ?? 0}</p>
                                                <p className="text-xs text-gray-500 mt-1">Total Jobs</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xl font-bold text-green-600">{performance.jobs?.completed ?? 0}</p>
                                                <p className="text-xs text-gray-500 mt-1">Completed</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xl font-bold text-red-600 flex items-center justify-center gap-1">
                                                    {(performance.jobs?.overdue ?? 0) > 0 && <AlertTriangleIcon className="w-4 h-4" />}
                                                    {performance.jobs?.overdue ?? 0}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">Overdue</p>
                                            </div>
                                        </div>
                                        {jobStatusData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height={180}>
                                                <BarChart data={jobStatusData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                    <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} stroke="#d1d5db" />
                                                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} stroke="#d1d5db" allowDecimals={false} />
                                                    <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }} />
                                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                        {jobStatusData.map((entry, i) => (
                                                            <Cell key={i} fill={entry.fill} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No job data</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </AccountManagerLayout>
    );
}
