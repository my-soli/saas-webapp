import type { ReactElement } from "react";
import type { Job, JobStatus } from "@/types/jobs";

interface JobsTableProps {
    jobs: Job[];
    onViewDetails: (job: Job) => void;
    onEdit?: (job: Job) => void;
    onAssign?: (job: Job) => void;
    onProgress?: (job: Job) => void;
    onDelete?: (job: Job) => void;
    onSendReminder?: (job: Job) => void;
    showAssignButton?: boolean;
    showProgressButton?: boolean;
    showReminderButton?: boolean;
    hideActionsWhenCompleted?: boolean;
    remindingJobId?: number;
    deletingJobId?: number;
    /** When provided, a checkbox column is shown for bulk actions. */
    selectedIds?: number[];
    onToggleSelect?: (jobId: number) => void;
    onToggleSelectAll?: () => void;
}

const statusStyles: Record<JobStatus, string> = {
    pending: "bg-brand-yellow/20 text-brand-black",
    in_progress: "bg-brand-blue/10 text-brand-blue",
    on_hold: "bg-brand-orange/10 text-brand-orange",
    blocked: "bg-brand-red/10 text-brand-red",
    qc_hold: "bg-brand-orange/10 text-brand-orange",
    ready: "bg-teal-100 text-teal-700",
    dispatched: "bg-brand-green/20 text-brand-green",
    completed: "bg-brand-green/10 text-brand-green",
};

export default function JobsTable({
    jobs,
    onViewDetails,
    onEdit,
    onAssign,
    onProgress,
    onDelete,
    onSendReminder,
    showAssignButton = true,
    showProgressButton = false,
    showReminderButton = false,
    hideActionsWhenCompleted = false,
    remindingJobId,
    deletingJobId,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
}: JobsTableProps): ReactElement {
    const formatDate = (value: string | null): string => {
        if (!value) {
            return "—";
        }
        return new Date(value).toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
        });
    };

    const DONE_STATUSES: JobStatus[] = ["completed", "dispatched", "ready"];

    const isOverdue = (job: Job): boolean => {
        if (!job.expected_completion || DONE_STATUSES.includes(job.status)) {
            return false;
        }
        return new Date(job.expected_completion) < new Date();
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                        {onToggleSelect && (
                            <th className="w-10 py-3 pl-4">
                                <input
                                    type="checkbox"
                                    aria-label="Select all jobs"
                                    checked={jobs.length > 0 && (selectedIds?.length ?? 0) === jobs.length}
                                    ref={(el): void => {
                                        if (el) {
                                            const n = selectedIds?.length ?? 0;
                                            el.indeterminate = n > 0 && n < jobs.length;
                                        }
                                    }}
                                    onChange={(): void => onToggleSelectAll?.()}
                                    className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                                />
                            </th>
                        )}
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Job #</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned To</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {jobs.map((job: Job): ReactElement => {
                        const overdue = isOverdue(job);
                        return (
                            <tr
                                key={job.id}
                                className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${selectedIds?.includes(job.id) ? "bg-brand-blue/5" : ""}`}
                            >
                                {onToggleSelect && (
                                    <td className="w-10 py-3 pl-4">
                                        <input
                                            type="checkbox"
                                            aria-label={`Select ${job.job_number}`}
                                            checked={selectedIds?.includes(job.id) ?? false}
                                            onChange={(): void => onToggleSelect(job.id)}
                                            className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                                        />
                                    </td>
                                )}
                                <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                                    {job.job_number || "—"}
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-700">
                                    {job.client?.name || "—"}
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-700">
                                    <div className="font-semibold text-gray-900">{job.job_name}</div>
                                    <div className="text-xs text-gray-500">{job.product}</div>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-700">
                                    {job.quantity}
                                </td>
                                <td className="py-3 px-4 text-sm">
                                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusStyles[job.status]}`}>
                                        {job.status.replace("_", " ")}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-700">
                                    {job.person_in_charge ? (
                                        `${job.person_in_charge.first_name} ${job.person_in_charge.last_name}`
                                    ) : onAssign && job.status !== "completed" ? (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-red/10 px-2 py-0.5 text-xs font-semibold text-brand-red">
                                                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                                </svg>
                                                Unassigned
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(): void => onAssign(job)}
                                                className="text-xs font-semibold text-brand-blue hover:underline"
                                            >
                                                Assign
                                            </button>
                                        </div>
                                    ) : (
                                        "—"
                                    )}
                                </td>
                                <td className="py-3 px-4 text-sm">
                                    <span className={overdue ? "text-brand-red font-semibold" : "text-gray-700"}>
                                        {formatDate(job.expected_completion)}
                                    </span>
                                    {overdue && (
                                        <span className="ml-2 inline-flex items-center rounded-full bg-brand-red/10 px-2 py-0.5 text-xs font-medium text-brand-red">
                                            Overdue
                                        </span>
                                    )}
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={(): void => onViewDetails(job)}
                                            className="text-xs font-medium text-gray-600 hover:text-gray-900"
                                        >
                                            View
                                        </button>
                                        {onEdit && (
                                            <button
                                                type="button"
                                                onClick={(): void => onEdit(job)}
                                                className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                            >
                                                Edit
                                            </button>
                                        )}
                                        {showAssignButton && onAssign && !(hideActionsWhenCompleted && job.status === "completed") && (
                                            <button
                                                type="button"
                                                onClick={(): void => onAssign(job)}
                                                className="rounded-md bg-brand-blue px-3 py-1 text-xs font-medium text-white hover:bg-brand-blue/90"
                                            >
                                                Assign
                                            </button>
                                        )}
                                        {showProgressButton && onProgress && (
                                            <button
                                                type="button"
                                                onClick={(): void => onProgress(job)}
                                                className="rounded-md bg-brand-green px-3 py-1 text-xs font-medium text-white hover:bg-brand-green/90"
                                            >
                                                Progress
                                            </button>
                                        )}
                                        {onDelete && (
                                            <button
                                                type="button"
                                                onClick={(): void => onDelete(job)}
                                                disabled={deletingJobId === job.id}
                                                className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                                            >
                                                Delete
                                            </button>
                                        )}
                                        {showReminderButton && onSendReminder && job.person_in_charge && !(hideActionsWhenCompleted && job.status === "completed") && (
                                            <button
                                                type="button"
                                                onClick={(): void => onSendReminder(job)}
                                                disabled={remindingJobId === job.id}
                                                className="rounded-md bg-brand-yellow px-3 py-1 text-xs font-medium text-brand-black hover:bg-brand-yellow/90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                                            >
                                                {remindingJobId === job.id && (
                                                    <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                )}
                                                {remindingJobId === job.id ? "Sending..." : "Remind"}
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

