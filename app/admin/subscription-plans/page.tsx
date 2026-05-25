"use client";

import { useState, type ReactElement } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/admin-layout";
import {
    Plus, Pencil, Trash2, Loader2, CheckCircle, XCircle,
    Star, Users, Zap, Globe, CreditCard, X, GripVertical,
} from "lucide-react";
import {
    fetchAdminPlans,
    createPlan,
    updatePlan,
    deletePlan,
    type AdminPlan,
    type PlanPayload,
} from "@/services/admin-subscription-plans";

// ─── helpers ───────────────────────────────────────────────────────────────

function slugifyLocal(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const EMPTY_FORM: PlanPayload = {
    name: "",
    slug: "",
    description: "",
    price_monthly: "",
    price_annually: "",
    max_users: 5,
    api_access: false,
    white_label: false,
    features: [],
    is_active: true,
    is_featured: false,
    sort_order: 0,
};

function StatusPill({ active }: { active: boolean }): ReactElement {
    return active ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" /> Active
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
            <XCircle className="w-3 h-3" /> Inactive
        </span>
    );
}

// ─── Plan Form Modal ────────────────────────────────────────────────────────

interface PlanModalProps {
    initial: PlanPayload | null;
    onSave: (payload: PlanPayload) => void;
    onClose: () => void;
    saving: boolean;
}

function PlanModal({ initial, onSave, onClose, saving }: PlanModalProps): ReactElement {
    const [form, setForm] = useState<PlanPayload>(initial ?? EMPTY_FORM);
    const [featureInput, setFeatureInput] = useState("");
    const isEdit = initial !== null;

    function set<K extends keyof PlanPayload>(key: K, value: PlanPayload[K]) {
        setForm((prev) => ({
            ...prev,
            [key]: value,
            ...(key === "name" && !isEdit ? { slug: slugifyLocal(value as string) } : {}),
        }));
    }

    function addFeature() {
        const val = featureInput.trim();
        if (val && !form.features.includes(val)) {
            set("features", [...form.features, val]);
        }
        setFeatureInput("");
    }

    function removeFeature(f: string) {
        set("features", form.features.filter((x) => x !== f));
    }

    function handleFeatureKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter") { e.preventDefault(); addFeature(); }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        onSave(form);
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {isEdit ? "Edit Plan" : "New Subscription Plan"}
                    </h2>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Name + Slug */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Plan Name <span className="text-red-500">*</span></label>
                            <input
                                required
                                type="text"
                                value={form.name}
                                onChange={(e) => set("name", e.target.value)}
                                placeholder="e.g. Starter"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Slug <span className="text-red-500">*</span></label>
                            <input
                                required
                                type="text"
                                value={form.slug}
                                onChange={(e) => set("slug", e.target.value)}
                                placeholder="e.g. starter"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent font-mono"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Description</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => set("description", e.target.value)}
                            rows={2}
                            placeholder="Short description shown on the pricing page"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-none"
                        />
                    </div>

                    {/* Pricing */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Monthly Price (KES) <span className="text-red-500">*</span></label>
                            <input
                                required
                                type="number"
                                min={0}
                                step="0.01"
                                value={form.price_monthly}
                                onChange={(e) => set("price_monthly", e.target.value)}
                                placeholder="2500"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Annual Price (KES) <span className="text-red-500">*</span></label>
                            <input
                                required
                                type="number"
                                min={0}
                                step="0.01"
                                value={form.price_annually}
                                onChange={(e) => set("price_annually", e.target.value)}
                                placeholder="24000"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Limits */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Max Users</label>
                            <input
                                type="number"
                                min={1}
                                value={form.max_users}
                                onChange={(e) => set("max_users", Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Sort Order</label>
                            <input
                                type="number"
                                min={0}
                                value={form.sort_order}
                                onChange={(e) => set("sort_order", Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Features</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={featureInput}
                                onChange={(e) => setFeatureInput(e.target.value)}
                                onKeyDown={handleFeatureKeyDown}
                                placeholder="Add a feature and press Enter"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                            />
                            <button
                                type="button"
                                onClick={addFeature}
                                className="px-3 py-2 bg-brand-blue text-white rounded-lg text-sm hover:opacity-90 transition-opacity"
                            >
                                Add
                            </button>
                        </div>
                        {form.features.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {form.features.map((f) => (
                                    <span key={f} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-blue/10 text-brand-blue text-xs rounded-full">
                                        {f}
                                        <button type="button" onClick={() => removeFeature(f)} className="hover:text-red-500 transition-colors">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Toggles */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                        {([
                            { key: "is_active", label: "Active", icon: CheckCircle },
                            { key: "is_featured", label: "Featured", icon: Star },
                            { key: "api_access", label: "API Access", icon: Zap },
                            { key: "white_label", label: "White-label", icon: Globe },
                        ] as const).map(({ key, label, icon: Icon }) => (
                            <label
                                key={key}
                                className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                    form[key] ? "border-brand-blue bg-brand-blue/5" : "border-gray-200"
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={form[key] as boolean}
                                    onChange={(e) => set(key, e.target.checked)}
                                />
                                <Icon className={`w-4 h-4 ${form[key] ? "text-brand-blue" : "text-gray-400"}`} />
                                <span className={`text-xs font-medium ${form[key] ? "text-brand-blue" : "text-gray-500"}`}>{label}</span>
                            </label>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isEdit ? "Save Changes" : "Create Plan"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Delete Confirm Modal ───────────────────────────────────────────────────

function DeleteModal({ plan, onConfirm, onClose, deleting }: {
    plan: AdminPlan;
    onConfirm: () => void;
    onClose: () => void;
    deleting: boolean;
}): ReactElement {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                        <Trash2 className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Delete &quot;{plan.name}&quot;?</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {plan.subscriber_count > 0
                                ? `This plan has ${plan.subscriber_count} active subscriber${plan.subscriber_count !== 1 ? "s" : ""}. You cannot delete it — deactivate it instead.`
                                : "This action cannot be undone."}
                        </p>
                    </div>
                </div>
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                        Cancel
                    </button>
                    {plan.subscriber_count === 0 && (
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={deleting}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
                        >
                            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Delete
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function SubscriptionPlansPage(): ReactElement {
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<AdminPlan | null>(null);
    const [deletingPlan, setDeletingPlan] = useState<AdminPlan | null>(null);

    const { data: plans = [], isLoading, isError } = useQuery({
        queryKey: ["admin-subscription-plans"],
        queryFn: fetchAdminPlans,
    });

    const createMutation = useMutation({
        mutationFn: createPlan,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
            toast.success("Plan created successfully");
            setModalOpen(false);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: Partial<PlanPayload> }) =>
            updatePlan(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
            toast.success("Plan updated");
            setEditingPlan(null);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => deletePlan(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
            toast.success("Plan deleted");
            setDeletingPlan(null);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    function handleSave(payload: PlanPayload) {
        if (editingPlan) {
            updateMutation.mutate({ id: editingPlan.id, payload });
        } else {
            createMutation.mutate(payload);
        }
    }

    function openEdit(plan: AdminPlan) {
        setEditingPlan(plan);
    }

    function closeModal() {
        setModalOpen(false);
        setEditingPlan(null);
    }

    const isSaving = createMutation.isPending || updateMutation.isPending;

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 lg:px-8 py-4 lg:py-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Manage the plans available to business subscribers
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                    >
                        <Plus className="w-4 h-4" />
                        Add Plan
                    </button>
                </div>
            </header>

            <div className="p-4 lg:p-8">
                {isLoading && (
                    <div className="grid grid-cols-1 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-2">
                                        <div className="h-5 w-32 bg-gray-200 rounded" />
                                        <div className="h-3 w-56 bg-gray-200 rounded" />
                                    </div>
                                    <div className="h-8 w-24 bg-gray-200 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {isError && (
                    <div className="text-center py-16 text-gray-500 text-sm">
                        Failed to load plans. Please refresh.
                    </div>
                )}

                {!isLoading && !isError && plans.length === 0 && (
                    <div className="text-center py-20">
                        <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">No subscription plans yet</p>
                        <p className="text-sm text-gray-400 mt-1">Create your first plan to offer to business subscribers.</p>
                        <button
                            type="button"
                            onClick={() => setModalOpen(true)}
                            className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                        >
                            <Plus className="w-4 h-4" /> Create first plan
                        </button>
                    </div>
                )}

                {!isLoading && plans.length > 0 && (
                    <div className="space-y-4">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                className={`bg-white rounded-xl border-2 p-5 transition-all ${
                                    plan.is_featured ? "border-brand-yellow" : plan.is_active ? "border-gray-200" : "border-gray-100 opacity-60"
                                }`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <GripVertical className="w-4 h-4 text-gray-300 mt-1 shrink-0" />
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                                                <StatusPill active={plan.is_active} />
                                                {plan.is_featured && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                                        <Star className="w-3 h-3" /> Featured
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 mt-0.5 truncate">{plan.description}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => openEdit(plan)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            <Pencil className="w-3.5 h-3.5" /> Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDeletingPlan(plan)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                                        <p className="text-xs text-gray-400">Monthly</p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            KES {Number(plan.price_monthly).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                                        <p className="text-xs text-gray-400">Annual</p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            KES {Number(plan.price_annually).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 px-3 py-2 flex items-center gap-2">
                                        <Users className="w-3.5 h-3.5 text-brand-blue" />
                                        <div>
                                            <p className="text-xs text-gray-400">Max users</p>
                                            <p className="text-sm font-semibold text-gray-900">{plan.max_users}</p>
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                                        <p className="text-xs text-gray-400">Active subscribers</p>
                                        <p className="text-sm font-semibold text-gray-900">{plan.subscriber_count}</p>
                                    </div>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    {plan.features.map((f) => (
                                        <span key={f} className="px-2 py-0.5 bg-brand-blue/10 text-brand-blue text-xs rounded-full">
                                            {f}
                                        </span>
                                    ))}
                                    {plan.api_access && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                            <Zap className="w-3 h-3" /> API
                                        </span>
                                    )}
                                    {plan.white_label && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                                            <Globe className="w-3 h-3" /> White-label
                                        </span>
                                    )}
                                </div>

                                {/* Quick toggles */}
                                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-4">
                                    <button
                                        type="button"
                                        onClick={() => updateMutation.mutate({ id: plan.id, payload: { is_active: !plan.is_active } })}
                                        className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                    >
                                        {plan.is_active ? "Deactivate" : "Activate"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateMutation.mutate({ id: plan.id, payload: { is_featured: !plan.is_featured } })}
                                        className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                    >
                                        {plan.is_featured ? "Unfeature" : "Mark as Featured"}
                                    </button>
                                    <span className="text-xs text-gray-300 ml-auto">
                                        Sort order: {plan.sort_order}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create / Edit modal */}
            {(modalOpen || editingPlan) && (
                <PlanModal
                    initial={editingPlan
                        ? {
                            name: editingPlan.name,
                            slug: editingPlan.slug,
                            description: editingPlan.description,
                            price_monthly: editingPlan.price_monthly,
                            price_annually: editingPlan.price_annually,
                            max_users: editingPlan.max_users,
                            api_access: editingPlan.api_access,
                            white_label: editingPlan.white_label,
                            features: editingPlan.features,
                            is_active: editingPlan.is_active,
                            is_featured: editingPlan.is_featured,
                            sort_order: editingPlan.sort_order,
                        }
                        : null
                    }
                    onSave={handleSave}
                    onClose={closeModal}
                    saving={isSaving}
                />
            )}

            {/* Delete modal */}
            {deletingPlan && (
                <DeleteModal
                    plan={deletingPlan}
                    onConfirm={() => deleteMutation.mutate(deletingPlan.id)}
                    onClose={() => setDeletingPlan(null)}
                    deleting={deleteMutation.isPending}
                />
            )}
        </AdminLayout>
    );
}
