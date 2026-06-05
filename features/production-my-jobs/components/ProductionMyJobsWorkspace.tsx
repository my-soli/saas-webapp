"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    AlertCircleIcon,
    BriefcaseIcon,
    CheckIcon,
    ClipboardListIcon,
    Building2Icon,
    CalendarIcon,
    EyeIcon,
    ImageIcon,
    PackageIcon,
    Plus,
    ReceiptIcon,
    LoaderCircleIcon,
    LucideIcon,
    SearchIcon,
    SendHorizonalIcon,
    UploadIcon,
    UserIcon,
    XIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
    assignJobToProductionTeam,
    deleteJob as deleteJobFn,
    fetchJob,
    fetchJobs,
    sendJobReminder,
    updateJob,
} from "@/services/jobs";
import { getCurrentUser, fetchAllUsers } from "@/services/users";
import JobsStatsCards from "@/features/jobs/components/JobsStatsCards";
import JobsFilters from "@/features/jobs/components/JobsFilters";
import JobsTable from "@/features/jobs/components/JobsTable";
import JobsPagination from "@/features/jobs/components/JobsPagination";
import JobsSkeleton from "@/features/jobs/components/JobsSkeleton";
import JobsEmptyState from "@/features/jobs/components/JobsEmptyState";
import AccountManagerJobAssignModal from "@/features/jobs/components/AccountManagerJobAssignModal";
import ConfirmModal from "@/features/quotes/components/ConfirmModal";
import type { ProductionUsersResponse } from "@/types/users";
import {
    approveInvoice,
    approveProof,
    fetchPurchaseOrderProofs,
    fetchPurchaseOrders,
    fetchVendorInvoices,
    rejectInvoice,
    rejectProof,
    sendJobToVendor,
    uploadJobAttachments,
} from "@/services/production-my-jobs";
import { fetchVendors } from "@/services/vendors";
import type { Job, JobStatus, JobsQueryParams, JobsResponse } from "@/types/jobs";
import type {
    DeadlineFilter,
    MyJobsTabKey,
    PurchaseOrderListItem,
    PurchaseOrderProofListItem,
    PurchaseOrderProofsResponse,
    PurchaseOrdersResponse,
    SendJobToVendorPayload,
    VendorInvoiceListItem,
    VendorInvoicesResponse,
} from "@/types/production-my-jobs";
import type { Vendor, VendorsQueryParams, VendorsResponse } from "@/types/vendors";

interface TabDefinition {
    key: MyJobsTabKey;
    title: string;
    icon: LucideIcon;
}

const tabs: TabDefinition[] = [
    {
        key: "active",
        title: "Active Jobs",
        icon: BriefcaseIcon,
    },
    {
        key: "pending",
        title: "Ready for Assignment",
        icon: ClipboardListIcon,
    },
    {
        key: "assigned",
        title: "Assigned to Vendors",
        icon: Building2Icon,
    },
    {
        key: "proofs",
        title: "Awaiting Proof Approval",
        icon: ImageIcon,
    },
    {
        key: "invoices",
        title: "Pending Invoices",
        icon: ReceiptIcon,
    },
];

const jobStatusOptions: Array<{ value: "all" | JobStatus; label: string }> = [
    { value: "all", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "blocked", label: "Blocked" },
    { value: "qc_hold", label: "QC Hold" },
    { value: "ready", label: "Ready for Dispatch" },
    { value: "dispatched", label: "Dispatched" },
    { value: "completed", label: "Completed" },
];

const deadlineOptions: Array<{ value: DeadlineFilter; label: string }> = [
    { value: "all", label: "All Deadlines" },
    { value: "today", label: "Due Today" },
    { value: "week", label: "This Week" },
    { value: "overdue", label: "Overdue" },
];

const getStatusPillClass = (status: string): string => {
    if (status === "pending") {
        return "bg-brand-yellow/20 text-brand-black";
    }

    if (status === "in_progress") {
        return "bg-brand-blue/10 text-brand-blue";
    }

    if (status === "completed") {
        return "bg-brand-green/10 text-brand-green";
    }

    if (status === "on_hold" || status === "blocked") {
        return "bg-brand-red/10 text-brand-red";
    }

    if (status === "qc_hold") {
        return "bg-brand-orange/10 text-brand-orange";
    }

    if (status === "ready") {
        return "bg-teal-100 text-teal-700";
    }

    if (status === "dispatched") {
        return "bg-brand-green/20 text-brand-green";
    }

    return "bg-gray-100 text-gray-700";
};

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

const getJobIdFromPurchaseOrder = (purchaseOrder: PurchaseOrderListItem): number | null => {
    if (typeof purchaseOrder.job === "number") {
        return purchaseOrder.job;
    }

    if (purchaseOrder.job && typeof purchaseOrder.job === "object" && typeof purchaseOrder.job.id === "number") {
        return purchaseOrder.job.id;
    }

    return null;
};

const getVendorNameFromPurchaseOrder = (purchaseOrder: PurchaseOrderListItem): string => {
    if (purchaseOrder.vendor_name) {
        return purchaseOrder.vendor_name;
    }

    if (purchaseOrder.vendor && typeof purchaseOrder.vendor === "object" && purchaseOrder.vendor.name) {
        return purchaseOrder.vendor.name;
    }

    return "Vendor";
};

const DONE_STATUSES = ["completed", "dispatched", "ready"];

const getDeadlineLabel = (dateValue: string | null, jobStatus?: string): { text: string; isOverdue: boolean } => {
    if (!dateValue || (jobStatus && DONE_STATUSES.includes(jobStatus))) {
        return { text: "—", isOverdue: false };
    }

    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const deadlineDate = new Date(dateValue);
    const deadlineOnly = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
    const daysDiff = Math.floor((deadlineOnly.getTime() - todayOnly.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) {
        return { text: `Overdue by ${Math.abs(daysDiff)} day${Math.abs(daysDiff) === 1 ? "" : "s"}`, isOverdue: true };
    }

    if (daysDiff === 0) {
        return { text: "Due today", isOverdue: false };
    }

    return { text: `${daysDiff} day${daysDiff === 1 ? "" : "s"} remaining`, isOverdue: false };
};

const applyDeadlineFilter = (jobs: Job[], deadline: DeadlineFilter): Job[] => {
    if (deadline === "all") {
        return jobs;
    }

    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const weekEnd = new Date(todayOnly);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return jobs.filter((job: Job): boolean => {
        if (!job.expected_completion) {
            return false;
        }

        const expectedDate = new Date(job.expected_completion);
        const deadlineOnly = new Date(expectedDate.getFullYear(), expectedDate.getMonth(), expectedDate.getDate());

        if (deadline === "today") {
            return deadlineOnly.getTime() === todayOnly.getTime();
        }

        if (deadline === "week") {
            return deadlineOnly.getTime() >= todayOnly.getTime() && deadlineOnly.getTime() <= weekEnd.getTime();
        }

        if (deadline === "overdue") {
            return deadlineOnly.getTime() < todayOnly.getTime();
        }

        return true;
    });
};

export default function ProductionMyJobsWorkspace(): ReactElement {
    const queryClient = useQueryClient();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [activeTab, setActiveTab] = useState<MyJobsTabKey>("pending");
    const [search, setSearch] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");
    const [status, setStatus] = useState<"all" | JobStatus>("all");
    const [deadline, setDeadline] = useState<DeadlineFilter>("all");
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(20);

    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);

    // Job detail panel — opened by row click or ?job= URL param
    const [detailJobId, setDetailJobId] = useState<number | null>(null);
    const [pendingStatusUpdate, setPendingStatusUpdate] = useState<JobStatus | "">("");
    const [selectedVendorIds, setSelectedVendorIds] = useState<number[]>([]);
    const [expectedDays, setExpectedDays] = useState<number>(3);
    const [estimatedCost, setEstimatedCost] = useState<string>("");
    const [stageName, setStageName] = useState<string>("Production");
    const [vendorNotes, setVendorNotes] = useState<string>("");
    const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
    const [selectedProof, setSelectedProof] = useState<PurchaseOrderProofListItem | null>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<VendorInvoiceListItem | null>(null);
    const [rejectReason, setRejectReason] = useState<string>("");

    // Active Jobs tab state
    const [activeSearch, setActiveSearch] = useState<string>("");
    const [activeDebouncedSearch, setActiveDebouncedSearch] = useState<string>("");
    const [activeStatus, setActiveStatus] = useState<"all" | JobStatus>("all");
    const [activePage, setActivePage] = useState<number>(1);
    const [activePageSize, setActivePageSize] = useState<number>(20);
    const [ptDeleteId, setPtDeleteId] = useState<number | null>(null);
    const [ptAssignOpen, setPtAssignOpen] = useState<boolean>(false);
    const [ptAssignJobId, setPtAssignJobId] = useState<number | null>(null);
    const [ptReminderModal, setPtReminderModal] = useState<{ job: Job; note: string } | null>(null);
    const [ptRemindingId, setPtRemindingId] = useState<number | null>(null);

    useEffect((): (() => void) => {
        const timer = setTimeout((): void => {
            setDebouncedSearch(search);
        }, 400);

        return (): void => clearTimeout(timer);
    }, [search]);

    useEffect((): (() => void) => {
        const t = setTimeout((): void => setActiveDebouncedSearch(activeSearch), 400);
        return (): void => clearTimeout(t);
    }, [activeSearch]);

    // Open job detail panel when ?job= param is present in the URL
    useEffect((): void => {
        const jobParam = searchParams.get("job");
        if (jobParam) {
            const id = Number(jobParam);
            if (!isNaN(id) && id > 0) {
                setDetailJobId(id);
            }
        }
    }, [searchParams]);

    const jobsParams = useMemo(
        (): JobsQueryParams => ({
            page,
            pageSize,
            search: debouncedSearch,
            status,
        }),
        [page, pageSize, debouncedSearch, status]
    );

    const vendorsParams = useMemo(
        (): VendorsQueryParams => ({
            page: 1,
            pageSize: 500,
            search: "",
            active: "true",
        }),
        []
    );

    const jobsQuery = useQuery({
        queryKey: ["production-my-jobs", "jobs", jobsParams],
        queryFn: (): Promise<JobsResponse> => fetchJobs(jobsParams),
    });

    const purchaseOrdersQuery = useQuery({
        queryKey: ["production-my-jobs", "purchase-orders"],
        queryFn: (): Promise<PurchaseOrdersResponse> => fetchPurchaseOrders("ACCEPTED"),
    });

    const proofsQuery = useQuery({
        queryKey: ["production-my-jobs", "proofs"],
        queryFn: (): Promise<PurchaseOrderProofsResponse> => fetchPurchaseOrderProofs(""),
    });

    const invoicesQuery = useQuery({
        queryKey: ["production-my-jobs", "invoices"],
        queryFn: (): Promise<VendorInvoicesResponse> => fetchVendorInvoices(""),
    });

    const vendorsQuery = useQuery({
        queryKey: ["production-my-jobs", "vendors", vendorsParams],
        queryFn: (): Promise<VendorsResponse> => fetchVendors(vendorsParams),
    });

    const currentUserQuery = useQuery({
        queryKey: ["production-my-jobs", "current-user"],
        queryFn: getCurrentUser,
        staleTime: 10 * 60 * 1000,
    });
    const currentUserId = currentUserQuery.data?.id ?? null;

    const activeJobsParams = useMemo(
        (): JobsQueryParams => ({ page: activePage, pageSize: activePageSize, search: activeDebouncedSearch, status: activeStatus }),
        [activePage, activePageSize, activeDebouncedSearch, activeStatus]
    );

    const activeJobsQuery = useQuery({
        queryKey: ["production-active-jobs", activeJobsParams],
        queryFn: (): Promise<JobsResponse> => fetchJobs(activeJobsParams),
        enabled: activeTab === "active",
    });

    const allUsersQuery = useQuery({
        queryKey: ["all-users"],
        queryFn: (): Promise<ProductionUsersResponse> => fetchAllUsers(),
    });


    const jobDetailQuery = useQuery({
        queryKey: ["production-my-jobs", "job-detail", detailJobId],
        queryFn: (): Promise<Job> => fetchJob(detailJobId!),
        enabled: detailJobId !== null,
    });

    const detailJob = jobDetailQuery.data ?? null;

    const updateStatusMutation = useMutation({
        mutationFn: ({ jobId, newStatus }: { jobId: number; newStatus: JobStatus }) =>
            updateJob(jobId, { status: newStatus }),
        onSuccess: (updatedJob: Job): void => {
            toast.success(`Job status updated to "${updatedJob.status.replace("_", " ")}".`);
            queryClient.invalidateQueries({ queryKey: ["production-my-jobs", "jobs"] });
            queryClient.invalidateQueries({ queryKey: ["production-my-jobs", "job-detail", detailJobId] });
            setPendingStatusUpdate("");
        },
        onError: (): void => {
            toast.error("Failed to update job status.");
        },
    });

    const uploadMutation = useMutation({
        mutationFn: ({ jobId, files }: { jobId: number; files: File[] }) => uploadJobAttachments(jobId, files),
        onSuccess: (): void => {
            toast.success("Attachments uploaded.");
            setFilesToUpload([]);
        },
        onError: (): void => {
            toast.error("Unable to upload attachments.");
        },
    });

    const sendToVendorMutation = useMutation({
        mutationFn: async (payload: {
            jobId: number;
            vendorIds: number[];
            expectedDaysValue: number;
            stageNameValue: string;
            estimatedCostValue: number;
            notesValue: string;
        }): Promise<void> => {
            const requests = payload.vendorIds.map((vendorId: number): Promise<unknown> => {
                const requestPayload: SendJobToVendorPayload = {
                    vendor_id: vendorId,
                    stage_name: payload.stageNameValue,
                    expected_days: payload.expectedDaysValue,
                    total_cost: payload.estimatedCostValue,
                    notes: payload.notesValue,
                };
                return sendJobToVendor(payload.jobId, requestPayload);
            });

            await Promise.all(requests);
        },
        onSuccess: (): void => {
            toast.success("Purchase order sent to selected vendor(s).");
            queryClient.invalidateQueries({ queryKey: ["production-my-jobs", "jobs"] });
            queryClient.invalidateQueries({ queryKey: ["production-my-jobs", "purchase-orders"] });
            setIsAssignModalOpen(false);
            setSelectedJob(null);
            setSelectedVendorIds([]);
            setExpectedDays(3);
            setEstimatedCost("");
            setStageName("Production");
            setVendorNotes("");
            setFilesToUpload([]);
        },
        onError: (): void => {
            toast.error("Unable to send job to vendor.");
        },
    });

    const approveProofMutation = useMutation({
        mutationFn: (proofId: number): Promise<void> => approveProof(proofId),
        onSuccess: (): void => {
            toast.success("Proof approved.");
            queryClient.invalidateQueries({ queryKey: ["production-my-jobs", "proofs"] });
            setSelectedProof(null);
            setRejectReason("");
        },
        onError: (): void => {
            toast.error("Unable to approve proof.");
        },
    });

    const rejectProofMutation = useMutation({
        mutationFn: (payload: { proofId: number; reason: string }): Promise<void> => rejectProof(payload.proofId, payload.reason),
        onSuccess: (): void => {
            toast.success("Proof rejected.");
            queryClient.invalidateQueries({ queryKey: ["production-my-jobs", "proofs"] });
            setSelectedProof(null);
            setRejectReason("");
        },
        onError: (): void => {
            toast.error("Unable to reject proof.");
        },
    });

    const approveInvoiceMutation = useMutation({
        mutationFn: (invoiceId: number): Promise<void> => approveInvoice(invoiceId),
        onSuccess: (): void => {
            toast.success("Invoice approved.");
            queryClient.invalidateQueries({ queryKey: ["production-my-jobs", "invoices"] });
            setSelectedInvoice(null);
            setRejectReason("");
        },
        onError: (): void => {
            toast.error("Unable to approve invoice.");
        },
    });

    const rejectInvoiceMutation = useMutation({
        mutationFn: (payload: { invoiceId: number; reason: string }): Promise<void> => rejectInvoice(payload.invoiceId, payload.reason),
        onSuccess: (): void => {
            toast.success("Invoice rejected.");
            queryClient.invalidateQueries({ queryKey: ["production-my-jobs", "invoices"] });
            setSelectedInvoice(null);
            setRejectReason("");
        },
        onError: (): void => {
            toast.error("Unable to reject invoice.");
        },
    });

    const deleteJobMutation = useMutation({
        mutationFn: (jobId: number) => deleteJobFn(jobId),
        onSuccess: (): void => {
            toast.success("Job deleted.");
            queryClient.invalidateQueries({ queryKey: ["production-active-jobs"] });
            setPtDeleteId(null);
        },
        onError: (): void => { toast.error("Failed to delete job."); },
    });

    const ptAssignMutation = useMutation({
        mutationFn: ({ jobId, userId, notes, remindDays }: {
            jobId: number; userId: number; notes: string; remindDays: number;
        }) => assignJobToProductionTeam(jobId, {
            user_id: userId,
            assignment_notes: notes,
            remind_days_before: remindDays,
        }),
        onSuccess: (): void => {
            toast.success("Job assigned! Notification sent.");
            queryClient.invalidateQueries({ queryKey: ["production-active-jobs"] });
            setPtAssignOpen(false);
        },
        onError: (): void => { toast.error("Unable to assign job."); },
    });

    const ptReminderMutation = useMutation({
        mutationFn: ({ jobId, note }: { jobId: number; note: string }) => sendJobReminder(jobId, note),
        onSuccess: (): void => {
            toast.success("Reminder sent!");
            setPtRemindingId(null);
        },
        onError: (): void => {
            toast.error("Unable to send reminder.");
            setPtRemindingId(null);
        },
    });

    const jobs = jobsQuery.data?.results ?? [];
    const filteredJobs = applyDeadlineFilter(jobs, deadline);
    const purchaseOrders = purchaseOrdersQuery.data?.results ?? [];
    const proofs = proofsQuery.data?.results ?? [];
    const invoices = invoicesQuery.data?.results ?? [];
    const vendors = vendorsQuery.data?.results ?? [];

    const sortedProofs = useMemo(
        (): PurchaseOrderProofListItem[] =>
            [...proofs].sort((a: PurchaseOrderProofListItem, b: PurchaseOrderProofListItem): number => {
                const order: Record<string, number> = { pending: 0, rejected: 1, approved: 2 };
                return (order[a.status] ?? 3) - (order[b.status] ?? 3);
            }),
        [proofs]
    );

    const sortedInvoices = useMemo(
        (): VendorInvoiceListItem[] =>
            [...invoices].sort((a: VendorInvoiceListItem, b: VendorInvoiceListItem): number => {
                const order: Record<string, number> = { submitted: 0, rejected: 1, approved: 2 };
                return (order[a.status] ?? 3) - (order[b.status] ?? 3);
            }),
        [invoices]
    );

    const purchaseOrdersByJob = useMemo((): Map<number, PurchaseOrderListItem[]> => {
        const map = new Map<number, PurchaseOrderListItem[]>();
        purchaseOrders.forEach((purchaseOrder: PurchaseOrderListItem): void => {
            const jobId = getJobIdFromPurchaseOrder(purchaseOrder);
            if (!jobId) {
                return;
            }

            const existing = map.get(jobId) ?? [];
            map.set(jobId, [...existing, purchaseOrder]);
        });
        return map;
    }, [purchaseOrders]);

    const activeJobs = activeJobsQuery.data?.results ?? [];
    const activeJobsTotal = activeJobsQuery.data?.count ?? 0;
    const allUsers = allUsersQuery.data?.users ?? [];

    const tabCounts = {
        active: activeJobsTotal,
        pending: jobsQuery.data?.count ?? filteredJobs.length,
        assigned: purchaseOrders.length,
        proofs: proofs.filter((p: PurchaseOrderProofListItem): boolean => p.status === "pending").length,
        invoices: invoices.filter((i: VendorInvoiceListItem): boolean => i.status === "submitted").length,
    };

    const isPendingLoading = jobsQuery.isLoading;
    const isPendingError = Boolean(jobsQuery.error);

    const isOtherTabsLoading = purchaseOrdersQuery.isLoading || proofsQuery.isLoading || invoicesQuery.isLoading;
    const isOtherTabsError = Boolean(purchaseOrdersQuery.error || proofsQuery.error || invoicesQuery.error);

    const openAssignModal = (job: Job): void => {
        setSelectedJob(job);
        setIsAssignModalOpen(true);
    };

    const toggleVendorSelection = (vendorId: number): void => {
        if (selectedVendorIds.includes(vendorId)) {
            setSelectedVendorIds(selectedVendorIds.filter((currentId: number): boolean => currentId !== vendorId));
            return;
        }

        setSelectedVendorIds([...selectedVendorIds, vendorId]);
    };

    const handleAttachmentInput = (event: ChangeEvent<HTMLInputElement>): void => {
        const files = event.target.files;
        if (!files) {
            setFilesToUpload([]);
            return;
        }

        setFilesToUpload(Array.from(files));
    };

    const handleUploadAttachments = (): void => {
        if (!selectedJob) {
            toast.error("Select a job first.");
            return;
        }

        if (filesToUpload.length === 0) {
            toast.error("Choose at least one file to upload.");
            return;
        }

        uploadMutation.mutate({ jobId: selectedJob.id, files: filesToUpload });
    };

    const handleSendToVendors = (): void => {
        if (!selectedJob) {
            toast.error("Select a job before sending to vendors.");
            return;
        }

        if (selectedVendorIds.length === 0) {
            toast.error("Select at least one vendor.");
            return;
        }

        const expectedDaysValue = Number(expectedDays);
        if (!Number.isFinite(expectedDaysValue) || expectedDaysValue < 1) {
            toast.error("Expected days must be 1 or greater.");
            return;
        }

        const estimatedCostValue = Number(estimatedCost || "0");
        if (!Number.isFinite(estimatedCostValue) || estimatedCostValue < 0) {
            toast.error("Estimated cost must be zero or greater.");
            return;
        }

        sendToVendorMutation.mutate({
            jobId: selectedJob.id,
            vendorIds: selectedVendorIds,
            expectedDaysValue,
            stageNameValue: stageName.trim() || "Production",
            estimatedCostValue,
            notesValue: vendorNotes.trim(),
        });
    };

    const handleReviewProof = (proof: PurchaseOrderProofListItem): void => {
        setRejectReason("");
        setSelectedProof(proof);
    };

    const handleReviewInvoice = (invoice: VendorInvoiceListItem): void => {
        setRejectReason("");
        setSelectedInvoice(invoice);
    };

    return (
        <>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                            <a href="/staff" className="hover:text-brand-blue">
                                Staff Portal
                            </a>
                            <span>/</span>
                            <span className="text-gray-900">My Jobs</span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">My Jobs</h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Manage jobs, assign to vendors, track proofs, and process invoices
                        </p>
                    </div>
                    {activeTab === "active" && (
                        <button
                            type="button"
                            onClick={(): void => router.push("/staff/production/my-jobs/create")}
                            className="flex items-center gap-2 rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Create Job
                        </button>
                    )}
                </div>
            </header>

            <main className="bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 lg:py-6 space-y-6">
                    <section className="w-full border-b border-gray-200 bg-white">
                        <div className="flex overflow-x-auto">
                            {tabs.map((tab: TabDefinition): ReactElement => {
                                const active = tab.key === activeTab;
                                const badgeCount = tabCounts[tab.key];
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={(): void => setActiveTab(tab.key)}
                                        className={`flex items-center gap-2 whitespace-nowrap px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${active
                                            ? "border-brand-blue text-brand-blue"
                                            : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span>{tab.title}</span>
                                        <span className={`inline-flex min-w-[20px] justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${active ? "bg-brand-blue text-white" : "bg-gray-100 text-gray-600"
                                            }`}>
                                            {badgeCount}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {activeTab !== "active" && (
                    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                            <div className="lg:col-span-6">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Search</label>
                                <div className="mt-2 relative">
                                    <SearchIcon className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(event: ChangeEvent<HTMLInputElement>): void => setSearch(event.target.value)}
                                        placeholder="Search by job number, client, or product"
                                        className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="lg:col-span-3">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                                <select
                                    value={status}
                                    onChange={(event: ChangeEvent<HTMLSelectElement>): void => {
                                        setStatus(event.target.value as "all" | JobStatus);
                                        setPage(1);
                                    }}
                                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                >
                                    {jobStatusOptions.map((option): ReactElement => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="lg:col-span-3">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Deadline</label>
                                <select
                                    value={deadline}
                                    onChange={(event: ChangeEvent<HTMLSelectElement>): void => {
                                        setDeadline(event.target.value as DeadlineFilter);
                                        setPage(1);
                                    }}
                                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                >
                                    {deadlineOptions.map((option): ReactElement => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>
                    )}

                    {(activeTab === "pending" && isPendingLoading) || (activeTab !== "pending" && activeTab !== "active" && isOtherTabsLoading) ? (
                        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                                Loading workflow data...
                            </div>
                        </div>
                    ) : null}

                    {activeTab === "pending" && isPendingError ? (
                        <div className="rounded-lg border border-brand-red/30 bg-brand-red/10 p-6">
                            <div className="flex items-center gap-3">
                                <AlertCircleIcon className="h-5 w-5 text-brand-red" />
                                <p className="text-sm text-brand-red">Unable to load jobs. Please try again.</p>
                            </div>
                        </div>
                    ) : null}

                    {activeTab !== "pending" && activeTab !== "active" && isOtherTabsError ? (
                        <div className="rounded-lg border border-brand-red/30 bg-brand-red/10 p-6">
                            <div className="flex items-center gap-3">
                                <AlertCircleIcon className="h-5 w-5 text-brand-red" />
                                <p className="text-sm text-brand-red">Unable to load tab data. Please try again.</p>
                            </div>
                        </div>
                    ) : null}

                    {activeTab === "active" ? (
                        <>
                            <JobsStatsCards jobs={activeJobs} />
                            <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
                                <div className="border-b border-gray-200 p-4">
                                    <JobsFilters
                                        search={activeSearch}
                                        status={activeStatus}
                                        onSearchChange={(v): void => { setActiveSearch(v); setActivePage(1); }}
                                        onStatusChange={(v): void => { setActiveStatus(v); setActivePage(1); }}
                                        onReset={(): void => { setActiveSearch(""); setActiveStatus("all"); setActivePage(1); }}
                                    />
                                </div>

                                {activeJobsQuery.isLoading && <JobsSkeleton />}

                                {activeJobsQuery.error && (
                                    <div className="p-6">
                                        <div className="rounded-lg border border-brand-red/20 bg-brand-red/5 p-4 flex items-center gap-2">
                                            <AlertCircleIcon className="h-4 w-4 text-brand-red" />
                                            <p className="text-sm font-medium text-brand-red">Unable to load jobs.</p>
                                        </div>
                                    </div>
                                )}

                                {!activeJobsQuery.isLoading && !activeJobsQuery.error && activeJobs.length === 0 && (
                                    <JobsEmptyState title="No jobs found" description="No jobs match your search. Create one to get started." />
                                )}

                                {!activeJobsQuery.isLoading && !activeJobsQuery.error && activeJobs.length > 0 && (
                                    <>
                                        <JobsTable
                                            jobs={activeJobs}
                                            onViewDetails={(job): void => router.push(`/staff/production/my-jobs/${job.id}`)}
                                            onEdit={(job): void => router.push(`/staff/production/my-jobs/${job.id}/edit`)}
                                            onAssign={(job): void => { setPtAssignJobId(job.id); setPtAssignOpen(true); }}
                                            onSendReminder={(job): void => setPtReminderModal({ job, note: "" })}
                                            onDelete={(job): void => setPtDeleteId(job.id)}
                                            showAssignButton
                                            showReminderButton
                                            remindingJobId={ptRemindingId ?? undefined}
                                            deletingJobId={deleteJobMutation.isPending ? (ptDeleteId ?? undefined) : undefined}
                                        />
                                        <div className="border-t border-gray-200 p-4">
                                            <JobsPagination
                                                count={activeJobsTotal}
                                                page={activePage}
                                                pageSize={activePageSize}
                                                onPageChange={setActivePage}
                                                onPageSizeChange={setActivePageSize}
                                            />
                                        </div>
                                    </>
                                )}
                            </section>
                        </>
                    ) : null}

                    {activeTab === "pending" && !isPendingLoading && !isPendingError ? (
                        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Job Number</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Products / Items</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Deadline</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredJobs.length > 0 ? (
                                            filteredJobs.map((job: Job): ReactElement => {
                                                const relatedPos = purchaseOrdersByJob.get(job.id) ?? [];
                                                const vendorStatus = relatedPos.length > 0
                                                    ? `Assigned to ${relatedPos.map((po: PurchaseOrderListItem): string => getVendorNameFromPurchaseOrder(po)).slice(0, 2).join(", ")}${relatedPos.length > 2 ? "..." : ""}`
                                                    : "Not Assigned";
                                                const deadlineLabel = getDeadlineLabel(job.expected_completion, job.status);

                                                return (
                                                    <tr
                                                        key={job.id}
                                                        className="hover:bg-gray-50 cursor-pointer"
                                                        onClick={(): void => { setDetailJobId(job.id); setPendingStatusUpdate(""); }}
                                                    >
                                                        <td className="px-4 py-3 font-semibold text-gray-900">{job.job_number || "—"}</td>
                                                        <td className="px-4 py-3 text-gray-700">{job.client?.name || "N/A"}</td>
                                                        <td className="px-4 py-3">
                                                            {job.job_products && job.job_products.length > 0 ? (() => {
                                                                // Show only items assigned to me; fall back to all if none specifically assigned
                                                                const mine = currentUserId
                                                                    ? job.job_products.filter((jp) => jp.assigned_to === currentUserId)
                                                                    : [];
                                                                const display = mine.length > 0 ? mine : job.job_products;
                                                                return (
                                                                    <div className="space-y-1">
                                                                        {display.slice(0, 3).map((jp) => (
                                                                            <div key={jp.id} className="flex items-center gap-1.5">
                                                                                <PackageIcon className="w-3 h-3 text-gray-400 shrink-0" />
                                                                                <span className="text-xs text-gray-900 leading-tight">{jp.product_name}</span>
                                                                                <span className="text-xs text-gray-400">× {jp.quantity}</span>
                                                                            </div>
                                                                        ))}
                                                                        {display.length > 3 && (
                                                                            <span className="text-xs text-gray-400">+{display.length - 3} more</span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })() : (
                                                                <div>
                                                                    <div className="text-sm text-gray-900">{job.product}</div>
                                                                    <div className="text-xs text-gray-500">{job.quantity} pcs</div>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${relatedPos.length > 0
                                                                ? "bg-brand-green/10 text-brand-green"
                                                                : "bg-brand-yellow/15 text-brand-black"
                                                                }`}>
                                                                {vendorStatus}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="text-sm text-gray-900">{formatDate(job.expected_completion)}</div>
                                                            <div className={`text-xs ${deadlineLabel.isOverdue ? "text-brand-red font-semibold" : "text-gray-500"}`}>
                                                                {deadlineLabel.text}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusPillClass(job.status)}`}>
                                                                {job.status.replace("_", " ")}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={(): void => { setDetailJobId(job.id); setPendingStatusUpdate(""); }}
                                                                    className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-brand-blue hover:text-brand-blue"
                                                                >
                                                                    <EyeIcon className="w-3 h-3" />
                                                                    View
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(): void => openAssignModal(job)}
                                                                    className="rounded-md bg-brand-green px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-green/90"
                                                                >
                                                                    Send to Vendor
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                                                    No jobs found for this filter.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
                                <div className="text-xs text-gray-500">
                                    Page {page} · Showing up to {pageSize} rows
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={page <= 1}
                                        onClick={(): void => setPage(page - 1)}
                                        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        type="button"
                                        disabled={Boolean(!jobsQuery.data?.next)}
                                        onClick={(): void => setPage(page + 1)}
                                        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                    <select
                                        value={pageSize}
                                        onChange={(event: ChangeEvent<HTMLSelectElement>): void => {
                                            setPageSize(Number(event.target.value));
                                            setPage(1);
                                        }}
                                        className="rounded-md border border-gray-300 px-2 py-1.5 text-xs"
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {activeTab === "assigned" && !isOtherTabsLoading ? (
                        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">PO Number</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Required By</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {purchaseOrders.length > 0 ? (
                                            purchaseOrders.map((purchaseOrder: PurchaseOrderListItem): ReactElement => (
                                                <tr key={purchaseOrder.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-semibold text-gray-900">{purchaseOrder.po_number || `PO-${purchaseOrder.id}`}</td>
                                                    <td className="px-4 py-3 text-gray-700">{getVendorNameFromPurchaseOrder(purchaseOrder)}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex rounded-full bg-brand-green/10 px-2 py-1 text-xs font-semibold text-brand-green">
                                                            {purchaseOrder.status || "ACCEPTED"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-700">{formatDate(purchaseOrder.required_by)}</td>
                                                    <td className="px-4 py-3 text-gray-700">KES {purchaseOrder.total_cost ?? "0"}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                                                    No assigned purchase orders yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : null}

                    {activeTab === "proofs" && !isOtherTabsLoading ? (
                        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Proof ID</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">PO</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Submitted</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {sortedProofs.length > 0 ? (
                                            sortedProofs.map((proof: PurchaseOrderProofListItem): ReactElement => {
                                                const isPending = proof.status === "pending";
                                                return (
                                                    <tr key={proof.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 font-semibold text-gray-900">#{proof.id}</td>
                                                        <td className="px-4 py-3 text-gray-700">{proof.po_number || "—"}</td>
                                                        <td className="px-4 py-3 text-gray-700">{formatDate(proof.submitted_at)}</td>
                                                        <td className="px-4 py-3">
                                                            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700 capitalize">
                                                                {proof.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={(): void => handleReviewProof(proof)}
                                                                className="text-sm font-semibold text-brand-blue hover:text-brand-blue/80"
                                                            >
                                                                {isPending ? <>Review &rarr;</> : <>View &rarr;</>}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                                                    No proofs submitted yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : null}

                    {activeTab === "invoices" && !isOtherTabsLoading ? (
                        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice #</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">PO</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Submitted</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {sortedInvoices.length > 0 ? (
                                            sortedInvoices.map((invoice: VendorInvoiceListItem): ReactElement => {
                                                const isPending = invoice.status === "submitted";
                                                return (
                                                    <tr key={invoice.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 font-semibold text-gray-900">{invoice.invoice_number || `INV-${invoice.id}`}</td>
                                                        <td className="px-4 py-3 text-gray-700">{invoice.vendor_name || "—"}</td>
                                                        <td className="px-4 py-3 text-gray-700">{invoice.po_number || "—"}</td>
                                                        <td className="px-4 py-3 text-gray-700">KES {invoice.total_amount ?? "0"}</td>
                                                        <td className="px-4 py-3 text-gray-700">{formatDate(invoice.submitted_at)}</td>
                                                        <td className="px-4 py-3">
                                                            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700 capitalize">
                                                                {invoice.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={(): void => handleReviewInvoice(invoice)}
                                                                className="text-sm font-semibold text-brand-blue hover:text-brand-blue/80"
                                                            >
                                                                {isPending ? <>Review &rarr;</> : <>View &rarr;</>}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                                                    No invoices submitted yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : null}
                </div>
            </main>

            {detailJobId !== null ? (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-black/30"
                        onClick={(): void => setDetailJobId(null)}
                    />
                    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl flex flex-col bg-white shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
                            <div>
                                {jobDetailQuery.isLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                                        Loading job details…
                                    </div>
                                ) : detailJob ? (
                                    <>
                                        <h2 className="text-base font-bold text-gray-900">
                                            {detailJob.job_number || `Job #${detailJob.id}`}
                                        </h2>
                                        <p className="mt-0.5 text-xs text-gray-500">
                                            {detailJob.client?.name || "No client"} &middot; {detailJob.job_name || detailJob.product}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-sm text-gray-500">Job not found.</p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={(): void => setDetailJobId(null)}
                                className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
                            >
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>

                        {detailJob && !jobDetailQuery.isLoading ? (
                            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                                {/* Status + Priority pills */}
                                <div className="flex items-center gap-3">
                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusPillClass(detailJob.status)}`}>
                                        {detailJob.status.replace(/_/g, " ")}
                                    </span>
                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                        detailJob.priority === "urgent"
                                            ? "bg-brand-red/10 text-brand-red"
                                            : detailJob.priority === "high"
                                            ? "bg-brand-orange/10 text-brand-orange"
                                            : "bg-gray-100 text-gray-600"
                                    }`}>
                                        {detailJob.priority} priority
                                    </span>
                                </div>

                                {/* Update Status */}
                                <div className="rounded-md border border-gray-200 p-4">
                                    <p className="text-xs font-semibold uppercase text-gray-500 mb-3">Update Job Status</p>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={pendingStatusUpdate || detailJob.status}
                                            onChange={(e: ChangeEvent<HTMLSelectElement>): void =>
                                                setPendingStatusUpdate(e.target.value as JobStatus)
                                            }
                                            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="blocked">Blocked</option>
                                            <option value="qc_hold">QC Hold</option>
                                            <option value="ready">Ready for Dispatch</option>
                                            <option value="dispatched">Dispatched</option>
                                            <option value="completed">Completed</option>
                                        </select>
                                        <button
                                            type="button"
                                            disabled={
                                                !pendingStatusUpdate ||
                                                pendingStatusUpdate === detailJob.status ||
                                                updateStatusMutation.isPending
                                            }
                                            onClick={(): void => {
                                                if (pendingStatusUpdate && pendingStatusUpdate !== detailJob.status) {
                                                    updateStatusMutation.mutate({
                                                        jobId: detailJob.id,
                                                        newStatus: pendingStatusUpdate as JobStatus,
                                                    });
                                                }
                                            }}
                                            className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-brand-blue/90"
                                        >
                                            {updateStatusMutation.isPending ? "Saving…" : "Save"}
                                        </button>
                                    </div>
                                </div>

                                {/* Key details grid */}
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-xs font-medium uppercase text-gray-400">Person in Charge</p>
                                        <p className="mt-1 text-gray-800 flex items-center gap-1.5">
                                            <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                                            {detailJob.person_in_charge
                                                ? `${detailJob.person_in_charge.first_name} ${detailJob.person_in_charge.last_name}`.trim() || detailJob.person_in_charge.username
                                                : "—"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium uppercase text-gray-400">Job Type</p>
                                        <p className="mt-1 text-gray-800">{detailJob.job_type || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium uppercase text-gray-400">Start Date</p>
                                        <p className="mt-1 text-gray-800 flex items-center gap-1.5">
                                            <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                                            {formatDate(detailJob.start_date)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium uppercase text-gray-400">Expected Completion</p>
                                        <p className="mt-1 text-gray-800 flex items-center gap-1.5">
                                            <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                                            {formatDate(detailJob.expected_completion)}
                                        </p>
                                    </div>
                                    {detailJob.delivery_date ? (
                                        <div>
                                            <p className="text-xs font-medium uppercase text-gray-400">Delivery Date</p>
                                            <p className="mt-1 text-gray-800 flex items-center gap-1.5">
                                                <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                                                {formatDate(detailJob.delivery_date)}
                                            </p>
                                        </div>
                                    ) : null}
                                    {detailJob.delivery_method ? (
                                        <div>
                                            <p className="text-xs font-medium uppercase text-gray-400">Delivery Method</p>
                                            <p className="mt-1 text-gray-800">{detailJob.delivery_method}</p>
                                        </div>
                                    ) : null}
                                </div>

                                {/* Products / Items */}
                                <div>
                                    {(() => {
                                        const mine = currentUserId && detailJob.job_products
                                            ? detailJob.job_products.filter((jp) => jp.assigned_to === currentUserId)
                                            : [];
                                        const hasFilter = mine.length > 0;
                                        return (
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-xs font-semibold uppercase text-gray-500">
                                                    {hasFilter ? "My Assigned Items" : "Products / Items"}
                                                </p>
                                                {hasFilter && detailJob.job_products && detailJob.job_products.length > mine.length && (
                                                    <span className="text-[10px] text-gray-400">
                                                        {mine.length} of {detailJob.job_products.length} items
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                    {detailJob.job_products && detailJob.job_products.length > 0 ? (() => {
                                        const mine = currentUserId
                                            ? detailJob.job_products.filter((jp) => jp.assigned_to === currentUserId)
                                            : [];
                                        const display = mine.length > 0 ? mine : detailJob.job_products;
                                        return (
                                        <div className="space-y-2">
                                            {display.map((jp) => (
                                                <div key={jp.id} className="rounded-md border border-gray-200 px-4 py-3">
                                                    <div className="flex items-start gap-2">
                                                        <PackageIcon className="w-4 h-4 text-brand-blue mt-0.5 shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-gray-900">{jp.product_name}</p>
                                                            <p className="text-xs text-gray-500 mt-0.5">
                                                                {jp.quantity} {jp.unit}
                                                                {jp.assigned_to_name ? ` · Assigned to: ${jp.assigned_to_name}` : ""}
                                                            </p>
                                                            {jp.specifications ? (
                                                                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{jp.specifications}</p>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                    })() : (
                                        <div className="rounded-md border border-gray-200 px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <PackageIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{detailJob.product}</p>
                                                    <p className="text-xs text-gray-500">{detailJob.quantity} pcs</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Notes */}
                                {detailJob.notes ? (
                                    <div>
                                        <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Notes</p>
                                        <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-700 whitespace-pre-line">
                                            {detailJob.notes}
                                        </div>
                                    </div>
                                ) : null}

                                {/* Assignment notes */}
                                {detailJob.assignment_notes ? (
                                    <div>
                                        <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Assignment Notes</p>
                                        <div className="rounded-md bg-brand-blue/5 border border-brand-blue/20 px-4 py-3 text-sm text-gray-700 whitespace-pre-line">
                                            {detailJob.assignment_notes}
                                        </div>
                                    </div>
                                ) : null}

                                {/* LPO info */}
                                {detailJob.lpo_number ? (
                                    <div className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3 text-sm">
                                        <span className="text-gray-500">LPO Number</span>
                                        <span className="font-semibold text-gray-900">{detailJob.lpo_number}</span>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        {/* Footer actions */}
                        {detailJob && !jobDetailQuery.isLoading ? (
                            <div className="border-t border-gray-200 px-6 py-4 shrink-0 flex items-center justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={(): void => setDetailJobId(null)}
                                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    onClick={(): void => {
                                        setSelectedJob(detailJob);
                                        setIsAssignModalOpen(true);
                                        setDetailJobId(null);
                                    }}
                                    className="inline-flex items-center gap-2 rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green/90"
                                >
                                    <SendHorizonalIcon className="w-4 h-4" />
                                    Send to Vendor
                                </button>
                            </div>
                        ) : null}
                    </div>
                </>
            ) : null}

            {selectedProof ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-lg bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">Proof Review</h2>
                                <p className="mt-0.5 text-xs text-gray-500">PO #{selectedProof.po_number || selectedProof.purchase_order || "—"} &middot; Submitted {formatDate(selectedProof.submitted_at)}</p>
                            </div>
                            <button type="button" onClick={(): void => setSelectedProof(null)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
                                <XIcon className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="px-6 py-5 space-y-5">
                            {selectedProof.proof_image ? (
                                <div>
                                    <p className="mb-2 text-xs font-medium uppercase text-gray-400">Attached Proof</p>
                                    {/\.(pdf)$/i.test(selectedProof.proof_image) ? (
                                        <div className="flex items-center gap-3 rounded-md border border-gray-200 p-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded bg-brand-blue/10 text-brand-blue text-xs font-bold">PDF</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">Proof Document</p>
                                                <p className="text-xs text-gray-500 truncate">{selectedProof.proof_image.split('/').pop()}</p>
                                            </div>
                                            <a
                                                href={selectedProof.proof_image}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="shrink-0 rounded-md bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-blue/90"
                                            >
                                                Open PDF
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="rounded-md border border-gray-200 overflow-hidden">
                                            <img
                                                src={selectedProof.proof_image}
                                                alt="Proof"
                                                className="w-full object-contain max-h-[400px] bg-gray-50"
                                            />
                                            <div className="border-t border-gray-100 px-4 py-2 flex justify-end">
                                                <a
                                                    href={selectedProof.proof_image}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-semibold text-brand-blue hover:underline"
                                                >
                                                    Open full size &rarr;
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 py-8 text-center text-sm text-gray-500">
                                    No proof file attached.
                                </div>
                            )}
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p className="text-xs font-medium uppercase text-gray-400">Type</p>
                                    <p className="mt-0.5 text-gray-700">{selectedProof.proof_type || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase text-gray-400">Status</p>
                                    <p className="mt-0.5">
                                        <span className="inline-flex rounded-full bg-brand-yellow/20 px-2 py-0.5 text-xs font-semibold text-brand-black">{selectedProof.status}</span>
                                    </p>
                                </div>
                                {selectedProof.reviewed_by_name ? (
                                    <div>
                                        <p className="text-xs font-medium uppercase text-gray-400">Reviewed By</p>
                                        <p className="mt-0.5 text-gray-700">{selectedProof.reviewed_by_name}</p>
                                    </div>
                                ) : null}
                            </div>
                            {selectedProof.description ? (
                                <div className="rounded-md bg-gray-50 px-4 py-3">
                                    <p className="text-xs font-medium uppercase text-gray-400 mb-1">Vendor Notes</p>
                                    <p className="text-sm text-gray-700">{selectedProof.description}</p>
                                </div>
                            ) : null}
                            {selectedProof.rejection_reason ? (
                                <div className="rounded-md bg-brand-red/5 border border-brand-red/20 px-4 py-3">
                                    <p className="text-xs font-medium uppercase text-brand-red mb-1">Previous Rejection Reason</p>
                                    <p className="text-sm text-brand-red">{selectedProof.rejection_reason}</p>
                                </div>
                            ) : null}
                            {selectedProof.status === "pending" ? (
                                <div>
                                    <label className="block text-xs font-medium uppercase text-gray-500">Rejection Reason <span className="text-gray-400 normal-case">(required to reject)</span></label>
                                    <textarea
                                        rows={3}
                                        value={rejectReason}
                                        onChange={(e: ChangeEvent<HTMLTextAreaElement>): void => setRejectReason(e.target.value)}
                                        placeholder="Describe why this proof is being rejected…"
                                        className="mt-1.5 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                                    />
                                </div>
                            ) : null}
                        </div>
                        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
                            <button
                                type="button"
                                onClick={(): void => setSelectedProof(null)}
                                className="rounded-md px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                            >
                                Close
                            </button>
                            {selectedProof.status === "pending" ? (
                                <>
                                    <button
                                        type="button"
                                        disabled={!rejectReason.trim() || rejectProofMutation.isPending}
                                        onClick={(): void => rejectProofMutation.mutate({ proofId: selectedProof.id, reason: rejectReason.trim() })}
                                        className="rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red/90 disabled:opacity-50"
                                    >
                                        {rejectProofMutation.isPending ? "Rejecting…" : "Reject"}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={approveProofMutation.isPending}
                                        onClick={(): void => approveProofMutation.mutate(selectedProof.id)}
                                        className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green/90 disabled:opacity-50"
                                    >
                                        {approveProofMutation.isPending ? "Approving…" : "Approve Proof"}
                                    </button>
                                </>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}

            {selectedInvoice ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-lg bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
                            <div>
                                <h2 className="text-base font-semibold text-gray-900">{selectedInvoice.invoice_number || `INV-${selectedInvoice.id}`}</h2>
                                <p className="mt-0.5 text-xs text-gray-500">{selectedInvoice.vendor_name || "Vendor"} &middot; Submitted {formatDate(selectedInvoice.submitted_at)}</p>
                            </div>
                            <button type="button" onClick={(): void => setSelectedInvoice(null)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
                                <XIcon className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="px-6 py-5 space-y-5">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                <div>
                                    <p className="text-xs font-medium uppercase text-gray-400">Purchase Order</p>
                                    <p className="mt-0.5 font-medium text-gray-900">{selectedInvoice.po_number ? `PO ${selectedInvoice.po_number}` : "—"}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase text-gray-400">Job</p>
                                    <p className="mt-0.5 font-medium text-gray-900">{selectedInvoice.job_number || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase text-gray-400">Invoice Date</p>
                                    <p className="mt-0.5 text-gray-700">{formatDate(selectedInvoice.invoice_date ?? null)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase text-gray-400">Due Date</p>
                                    <p className="mt-0.5 text-gray-700">{formatDate(selectedInvoice.due_date ?? null)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase text-gray-400">Payment Terms</p>
                                    <p className="mt-0.5 text-gray-700">{selectedInvoice.payment_terms || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase text-gray-400">Status</p>
                                    <p className="mt-0.5">
                                        <span className="inline-flex rounded-full bg-brand-yellow/20 px-2 py-0.5 text-xs font-semibold text-brand-black">{selectedInvoice.status}</span>
                                    </p>
                                </div>
                            </div>
                            {selectedInvoice.line_items && selectedInvoice.line_items.length > 0 ? (
                                <div>
                                    <p className="mb-2 text-xs font-medium uppercase text-gray-400">Line Items</p>
                                    <div className="overflow-hidden rounded-md border border-gray-200">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                                                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Qty</th>
                                                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Unit Price</th>
                                                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {selectedInvoice.line_items.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-4 py-2.5 text-gray-700">{item.description}</td>
                                                        <td className="px-4 py-2.5 text-right text-gray-700">{item.quantity}</td>
                                                        <td className="px-4 py-2.5 text-right text-gray-700">KES {item.unit_price}</td>
                                                        <td className="px-4 py-2.5 text-right font-medium text-gray-900">KES {item.amount}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-gray-50 border-t border-gray-200">
                                                {selectedInvoice.subtotal ? (
                                                    <tr>
                                                        <td colSpan={3} className="px-4 py-2 text-right text-xs text-gray-500">Subtotal</td>
                                                        <td className="px-4 py-2 text-right text-sm text-gray-700">KES {selectedInvoice.subtotal}</td>
                                                    </tr>
                                                ) : null}
                                                {selectedInvoice.tax_amount ? (
                                                    <tr>
                                                        <td colSpan={3} className="px-4 py-2 text-right text-xs text-gray-500">Tax ({selectedInvoice.tax_rate ?? 0}%)</td>
                                                        <td className="px-4 py-2 text-right text-sm text-gray-700">KES {selectedInvoice.tax_amount}</td>
                                                    </tr>
                                                ) : null}
                                                <tr>
                                                    <td colSpan={3} className="px-4 py-2 text-right text-xs font-semibold uppercase text-gray-700">Total</td>
                                                    <td className="px-4 py-2 text-right text-sm font-bold text-brand-blue">KES {selectedInvoice.total_amount ?? "0"}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3">
                                    <p className="text-sm font-medium text-gray-700">Total Amount</p>
                                    <p className="text-base font-bold text-brand-blue">KES {selectedInvoice.total_amount ?? "0"}</p>
                                </div>
                            )}
                            {selectedInvoice.invoice_file ? (
                                <div>
                                    <p className="mb-2 text-xs font-medium uppercase text-gray-400">Invoice Document</p>
                                    <div className="flex items-center gap-3 rounded-md border border-gray-200 p-4">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-brand-blue/10 text-brand-blue text-xs font-bold">PDF</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">Invoice File</p>
                                            <p className="text-xs text-gray-500 truncate">{selectedInvoice.invoice_file.split('/').pop()}</p>
                                        </div>
                                        <a
                                            href={selectedInvoice.invoice_file}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="shrink-0 rounded-md bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-blue/90"
                                        >
                                            Open File
                                        </a>
                                    </div>
                                </div>
                            ) : null}
                            {selectedInvoice.vendor_notes ? (
                                <div className="rounded-md bg-gray-50 px-4 py-3">
                                    <p className="text-xs font-medium uppercase text-gray-400 mb-1">Vendor Notes</p>
                                    <p className="text-sm text-gray-700">{selectedInvoice.vendor_notes}</p>
                                </div>
                            ) : null}
                            {selectedInvoice.rejection_reason ? (
                                <div className="rounded-md bg-brand-red/5 border border-brand-red/20 px-4 py-3">
                                    <p className="text-xs font-medium uppercase text-brand-red mb-1">Previous Rejection Reason</p>
                                    <p className="text-sm text-brand-red">{selectedInvoice.rejection_reason}</p>
                                </div>
                            ) : null}
                            {selectedInvoice.status === "submitted" ? (
                                <div>
                                    <label className="block text-xs font-medium uppercase text-gray-500">Rejection Reason <span className="text-gray-400 normal-case">(required to reject)</span></label>
                                    <textarea
                                        rows={3}
                                        value={rejectReason}
                                        onChange={(e: ChangeEvent<HTMLTextAreaElement>): void => setRejectReason(e.target.value)}
                                        placeholder="Describe why this invoice is being rejected…"
                                        className="mt-1.5 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                                    />
                                </div>
                            ) : null}
                        </div>
                        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
                            <button
                                type="button"
                                onClick={(): void => setSelectedInvoice(null)}
                                className="rounded-md px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                            >
                                Close
                            </button>
                            {selectedInvoice.status === "submitted" ? (
                                <>
                                    <button
                                        type="button"
                                        disabled={!rejectReason.trim() || rejectInvoiceMutation.isPending}
                                        onClick={(): void => rejectInvoiceMutation.mutate({ invoiceId: selectedInvoice.id, reason: rejectReason.trim() })}
                                        className="rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red/90 disabled:opacity-50"
                                    >
                                        {rejectInvoiceMutation.isPending ? "Rejecting…" : "Reject"}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={approveInvoiceMutation.isPending}
                                        onClick={(): void => approveInvoiceMutation.mutate(selectedInvoice.id)}
                                        className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green/90 disabled:opacity-50"
                                    >
                                        {approveInvoiceMutation.isPending ? "Approving…" : "Approve Invoice"}
                                    </button>
                                </>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}

            {isAssignModalOpen && selectedJob && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                            <h2 className="text-lg font-semibold text-gray-900">Send Purchase Order to Vendor</h2>
                            <button
                                type="button"
                                onClick={(): void => setIsAssignModalOpen(false)}
                                className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
                            >
                                <XIcon className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-6 px-6 py-5">
                            <section className="rounded-md border border-brand-blue/20 bg-brand-blue/5 p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <div className="text-xs uppercase text-gray-500">Job Number</div>
                                        <div className="mt-1 font-semibold text-gray-900">{selectedJob.job_number || `Job #${selectedJob.id}`}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs uppercase text-gray-500">Client</div>
                                        <div className="mt-1 font-semibold text-gray-900">{selectedJob.client?.name || "N/A"}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs uppercase text-gray-500">Product</div>
                                        <div className="mt-1 text-gray-700">{selectedJob.product}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs uppercase text-gray-500">Quantity</div>
                                        <div className="mt-1 text-gray-700">{selectedJob.quantity} pcs</div>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-md border border-gray-200 p-4">
                                <div className="text-sm font-semibold text-gray-900">Attachments</div>
                                <div className="mt-3 flex flex-col md:flex-row md:items-end gap-3">
                                    <div className="flex-1">
                                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Upload Files</label>
                                        <input
                                            type="file"
                                            multiple
                                            onChange={handleAttachmentInput}
                                            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleUploadAttachments}
                                        disabled={uploadMutation.isPending}
                                        className="inline-flex items-center gap-2 rounded-md border border-brand-orange px-4 py-2 text-sm font-semibold text-brand-orange disabled:opacity-60"
                                    >
                                        {uploadMutation.isPending ? <LoaderCircleIcon className="h-4 w-4 animate-spin" /> : <UploadIcon className="h-4 w-4" />}
                                        Upload
                                    </button>
                                </div>
                                {filesToUpload.length > 0 && (
                                    <div className="mt-2 text-xs text-gray-600">
                                        {filesToUpload.length} file(s) selected
                                    </div>
                                )}
                            </section>

                            <section className="rounded-md border border-gray-200 p-4">
                                <div className="text-sm font-semibold text-gray-900">Select Vendors</div>
                                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                                    {vendors.length > 0 ? (
                                        vendors.map((vendor: Vendor): ReactElement => {
                                            const isChecked = selectedVendorIds.includes(vendor.id);
                                            return (
                                                <label key={vendor.id} className="flex items-start gap-2 rounded-md border border-gray-200 p-3 hover:bg-gray-50 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(): void => toggleVendorSelection(vendor.id)}
                                                        className="mt-1 h-4 w-4"
                                                    />
                                                    <span className="text-sm text-gray-700">
                                                        <span className="font-semibold text-gray-900 block">{vendor.name}</span>
                                                        <span className="text-xs text-gray-500">{vendor.email}</span>
                                                    </span>
                                                </label>
                                            );
                                        })
                                    ) : (
                                        <div className="text-sm text-gray-500">No active vendors found.</div>
                                    )}
                                </div>
                                <div className="mt-2 text-xs text-gray-500">Selected vendors: {selectedVendorIds.length}</div>
                            </section>

                            <section className="rounded-md border border-gray-200 p-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Expected Days</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={expectedDays}
                                            onChange={(event: ChangeEvent<HTMLInputElement>): void => setExpectedDays(Number(event.target.value))}
                                            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Estimated Cost (KES)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={estimatedCost}
                                            onChange={(event: ChangeEvent<HTMLInputElement>): void => setEstimatedCost(event.target.value)}
                                            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Stage</label>
                                        <select
                                            value={stageName}
                                            onChange={(event: ChangeEvent<HTMLSelectElement>): void => setStageName(event.target.value)}
                                            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                        >
                                            <option value="Production">Production</option>
                                            <option value="Quality Check">Quality Check</option>
                                            <option value="Packaging">Packaging</option>
                                            <option value="Quality Assurance">Quality Assurance</option>
                                            <option value="Assembly">Assembly</option>
                                            <option value="Design">Design</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</label>
                                    <textarea
                                        value={vendorNotes}
                                        onChange={(event: ChangeEvent<HTMLTextAreaElement>): void => setVendorNotes(event.target.value)}
                                        rows={3}
                                        className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </div>
                            </section>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
                            <button
                                type="button"
                                onClick={(): void => setIsAssignModalOpen(false)}
                                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSendToVendors}
                                disabled={sendToVendorMutation.isPending || selectedVendorIds.length === 0}
                                className="inline-flex items-center gap-2 rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                            >
                                {sendToVendorMutation.isPending ? <LoaderCircleIcon className="h-4 w-4 animate-spin" /> : <SendHorizonalIcon className="h-4 w-4" />}
                                Send to Vendor(s)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <section className="max-w-7xl mx-auto px-4 lg:px-8 pb-8">
            </section>

            {(approveProofMutation.isPending || rejectProofMutation.isPending || approveInvoiceMutation.isPending || rejectInvoiceMutation.isPending) && (
                <div className="fixed bottom-4 right-4 rounded-md bg-brand-blue text-white px-3 py-2 text-xs font-semibold shadow-lg">
                    <span className="inline-flex items-center gap-2">
                        <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" />
                        Processing action...
                    </span>
                </div>
            )}

            {sendToVendorMutation.isSuccess && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-brand-green text-white px-3 py-2 text-xs font-semibold shadow-lg">
                    <span className="inline-flex items-center gap-2">
                        <CheckIcon className="h-3.5 w-3.5" />
                        Job assignment sent successfully.
                    </span>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {ptDeleteId && (
                <ConfirmModal
                    title="Delete Job"
                    message="Are you sure you want to delete this job? This action cannot be undone."
                    confirmText="Delete Job"
                    confirmColor="red"
                    onClose={(): void => setPtDeleteId(null)}
                    onConfirm={(): void => { deleteJobMutation.mutate(ptDeleteId); }}
                />
            )}

            {/* Assign to Production Team Member Modal */}
            <AccountManagerJobAssignModal
                open={ptAssignOpen}
                jobId={ptAssignJobId}
                productionUsers={allUsers}
                onClose={(): void => { setPtAssignOpen(false); setPtAssignJobId(null); }}
                onSubmit={(userId, notes, remindDays): void => {
                    if (!ptAssignJobId) return;
                    ptAssignMutation.mutate({ jobId: ptAssignJobId, userId, notes, remindDays });
                }}
                isSubmitting={ptAssignMutation.isPending}
            />

            {/* Reminder Modal */}
            {ptReminderModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-base font-semibold text-gray-900">Send Reminder</h2>
                            <p className="text-xs text-gray-500 mt-1">
                                Sending reminder for <strong>{ptReminderModal.job.job_name}</strong>
                            </p>
                        </div>
                        <div className="px-6 py-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                            <textarea
                                rows={3}
                                value={ptReminderModal.note}
                                onChange={(e): void => setPtReminderModal(prev => prev ? { ...prev, note: e.target.value } : null)}
                                placeholder="e.g. Client is chasing this — please update ASAP."
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
                            />
                        </div>
                        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={(): void => setPtReminderModal(null)}
                                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={(): void => {
                                    if (!ptReminderModal) return;
                                    setPtRemindingId(ptReminderModal.job.id);
                                    ptReminderMutation.mutate({ jobId: ptReminderModal.job.id, note: ptReminderModal.note });
                                    setPtReminderModal(null);
                                }}
                                disabled={ptReminderMutation.isPending}
                                className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-50"
                            >
                                {ptReminderMutation.isPending ? "Sending..." : "Send Reminder"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
