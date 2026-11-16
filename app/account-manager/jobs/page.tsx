"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircleIcon, Plus, RefreshCw, CheckCircle2, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import AccountManagerLayout from "@/components/account-manager/account-manager-layout";
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
    syncJobToZoho,
    updateJob,
} from "@/services/jobs";
import type { Job, JobStatus, JobsQueryParams, JobsResponse } from "@/types/jobs";

type TabType = "active" | "completed";

function formatDate(value: string | null | undefined): string {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AccountManagerJobsPage(): ReactElement {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<TabType>("active");
    const [search, setSearch] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");
    const [status, setStatus] = useState<"all" | JobStatus>("all");
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(20);

    const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
    const [remindingJobId, setRemindingJobId] = useState<number | null>(null);
    const [reminderModal, setReminderModal] = useState<{ job: Job; note: string } | null>(null);
    const [isAssignOpen, setIsAssignOpen] = useState<boolean>(false);
    const [deleteConfirmJobId, setDeleteConfirmJobId] = useState<number | null>(null);
    const [syncingJobId, setSyncingJobId] = useState<number | null>(null);

    useEffect((): (() => void) => {
        const timer = setTimeout((): void => setDebouncedSearch(search), 500);
        return (): void => clearTimeout(timer);
    }, [search]);

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
        (): JobsQueryParams => ({ page: 1, pageSize: 100, search: "", status: "completed" }),
        []
    );

    const { data, isLoading, error } = useQuery({
        queryKey: ["account-manager-jobs", jobQueryParams],
        queryFn: (): Promise<JobsResponse> => fetchJobs(jobQueryParams),
        enabled: activeTab === "active",
    });

    const completedQuery = useQuery({
        queryKey: ["account-manager-jobs-completed"],
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
            queryClient.invalidateQueries({ queryKey: ["account-manager-jobs"] });
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
            queryClient.invalidateQueries({ queryKey: ["account-manager-jobs"] });
            setDeleteConfirmJobId(null);
        },
        onError: (): void => { toast.error("Failed to delete job. Please try again."); },
    });

    const syncMutation = useMutation({
        mutationFn: (jobId: number) => syncJobToZoho(jobId),
        onSuccess: (result): void => {
            setSyncingJobId(null);
            toast.success(`Invoice ${result.zoho_invoice_number} created in Zoho Books!`);
            queryClient.invalidateQueries({ queryKey: ["account-manager-jobs-completed"] });
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
        { id: "completed", label: "Completed — Ready to Invoice" },
    ];

    return (
        <AccountManagerLayout>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
                        <p className="mt-1 text-sm text-gray-600">Manage and track production jobs for your clients</p>
                    </div>
                    <button
                        type="button"
                        onClick={(): void => router.push("/account-manager/jobs/create")}
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
                                    <JobsTable
                                        jobs={jobs}
                                        onViewDetails={(job): void => router.push(`/account-manager/jobs/${job.id}`)}
                                        onSendReminder={handleSendReminder}
                                        onEdit={(job): void => router.push(`/account-manager/jobs/${job.id}/edit`)}
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
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-brand-blue" />
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900">Completed Jobs — Zoho Books Invoice Generation</h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Once a job is marked complete by the production team, sync it to Zoho Books to auto-generate the client invoice.
                                </p>
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
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Zoho Status</th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {completedJobs.map((job: Job) => (
                                            <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="py-3 px-4">
                                                    <button
                                                        type="button"
                                                        onClick={(): void => router.push(`/account-manager/jobs/${job.id}`)}
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
                                                        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                                                            Pending sync
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    {job.zoho_synced ? (
                                                        <span className="text-xs text-gray-400 italic">Invoice sent</span>
                                                    ) : job.lpo_id ? (
                                                        <button
                                                            type="button"
                                                            onClick={(): void => handleSyncToZoho(job)}
                                                            disabled={syncingJobId === job.id}
                                                            className="inline-flex items-center gap-1.5 rounded-md bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            {syncingJobId === job.id ? (
                                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                <RefreshCw className="w-3 h-3" />
                                                            )}
                                                            {syncingJobId === job.id ? "Syncing…" : "Sync to Zoho Books"}
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">No quote LPO</span>
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

            {/* Reminder Note Modal */}
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
                            <p className="mt-1 text-xs text-gray-500">
                                This note will be included in the email and notification to the production team member.
                            </p>
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
        </AccountManagerLayout>
    );
}
