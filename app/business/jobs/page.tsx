"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircleIcon, X } from "lucide-react";
import BusinessLayout from "@/components/business/business-layout";
import JobsFilters from "@/features/jobs/components/JobsFilters";
import JobsTable from "@/features/jobs/components/JobsTable";
import JobsPagination from "@/features/jobs/components/JobsPagination";
import JobsSkeleton from "@/features/jobs/components/JobsSkeleton";
import JobsEmptyState from "@/features/jobs/components/JobsEmptyState";
import JobDetailModal from "@/features/jobs/components/JobDetailModal";
import JobAssignModal from "@/features/jobs/components/JobAssignModal";
import JobProgressModal from "@/features/jobs/components/JobProgressModal";
import { fetchVendors } from "@/services/vendors";
import {
    createJob,
    createJobVendorStage,
    deleteJob,
    fetchJob,
    fetchJobVendorStages,
    fetchJobs,
    updateJob,
    updateJobVendorStage,
} from "@/services/jobs";
import type {
    CreateJobVendorStagePayload,
    Job,
    JobPriority,
    JobStatus,
    JobVendorStage,
    JobsQueryParams,
    JobsResponse,
    UpdateJobVendorStagePayload,
} from "@/types/jobs";
import type { Vendor, VendorsQueryParams, VendorsResponse } from "@/types/vendors";
import { toast } from "sonner";

interface JobFormState {
    job_name: string;
    job_type: string;
    product: string;
    quantity: string;
    priority: JobPriority;
    status: JobStatus;
    expected_completion: string;
}

const emptyJobForm: JobFormState = {
    job_name: "",
    job_type: "print",
    product: "",
    quantity: "1",
    priority: "normal",
    status: "pending",
    expected_completion: "",
};

export default function BusinessJobsPage(): ReactElement {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");
    const [status, setStatus] = useState<"all" | "pending" | "in_progress" | "on_hold" | "completed">("all");
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(20);

    const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
    const [deletingJobId, setDeletingJobId] = useState<number | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
    const [isAssignOpen, setIsAssignOpen] = useState<boolean>(false);
    const [isProgressOpen, setIsProgressOpen] = useState<boolean>(false);
    const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
    const [editingJob, setEditingJob] = useState<Job | null>(null);
    const [formState, setFormState] = useState<JobFormState>(emptyJobForm);

    useEffect((): (() => void) => {
        const timer = setTimeout((): void => {
            setDebouncedSearch(search);
        }, 500);

        return (): void => clearTimeout(timer);
    }, [search]);

    const jobQueryParams = useMemo(
        (): JobsQueryParams => ({
            page,
            pageSize,
            search: debouncedSearch,
            status,
        }),
        [page, pageSize, debouncedSearch, status]
    );

    const vendorQueryParams = useMemo(
        (): VendorsQueryParams => ({
            page: 1,
            pageSize: 200,
            search: "",
            active: "true",
        }),
        []
    );

    const { data, isLoading, error } = useQuery({
        queryKey: ["jobs", jobQueryParams],
        queryFn: (): Promise<JobsResponse> => fetchJobs(jobQueryParams),
    });

    const vendorQuery = useQuery({
        queryKey: ["vendors", vendorQueryParams],
        queryFn: (): Promise<VendorsResponse> => fetchVendors(vendorQueryParams),
    });

    const jobDetailQuery = useQuery({
        queryKey: ["job", selectedJobId],
        queryFn: (): Promise<Job> => fetchJob(selectedJobId as number),
        enabled: selectedJobId !== null,
    });

    const jobStagesQuery = useQuery({
        queryKey: ["job-vendor-stages", selectedJobId],
        queryFn: (): Promise<JobVendorStage[]> => fetchJobVendorStages(selectedJobId as number),
        enabled: selectedJobId !== null,
    });

    const deleteMutation = useMutation({
        mutationFn: (jobId: number): Promise<void> => deleteJob(jobId),
        onSuccess: (): void => {
            toast.success("Job deleted.");
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
        },
        onError: (): void => {
            toast.error("Unable to delete job. Please try again.");
        },
        onSettled: (): void => {
            setDeletingJobId(null);
        },
    });

    const createMutation = useMutation({
        mutationFn: (payload: Partial<Job>) => createJob(payload),
        onSuccess: (): void => {
            toast.success("Job created.");
            setFormMode(null);
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
        },
        onError: (): void => {
            toast.error("Unable to create job. Please try again.");
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: Partial<Job> }) => updateJob(id, payload),
        onSuccess: (): void => {
            toast.success("Job updated.");
            setFormMode(null);
            setEditingJob(null);
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
        },
        onError: (): void => {
            toast.error("Unable to update job. Please try again.");
        },
    });

    const assignMutation = useMutation({
        mutationFn: (payload: CreateJobVendorStagePayload): Promise<JobVendorStage> => createJobVendorStage(payload),
        onSuccess: (): void => {
            toast.success("Vendor assigned.");
            queryClient.invalidateQueries({ queryKey: ["job-vendor-stages", selectedJobId] });
            setIsAssignOpen(false);
        },
        onError: (): void => {
            toast.error("Unable to assign vendor. Please try again.");
        },
    });

    const progressMutation = useMutation({
        mutationFn: ({ stageId, payload }: { stageId: number; payload: UpdateJobVendorStagePayload }): Promise<JobVendorStage> =>
            updateJobVendorStage(stageId, payload),
        onSuccess: (): void => {
            toast.success("Progress updated.");
            queryClient.invalidateQueries({ queryKey: ["job-vendor-stages", selectedJobId] });
            setIsProgressOpen(false);
        },
        onError: (): void => {
            toast.error("Unable to update progress. Please try again.");
        },
    });

    const jobs = data?.results ?? [];
    const totalCount = data?.count ?? 0;
    const stages = jobStagesQuery.data ?? [];
    const vendors = vendorQuery.data?.results ?? [];

    const openDetailModal = (job: Job): void => {
        setSelectedJobId(job.id);
        setIsDetailOpen(true);
    };

    const openAssignModal = (job: Job): void => {
        setSelectedJobId(job.id);
        setIsAssignOpen(true);
    };

    const openProgressModal = (job: Job): void => {
        setSelectedJobId(job.id);
        setIsProgressOpen(true);
    };

    const openCreate = (): void => {
        setFormState(emptyJobForm);
        setEditingJob(null);
        setFormMode("create");
    };

    const openEdit = (job: Job): void => {
        setFormState({
            job_name: job.job_name,
            job_type: job.job_type,
            product: job.product,
            quantity: String(job.quantity),
            priority: job.priority,
            status: job.status,
            expected_completion: job.expected_completion?.split("T")[0] ?? "",
        });
        setEditingJob(job);
        setFormMode("edit");
    };

    const handleFormSubmit = (e: React.FormEvent): void => {
        e.preventDefault();
        const payload: Partial<Job> = {
            job_name: formState.job_name,
            job_type: formState.job_type,
            product: formState.product,
            quantity: Number(formState.quantity),
            priority: formState.priority,
            status: formState.status,
            expected_completion: formState.expected_completion || null,
        };
        if (formMode === "edit" && editingJob) {
            updateMutation.mutate({ id: editingJob.id, payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleAssignSubmit = (payload: CreateJobVendorStagePayload): void => {
        if (!selectedJobId) {
            toast.error("Select a job before assigning a vendor.");
            return;
        }

        assignMutation.mutate({
            ...payload,
            job: selectedJobId,
        });
    };

    const handleProgressSubmit = (stageId: number, payload: UpdateJobVendorStagePayload): void => {
        progressMutation.mutate({ stageId, payload });
    };

    const handleSearchChange = (value: string): void => {
        setSearch(value);
        setPage(1);
    };

    const handleStatusChange = (value: "all" | "pending" | "in_progress" | "on_hold" | "completed"): void => {
        setStatus(value);
        setPage(1);
    };

    const handleDelete = (job: Job): void => {
        if (!window.confirm(`Delete job ${job.job_number ?? job.job_name}? This cannot be undone.`)) return;
        setDeletingJobId(job.id);
        deleteMutation.mutate(job.id);
    };

    const handleResetFilters = (): void => {
        setSearch("");
        setStatus("all");
        setPage(1);
    };

    const handlePageChange = (nextPage: number): void => {
        setPage(nextPage);
    };

    const handlePageSizeChange = (size: number): void => {
        setPageSize(size);
        setPage(1);
    };

    return (
        <BusinessLayout>
            <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                        <a href="/business/dashboard" className="hover:text-brand-blue">
                            Business Portal
                        </a>
                        <span>/</span>
                        <span className="text-gray-900">Jobs</span>
                    </div>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
                            <p className="mt-2 text-sm text-gray-600">Track production jobs and vendor assignments</p>
                        </div>
                        <button
                            type="button"
                            onClick={openCreate}
                            className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90"
                        >
                            + New Job
                        </button>
                    </div>
                </div>
            </header>
            <main className="bg-gray-50 min-h-screen">
                <div className="px-4 lg:px-8 py-4 lg:py-6 space-y-6">
                    {isLoading && <JobsSkeleton />}

                    {!isLoading && (error || !data) && (
                        <div className="bg-brand-red/10 border border-brand-red/20 rounded-lg p-6">
                            <div className="flex items-center gap-3">
                                <AlertCircleIcon className="h-6 w-6 text-brand-red" />
                                <div>
                                    <h3 className="font-semibold text-brand-red">Failed to load jobs</h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Unable to fetch job data. Please try again later.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {!isLoading && data && (
                        <>
                            <JobsFilters
                                search={search}
                                status={status}
                                onSearchChange={handleSearchChange}
                                onStatusChange={handleStatusChange}
                                onReset={handleResetFilters}
                            />

                            {jobs.length > 0 ? (
                                <>
                                    <JobsTable
                                        jobs={jobs}
                                        onViewDetails={openDetailModal}
                                        onEdit={openEdit}
                                        onAssign={openAssignModal}
                                        onProgress={openProgressModal}
                                        onDelete={handleDelete}
                                        deletingJobId={deletingJobId ?? undefined}
                                    />
                                    <JobsPagination
                                        count={totalCount}
                                        page={page}
                                        pageSize={pageSize}
                                        onPageChange={handlePageChange}
                                        onPageSizeChange={handlePageSizeChange}
                                    />
                                </>
                            ) : (
                                <JobsEmptyState
                                    title="No jobs found"
                                    description="Try adjusting your filters or create a new job."
                                />
                            )}
                        </>
                    )}
                </div>
            </main>

            <JobDetailModal
                open={isDetailOpen}
                job={jobDetailQuery.data ?? null}
                stages={stages}
                vendorOptions={vendors}
                isLoading={jobDetailQuery.isLoading || jobStagesQuery.isLoading}
                onClose={(): void => setIsDetailOpen(false)}
            />

            <JobAssignModal
                open={isAssignOpen}
                vendorOptions={vendors}
                defaultStageOrder={stages.length + 1}
                onClose={(): void => setIsAssignOpen(false)}
                onSubmit={handleAssignSubmit}
            />

            <JobProgressModal
                open={isProgressOpen}
                stages={stages}
                vendorOptions={vendors}
                onClose={(): void => setIsProgressOpen(false)}
                onSubmit={handleProgressSubmit}
            />

            {formMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">{formMode === "create" ? "New Job" : "Edit Job"}</h2>
                            <button type="button" onClick={(): void => { setFormMode(null); setEditingJob(null); }}>
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleFormSubmit} className="px-6 py-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="col-span-2 sm:col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Job Name *</label>
                                    <input required type="text" value={formState.job_name} onChange={(e): void => setFormState(s => ({ ...s, job_name: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="e.g. Business Cards for Acme" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Job Type *</label>
                                    <input required type="text" value={formState.job_type} onChange={(e): void => setFormState(s => ({ ...s, job_type: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="e.g. print, digital" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Product *</label>
                                    <input required type="text" value={formState.product} onChange={(e): void => setFormState(s => ({ ...s, product: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="e.g. Business Cards" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Quantity *</label>
                                    <input required type="number" min="1" value={formState.quantity} onChange={(e): void => setFormState(s => ({ ...s, quantity: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Priority *</label>
                                    <select required value={formState.priority} onChange={(e): void => setFormState(s => ({ ...s, priority: e.target.value as JobPriority }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                                        <option value="normal">Normal</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Status *</label>
                                    <select required value={formState.status} onChange={(e): void => setFormState(s => ({ ...s, status: e.target.value as JobStatus }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                                        <option value="pending">Pending</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="on_hold">On Hold</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Expected Completion</label>
                                    <input type="date" value={formState.expected_completion} onChange={(e): void => setFormState(s => ({ ...s, expected_completion: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={(): void => { setFormMode(null); setEditingJob(null); }} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-brand-blue rounded-md hover:bg-brand-blue/90 disabled:opacity-50">
                                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : formMode === "create" ? "Create Job" : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </BusinessLayout>
    );
}
