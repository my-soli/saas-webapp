"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/admin-layout";
import AddTenantModal from "@/components/admin/add-tenant-modal";
import TenantsTable from "@/components/admin/tenants-table";
import Pagination from "@/components/admin/pagination";
import TableSkeleton from "@/components/admin/table-skeleton";
import EmptyState from "@/components/admin/empty-state";
import { fetchTenants, updateTenant, deactivateTenant } from "@/lib/api/tenants";
import type { Tenant } from "@/types/tenant";
import { Plus, Search, AlertTriangle } from "lucide-react";

const PAGE_SIZE = 25;

export default function TenantsPage() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [deactivatingTenant, setDeactivatingTenant] = useState<Tenant | null>(null);

    const { data: tenantsData, isLoading } = useQuery({
        queryKey: ["tenants", page, searchTerm],
        queryFn: () => fetchTenants({ page, search: searchTerm || undefined }),
        retry: 1,
    });

    const toggleActiveMutation = useMutation({
        mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
            updateTenant(id, { is_active }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenants"] }),
    });

    const deactivateMutation = useMutation({
        mutationFn: (id: number) => deactivateTenant(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenants"] }),
    });

    const calculateTotalPages = (totalCount: number) => Math.ceil(totalCount / PAGE_SIZE);

    const handleDeactivateClick = (tenant: Tenant) => {
        if (tenant.is_active) {
            setDeactivatingTenant(tenant);
        } else {
            // Reactivating is low-risk — no confirmation needed
            toggleActiveMutation.mutate({ id: tenant.id, is_active: true });
        }
    };

    const confirmDeactivate = async () => {
        if (!deactivatingTenant) return;
        await deactivateMutation.mutateAsync(deactivatingTenant.id);
        setDeactivatingTenant(null);
    };

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8 sm:py-6">
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Tenants</h1>
                        <p className="mt-1 text-sm text-gray-600 hidden sm:block">
                            Print shop businesses subscribed to this platform, each with their own isolated data and branding.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex-shrink-0 flex items-center gap-2 px-3 py-2 sm:px-4 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Add Tenant</span>
                    </button>
                </div>
            </header>

            <main className="p-4 sm:p-8 bg-gray-50">
                <div className="mb-6 relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Search tenants by name or subdomain..."
                        className="w-full h-10 pl-9 pr-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                    />
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    {isLoading ? (
                        <TableSkeleton rows={6} columns={7} />
                    ) : tenantsData && tenantsData.results.length > 0 ? (
                        <>
                            <TenantsTable
                                tenants={tenantsData.results}
                                onEditTenant={setEditingTenant}
                                onDeactivateTenant={handleDeactivateClick}
                            />
                            <Pagination
                                currentPage={page}
                                totalPages={calculateTotalPages(tenantsData.count)}
                                hasNext={!!tenantsData.next}
                                hasPrevious={!!tenantsData.previous}
                                onNext={() => tenantsData.next && setPage((p) => p + 1)}
                                onPrevious={() => tenantsData.previous && page > 1 && setPage((p) => p - 1)}
                            />
                        </>
                    ) : (
                        <div className="px-4">
                            <EmptyState message="No tenants yet — click Add Tenant to onboard the first print shop." />
                        </div>
                    )}
                </div>
            </main>

            <AddTenantModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ["tenants"] })}
            />

            {editingTenant && (
                <EditTenantPanel
                    tenant={editingTenant}
                    onClose={() => setEditingTenant(null)}
                    onSaved={() => {
                        setEditingTenant(null);
                        queryClient.invalidateQueries({ queryKey: ["tenants"] });
                    }}
                />
            )}

            {deactivatingTenant && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Deactivate Tenant</h2>
                        </div>
                        <div className="text-sm text-gray-600 mb-6">
                            Deactivate <strong>{deactivatingTenant.name}</strong>? Their data is kept —
                            deactivating just blocks their users from logging in until reactivated.
                        </div>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setDeactivatingTenant(null)}
                                disabled={deactivateMutation.isPending}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeactivate}
                                disabled={deactivateMutation.isPending}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                {deactivateMutation.isPending ? "Deactivating..." : "Deactivate"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

function EditTenantPanel({
    tenant,
    onClose,
    onSaved,
}: {
    tenant: Tenant;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [name, setName] = useState(tenant.name);
    const [contactEmail, setContactEmail] = useState(tenant.contact_email);
    const [contactPhone, setContactPhone] = useState(tenant.contact_phone);
    const [colorPrimary, setColorPrimary] = useState(tenant.color_primary);
    const [colorSecondary, setColorSecondary] = useState(tenant.color_secondary);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            await updateTenant(tenant.id, {
                name,
                contact_email: contactEmail,
                contact_phone: contactPhone,
                color_primary: colorPrimary,
                color_secondary: colorSecondary,
            });
            onSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save changes");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="border-b border-gray-200 px-6 py-4">
                    <h2 className="text-lg font-semibold text-gray-900">Edit {tenant.name}</h2>
                    <p className="text-sm text-gray-600">{tenant.subdomain}.printduka.co.ke</p>
                </div>
                <form onSubmit={handleSubmit}>
                    {error && (
                        <div className="mx-6 mt-5 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                            {error}
                        </div>
                    )}
                    <div className="px-6 py-5 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-0.5">Business Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-0.5">Contact Email</label>
                            <input
                                type="email"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-0.5">Contact Phone</label>
                            <input
                                type="text"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-0.5">Primary Color</label>
                                <p className="text-xs text-gray-500 mb-1.5">Overrides the sidebar blue for this tenant</p>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={colorPrimary || "#093756"}
                                        onChange={(e) => setColorPrimary(e.target.value)}
                                        className="h-10 w-12 rounded border border-gray-200"
                                    />
                                    <input
                                        type="text"
                                        value={colorPrimary}
                                        onChange={(e) => setColorPrimary(e.target.value)}
                                        placeholder="#093756"
                                        className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-0.5">Accent Color</label>
                                <p className="text-xs text-gray-500 mb-1.5">Overrides the active-state yellow</p>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={colorSecondary || "#f6b619"}
                                        onChange={(e) => setColorSecondary(e.target.value)}
                                        className="h-10 w-12 rounded border border-gray-200"
                                    />
                                    <input
                                        type="text"
                                        value={colorSecondary}
                                        onChange={(e) => setColorSecondary(e.target.value)}
                                        placeholder="#f6b619"
                                        className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 disabled:opacity-50"
                        >
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
