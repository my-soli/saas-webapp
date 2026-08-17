"use client";

import { useState } from "react";
import { X, AlertCircle, Building2 } from "lucide-react";
import { createTenant } from "@/lib/api/tenants";
import type { CreateTenantPayload } from "@/types/tenant";

interface AddTenantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const EMPTY_FORM: CreateTenantPayload = {
    name: "",
    subdomain: "",
    contact_email: "",
    admin_email: "",
    admin_name: "",
};

function slugify(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "")
        .slice(0, 63);
}

export default function AddTenantModal({ isOpen, onClose, onSuccess }: AddTenantModalProps) {
    const [formData, setFormData] = useState<CreateTenantPayload>(EMPTY_FORM);
    const [subdomainTouched, setSubdomainTouched] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleClose = () => {
        if (!isSubmitting) {
            setFormData(EMPTY_FORM);
            setSubdomainTouched(false);
            setError(null);
            onClose();
        }
    };

    const handleNameChange = (value: string) => {
        setFormData((prev) => ({
            ...prev,
            name: value,
            subdomain: subdomainTouched ? prev.subdomain : slugify(value),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.subdomain) {
            setError("Business name and subdomain are required");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await createTenant(formData);
            onSuccess();
            handleClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create tenant");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex-shrink-0 border-b border-gray-200">
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-brand-blue/10 rounded-lg flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-brand-blue" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Add Tenant</h2>
                                <p className="text-sm text-gray-600">Onboard a new print shop business</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="text-gray-400 hover:text-gray-600 transition-colors disabled:cursor-not-allowed"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    {error && (
                        <div className="mx-6 mt-5 mb-0 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    <div className="px-6 py-5 space-y-6">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-4">Business Details</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-0.5">
                                        Business Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => handleNameChange(e.target.value)}
                                        required
                                        className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                        placeholder="Acme Prints Ltd"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-0.5">
                                        Subdomain <span className="text-red-500">*</span>
                                    </label>
                                    <p className="text-xs text-gray-500 mb-1.5">Their portal will live at this address</p>
                                    <div className="flex items-center">
                                        <input
                                            type="text"
                                            value={formData.subdomain}
                                            onChange={(e) => {
                                                setSubdomainTouched(true);
                                                setFormData({ ...formData, subdomain: slugify(e.target.value) });
                                            }}
                                            required
                                            className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                            placeholder="acmeprints"
                                        />
                                        <span className="h-10 flex items-center px-3 text-sm text-gray-500 bg-gray-50 border border-l-0 border-gray-200 rounded-r-lg whitespace-nowrap">
                                            .printduka.co.ke
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-0.5">
                                        Contact Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.contact_email}
                                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                                        className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                        placeholder="owner@acmeprints.com"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-200 pt-6">
                            <h3 className="text-sm font-semibold text-gray-900 mb-1">First Admin User (optional)</h3>
                            <p className="text-xs text-gray-600 mb-4">
                                Creates their first login and emails a temporary password. You can also add this later.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-0.5">
                                        Admin Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.admin_name}
                                        onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                                        className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                        placeholder="Jane Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-0.5">
                                        Admin Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.admin_email}
                                        onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                                        className="w-full h-10 px-3 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                        placeholder="jane@acmeprints.com"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "Creating..." : "Create Tenant"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
