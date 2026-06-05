import type { ReactElement } from "react";
import type { Job, JobProduct, JobVendorStage } from "@/types/jobs";

interface JobDetailModalProps {
    open: boolean;
    job: Job | null;
    stages: JobVendorStage[];
    vendorOptions: { id: number; name: string }[];
    isLoading: boolean;
    onClose: () => void;
}

const statusBadge: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    in_progress: "bg-blue-100 text-blue-700",
    on_hold: "bg-orange-100 text-orange-700",
    blocked: "bg-red-100 text-red-700",
    qc_hold: "bg-orange-100 text-orange-700",
    ready: "bg-teal-100 text-teal-700",
    dispatched: "bg-green-100 text-green-700",
    completed: "bg-green-100 text-green-700",
};

export default function JobDetailModal({
    open,
    job,
    stages,
    vendorOptions,
    isLoading,
    onClose,
}: JobDetailModalProps): ReactElement | null {
    if (!open) {
        return null;
    }

    const formatDate = (value: string | null | undefined): string => {
        if (!value) return "—";
        return new Date(value).toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
        });
    };

    const vendorLookup = new Map<number, string>(
        vendorOptions.map((vendor) => [vendor.id, vendor.name])
    );

    const jobProducts: JobProduct[] = job?.job_products ?? [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Job Details</h2>
                        <p className="text-xs text-gray-500">{job?.job_number || "Job"}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-sm font-semibold text-gray-500 hover:text-gray-700"
                    >
                        Close
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {isLoading && (
                        <div className="animate-pulse space-y-3">
                            <div className="h-4 bg-gray-200 rounded w-40"></div>
                            <div className="h-4 bg-gray-200 rounded w-64"></div>
                            <div className="h-4 bg-gray-200 rounded w-52"></div>
                        </div>
                    )}

                    {!isLoading && job && (
                        <>
                            {/* Core info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</div>
                                    <div className="text-sm text-gray-900 mt-1">{job.job_name}</div>
                                    <div className="text-xs text-gray-500 mt-1">{job.product}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</div>
                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[job.status] ?? "bg-gray-100 text-gray-600"}`}>
                                        {job.status.replace(/_/g, " ")}
                                    </span>
                                </div>
                                <div>
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Client</div>
                                    <div className="text-sm text-gray-900 mt-1">{job.client?.name || "—"}</div>
                                    <div className="text-xs text-gray-500 mt-1">{job.client?.email || ""}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Priority</div>
                                    <div className="text-sm text-gray-900 mt-1 capitalize">{job.priority}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Expected Completion</div>
                                    <div className="text-sm text-gray-900 mt-1">{formatDate(job.expected_completion)}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assigned To (Job)</div>
                                    <div className="text-sm text-gray-900 mt-1">
                                        {job.person_in_charge
                                            ? `${job.person_in_charge.first_name} ${job.person_in_charge.last_name}`.trim() || job.person_in_charge.username
                                            : "—"}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quote</div>
                                    <div className="text-sm text-gray-900 mt-1">{job.quote ?? "—"}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created</div>
                                    <div className="text-sm text-gray-900 mt-1">{formatDate(job.created_at)}</div>
                                </div>
                            </div>

                            {/* Line Items / Job Products */}
                            <div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                    Line Items ({jobProducts.length})
                                </div>
                                {jobProducts.length === 0 ? (
                                    <div className="text-sm text-gray-400">No line items on this job.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {jobProducts.map((item: JobProduct): ReactElement => (
                                            <div key={item.id} className="border border-gray-200 rounded-md p-3 bg-gray-50">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-semibold text-gray-900">{item.product_name || "—"}</div>
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                            Qty: {item.quantity} {item.unit ? `(${item.unit})` : ""}
                                                        </div>
                                                        {item.specifications && (
                                                            <div className="text-xs text-gray-500 mt-0.5 truncate">{item.specifications}</div>
                                                        )}
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assigned To</div>
                                                        <div className="text-sm text-gray-900 mt-0.5">
                                                            {item.assigned_to_name || <span className="text-gray-400 italic">Unassigned</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Vendor Stages */}
                            {stages.length > 0 && (
                                <div>
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Vendor Stages</div>
                                    <div className="space-y-2">
                                        {stages.map((stage: JobVendorStage): ReactElement => (
                                            <div key={stage.id} className="border border-gray-200 rounded-md p-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm font-semibold text-gray-900">{stage.stage_name}</div>
                                                    <div className="text-xs text-gray-500">Stage {stage.stage_order}</div>
                                                </div>
                                                <div className="mt-2 text-xs text-gray-600">
                                                    Vendor: {vendorLookup.get(stage.vendor) || `#${stage.vendor}`} · Status: {stage.status.replace(/_/g, " ")}
                                                </div>
                                                <div className="mt-2 text-xs text-gray-600">
                                                    Progress: {stage.progress}% · Expected: {formatDate(stage.expected_completion)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
