"use client";

import { useState, type ReactElement } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import AdminLayout from "@/components/admin/admin-layout";
import StatusPill from "@/components/admin/status-pill";
import { Plus, Pencil, Trash2, Loader2, X, ArrowLeft, Gauge } from "lucide-react";
import {
    fetchMachines,
    createMachine,
    updateMachine,
    deleteMachine,
    type Machine,
    type MachinePayload,
} from "@/services/machines";

const MACHINE_TYPES = [
    ["digital_press", "Digital Press"],
    ["offset_press", "Offset Press"],
    ["large_format", "Large Format Printer"],
    ["embroidery", "Embroidery Machine"],
    ["dtf", "DTF Printer"],
    ["uv_printer", "UV Printer"],
    ["engraver", "Engraving/Laser"],
    ["finishing", "Finishing"],
    ["other", "Other"],
];

const EMPTY_FORM: MachinePayload = {
    name: "",
    machine_type: "other",
    code: "",
    location: "",
    daily_capacity_units: 0,
    capacity_unit_label: "pcs",
    status: "active",
    is_active: true,
    notes: "",
};

function MachineModal({ initial, onSave, onClose, saving }: {
    initial: MachinePayload | null;
    onSave: (payload: MachinePayload) => void;
    onClose: () => void;
    saving: boolean;
}): ReactElement {
    const [form, setForm] = useState<MachinePayload>(initial ?? EMPTY_FORM);
    const isEdit = initial !== null;

    function set<K extends keyof MachinePayload>(key: K, value: MachinePayload[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        onSave(form);
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">{isEdit ? "Edit Machine" : "Add Machine"}</h2>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
                            <input required type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
                                placeholder="e.g. Digital Press 1"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Code</label>
                            <input type="text" value={form.code} onChange={(e) => set("code", e.target.value)}
                                placeholder="e.g. DP-01"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent font-mono" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Type</label>
                        <select value={form.machine_type} onChange={(e) => set("machine_type", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent">
                            {MACHINE_TYPES.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Location</label>
                        <input type="text" value={form.location} onChange={(e) => set("location", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Daily Capacity</label>
                            <input type="number" min={0} value={form.daily_capacity_units}
                                onChange={(e) => set("daily_capacity_units", Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Capacity Unit</label>
                            <input type="text" value={form.capacity_unit_label} onChange={(e) => set("capacity_unit_label", e.target.value)}
                                placeholder="pcs, sheets, meters"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Status</label>
                        <select value={form.status} onChange={(e) => set("status", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent">
                            <option value="active">Active</option>
                            <option value="maintenance">Under Maintenance</option>
                            <option value="offline">Offline</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Notes</label>
                        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-none" />
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isEdit ? "Save Changes" : "Add Machine"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function MachinesPage(): ReactElement {
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
    const [deletingMachine, setDeletingMachine] = useState<Machine | null>(null);

    const { data: machines = [], isLoading, isError } = useQuery({
        queryKey: ["machines"],
        queryFn: fetchMachines,
    });

    const createMutation = useMutation({
        mutationFn: createMachine,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["machines"] });
            toast.success("Machine added");
            setModalOpen(false);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: Partial<MachinePayload> }) => updateMachine(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["machines"] });
            toast.success("Machine updated");
            setEditingMachine(null);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => deleteMachine(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["machines"] });
            toast.success("Machine removed");
            setDeletingMachine(null);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    function handleSave(payload: MachinePayload) {
        if (editingMachine) {
            updateMutation.mutate({ id: editingMachine.id, payload });
        } else {
            createMutation.mutate(payload);
        }
    }

    const isSaving = createMutation.isPending || updateMutation.isPending;

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 lg:px-8 py-4 lg:py-6">
                    <div>
                        <Link href="/admin/production-planning" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-1">
                            <ArrowLeft className="w-3.5 h-3.5" /> Production Planning
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">Machines</h1>
                        <p className="mt-1 text-sm text-gray-500">In-house production machines available for job assignment</p>
                    </div>
                    <button type="button" onClick={() => setModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
                        <Plus className="w-4 h-4" /> Add Machine
                    </button>
                </div>
            </header>

            <div className="p-4 lg:p-8">
                {isLoading && <div className="text-center py-16 text-gray-400 text-sm">Loading machines…</div>}
                {isError && <div className="text-center py-16 text-gray-500 text-sm">Failed to load machines. Please refresh.</div>}

                {!isLoading && !isError && machines.length === 0 && (
                    <div className="text-center py-20">
                        <Gauge className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">No machines yet</p>
                        <p className="text-sm text-gray-400 mt-1">Add your production machines to start assigning jobs to them.</p>
                    </div>
                )}

                {!isLoading && machines.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {machines.map((m) => (
                            <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-5">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-gray-900 truncate">{m.name}</h3>
                                        <p className="text-xs text-gray-400 font-mono">{m.code || "—"}</p>
                                    </div>
                                    <StatusPill
                                        label={m.status_display}
                                        tone={m.status === "active" ? "success" : m.status === "maintenance" ? "warning" : "neutral"}
                                    />
                                </div>
                                <p className="text-sm text-gray-500 mt-2">{m.machine_type_display}{m.location ? ` · ${m.location}` : ""}</p>
                                <div className="mt-4 rounded-lg bg-gray-50 px-3 py-2">
                                    <p className="text-xs text-gray-400">Current load</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {m.current_load}{m.daily_capacity_units ? ` / ${m.daily_capacity_units} ${m.capacity_unit_label}` : ""}
                                        {m.workload_percentage !== null && (
                                            <span className="text-gray-400 font-normal"> ({m.workload_percentage}%)</span>
                                        )}
                                    </p>
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                                    <button type="button" onClick={() => setEditingMachine(m)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                        <Pencil className="w-3.5 h-3.5" /> Edit
                                    </button>
                                    <button type="button" onClick={() => setDeletingMachine(m)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-100 rounded-lg hover:bg-red-50 transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {(modalOpen || editingMachine) && (
                <MachineModal
                    initial={editingMachine ? {
                        name: editingMachine.name,
                        machine_type: editingMachine.machine_type,
                        code: editingMachine.code,
                        location: editingMachine.location,
                        daily_capacity_units: editingMachine.daily_capacity_units,
                        capacity_unit_label: editingMachine.capacity_unit_label,
                        status: editingMachine.status,
                        is_active: editingMachine.is_active,
                        notes: editingMachine.notes,
                    } : null}
                    onSave={handleSave}
                    onClose={() => { setModalOpen(false); setEditingMachine(null); }}
                    saving={isSaving}
                />
            )}

            {deletingMachine && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                <Trash2 className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Delete &quot;{deletingMachine.name}&quot;?</h3>
                                <p className="text-sm text-gray-500 mt-0.5">This action cannot be undone.</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setDeletingMachine(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                                Cancel
                            </button>
                            <button type="button" onClick={() => deleteMutation.mutate(deletingMachine.id)} disabled={deleteMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60">
                                {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
