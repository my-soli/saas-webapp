"use client";

import type { ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import AdminLayout from "@/components/admin/admin-layout";
import StatusPill from "@/components/admin/status-pill";
import { Gauge, ListChecks, ArrowRight, Building2, LayoutGrid } from "lucide-react";
import { fetchCapacitySummary } from "@/services/machines";
import { fetchOutsourcingSummary } from "@/services/production-outsourcing";

export default function ProductionPlanningPage(): ReactElement {
    const { data: capacity = [], isLoading: loadingCapacity } = useQuery({
        queryKey: ["machine-capacity-summary"],
        queryFn: fetchCapacitySummary,
    });

    const { data: outsourcing, isLoading: loadingOutsourcing } = useQuery({
        queryKey: ["outsourcing-summary"],
        queryFn: fetchOutsourcingSummary,
    });

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 lg:px-8 py-4 lg:py-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Production Planning</h1>
                        <p className="mt-1 text-sm text-gray-500">In-house machine capacity and outsourced work at a glance</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/admin/production-planning/board"
                            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                            <LayoutGrid className="w-4 h-4" /> Board
                        </Link>
                        <Link href="/admin/production-planning/queue"
                            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                            <ListChecks className="w-4 h-4" /> Assignment Queue
                        </Link>
                        <Link href="/admin/production-planning/machines"
                            className="flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
                            <Gauge className="w-4 h-4" /> Manage Machines
                        </Link>
                    </div>
                </div>
            </header>

            <div className="p-4 lg:p-8 space-y-8">
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">In-House Machines</h2>
                        <Link href="/admin/production-planning/machines" className="text-xs text-brand-blue hover:underline inline-flex items-center gap-1">
                            View all <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                    {loadingCapacity && <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>}
                    {!loadingCapacity && capacity.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                            <Gauge className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-600 text-sm font-medium">No machines added yet</p>
                            <Link href="/admin/production-planning/machines" className="text-xs text-brand-blue hover:underline mt-1 inline-block">
                                Add your first machine
                            </Link>
                        </div>
                    )}
                    {!loadingCapacity && capacity.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {capacity.map((row) => (
                                <div key={row.machine_id} className="bg-white rounded-xl border border-gray-200 p-4">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{row.machine_name}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {row.current_load}{row.capacity ? ` / ${row.capacity}` : ""} active
                                    </p>
                                    {row.utilization_pct !== null && (
                                        <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${row.utilization_pct >= 90 ? "bg-red-500" : row.utilization_pct >= 60 ? "bg-yellow-500" : "bg-green-500"}`}
                                                style={{ width: `${Math.min(100, row.utilization_pct)}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section>
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Outsourcing (Vendors)</h2>
                    {loadingOutsourcing && <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>}
                    {!loadingOutsourcing && outsourcing && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                                {Object.entries(outsourcing.purchase_orders_by_status).map(([statusCode, count]) => (
                                    <div key={statusCode} className="bg-white rounded-lg border border-gray-200 px-3 py-2">
                                        <p className="text-xs text-gray-400">{statusCode.replace(/_/g, " ")}</p>
                                        <p className="text-sm font-semibold text-gray-900">{count}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                                {outsourcing.vendor_capacity.length === 0 && (
                                    <div className="text-center py-10 text-sm text-gray-400">
                                        <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        No vendors registered yet.
                                    </div>
                                )}
                                {outsourcing.vendor_capacity.map((v) => (
                                    <div key={v.vendor_id} className="flex items-center justify-between px-4 py-3">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{v.vendor_name}</p>
                                            <p className="text-xs text-gray-400">{v.current_workload} / {v.max_concurrent_jobs} jobs</p>
                                        </div>
                                        <StatusPill
                                            label={v.is_at_capacity ? "At Capacity" : `${v.workload_percentage}%`}
                                            tone={v.is_at_capacity ? "danger" : v.workload_percentage >= 70 ? "warning" : "success"}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </AdminLayout>
    );
}
