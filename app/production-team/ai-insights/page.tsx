"use client";

import { useQuery } from "@tanstack/react-query";
import { SparklesIcon, AlertTriangleIcon, ShieldCheckIcon, Loader2Icon } from "lucide-react";
import ProductionLayout from "@/components/production/production-layout";
import { fetchBottleneckAlerts, fetchVendorPerformance } from "@/services/analytics";

export default function PTInsightsPage() {
    const bottleneckQuery = useQuery({
        queryKey: ["bottleneck-alerts"],
        queryFn: fetchBottleneckAlerts,
        staleTime: 300_000,
        refetchInterval: 300_000,
    });

    const vendorQuery = useQuery({
        queryKey: ["vendor-performance-ai"],
        queryFn: fetchVendorPerformance,
        staleTime: 600_000,
    });

    const loading = bottleneckQuery.isLoading || vendorQuery.isLoading;

    return (
        <ProductionLayout>
            <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                        <SparklesIcon className="w-5 h-5 text-brand-blue" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">AI Insights</h1>
                        <p className="text-sm text-gray-500">Live production alerts — bottlenecks, overdue components, vendor reliability</p>
                    </div>
                    {bottleneckQuery.data && (
                        (() => {
                            const total = bottleneckQuery.data.overdue_components.length +
                                bottleneckQuery.data.approaching_deadlines.length;
                            return total > 0 ? (
                                <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                    {total} alert{total !== 1 ? "s" : ""}
                                </span>
                            ) : null;
                        })()
                    )}
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2Icon className="w-6 h-6 text-brand-blue animate-spin" />
                    </div>
                )}

                {/* Production Bottlenecks */}
                {bottleneckQuery.data && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                            <AlertTriangleIcon className="w-5 h-5 text-amber-500" />
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900">Production Bottlenecks</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Overdue components, approaching deadlines, stale jobs</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-6">

                            {/* Overdue components */}
                            {bottleneckQuery.data.overdue_components.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                                        Overdue Components ({bottleneckQuery.data.overdue_components.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {bottleneckQuery.data.overdue_components.map((c, i) => (
                                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900">{c.component}</p>
                                                    <p className="text-xs text-gray-500">{c.job_number} · {c.client}{c.vendor ? ` · ${c.vendor}` : ""}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">{c.days_overdue}d overdue</span>
                                                    <p className="text-xs text-gray-400 mt-1">{c.status}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Approaching deadlines */}
                            {bottleneckQuery.data.approaching_deadlines.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                                        Deadlines Within 3 Days ({bottleneckQuery.data.approaching_deadlines.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {bottleneckQuery.data.approaching_deadlines.map((j, i) => (
                                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900">{j.job_name}</p>
                                                    <p className="text-xs text-gray-500">{j.job_number} · {j.client} · PIC: {j.pic}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                                        {j.days_left === 0 ? "Due today" : `${j.days_left}d left`}
                                                    </span>
                                                    {j.components_not_ready > 0 && (
                                                        <p className="text-xs text-red-500 mt-1">{j.components_not_ready} comp. not ready</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Stale jobs */}
                            {bottleneckQuery.data.stale_jobs.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                                        Stale Jobs — No Movement in 5+ Days ({bottleneckQuery.data.stale_jobs.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {bottleneckQuery.data.stale_jobs.map((j, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900">{j.job_name}</p>
                                                    <p className="text-xs text-gray-500">{j.job_number} · {j.client} · PIC: {j.pic}</p>
                                                </div>
                                                <span className="text-xs text-gray-400 flex-shrink-0">{j.days_no_movement}d idle</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {bottleneckQuery.data.overdue_components.length === 0 &&
                             bottleneckQuery.data.approaching_deadlines.length === 0 &&
                             bottleneckQuery.data.stale_jobs.length === 0 && (
                                <div className="text-center py-8">
                                    <p className="text-green-600 font-medium text-sm">✓ No bottlenecks — production is on track.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Vendor Performance */}
                {vendorQuery.data && vendorQuery.data.vendors.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                            <ShieldCheckIcon className="w-5 h-5 text-teal-500" />
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900">Vendor Performance</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Reliability scored by overdue components and invoice timeliness</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50">
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Jobs</th>
                                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Overdue</th>
                                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Done</th>
                                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Late Invoices</th>
                                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Reliability</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {vendorQuery.data.vendors.map((v, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium text-gray-900">{v.vendor}</td>
                                            <td className="px-6 py-3 text-right text-gray-600">{v.total_components}</td>
                                            <td className="px-6 py-3 text-right">
                                                <span className={v.overdue > 0 ? "text-red-600 font-semibold" : "text-gray-300"}>{v.overdue}</span>
                                            </td>
                                            <td className="px-6 py-3 text-right text-green-600">{v.completed}</td>
                                            <td className="px-6 py-3 text-right">
                                                <span className={v.late_invoices > 0 ? "text-amber-600 font-medium" : "text-gray-300"}>{v.late_invoices}</span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="w-16 bg-gray-100 rounded-full h-1.5">
                                                        <div
                                                            className={`h-1.5 rounded-full ${v.reliability_score >= 80 ? "bg-green-500" : v.reliability_score >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                                                            style={{ width: `${v.reliability_score}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-xs font-semibold w-10 text-right ${v.reliability_score >= 80 ? "text-green-600" : v.reliability_score >= 60 ? "text-amber-600" : "text-red-600"}`}>
                                                        {v.reliability_score}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </ProductionLayout>
    );
}
