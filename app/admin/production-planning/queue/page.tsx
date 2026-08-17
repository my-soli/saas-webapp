"use client";

import { useState, type ReactElement } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import AdminLayout from "@/components/admin/admin-layout";
import StatusPill from "@/components/admin/status-pill";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { fetchMachines } from "@/services/machines";
import {
    fetchAssignments,
    fetchAssignableJobProducts,
    createAssignment,
    cancelAssignment,
    type AssignableJobProduct,
} from "@/services/machine-assignments";

function AssignModal({ jobProduct, onClose }: { jobProduct: AssignableJobProduct; onClose: () => void }): ReactElement {
    const queryClient = useQueryClient();
    const { data: machines = [] } = useQuery({ queryKey: ["machines"], queryFn: fetchMachines });
    const [machineId, setMachineId] = useState<number | "">("");
    const [scheduledDate, setScheduledDate] = useState("");

    const assignMutation = useMutation({
        mutationFn: () => createAssignment({
            job_product: jobProduct.id,
            machine: machineId as number,
            scheduled_date: scheduledDate || null,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["machine-assignments"] });
            toast.success("Assigned to machine");
            onClose();
        },
        onError: (e: Error) => toast.error(e.message),
    });

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Assign to Machine</h2>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <p className="text-sm font-medium text-gray-900">{jobProduct.product_name}</p>
                        <p className="text-xs text-gray-400">{jobProduct.job_number ? `Job ${jobProduct.job_number}` : ""} · Qty {jobProduct.quantity}</p>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Machine <span className="text-red-500">*</span></label>
                        <select value={machineId} onChange={(e) => setMachineId(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent">
                            <option value="">Select a machine…</option>
                            {machines.map((m) => (
                                <option key={m.id} value={m.id}>{m.name} ({m.current_load}{m.daily_capacity_units ? `/${m.daily_capacity_units}` : ""})</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Scheduled Date</label>
                        <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                            Cancel
                        </button>
                        <button type="button" disabled={!machineId || assignMutation.isPending}
                            onClick={() => assignMutation.mutate()}
                            className="flex items-center gap-2 px-5 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">
                            {assignMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Assign
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ProductionQueuePage(): ReactElement {
    const queryClient = useQueryClient();
    const [assigningProduct, setAssigningProduct] = useState<AssignableJobProduct | null>(null);

    const { data: jobProducts = [], isLoading: loadingProducts } = useQuery({
        queryKey: ["assignable-job-products"],
        queryFn: fetchAssignableJobProducts,
    });

    const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
        queryKey: ["machine-assignments"],
        queryFn: () => fetchAssignments(),
    });

    const cancelMutation = useMutation({
        mutationFn: cancelAssignment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["machine-assignments"] });
            toast.success("Assignment cancelled");
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const assignedJobProductIds = new Set(
        assignments.filter((a) => a.status === "scheduled" || a.status === "in_progress").map((a) => a.job_product)
    );
    const unassigned = jobProducts.filter((jp) => !assignedJobProductIds.has(jp.id));

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4 lg:py-6">
                    <Link href="/admin/production-planning" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-1">
                        <ArrowLeft className="w-3.5 h-3.5" /> Production Planning
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">Assignment Queue</h1>
                    <p className="mt-1 text-sm text-gray-500">Assign internal job components to machines</p>
                </div>
            </header>

            <div className="p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Unassigned Components</h2>
                    {loadingProducts && <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>}
                    {!loadingProducts && unassigned.length === 0 && (
                        <div className="text-sm text-gray-400 py-8 text-center bg-white rounded-xl border border-gray-200">
                            All internal components are assigned.
                        </div>
                    )}
                    <div className="space-y-2">
                        {unassigned.map((jp) => (
                            <div key={jp.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{jp.product_name}</p>
                                    <p className="text-xs text-gray-400">{jp.job_number ? `Job ${jp.job_number}` : ""} · Qty {jp.quantity}</p>
                                </div>
                                <button type="button" onClick={() => setAssigningProduct(jp)}
                                    className="shrink-0 px-3 py-1.5 bg-brand-blue text-white text-xs font-medium rounded-lg hover:opacity-90 transition-opacity">
                                    Assign
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Active Assignments</h2>
                    {loadingAssignments && <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>}
                    {!loadingAssignments && assignments.filter((a) => a.status !== "cancelled").length === 0 && (
                        <div className="text-sm text-gray-400 py-8 text-center bg-white rounded-xl border border-gray-200">
                            No active assignments yet.
                        </div>
                    )}
                    <div className="space-y-2">
                        {assignments.filter((a) => a.status !== "cancelled").map((a) => (
                            <div key={a.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{a.job_product_name}</p>
                                    <p className="text-xs text-gray-400">
                                        {a.machine_name}{a.scheduled_date ? ` · ${a.scheduled_date}` : ""}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <StatusPill
                                        label={a.status_display}
                                        tone={a.status === "completed" ? "success" : a.status === "in_progress" ? "warning" : "neutral"}
                                    />
                                    <button type="button" onClick={() => cancelMutation.mutate(a.id)}
                                        className="text-xs text-red-500 hover:text-red-700 transition-colors">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {assigningProduct && (
                <AssignModal jobProduct={assigningProduct} onClose={() => setAssigningProduct(null)} />
            )}
        </AdminLayout>
    );
}
