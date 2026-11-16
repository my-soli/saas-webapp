"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircleIcon, Plus, RefreshCw, CheckCircle2, BookOpen, SearchIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/admin-layout";
import ConfirmModal from "@/features/quotes/components/ConfirmModal";
import JobsStatsCards from "@/features/jobs/components/JobsStatsCards";
import JobsFilters from "@/features/jobs/components/JobsFilters";
import JobsTable from "@/features/jobs/components/JobsTable";
import JobsPagination from "@/features/jobs/components/JobsPagination";
import JobsSkeleton from "@/features/jobs/components/JobsSkeleton";
import JobsEmptyState from "@/features/jobs/components/JobsEmptyState";
import AssignJobOwnerModal from "@/features/jobs/components/AssignJobOwnerModal";
import {
    assignJobToProductionTeam,
    deleteJob,
    fetchJobs,
    sendJobReminder,
    setJobStatus,
    syncJobToZoho,
    updateJob,
} from "@/services/jobs";
import type { Job, JobStatus, JobsQueryParams, JobsResponse } from "@/types/jobs";

type TabType = "active" | "completed";

function formatDate(value: string | null | undefined): string {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminJobsPage(): ReactElement {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<TabType>("active");
    const [search, setSearch] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");
    const [status, setStatus] = useState<"all" | JobStatus>("all");
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(20);
    const [completedSearch, setCompletedSearch] = useState<string>("");
    const [debouncedCompletedSearch, setDebouncedCompletedSearch] = useState<string>("");

    const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
    const [remindingJobId, setRemindingJobId] = useState<number | null>(null);
    const [reminderModal, setReminderModal] = useState<{ job: Job; note: string } | null>(null);
    const [isAssignOpen, setIsAssignOpen] = useState<boolean>(false);
    const [deleteConfirmJobId, setDeleteConfirmJobId] = useState<number | null>(null);
    const [syncingJobId, setSyncingJobId] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [bulkStatus, setBulkStatus] = useState<string>("");
    const [bulkConfirm, setBulkConfirm] = useState<string | null>(null);

    useEffect((): (() => void) => {
        const timer = setTimeout((): void => setDebouncedSearch(search), 500);
        return (): void => clearTimeout(timer);
    }, [search]);

    useEffect((): (() => void) => {
        const timer = setTimeout((): void => setDebouncedCompletedSearch(completedSearch), 500);
        return (): void => clearTimeout(timer);
    }, [completedSearch]);

    const jobQueryParams = useMemo(
        (): JobsQueryParams => ({
            page,
            pageSize,
            search: debouncedSearch,
            status: status === "all" || status === "completed" ? "active" : status,
        }),
        [page, pageSize, debouncedSearch, status]
    );

    const completedQueryParams = useMemo(
        (): JobsQueryParams => ({ page: 1, pageSize: 100, search: debouncedCompletedSearch, status: "completed" }),
        [debouncedCompletedSearch]
    );

    const { data, isLoading, error } = useQuery({
        queryKey: ["admin-jobs", jobQueryParams],
        queryFn: (): Promise<JobsResponse> => fetchJobs(jobQueryParams),
        enabled: activeTab === "active",
    });

    const completedQuery = useQuery({
        queryKey: ["admin-jobs-completed", completedQueryParams],
        queryFn: (): Promise<JobsResponse> => fetchJobs(completedQueryParams),
        enabled: activeTab === "completed",
    });

    const assignMutation = useMutation({
        mutationFn: async ({ jobId, userId, jobName }: { jobId: number; userId: number; jobName: string }) => {
            const current = jobs.find((j) => j.id === jobId);
            if (jobName && current && jobName !== current.job_name) {
                await updateJob(jobId, { job_name: jobName });
            }
            return assignJobToProductionTeam(jobId, { user_id: userId });
        },
        onSuccess: (): void => {
            toast.success("Job assigned! Email and portal notification sent.");
            queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
            queryClient.invalidateQueries({ queryKey: ["job", selectedJobId] });
            setIsAssignOpen(false);
        },
        onError: (): void => { toast.error("Unable to assign job. Please try again."); },
    });

    const reminderMutation = useMutation({
        mutationFn: ({ jobId, note }: { jobId: number; note: string }) => sendJobReminder(jobId, note),
        onSuccess: (): void => {
            toast.success("Reminder sent! Email and notification delivered.");
            setRemindingJobId(null);
        },
        onError: (): void => {
            toast.error("Unable to send reminder. Please try again.");
            setRemindingJobId(null);
        },
    });

    const deleteJobMutation = useMutation({
        mutationFn: (jobId: number) => deleteJob(jobId),
        onSuccess: (): void => {
            toast.success("Job deleted.");
            queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
            setDeleteConfirmJobId(null);
        },
        onError: (): void => { toast.error("Failed to delete job. Please try again."); },
    });

    const syncMutation = useMutation({
        mutationFn: (jobId: number) => syncJobToZoho(jobId),
        onSuccess: (result): void => {
            setSyncingJobId(null);
            toast.success(`Invoice ${result.zoho_invoice_number} created in Zoho Books!`);
            queryClient.invalidateQueries({ queryKey: ["admin-jobs-completed"], exact: false });
        },
        onError: (err: Error): void => {
            setSyncingJobId(null);
            toast.error(err.message || "Zoho Books sync failed. Please try again.");
        },
    });

    const jobs = (data?.results ?? []).filter((job) => job.status !== "completed");
    const totalCount = jobs.length;
    const completedJobs = completedQuery.data?.results ?? [];

    const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null;

    // Drop selections that are no longer on screen (filter, page or status change).
    const visibleSelectedIds = selectedIds.filter((id) => jobs.some((j) => j.id === id));

    const toggleSelect = (jobId: number): void => {
        setSelectedIds((prev) => (prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]));
    };
    const toggleSelectAll = (): void => {
        setSelectedIds(visibleSelectedIds.length === jobs.length ? [] : jobs.map((j) => j.id));
    };

    const BULK_STATUS_LABELS: Record<string, string> = {
        pending: "Pending",
        in_progress: "In Progress",
        on_hold: "On Hold",
        completed: "Completed",
    };

    const bulkStatusMutation = useMutation({
        mutationFn: async ({ ids, nextStatus }: { ids: number[]; nextStatus: string }) => {
            const results = await Promise.allSettled(ids.map((id) => setJobStatus(id, nextStatus)));
            return {
                ok: results.filter((r) => r.status === "fulfilled").length,
                failed: results.filter((r) => r.status === "rejected").length,
                nextStatus,
            };
        },
        onSuccess: ({ ok, failed, nextStatus }): void => {
            const label = BULK_STATUS_LABELS[nextStatus] ?? nextStatus;
            if (ok) toast.success(`${ok} job${ok === 1 ? "" : "s"} marked ${label}.`);
            if (failed) toast.error(`${failed} job${failed === 1 ? "" : "s"} could not be updated.`);
            queryClient.invalidateQueries({ queryKey: ["admin-jobs"] });
            queryClient.invalidateQueries({ queryKey: ["admin-jobs-completed"], exact: false });
            setSelectedIds([]);
            setBulkStatus("");
            setBulkConfirm(null);
        },
        onError: (): void => { toast.error("Unable to update jobs. Please try again."); },
    });

    const openAssignModal = (job: Job): void => {
        setSelectedJobId(job.id);
        setIsAssignOpen(true);
    };

    const handleSendReminder = (job: Job): void => { setReminderModal({ job, note: "" }); };

    const handleConfirmReminder = (): void => {
        if (!reminderModal) return;
        setRemindingJobId(reminderModal.job.id);
        reminderMutation.mutate({ jobId: reminderModal.job.id, note: reminderModal.note });
        setReminderModal(null);
    };

    const handleAssignSubmit = (userId: number, jobName: string): void => {
        if (!selectedJobId) return;
        assignMutation.mutate({ jobId: selectedJobId, userId, jobName });
    };

    const handleResetFilters = (): void => { setSearch(""); setStatus("all"); setPage(1); };

    const handleSyncToZoho = (job: Job): void => {
        setSyncingJobId(job.id);
        syncMutation.mutate(job.id);
    };

    const tabs: { id: TabType; label: string }[] = [
        { id: "active", label: "Active Jobs" },
        { id: "completed", label: "Completed" },
    ];

    return (
        <AdminLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
                        <p className="mt-1 text-sm text-gray-600">Manage and track production jobs for your clients</p>
                    </div>
                    <button
                        type="button"
                        onClick={(): void => router.push("/admin/jobs/create")}
                        className="flex items-center gap-2 rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Create Job
                    </button>
                </div>
                <div className="border-t border-gray-200 px-4 lg:px-8 flex gap-4 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={(): void => setActiveTab(tab.id)}
                            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                ? "border-brand-blue text-brand-blue"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            <main className="p-4 lg:p-8 space-y-6">
                {/* ── Active Jobs Tab ── */}
                {activeTab === "active" && (
                    <>
                        <JobsStatsCards jobs={jobs} />

                        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
                            <div className="border-b border-gray-200 p-4">
                                <JobsFilters
                                    search={search}
                                    status={status}
                                    onSearchChange={setSearch}
                                    onStatusChange={setStatus}
                                    onReset={handleResetFilters}
                                />
                            </div>

                            {isLoading && <JobsSkeleton />}

                            {error && (
                                <div className="p-6">
                                    <div className="rounded-lg border border-brand-red/20 bg-brand-red/5 p-4">
                                        <div className="flex items-center gap-2">
                                            <AlertCircleIcon className="h-4 w-4 text-brand-red" />
                                            <p className="text-sm font-medium text-brand-red">Unable to load jobs.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!isLoading && !error && jobs.length === 0 && (
                                <JobsEmptyState title="No jobs found" description="There are no jobs matching your search criteria." />
                            )}

                            {!isLoading && !error && jobs.length > 0 && (
                                <>
                                    {visibleSelectedIds.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-3 border-b border-brand-blue/20 bg-brand-blue/5 px-4 py-3">
                                            <span className="text-sm font-semibold text-gray-900">
                                                {visibleSelectedIds.length} selected
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(): void => setBulkConfirm("completed")}
                                                disabled={bulkStatusMutation.isPending}
                                                className="inline-flex items-center gap-1.5 rounded-md bg-brand-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-green/90 disabled:opacity-50"
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                Mark as Completed
                                            </button>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={bulkStatus}
                                                    onChange={(e): void => setBulkStatus(e.target.value)}
                                                    className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                                    aria-label="Change status to"
                                                >
                                                    <option value="">Change status to…</option>
                                                    {Object.entries(BULK_STATUS_LABELS).map(([value, label]) => (
                                                        <option key={value} value={value}>{label}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={(): void => { if (bulkStatus) setBulkConfirm(bulkStatus); }}
                                                    disabled={!bulkStatus || bulkStatusMutation.isPending}
                                                    className="rounded-md border border-brand-blue px-3 py-1.5 text-xs font-semibold text-brand-blue hover:bg-brand-blue/5 disabled:opacity-50"
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(): void => setSelectedIds([])}
                                                className="ml-auto text-xs font-medium text-gray-500 hover:text-gray-800"
                                            >
                                                Clear selection
                                            </button>
                                        </div>
                                    )}
                                    <JobsTable
                                        jobs={jobs}
                                        selectedIds={visibleSelectedIds}
                                        onToggleSelect={toggleSelect}
                                        onToggleSelectAll={toggleSelectAll}
                                        onViewDetails={(job): void => router.push(`/admin/jobs/${job.id}`)}
                                        onSendReminder={handleSendReminder}
                                        onEdit={(job): void => router.push(`/admin/jobs/${job.id}/edit`)}
                                        onDelete={(job): void => setDeleteConfirmJobId(job.id)}
                                        onAssign={openAssignModal}
                                        showAssignButton={false}
                                        showReminderButton
                                        hideActionsWhenCompleted
                                        remindingJobId={remindingJobId ?? undefined}
                                        deletingJobId={deleteJobMutation.isPending ? (deleteConfirmJobId ?? undefined) : undefined}
                                    />
                                    <div className="border-t border-gray-200 p-4">
                                        <JobsPagination
                                            count={totalCount}
                                            page={page}
                                            pageSize={pageSize}
                                            onPageChange={setPage}
                                            onPageSizeChange={setPageSize}
                                        />
                                    </div>
                                </>
                            )}
                        </section>
                    </>
                )}

                {/* ── Completed Jobs Tab ── */}
                {activeTab === "completed" && (
                    <section className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <BookOpen className="w-4 h-4 text-brand-blue shrink-0" />
                                <div className="min-w-0">
                                    <h2 className="text-sm font-semibold text-gray-900">Completed Jobs</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Jobs completed by the production team. Zoho Books invoicing is managed from the Reconciliation tab.
                                    </p>
                                </div>
                            </div>
                            <div className="relative w-full sm:w-64 shrink-0">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={completedSearch}
                                    onChange={(e): void => setCompletedSearch(e.target.value)}
                                    placeholder="Search completed jobs…"
                                    className="w-full rounded-md border border-gray-300 pl-9 pr-8 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                                />
                                {completedSearch && (
                                    <button
                                        type="button"
                                        onClick={(): void => setCompletedSearch("")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <XIcon className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {completedQuery.isLoading && (
                            <div className="p-6 space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-14 animate-pulse bg-gray-100 rounded-lg" />
                                ))}
                            </div>
                        )}

                        {!completedQuery.isLoading && completedJobs.length === 0 && (
                            <div className="p-12 text-center">
                                <CheckCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-sm font-medium text-gray-500">No completed jobs yet</p>
                                <p className="text-xs text-gray-400 mt-1">Jobs marked as completed by the production team will appear here.</p>
                            </div>
                        )}

                        {!completedQuery.isLoading && completedJobs.length > 0 && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="border-b border-gray-100 bg-gray-50">
                                        <tr>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Job</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">LPO</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Zoho Invoice</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {completedJobs.map((job: Job) => (
                                            <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="py-3 px-4">
                                                    <button
                                                        type="button"
                                                        onClick={(): void => router.push(`/admin/jobs/${job.id}`)}
                                                        className="text-left hover:underline"
                                                    >
                                                        <div className="font-medium text-gray-900">{job.job_name}</div>
                                                        <div className="text-xs text-gray-500">{job.job_number}</div>
                                                    </button>
                                                </td>
                                                <td className="py-3 px-4 text-gray-700">{job.client?.name ?? "—"}</td>
                                                <td className="py-3 px-4">
                                                    {job.lpo_number ? (
                                                        <span className="text-gray-700">{job.lpo_number}</span>
                                                    ) : (
                                                        <span className="text-gray-400 italic text-xs">No LPO</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-gray-700">{formatDate(job.expected_completion)}</td>
                                                <td className="py-3 px-4">
                                                    {job.zoho_synced ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                Synced
                                                            </span>
                                                            {job.zoho_invoice_number && (
                                                                <span className="text-xs text-gray-500">#{job.zoho_invoice_number}</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">Not synced</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}
            </main>

            {isAssignOpen && selectedJob && (
                <AssignJobOwnerModal
                    job={selectedJob}
                    onClose={(): void => setIsAssignOpen(false)}
                    onConfirm={handleAssignSubmit}
                    isLoading={assignMutation.isPending}
                />
            )}

            {bulkConfirm && (
                <ConfirmModal
                    title={bulkConfirm === "completed" ? "Mark Jobs as Completed" : "Update Job Status"}
                    message={`Set ${visibleSelectedIds.length} selected job${visibleSelectedIds.length === 1 ? "" : "s"} to "${BULK_STATUS_LABELS[bulkConfirm] ?? bulkConfirm}"?${bulkConfirm === "completed" ? " Completed jobs move to the Completed tab." : ""}`}
                    confirmText={bulkStatusMutation.isPending ? "Updating…" : "Confirm"}
                    confirmColor={bulkConfirm === "completed" ? "green" : "blue"}
                    isLoading={bulkStatusMutation.isPending}
                    onClose={(): void => setBulkConfirm(null)}
                    onConfirm={(): void => bulkStatusMutation.mutate({ ids: visibleSelectedIds, nextStatus: bulkConfirm })}
                />
            )}

            {deleteConfirmJobId && (
                <ConfirmModal
                    title="Delete Job"
                    message="Are you sure you want to delete this job? This action cannot be undone."
                    confirmText="Delete Job"
                    confirmColor="red"
                    onClose={(): void => setDeleteConfirmJobId(null)}
                    onConfirm={(): void => { deleteJobMutation.mutate(deleteConfirmJobId); }}
                />
            )}

            {reminderModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-base font-semibold text-gray-900">Send Reminder</h2>
                            <p className="text-xs text-gray-500 mt-1">
                                Sending reminder for <strong>{reminderModal.job.job_name}</strong>
                            </p>
                        </div>
                        <div className="px-6 py-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Note to include (optional)
                            </label>
                            <textarea
                                rows={3}
                                value={reminderModal.note}
                                onChange={(e): void => setReminderModal(prev => prev ? { ...prev, note: e.target.value } : null)}
                                placeholder="e.g. Client is chasing this — please update ASAP."
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
                            />
                        </div>
                        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={(): void => setReminderModal(null)}
                                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmReminder}
                                disabled={reminderMutation.isPending}
                                className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-50"
                            >
                                {reminderMutation.isPending ? "Sending..." : "Send Reminder"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
