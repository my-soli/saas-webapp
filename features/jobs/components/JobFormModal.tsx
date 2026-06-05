"use client";

import { useState, useEffect } from "react";
import type { ReactElement, FormEvent } from "react";
import { X } from "lucide-react";
import type { Job, JobStatus, JobPriority } from "@/types/jobs";

export interface JobFormPayload {
    job_name: string;
    job_type: string;
    product: string;
    quantity: number;
    status: JobStatus;
    priority: JobPriority;
    expected_completion: string;
    client_id: number | null;
}

interface JobFormModalProps {
    isOpen: boolean;
    isSubmitting: boolean;
    mode: "create" | "edit";
    job: Job | null;
    onClose: () => void;
    onSubmit: (payload: JobFormPayload) => void;
}

const defaultForm = (): JobFormPayload => ({
    job_name: "",
    job_type: "printing",
    product: "",
    quantity: 1,
    status: "pending",
    priority: "normal",
    expected_completion: "",
    client_id: null,
});

export default function JobFormModal({
    isOpen,
    isSubmitting,
    mode,
    job,
    onClose,
    onSubmit,
}: JobFormModalProps): ReactElement | null {
    const [form, setForm] = useState<JobFormPayload>(defaultForm());

    useEffect((): void => {
        if (mode === "edit" && job) {
            setForm({
                job_name: job.job_name,
                job_type: job.job_type,
                product: job.product,
                quantity: job.quantity,
                status: job.status,
                priority: job.priority,
                expected_completion: job.expected_completion ?? "",
                client_id: job.client?.id ?? null,
            });
        } else if (mode === "create") {
            setForm(defaultForm());
        }
    }, [mode, job, isOpen]);

    if (!isOpen) return null;

    const set = <K extends keyof JobFormPayload>(key: K, value: JobFormPayload[K]): void => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = (e: FormEvent): void => {
        e.preventDefault();
        onSubmit(form);
    };

    const title = mode === "create" ? "Create Job" : "Edit Job";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-lg"
                onClick={(e): void => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Job Name *</label>
                            <input
                                type="text"
                                required
                                value={form.job_name}
                                onChange={(e): void => set("job_name", e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                                placeholder="e.g. Business Cards for Acme Corp"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Product / Description *</label>
                            <input
                                type="text"
                                required
                                value={form.product}
                                onChange={(e): void => set("product", e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                                placeholder="e.g. Business Cards"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Job Type</label>
                            <select
                                value={form.job_type}
                                onChange={(e): void => set("job_type", e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                            >
                                <option value="printing">Printing</option>
                                <option value="design">Design</option>
                                <option value="finishing">Finishing</option>
                                <option value="delivery">Delivery</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Quantity *</label>
                            <input
                                type="number"
                                required
                                min={1}
                                value={form.quantity}
                                onChange={(e): void => set("quantity", Number(e.target.value))}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                            <select
                                value={form.status}
                                onChange={(e): void => set("status", e.target.value as JobStatus)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                            >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="blocked">Blocked</option>
                                <option value="qc_hold">QC Hold</option>
                                <option value="ready">Ready for Dispatch</option>
                                <option value="dispatched">Dispatched</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                            <select
                                value={form.priority}
                                onChange={(e): void => set("priority", e.target.value as JobPriority)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                            >
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Expected Completion</label>
                            <input
                                type="date"
                                value={form.expected_completion}
                                onChange={(e): void => set("expected_completion", e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-brand-blue rounded-md hover:bg-brand-blue/90 disabled:opacity-50"
                        >
                            {isSubmitting ? "Saving..." : mode === "create" ? "Create Job" : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
