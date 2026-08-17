"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BikeIcon, PlusIcon, PencilIcon, Trash2Icon, XIcon, CheckIcon, LoaderCircleIcon, SearchIcon, PackageIcon } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/admin-layout";
import { fetchRiders, createRider, updateRider, deleteRider, type Rider, type RiderPayload } from "@/services/riders";

const VEHICLE_TYPES = [
    { value: "", label: "— Not specified —" },
    { value: "motorcycle", label: "Motorcycle" },
    { value: "bicycle", label: "Bicycle" },
    { value: "car", label: "Car" },
    { value: "van", label: "Van" },
    { value: "on_foot", label: "On Foot" },
];

const EMPTY_FORM: RiderPayload = {
    name: "", phone: "", id_number: "", vehicle_type: "",
    vehicle_plate: "", area_coverage: "", is_active: true, notes: "",
};

function RiderModal({ rider, onClose }: { rider?: Rider; onClose: () => void }): ReactElement {
    const queryClient = useQueryClient();
    const isEdit = !!rider;
    const [form, setForm] = useState<RiderPayload>(
        rider ? {
            name: rider.name, phone: rider.phone, id_number: rider.id_number,
            vehicle_type: rider.vehicle_type, vehicle_plate: rider.vehicle_plate,
            area_coverage: rider.area_coverage, is_active: rider.is_active, notes: rider.notes,
        } : EMPTY_FORM
    );
    const [error, setError] = useState("");

    const set = (k: keyof RiderPayload, v: string | boolean) =>
        setForm((p) => ({ ...p, [k]: v }));

    const mut = useMutation({
        mutationFn: () => isEdit ? updateRider(rider!.id, form) : createRider(form),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["riders"] });
            toast.success(isEdit ? "Rider updated." : "Rider added.");
            onClose();
        },
        onError: (e: Error) => setError(e.message),
    });

    const handleSubmit = () => {
        setError("");
        if (!form.name.trim()) { setError("Name is required."); return; }
        mut.mutate();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <BikeIcon className="h-5 w-5 text-brand-blue" />
                        <h2 className="text-lg font-bold text-gray-900">{isEdit ? `Edit ${rider!.name}` : "Add Rider"}</h2>
                    </div>
                    <button onClick={onClose} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>
                <div className="overflow-y-auto px-6 py-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Full Name *</label>
                            <input value={form.name} onChange={(e) => set("name", e.target.value)}
                                placeholder="e.g. John Kamau"
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Phone</label>
                            <input value={form.phone} onChange={(e) => set("phone", e.target.value)}
                                placeholder="+254 7XX XXX XXX"
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">ID / Staff Number</label>
                            <input value={form.id_number} onChange={(e) => set("id_number", e.target.value)}
                                placeholder="National ID or staff ID"
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Vehicle Type</label>
                            <select value={form.vehicle_type} onChange={(e) => set("vehicle_type", e.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none">
                                {VEHICLE_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Vehicle Plate</label>
                        <input value={form.vehicle_plate} onChange={(e) => set("vehicle_plate", e.target.value)}
                            placeholder="e.g. KAB 123A"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Area Coverage</label>
                        <input value={form.area_coverage} onChange={(e) => set("area_coverage", e.target.value)}
                            placeholder="e.g. Westlands, CBD, Karen"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Notes</label>
                        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)}
                            rows={2} placeholder="Any additional notes…"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none resize-none" />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.is_active}
                            onChange={(e) => set("is_active", e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-brand-blue" />
                        <span className="text-sm text-gray-700 font-medium">Active rider</span>
                    </label>
                    {error && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                            {error}
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                    <button onClick={onClose}
                        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={mut.isPending}
                        className="flex items-center gap-2 rounded-lg bg-brand-blue px-5 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-50 transition-colors">
                        {mut.isPending
                            ? <><LoaderCircleIcon className="h-4 w-4 animate-spin" /> Saving…</>
                            : <><CheckIcon className="h-4 w-4" /> {isEdit ? "Save Changes" : "Add Rider"}</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AdminRidersPage(): ReactElement {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editRider, setEditRider] = useState<Rider | null>(null);
    const [search, setSearch] = useState("");

    const { data: riders = [], isLoading } = useQuery({
        queryKey: ["riders"],
        queryFn: fetchRiders,
        refetchInterval: 60_000,
    });

    const deleteMut = useMutation({
        mutationFn: (id: number) => deleteRider(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["riders"] });
            toast.success("Rider removed.");
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const filtered = search.trim()
        ? riders.filter((r) => {
            const q = search.toLowerCase();
            return r.name.toLowerCase().includes(q) ||
                r.phone.includes(q) ||
                r.area_coverage.toLowerCase().includes(q) ||
                r.vehicle_plate.toLowerCase().includes(q);
          })
        : riders;

    const activeCount = riders.filter((r) => r.is_active).length;
    const totalDispatches = riders.reduce((s, r) => s + r.dispatch_count, 0);
    const totalDelivered = riders.reduce((s, r) => s + r.delivered_count, 0);

    return (
        <AdminLayout>
            {(showModal || editRider) && (
                <RiderModal
                    rider={editRider ?? undefined}
                    onClose={() => { setShowModal(false); setEditRider(null); }}
                />
            )}

            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <BikeIcon className="h-6 w-6 text-brand-blue" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Rider Database</h1>
                            <p className="mt-0.5 text-sm text-gray-500">Manage riders, track deliveries, and view workload metrics</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            <input value={search} onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search riders…"
                                className="pl-9 pr-3 py-2 rounded-md border border-gray-200 text-sm focus:border-brand-blue focus:outline-none w-48" />
                        </div>
                        <button onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 transition-colors">
                            <PlusIcon className="h-4 w-4" />
                            Add Rider
                        </button>
                    </div>
                </div>
            </header>

            <main className="min-h-screen bg-gray-50 p-8 space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: "Active Riders", value: activeCount, color: "bg-brand-blue" },
                        { label: "Total Dispatches", value: totalDispatches, color: "bg-brand-orange" },
                        { label: "Deliveries Completed", value: totalDelivered, color: "bg-brand-green" },
                    ].map((k) => (
                        <article key={k.label} className="relative overflow-hidden rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
                            <div className={`absolute top-0 left-0 right-0 h-1 ${k.color}`} />
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{k.label}</p>
                            <p className="mt-2 text-3xl font-extrabold text-gray-900">{k.value}</p>
                        </article>
                    ))}
                </div>

                {/* Table */}
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Rider</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Vehicle</th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Area Coverage</th>
                                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">Dispatches</th>
                                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">Delivered</th>
                                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
                                <th className="px-5 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading && (
                                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">
                                    <LoaderCircleIcon className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-300" />
                                    Loading riders…
                                </td></tr>
                            )}
                            {!isLoading && filtered.length === 0 && (
                                <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">
                                    <PackageIcon className="h-8 w-8 mx-auto mb-2 text-gray-200" />
                                    {search ? "No riders match your search." : "No riders yet. Add one to get started."}
                                </td></tr>
                            )}
                            {filtered.map((r) => (
                                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-5 py-3">
                                        <p className="font-semibold text-gray-800">{r.name}</p>
                                        <p className="text-xs text-gray-400">{r.phone || "—"}{r.id_number ? ` · ID: ${r.id_number}` : ""}</p>
                                    </td>
                                    <td className="px-5 py-3 text-gray-600">
                                        <p>{r.vehicle_type_display || "—"}</p>
                                        {r.vehicle_plate && <p className="text-xs text-gray-400 font-mono">{r.vehicle_plate}</p>}
                                    </td>
                                    <td className="px-5 py-3 text-gray-600 max-w-[200px]">
                                        <p className="truncate">{r.area_coverage || "—"}</p>
                                    </td>
                                    <td className="px-5 py-3 text-center font-semibold text-gray-700">{r.dispatch_count}</td>
                                    <td className="px-5 py-3 text-center font-semibold text-brand-green">{r.delivered_count}</td>
                                    <td className="px-5 py-3 text-center">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.is_active ? "bg-brand-green/10 text-brand-green" : "bg-gray-100 text-gray-400"}`}>
                                            {r.is_active ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-2 justify-end">
                                            <button onClick={() => setEditRider(r)}
                                                className="rounded-md border border-gray-200 p-1.5 text-gray-400 hover:border-brand-blue hover:text-brand-blue transition-colors">
                                                <PencilIcon className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm(`Remove ${r.name} from the rider database?`))
                                                        deleteMut.mutate(r.id);
                                                }}
                                                disabled={deleteMut.isPending}
                                                className="rounded-md border border-gray-200 p-1.5 text-gray-400 hover:border-red-400 hover:text-red-500 transition-colors disabled:opacity-40">
                                                <Trash2Icon className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </AdminLayout>
    );
}
