"use client";

import { useState, type ReactElement } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import AdminLayout from "@/components/admin/admin-layout";
import StatusPill from "@/components/admin/status-pill";
import { Plus, Pencil, Trash2, Loader2, X, ArrowLeft, Percent, Tag } from "lucide-react";
import {
    fetchTaxConfigurations,
    createTaxConfiguration,
    updateTaxConfiguration,
    deleteTaxConfiguration,
    TAX_TYPE_OPTIONS,
    REGION_TYPE_OPTIONS,
    type TaxConfiguration,
    type TaxConfigurationPayload,
} from "@/services/tax-configurations";

const EMPTY_FORM: TaxConfigurationPayload = {
    name: "",
    tax_type: "vat",
    rate: "16.00" as unknown as string,
    region_type: "country",
    country: "Kenya",
    state_province: "",
    city: "",
    postal_code: "",
    is_active: true,
    applies_to_b2b: true,
    applies_to_b2c: true,
    exempt_product_categories: [],
    exempt_business_types: [],
};

function TagListInput({ label, placeholder, values, onChange }: {
    label: string;
    placeholder: string;
    values: string[];
    onChange: (values: string[]) => void;
}): ReactElement {
    const [draft, setDraft] = useState("");

    function addTag() {
        const trimmed = draft.trim();
        if (trimmed && !values.includes(trimmed)) onChange([...values, trimmed]);
        setDraft("");
    }

    return (
        <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">{label}</label>
            <div className="flex gap-2">
                <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    placeholder={placeholder}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                <button type="button" onClick={addTag}
                    className="px-3 rounded-lg border border-gray-200 text-gray-500 hover:text-brand-blue hover:border-brand-blue transition-colors">
                    <Tag className="w-4 h-4" />
                </button>
            </div>
            {values.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {values.map((v) => (
                        <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {v}
                            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="hover:text-red-500">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

function TaxConfigModal({ initial, onSave, onClose, saving }: {
    initial: TaxConfigurationPayload | null;
    onSave: (payload: TaxConfigurationPayload) => void;
    onClose: () => void;
    saving: boolean;
}): ReactElement {
    const [form, setForm] = useState<TaxConfigurationPayload>(initial ?? EMPTY_FORM);
    const isEdit = initial !== null;

    function set<K extends keyof TaxConfigurationPayload>(key: K, value: TaxConfigurationPayload[K]) {
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
                    <h2 className="text-lg font-semibold text-gray-900">{isEdit ? "Edit Tax Rate" : "Add Tax Rate"}</h2>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
                        <input required type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
                            placeholder="e.g. Kenya VAT Standard"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Tax Type</label>
                            <select value={form.tax_type} onChange={(e) => set("tax_type", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent bg-white">
                                {TAX_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Rate (%) <span className="text-red-500">*</span></label>
                            <input required type="number" min={0} step="0.01" value={form.rate}
                                onChange={(e) => set("rate", e.target.value as unknown as string)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Region Type</label>
                            <select value={form.region_type} onChange={(e) => set("region_type", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent bg-white">
                                {REGION_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Country</label>
                            <input type="text" value={form.country} onChange={(e) => set("country", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">State/Province</label>
                            <input type="text" value={form.state_province} onChange={(e) => set("state_province", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">City</label>
                            <input type="text" value={form.city} onChange={(e) => set("city", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent" />
                        </div>
                    </div>
                    <TagListInput
                        label="Exempt Product Categories (optional)"
                        placeholder="e.g. books — press Enter to add"
                        values={form.exempt_product_categories}
                        onChange={(v) => set("exempt_product_categories", v)}
                    />
                    <TagListInput
                        label="Exempt Business Types (optional)"
                        placeholder="e.g. NGO — press Enter to add"
                        values={form.exempt_business_types}
                        onChange={(v) => set("exempt_business_types", v)}
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                        {([
                            { key: "is_active", label: "Active" },
                            { key: "applies_to_b2b", label: "Applies to B2B" },
                            { key: "applies_to_b2c", label: "Applies to B2C" },
                        ] as const).map(({ key, label }) => (
                            <label key={key}
                                className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                    form[key] ? "border-brand-blue bg-brand-blue/5" : "border-gray-200"
                                }`}>
                                <input type="checkbox" className="sr-only" checked={form[key] as boolean}
                                    onChange={(e) => set(key, e.target.checked)} />
                                <span className={`text-xs font-medium ${form[key] ? "text-brand-blue" : "text-gray-500"}`}>{label}</span>
                            </label>
                        ))}
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isEdit ? "Save Changes" : "Add Tax Rate"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function TaxSettingsPage(): ReactElement {
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState<TaxConfiguration | null>(null);
    const [deletingConfig, setDeletingConfig] = useState<TaxConfiguration | null>(null);

    const { data: configs = [], isLoading, isError } = useQuery({
        queryKey: ["tax-configurations"],
        queryFn: fetchTaxConfigurations,
    });

    const createMutation = useMutation({
        mutationFn: createTaxConfiguration,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tax-configurations"] });
            toast.success("Tax rate added");
            setModalOpen(false);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: Partial<TaxConfigurationPayload> }) => updateTaxConfiguration(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tax-configurations"] });
            toast.success("Tax rate updated");
            setEditingConfig(null);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => deleteTaxConfiguration(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tax-configurations"] });
            toast.success("Tax rate removed");
            setDeletingConfig(null);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    function handleSave(payload: TaxConfigurationPayload) {
        if (editingConfig) {
            updateMutation.mutate({ id: editingConfig.id, payload });
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
                        <Link href="/admin/financial" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-1">
                            <ArrowLeft className="w-3.5 h-3.5" /> Invoices
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">Tax Settings</h1>
                        <p className="mt-1 text-sm text-gray-500">Region-based tax rates used by pricing and invoicing</p>
                    </div>
                    <button type="button" onClick={() => setModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
                        <Plus className="w-4 h-4" /> Add Tax Rate
                    </button>
                </div>
            </header>

            <div className="p-4 lg:p-8">
                {isLoading && <div className="text-center py-16 text-gray-400 text-sm">Loading tax rates…</div>}
                {isError && <div className="text-center py-16 text-gray-500 text-sm">Failed to load tax rates. Please refresh.</div>}

                {!isLoading && !isError && configs.length === 0 && (
                    <div className="text-center py-20">
                        <Percent className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">No tax rates configured yet</p>
                        <p className="text-sm text-gray-400 mt-1">Add a tax rate to start applying it in pricing and invoicing.</p>
                    </div>
                )}

                {!isLoading && configs.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {configs.map((c) => (
                            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-gray-900 truncate">{c.name}</h3>
                                        <p className="text-xs text-gray-400">{TAX_TYPE_OPTIONS.find((o) => o.value === c.tax_type)?.label}</p>
                                    </div>
                                    <StatusPill label={c.is_active ? "Active" : "Inactive"} tone={c.is_active ? "success" : "neutral"} />
                                </div>
                                <p className="mt-3 text-2xl font-extrabold text-gray-900">{Number(c.rate).toFixed(2)}%</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {[c.city, c.state_province, c.country].filter(Boolean).join(", ")}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {c.applies_to_b2b && <span className="px-2 py-0.5 bg-brand-blue/10 text-brand-blue text-xs rounded-full">B2B</span>}
                                    {c.applies_to_b2c && <span className="px-2 py-0.5 bg-brand-blue/10 text-brand-blue text-xs rounded-full">B2C</span>}
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                                    <button type="button" onClick={() => setEditingConfig(c)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                        <Pencil className="w-3.5 h-3.5" /> Edit
                                    </button>
                                    <button type="button" onClick={() => setDeletingConfig(c)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-100 rounded-lg hover:bg-red-50 transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {(modalOpen || editingConfig) && (
                <TaxConfigModal
                    initial={editingConfig ? {
                        name: editingConfig.name,
                        tax_type: editingConfig.tax_type,
                        rate: editingConfig.rate,
                        region_type: editingConfig.region_type,
                        country: editingConfig.country,
                        state_province: editingConfig.state_province,
                        city: editingConfig.city,
                        postal_code: editingConfig.postal_code,
                        is_active: editingConfig.is_active,
                        applies_to_b2b: editingConfig.applies_to_b2b,
                        applies_to_b2c: editingConfig.applies_to_b2c,
                        exempt_product_categories: editingConfig.exempt_product_categories,
                        exempt_business_types: editingConfig.exempt_business_types,
                    } : null}
                    onSave={handleSave}
                    onClose={() => { setModalOpen(false); setEditingConfig(null); }}
                    saving={isSaving}
                />
            )}

            {deletingConfig && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                <Trash2 className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Delete &quot;{deletingConfig.name}&quot;?</h3>
                                <p className="text-sm text-gray-500 mt-0.5">This action cannot be undone.</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setDeletingConfig(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                                Cancel
                            </button>
                            <button type="button" onClick={() => deleteMutation.mutate(deletingConfig.id)} disabled={deleteMutation.isPending}
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
