"use client";

import {
    type ReactElement,
    useState,
    useMemo,
    useEffect,
    useRef,
} from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeftIcon,
    CheckCircleIcon,
    LinkIcon,
    ListChecksIcon,
    ClipboardCheckIcon,
    SendIcon,
    FolderOpenIcon,
    ActivityIcon,
    ChevronDownIcon,
    PlusIcon,
    LockIcon,
    UnlockIcon,
    CheckIcon,
    XIcon,
    FileTextIcon,
    FileImageIcon,
    FileIcon,
    InboxIcon,
    LoaderCircleIcon,
    TrashIcon,
    AlertCircleIcon,
    BuildingIcon,
    MessageSquareIcon,
    PhoneIcon,
    ThumbsUpIcon,
    ThumbsDownIcon,
    MessageCircleIcon,
    PaperclipIcon,
    UploadIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
    fetchJobComponents,
    fetchDependencies,
    fetchTasks,
    fetchQCResults,
    fetchProductionUsers,
    sendVendorBrief,
    createDependency,
    resolveDependency,
    deleteDependency,
    createTask,
    updateTask,
    deleteTask,
    markQCResult,
    loadQCTemplate,
    deleteQCResult,
    updateComponentStatus,
    updateJobComponent,
    fetchQCCustomTemplates,
    fetchVendors,
    fetchComponentFiles,
    uploadComponentFile,
    deleteComponentFile,
    fetchVendorBriefStatus,
    fetchProductionCost,
    saveProductionCost,
    sendAdjustmentRequest,
    fetchBriefAttachments,
    uploadBriefAttachment,
    deleteBriefAttachment,
    logCommunication,
    respondToAdjustment,
    type JobComponent,
    type ComponentDependency,
    type ComponentTask,
    type ComponentQCResult,
    type ComponentFile,
    type ComponentFileSlot,
    type VendorBriefStatus,
    type BriefAttachment,
    type OffSystemLog,
    type OffSystemChannel,
    type OffSystemDirection,
    type ProductionCostItem,
} from "@/services/orchestration";
import { getCurrentUser } from "@/services/users";
import { jobComponentToProductionComponent } from "../lib/api-job-helpers";
import type { ProductionComponent } from "../types";

type Tab = "deps" | "tasks" | "qc" | "brief" | "files" | "adjustment" | "audit";

// ── Built-in QC template options (match backend QC_TEMPLATES keys) ─────────────
const BUILTIN_QC_OPTIONS = [
    { key: "embroidery",    label: "Embroidery" },
    { key: "uv_print",     label: "UV Print" },
    { key: "dtf",          label: "DTF / Transfer Print" },
    { key: "engraving",    label: "Engraving / Laser" },
    { key: "large_format", label: "Large Format Print" },
    { key: "screen_print", label: "Screen Print" },
];

const FILE_SLOT_DEFS: { slot: ComponentFileSlot; label: string; icon: ReactElement }[] = [
    { slot: "artwork",       label: "Artwork / Design File", icon: <FileImageIcon className="h-5 w-5" /> },
    { slot: "bom",           label: "Size Breakdown / BOM",  icon: <FileTextIcon  className="h-5 w-5" /> },
    { slot: "brief_pdf",     label: "Vendor Brief PDF",      icon: <FileTextIcon  className="h-5 w-5" /> },
    { slot: "proof",         label: "Vendor Proof",          icon: <FileImageIcon className="h-5 w-5" /> },
    { slot: "qc_sheet",      label: "QC Sign-off Sheet",     icon: <FileTextIcon  className="h-5 w-5" /> },
    { slot: "delivery_note", label: "Delivery Note",         icon: <FileIcon      className="h-5 w-5" /> },
];

const tabs: { key: Tab; label: string; icon: ReactElement }[] = [
    { key: "deps",       label: "Dependencies",   icon: <LinkIcon className="h-4 w-4" /> },
    { key: "tasks",      label: "Tasks",          icon: <ListChecksIcon className="h-4 w-4" /> },
    { key: "qc",         label: "QC Checkpoints", icon: <ClipboardCheckIcon className="h-4 w-4" /> },
    { key: "brief",      label: "Vendor Brief",   icon: <SendIcon className="h-4 w-4" /> },
    { key: "files",      label: "Files & Assets", icon: <FolderOpenIcon className="h-4 w-4" /> },
    { key: "adjustment", label: "Adjustment",     icon: <AlertCircleIcon className="h-4 w-4" /> },
    { key: "audit",      label: "Audit Log",      icon: <ActivityIcon className="h-4 w-4" /> },
];

const compStatusColor = (status: string) => {
    if (["DEP_BLOCKED", "SEQ_BLOCKED", "QC_FAILED"].includes(status)) return "bg-brand-red/10 text-brand-red";
    if (status === "QC_HOLD") return "bg-brand-orange/10 text-brand-orange";
    if (status === "IN_PRODUCTION") return "bg-brand-blue/10 text-brand-blue";
    if (["DISPATCH_READY", "COMPLETE"].includes(status)) return "bg-brand-green/10 text-brand-green";
    return "bg-gray-100 text-gray-500";
};

const apiTaskStatusLabel = (s: string) => {
    const map: Record<string, string> = {
        pending: "Pending", in_progress: "In Progress", done: "Done", overdue: "Overdue", blocked: "Blocked",
    };
    return map[s] ?? s;
};

const taskStatusColor = (status: string) => {
    if (status === "done") return "bg-brand-green/10 text-brand-green";
    if (status === "overdue") return "bg-brand-red/10 text-brand-red";
    if (status === "blocked") return "bg-brand-orange/10 text-brand-orange";
    if (status === "in_progress") return "bg-brand-blue/10 text-brand-blue";
    return "bg-gray-100 text-gray-500";
};

const depTypeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("artwork") || t.includes("approval")) return "bg-brand-blue/10 text-brand-blue";
    if (t.includes("material")) return "bg-brand-orange/10 text-brand-orange";
    if (t === "financial") return "bg-brand-green/10 text-brand-green";
    if (t === "sequential") return "bg-brand-purple/10 text-brand-purple";
    if (t === "dispatch") return "bg-gray-100 text-gray-600";
    return "bg-gray-100 text-gray-500";
};

const depTypeLabel = (type: string) => {
    const map: Record<string, string> = {
        artwork_approval: "Artwork Approval",
        client_approval: "Client Approval",
        material_arrival: "Material Arrival",
        sequential: "Sequential",
        financial: "Financial",
        dispatch: "Dispatch",
    };
    return map[type] ?? type;
};

export default function ComponentDetailWorkspace({ basePath = "/production-team" }: { basePath?: string } = {}): ReactElement {
    const params = useParams();
    const jobId = params?.jobId as string;
    const compId = params?.compId as string;

    const isNumericJob = Boolean(jobId && /^\d+$/.test(jobId));
    const isNumericComp = Boolean(compId && /^\d+$/.test(compId));
    const numericJobId = isNumericJob ? Number(jobId) : 0;
    const numericCompId = isNumericComp ? Number(compId) : 0;

    const queryClient = useQueryClient();

    const componentsQuery = useQuery({
        queryKey: ["job-components", numericJobId],
        queryFn: () => fetchJobComponents(numericJobId),
        enabled: isNumericJob,
    });

    const rawComp: JobComponent | undefined = useMemo(
        () => componentsQuery.data?.find((c) => c.id === numericCompId),
        [componentsQuery.data, numericCompId]
    );

    const comp: ProductionComponent | null = useMemo(() => {
        if (!rawComp) return null;
        return jobComponentToProductionComponent(numericJobId, rawComp);
    }, [rawComp, numericJobId]);

    const depsQuery = useQuery({
        queryKey: ["component-deps", numericCompId],
        queryFn: () => fetchDependencies(numericCompId),
        enabled: isNumericComp,
    });
    const tasksQuery = useQuery({
        queryKey: ["component-tasks", numericCompId],
        queryFn: () => fetchTasks(numericCompId),
        enabled: isNumericComp,
    });
    const qcQuery = useQuery({
        queryKey: ["component-qc", numericCompId],
        queryFn: () => fetchQCResults(numericCompId),
        enabled: isNumericComp,
    });
    const usersQuery = useQuery({
        queryKey: ["production-users"],
        queryFn: fetchProductionUsers,
        staleTime: 5 * 60_000,
    });
    const customTemplatesQuery = useQuery({
        queryKey: ["qc-custom-templates"],
        queryFn: fetchQCCustomTemplates,
        staleTime: 2 * 60_000,
    });
    const vendorsQuery = useQuery({
        queryKey: ["vendors-list"],
        queryFn: fetchVendors,
        staleTime: 5 * 60_000,
    });
    const filesQuery = useQuery({
        queryKey: ["component-files", numericCompId],
        queryFn: () => fetchComponentFiles(numericCompId),
        enabled: isNumericComp,
    });

    const vendorBriefStatusQuery = useQuery({
        queryKey: ["vendor-brief-status", numericCompId],
        queryFn: () => fetchVendorBriefStatus(numericCompId),
        enabled: isNumericComp,
        staleTime: 15_000,
        refetchInterval: 30_000,
    });

    const productionCostQuery = useQuery({
        queryKey: ["production-cost", numericCompId],
        queryFn: () => fetchProductionCost(numericCompId),
        enabled: isNumericComp,
        staleTime: 60_000,
    });

    const saveCostMut = useMutation({
        mutationFn: (items: ProductionCostItem[]) => saveProductionCost(numericCompId, items),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["production-cost", numericCompId] });
            queryClient.invalidateQueries({ queryKey: ["pt-reconciliation"] });
            setCostEditing(false);
        },
    });

    const adjustmentMut = useMutation({
        mutationFn: (note: string) => sendAdjustmentRequest(numericCompId, note),
        onSuccess: () => { setAdjustmentNote(""); },
    });

    const currentUserQuery = useQuery({
        queryKey: ["orchestration", "current-user"],
        queryFn: getCurrentUser,
        staleTime: 5 * 60_000,
    });

    // PIC = the production lead who owns this job.
    const isPIC =
        currentUserQuery.data != null &&
        rawComp?.job_person_in_charge_id != null &&
        currentUserQuery.data.id === rawComp.job_person_in_charge_id;

    // Admins and superusers can manage tasks on any component.
    // groups is an array of objects {id, name} from the API — must use .some(), not .includes()
    const isPrivileged =
        currentUserQuery.data?.is_superuser === true ||
        (currentUserQuery.data?.groups ?? []).some((g) => (g as { name: string }).name === "Admin");

    // canManageTasks = PIC, component-assigned, or privileged admin
    const canManageTasks = isPIC || isPrivileged;

    // Whether the current user is assigned the whole component (vs. only individual tasks inside it).
    const isComponentAssigned = currentUserQuery.data != null && rawComp?.assigned_to === currentUserQuery.data.id;

    // Non-PICs/non-admins who don't own the whole component only see their own tasks.
    const myUserId = currentUserQuery.data?.id;
    const allTasks = tasksQuery.data ?? [];
    const visibleTasks = canManageTasks || isComponentAssigned
        ? allTasks
        : allTasks.filter((t) => t.assigned_to === myUserId);

    const ptUsers = usersQuery.data ?? [];
    const customTemplates = customTemplatesQuery.data ?? [];
    const vendors = vendorsQuery.data ?? [];
    const uploadedFiles: ComponentFile[] = filesQuery.data ?? [];

    // file input refs keyed by slot
    const fileInputRefs = useRef<Partial<Record<ComponentFileSlot, HTMLInputElement | null>>>({});

    // Mutations
    const resolveDepMut = useMutation({
        mutationFn: (depId: number) => resolveDependency(depId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["component-deps", numericCompId] });
            queryClient.invalidateQueries({ queryKey: ["job-components", numericJobId] });
        },
    });

    const deleteDepMut = useMutation({
        mutationFn: (depId: number) => deleteDependency(depId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["component-deps", numericCompId] }),
    });

    const createDepMut = useMutation({
        mutationFn: (payload: Partial<ComponentDependency>) => createDependency(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["component-deps", numericCompId] });
            queryClient.invalidateQueries({ queryKey: ["job-components", numericJobId] });
        },
    });

    const createTaskMut = useMutation({
        mutationFn: (payload: Partial<ComponentTask>) => createTask(payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["component-tasks", numericCompId] }),
    });

    const updateTaskMut = useMutation({
        mutationFn: ({ taskId, payload }: { taskId: number; payload: Partial<ComponentTask> }) =>
            updateTask(taskId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["component-tasks", numericCompId] }),
    });

    const deleteTaskMut = useMutation({
        mutationFn: (taskId: number) => deleteTask(taskId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["component-tasks", numericCompId] }),
    });

    const markQCMut = useMutation({
        mutationFn: ({ resultId, passed }: { resultId: number; passed: boolean | null }) =>
            markQCResult(resultId, passed),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["component-qc", numericCompId] });
            queryClient.invalidateQueries({ queryKey: ["job-components", numericJobId] });
        },
    });

    const loadTemplateMut = useMutation({
        mutationFn: (templateType: string) => loadQCTemplate(numericCompId, templateType),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["component-qc", numericCompId] }),
    });

    const deleteQCMut = useMutation({
        mutationFn: (resultId: number) => deleteQCResult(resultId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["component-qc", numericCompId] }),
    });

    const updateStatusMut = useMutation({
        mutationFn: (status: JobComponent["status"]) => updateComponentStatus(numericCompId, status),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["job-components", numericJobId] }),
    });

    const sendBriefMut = useMutation({
        mutationFn: (channel: "email" | "whatsapp" | "both" = "email") => sendVendorBrief(numericCompId, channel),
        onSuccess: (data, channel) => {
            queryClient.invalidateQueries({ queryKey: ["vendor-brief-status", numericCompId] });
            if ((channel === "whatsapp" || channel === "both") && data.wa_message) {
                const phone = data.vendor_phone.replace(/\D/g, "");
                const url = `https://api.whatsapp.com/send?${phone ? `phone=${phone}&` : ""}text=${encodeURIComponent(data.wa_message)}`;
                window.open(url, "_blank");
            }
        },
    });

    // Brief attachments
    const briefAttachmentsQuery = useQuery({
        queryKey: ["brief-attachments", numericCompId],
        queryFn: () => fetchBriefAttachments(numericCompId),
        enabled: isNumericComp,
    });
    const [baRows, setBaRows] = useState<{ name: string; desc: string; file: File | null }[]>([{ name: "", desc: "", file: null }]);
    const [baUploading, setBaUploading] = useState(false);
    const [baUploadError, setBaUploadError] = useState<string | null>(null);

    const handleBaUploadAll = async () => {
        const toUpload = baRows.filter((r) => r.file || r.name.trim() || r.desc.trim());
        if (!toUpload.length) return;
        setBaUploading(true);
        setBaUploadError(null);
        try {
            await Promise.all(toUpload.map((r) => uploadBriefAttachment(numericCompId, r.file ?? null, r.name.trim(), r.desc.trim())));
            queryClient.invalidateQueries({ queryKey: ["brief-attachments", numericCompId] });
            setBaRows([{ name: "", desc: "", file: null }]);
        } catch (err) {
            setBaUploadError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setBaUploading(false);
        }
    };

    const deleteBaMut = useMutation({
        mutationFn: (id: number) => deleteBriefAttachment(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brief-attachments", numericCompId] }),
    });

    // Off-system communication log
    const [showLogForm, setShowLogForm] = useState(false);
    const [logChannel, setLogChannel] = useState<OffSystemChannel>("phone");
    const [logDirection, setLogDirection] = useState<OffSystemDirection>("outbound");
    const [logSummary, setLogSummary] = useState("");
    const [logOccurredAt, setLogOccurredAt] = useState(() => new Date().toISOString().slice(0, 16));

    const logCommMut = useMutation({
        mutationFn: () => logCommunication(numericCompId, {
            channel: logChannel,
            direction: logDirection,
            summary: logSummary,
            occurred_at: logOccurredAt,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["vendor-brief-status", numericCompId] });
            setShowLogForm(false); setLogSummary(""); setLogOccurredAt(new Date().toISOString().slice(0, 16));
        },
    });

    // Adjustment response
    const [showAdjReply, setShowAdjReply] = useState(false);
    const [adjAction, setAdjAction] = useState<"approve" | "reject" | "reply">("reply");
    const [adjMessage, setAdjMessage] = useState("");
    const [adjNewDeadline, setAdjNewDeadline] = useState("");
    const [adjNewCost, setAdjNewCost] = useState("");

    const respondAdjMut = useMutation({
        mutationFn: () => respondToAdjustment(numericCompId, {
            action: adjAction,
            message: adjMessage,
            new_deadline: adjNewDeadline || undefined,
            new_cost: adjNewCost || undefined,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["vendor-brief-status", numericCompId] });
            setShowAdjReply(false); setAdjMessage(""); setAdjNewDeadline(""); setAdjNewCost("");
            toast.success("Response sent.");
        },
        onError: (err: Error) => toast.error(err.message || "Failed to respond."),
    });

    const assignVendorMut = useMutation({
        mutationFn: (vendorId: number | null) =>
            updateJobComponent(numericCompId, { vendor: vendorId } as Partial<JobComponent>),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["job-components", numericJobId] }),
    });

    const [uploadingSlots, setUploadingSlots] = useState<Set<ComponentFileSlot>>(new Set());
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [deletingFileIds, setDeletingFileIds] = useState<Set<number>>(new Set());

    const handleFileChange = async (slot: ComponentFileSlot, file: File) => {
        setUploadingSlots((s) => new Set(s).add(slot));
        setUploadError(null);
        try {
            await uploadComponentFile(numericCompId, slot, file);
            queryClient.invalidateQueries({ queryKey: ["component-files", numericCompId] });
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setUploadingSlots((s) => { const n = new Set(s); n.delete(slot); return n; });
        }
    };

    const handleDeleteFile = async (fileId: number) => {
        setDeletingFileIds((s) => new Set(s).add(fileId));
        try {
            await deleteComponentFile(fileId);
            queryClient.invalidateQueries({ queryKey: ["component-files", numericCompId] });
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Delete failed");
        } finally {
            setDeletingFileIds((s) => { const n = new Set(s); n.delete(fileId); return n; });
        }
    };

    // Local UI state
    const [activeTab, setActiveTab] = useState<Tab>("deps");
    const [selectedTemplate, setSelectedTemplate] = useState("");
    const [briefMasked, setBriefMasked] = useState(true);
    const [briefChannel, setBriefChannel] = useState<"email" | "whatsapp" | "both">("email");
    const [showVendorPicker, setShowVendorPicker] = useState(false);
    const [briefDraft, setBriefDraft] = useState({
        product_name: "",
        production_type: "",
        quantity: "",
        unit: "",
        specifications: "",
        brief_artwork_ref: "",
        sla_deadline: "",
        notes: "",
        brief_quoted_price: "",
        brief_client_contact: "",
        brief_lpo_ref: "",
    });
    const [briefEditing, setBriefEditing] = useState(false);
    const [briefSaving, setBriefSaving] = useState(false);

    // Production cost breakdown state
    const [costEditing, setCostEditing] = useState(false);
    const [costItems, setCostItems] = useState<ProductionCostItem[]>([{ service_name: "", cost: 0 }]);

    // Adjustment request state
    const [adjustmentNote, setAdjustmentNote] = useState("");

    // Add dependency form
    const [showAddDep, setShowAddDep] = useState(false);
    const [depForm, setDepForm] = useState({ description: "", dependency_type: "artwork_approval", due_by: "" });
    const [depError, setDepError] = useState("");

    // Add task form
    const [showAddTask, setShowAddTask] = useState(false);
    const [taskForm, setTaskForm] = useState({ name: "", description: "", due_by: "", assigned_to: "" });
    const [taskError, setTaskError] = useState("");

    useEffect(() => {
        setActiveTab("deps");
        setShowAddDep(false);
        setShowAddTask(false);
        setDepForm({ description: "", dependency_type: "artwork_approval", due_by: "" });
        setTaskForm({ name: "", description: "", due_by: "", assigned_to: "" });
        setDepError("");
        setTaskError("");
        setShowVendorPicker(false);
        setBriefEditing(false);
    }, [compId]);

    useEffect(() => {
        if (rawComp) {
            setBriefDraft({
                product_name: rawComp.product_name ?? "",
                production_type: rawComp.production_type ?? "",
                quantity: String(rawComp.quantity ?? ""),
                unit: rawComp.unit ?? "",
                specifications: rawComp.specifications ?? "",
                brief_artwork_ref: rawComp.brief_artwork_ref ?? "",
                sla_deadline: rawComp.sla_deadline ? rawComp.sla_deadline.split("T")[0] : "",
                notes: rawComp.notes ?? "",
                brief_quoted_price: rawComp.brief_quoted_price ?? "",
                brief_client_contact: rawComp.brief_client_contact ?? "",
                brief_lpo_ref: rawComp.brief_lpo_ref ?? "",
            });
        }
    }, [rawComp]);

    const qcResults: ComponentQCResult[] = qcQuery.data ?? [];
    const passCount = qcResults.filter((r) => r.passed === true).length;
    const failCount = qcResults.filter((r) => r.passed === false).length;
    const pendingCount = qcResults.filter((r) => r.passed === null).length;
    const deps: ComponentDependency[] = depsQuery.data ?? [];
    const openDepsCount = deps.filter((d) => d.status === "open").length;

    if (isNumericJob && componentsQuery.isPending) {
        return (
            <main className="flex min-h-[50vh] flex-col items-center justify-center bg-gray-50 p-8 text-gray-400">
                <LoaderCircleIcon className="h-10 w-10 animate-spin" />
                <p className="mt-3 text-sm">Loading…</p>
            </main>
        );
    }

    if (isNumericJob && componentsQuery.isError) {
        return (
            <>
                <header className="border-b border-gray-200 bg-white px-4 lg:px-8 py-4">
                    <Link href={`${basePath}/orchestration`} className="text-sm text-gray-500 hover:text-brand-blue">
                        ← Control Tower
                    </Link>
                </header>
                <main className="flex min-h-[50vh] flex-col items-center justify-center bg-gray-50 p-8">
                    <p className="text-sm font-semibold text-brand-red">Could not load component</p>
                </main>
            </>
        );
    }

    if (!comp) {
        return (
            <>
                <header className="border-b border-gray-200 bg-white">
                    <div className="px-4 lg:px-8 py-4">
                        <Link
                            href={jobId ? `${basePath}/jobs/${jobId}/components` : `${basePath}/orchestration`}
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-blue transition-colors"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                            {jobId ? "Components" : "Control Tower"}
                        </Link>
                    </div>
                </header>
                <main className="flex min-h-[60vh] flex-col items-center justify-center bg-gray-50 p-8">
                    <InboxIcon className="h-12 w-12 text-gray-200" />
                    <p className="mt-4 text-sm font-semibold text-gray-600">Component not found</p>
                    <p className="mt-1 text-center text-xs text-gray-400 max-w-sm">
                        {compId ? `No component matches "${compId}".` : "Select a component from the production board."}
                    </p>
                    <Link
                        href={jobId ? `${basePath}/jobs/${jobId}/components` : `${basePath}/orchestration`}
                        className="mt-6 rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90"
                    >
                        {jobId ? "Back to components" : "Back to Control Tower"}
                    </Link>
                </main>
            </>
        );
    }

    const handleAddDep = async () => {
        if (!depForm.description.trim()) return;
        setDepError("");
        try {
            await createDepMut.mutateAsync({
                component: numericCompId,
                dependency_type: depForm.dependency_type,
                description: depForm.description,
                status: "open",
                due_by: depForm.due_by || null,
            });
            setDepForm({ description: "", dependency_type: "artwork_approval", due_by: "" });
            setShowAddDep(false);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to add dependency";
            setDepError(msg.replace(/^.*?failed:\s*\d+\s*/i, "").slice(0, 120) || "Failed to save. Please try again.");
        }
    };

    const handleAddTask = async () => {
        if (!taskForm.name.trim()) return;
        setTaskError("");
        try {
            await createTaskMut.mutateAsync({
                component: numericCompId,
                name: taskForm.name,
                description: taskForm.description,
                status: "pending",
                due_by: taskForm.due_by || null,
                assigned_to: taskForm.assigned_to ? Number(taskForm.assigned_to) : null,
            });
            setTaskForm({ name: "", description: "", due_by: "", assigned_to: "" });
            setShowAddTask(false);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to add task";
            setTaskError(msg.replace(/^.*?failed:\s*\d+\s*/i, "").slice(0, 120) || "Failed to save. Please try again.");
        }
    };

    const handleSaveBrief = async () => {
        setBriefSaving(true);
        try {
            await updateJobComponent(numericCompId, {
                product_name: briefDraft.product_name,
                production_type: briefDraft.production_type,
                quantity: Number(briefDraft.quantity) || rawComp?.quantity,
                unit: briefDraft.unit,
                specifications: briefDraft.specifications,
                brief_artwork_ref: briefDraft.brief_artwork_ref,
                sla_deadline: briefDraft.sla_deadline || null,
                notes: briefDraft.notes,
                brief_quoted_price: briefDraft.brief_quoted_price,
                brief_client_contact: briefDraft.brief_client_contact,
                brief_lpo_ref: briefDraft.brief_lpo_ref,
            } as Partial<JobComponent>);
            queryClient.invalidateQueries({ queryKey: ["job-components", numericJobId] });
            setBriefEditing(false);
        } finally {
            setBriefSaving(false);
        }
    };

    const qcRemainingLabel =
        qcResults.length === 0
            ? "Load a template or add checkpoints"
            : pendingCount > 0
                ? `${pendingCount} checkpoint${pendingCount !== 1 ? "s" : ""} remaining`
                : "All checkpoints reviewed";

    const categories = Array.from(new Set(qcResults.map((r) => r.category)));

    // Combined QC template options (built-in + custom)
    const allQCTemplateOptions = [
        ...BUILTIN_QC_OPTIONS,
        ...customTemplates.map((t) => ({ key: `custom_${t.id}`, label: `${t.icon} ${t.name} (custom)` })),
    ];

    return (
        <>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4">
                    <div className="flex items-center gap-3 mb-3">
                        <Link
                            href={`${basePath}/jobs/${jobId}/components`}
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-blue transition-colors"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                            {jobId}
                        </Link>
                        <span className="text-gray-300">/</span>
                        <span className="text-sm font-semibold text-gray-700">{comp.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h1 className="text-xl font-bold text-gray-900">{comp.name}</h1>
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${compStatusColor(comp.status)}`}>
                                    {comp.status.replace(/_/g, " ")}
                                </span>
                            </div>
                            <p className="mt-0.5 text-sm text-gray-400">
                                {comp.id} · {comp.productionType} · {comp.execMode} · Vendor: {comp.vendor}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                value={rawComp?.status ?? "pending"}
                                onChange={(e) => updateStatusMut.mutate(e.target.value as JobComponent["status"])}
                                disabled={updateStatusMut.isPending}
                                className="appearance-none rounded-md border border-gray-200 bg-white py-1.5 pl-3 pr-8 text-xs font-semibold text-gray-700 focus:border-brand-blue focus:outline-none"
                            >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="blocked">Blocked</option>
                                <option value="qc_hold">QC Hold</option>
                                <option value="ready">Ready</option>
                                <option value="dispatched">Dispatched</option>
                                <option value="completed">Completed</option>
                            </select>
                            <div
                                className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                                style={{ backgroundColor: comp.picColor }}
                            >
                                {comp.picInitials}
                            </div>
                            <div className="text-xs">
                                <p className="font-semibold text-gray-700">{comp.picName}</p>
                                <p className="text-gray-400">PIC</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="mt-4 flex gap-1 border-b border-gray-100 -mb-px overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex shrink-0 items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                                    activeTab === tab.key
                                        ? "border-brand-blue text-brand-blue"
                                        : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                                {tab.key === "deps" && openDepsCount > 0 && (
                                    <span className="ml-1 rounded-full bg-brand-red/10 px-1.5 py-0 text-[10px] font-bold text-brand-red">
                                        {openDepsCount}
                                    </span>
                                )}
                                {tab.key === "tasks" && visibleTasks.length > 0 && (
                                    <span className="ml-1 rounded-full bg-gray-100 px-1.5 py-0 text-[10px] font-bold text-gray-500">
                                        {visibleTasks.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="min-h-screen bg-gray-50 p-8">

                {/* ── DEPENDENCIES ── */}
                {activeTab === "deps" && (
                    <div className="space-y-4">
                        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                                <span className="text-sm font-semibold text-gray-800">Dependencies</span>
                                <div className="flex items-center gap-2">
                                    {openDepsCount > 0 && (
                                        <span className="rounded-full bg-brand-red/10 px-2 py-0.5 text-xs font-bold text-brand-red">
                                            {openDepsCount} OPEN
                                        </span>
                                    )}
                                    <button
                                        onClick={() => { setShowAddDep((v) => !v); setDepError(""); }}
                                        className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-brand-blue hover:text-brand-blue transition-colors"
                                    >
                                        <PlusIcon className="h-3.5 w-3.5" />
                                        Add Dependency
                                    </button>
                                </div>
                            </div>

                            {showAddDep && (
                                <div className="border-b border-gray-100 bg-gray-50 px-5 py-4 space-y-3">
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <input
                                            placeholder="Description *"
                                            value={depForm.description}
                                            onChange={(e) => setDepForm((p) => ({ ...p, description: e.target.value }))}
                                            className="col-span-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                        />
                                        <select
                                            value={depForm.dependency_type}
                                            onChange={(e) => setDepForm((p) => ({ ...p, dependency_type: e.target.value }))}
                                            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                        >
                                            <option value="artwork_approval">Artwork Approval</option>
                                            <option value="client_approval">Client Approval</option>
                                            <option value="material_arrival">Material Arrival</option>
                                            <option value="sequential">Sequential</option>
                                            <option value="financial">Financial</option>
                                            <option value="dispatch">Dispatch</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="date"
                                            value={depForm.due_by}
                                            onChange={(e) => setDepForm((p) => ({ ...p, due_by: e.target.value }))}
                                            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                        />
                                        <button
                                            onClick={handleAddDep}
                                            disabled={createDepMut.isPending || !depForm.description.trim()}
                                            className="rounded-md bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-40"
                                        >
                                            {createDepMut.isPending ? "Adding…" : "Add"}
                                        </button>
                                        <button
                                            onClick={() => { setShowAddDep(false); setDepError(""); }}
                                            className="text-xs text-gray-400 hover:text-gray-600"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                    {depError && (
                                        <div className="flex items-center gap-1.5 text-xs text-brand-red">
                                            <AlertCircleIcon className="h-3.5 w-3.5 shrink-0" />
                                            {depError}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="divide-y divide-gray-50">
                                {depsQuery.isLoading && (
                                    <div className="flex items-center justify-center py-8 text-gray-400">
                                        <LoaderCircleIcon className="h-5 w-5 animate-spin mr-2" />
                                        <span className="text-sm">Loading…</span>
                                    </div>
                                )}
                                {deps.map((dep) => (
                                    <div key={dep.id} className="flex items-start gap-4 px-5 py-4">
                                        <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${dep.status === "resolved" ? "bg-brand-green/10" : "bg-brand-red/10"}`}>
                                            {dep.status === "resolved"
                                                ? <CheckIcon className="h-3 w-3 text-brand-green" />
                                                : <LockIcon className="h-3 w-3 text-brand-red" />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-semibold ${dep.status === "resolved" ? "text-gray-400 line-through" : "text-gray-800"}`}>
                                                {dep.description}
                                            </p>
                                            <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                                                {dep.due_by && <span>Due: {dep.due_by}</span>}
                                                {dep.blocking && <span>Blocking: {dep.blocking}</span>}
                                            </div>
                                        </div>
                                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${depTypeColor(dep.dependency_type)}`}>
                                            {depTypeLabel(dep.dependency_type)}
                                        </span>
                                        {dep.status === "open" && (
                                            <button
                                                onClick={() => resolveDepMut.mutate(dep.id)}
                                                disabled={resolveDepMut.isPending}
                                                className="shrink-0 rounded border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-500 hover:border-brand-green hover:text-brand-green transition-colors disabled:opacity-40"
                                            >
                                                Mark Resolved
                                            </button>
                                        )}
                                        {dep.status === "resolved" && (
                                            <span className="shrink-0 rounded-full bg-brand-green/10 px-2 py-0.5 text-[10px] font-bold text-brand-green">
                                                RESOLVED
                                            </span>
                                        )}
                                        <button
                                            onClick={() => deleteDepMut.mutate(dep.id)}
                                            disabled={deleteDepMut.isPending}
                                            className="shrink-0 text-gray-200 hover:text-brand-red transition-colors disabled:opacity-40"
                                        >
                                            <TrashIcon className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                                {!depsQuery.isLoading && deps.length === 0 && (
                                    <p className="px-5 py-8 text-center text-sm text-gray-400">No dependencies recorded</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TASKS ── */}
                {activeTab === "tasks" && (
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                            <span className="text-sm font-semibold text-gray-800">Tasks</span>
                            {canManageTasks && (
                                <button
                                    onClick={() => { setShowAddTask((v) => !v); setTaskError(""); }}
                                    className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-brand-blue hover:text-brand-blue transition-colors"
                                >
                                    <PlusIcon className="h-3.5 w-3.5" />
                                    Add Task
                                </button>
                            )}
                        </div>

                        {showAddTask && (
                            <div className="border-b border-gray-100 bg-gray-50 px-5 py-4 space-y-2">
                                <div className="flex items-center gap-3">
                                    <input
                                        placeholder="Task name *"
                                        value={taskForm.name}
                                        onChange={(e) => setTaskForm((p) => ({ ...p, name: e.target.value }))}
                                        className="flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                    />
                                    <input
                                        type="date"
                                        value={taskForm.due_by}
                                        onChange={(e) => setTaskForm((p) => ({ ...p, due_by: e.target.value }))}
                                        className="rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                    />
                                </div>
                                <textarea
                                    placeholder="Task description (optional)"
                                    value={taskForm.description}
                                    onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
                                    rows={2}
                                    className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none resize-none"
                                />
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1">
                                        <select
                                            value={taskForm.assigned_to}
                                            onChange={(e) => setTaskForm((p) => ({ ...p, assigned_to: e.target.value }))}
                                            className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-brand-blue focus:outline-none"
                                        >
                                            <option value="">
                                                {usersQuery.isLoading ? "Loading users…" : "Assign to… (optional)"}
                                            </option>
                                            {ptUsers.map((u) => (
                                                <option key={u.id} value={u.id}>
                                                    {(u.first_name + " " + u.last_name).trim() || u.username}
                                                </option>
                                            ))}
                                        </select>
                                        {usersQuery.isLoading && (
                                            <LoaderCircleIcon className="pointer-events-none absolute right-2.5 top-2 h-4 w-4 animate-spin text-gray-300" />
                                        )}
                                    </div>
                                    <button
                                        onClick={handleAddTask}
                                        disabled={createTaskMut.isPending || !taskForm.name.trim()}
                                        className="rounded-md bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-40"
                                    >
                                        {createTaskMut.isPending ? "Adding…" : "Add"}
                                    </button>
                                    <button
                                        onClick={() => { setShowAddTask(false); setTaskError(""); }}
                                        className="text-xs text-gray-400 hover:text-gray-600"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                {usersQuery.isError && (
                                    <p className="text-xs text-brand-orange flex items-center gap-1">
                                        <AlertCircleIcon className="h-3.5 w-3.5" />
                                        Could not load team members. You can still add the task unassigned.
                                    </p>
                                )}
                                {taskError && (
                                    <div className="flex items-center gap-1.5 text-xs text-brand-red">
                                        <AlertCircleIcon className="h-3.5 w-3.5 shrink-0" />
                                        {taskError}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="divide-y divide-gray-50">
                            {tasksQuery.isLoading && (
                                <div className="flex items-center justify-center py-8 text-gray-400">
                                    <LoaderCircleIcon className="h-5 w-5 animate-spin mr-2" />
                                    <span className="text-sm">Loading…</span>
                                </div>
                            )}
                            {visibleTasks.map((task) => (
                                <div key={task.id} className="flex items-center gap-4 px-5 py-3.5">
                                    <button
                                        onClick={() =>
                                            updateTaskMut.mutate({
                                                taskId: task.id,
                                                payload: { status: task.status === "done" ? "pending" : "done" },
                                            })
                                        }
                                        disabled={updateTaskMut.isPending}
                                        className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${task.status === "done" ? "bg-brand-green/10" : "bg-gray-100 hover:bg-gray-200"}`}
                                    >
                                        {task.status === "done"
                                            ? <CheckIcon className="h-3 w-3 text-brand-green" />
                                            : <div className="h-2 w-2 rounded-full bg-gray-300" />
                                        }
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold ${task.status === "done" ? "text-gray-400 line-through" : "text-gray-800"}`}>
                                            {task.name}
                                        </p>
                                        <div className="mt-1 flex items-center gap-2">
                                            {canManageTasks ? (
                                                <select
                                                    value={task.assigned_to ?? ""}
                                                    onChange={(e) =>
                                                        updateTaskMut.mutate({
                                                            taskId: task.id,
                                                            payload: { assigned_to: e.target.value ? Number(e.target.value) : null },
                                                        })
                                                    }
                                                    disabled={updateTaskMut.isPending}
                                                    className="rounded border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600 focus:border-brand-blue focus:outline-none disabled:opacity-40"
                                                >
                                                    <option value="">
                                                        {task.assigned_to_name ? "Reassign…" : "Unassigned"}
                                                    </option>
                                                    {ptUsers.map((u) => (
                                                        <option key={u.id} value={u.id}>
                                                            {(u.first_name + " " + u.last_name).trim() || u.username}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                task.assigned_to_name && (
                                                    <span className="text-xs text-gray-500">{task.assigned_to_name}</span>
                                                )
                                            )}
                                            {task.due_by && (
                                                <span className="text-xs text-gray-400">Due {task.due_by}</span>
                                            )}
                                        </div>
                                    </div>
                                    <select
                                        value={task.status}
                                        onChange={(e) =>
                                            updateTaskMut.mutate({
                                                taskId: task.id,
                                                payload: { status: e.target.value as ComponentTask["status"] },
                                            })
                                        }
                                        disabled={updateTaskMut.isPending}
                                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold border-0 focus:outline-none focus:ring-1 focus:ring-brand-blue cursor-pointer disabled:opacity-40 ${taskStatusColor(task.status)}`}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="done">Done</option>
                                        <option value="blocked">Blocked</option>
                                        <option value="overdue">Overdue</option>
                                    </select>
                                    {canManageTasks && (
                                        <button
                                            onClick={() => deleteTaskMut.mutate(task.id)}
                                            disabled={deleteTaskMut.isPending}
                                            className="shrink-0 text-gray-200 hover:text-brand-red transition-colors disabled:opacity-40"
                                        >
                                            <TrashIcon className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {!tasksQuery.isLoading && visibleTasks.length === 0 && (
                                <p className="px-5 py-8 text-center text-sm text-gray-400">
                                    {canManageTasks || isComponentAssigned ? "No tasks yet" : "No tasks assigned to you on this component"}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* ── QC CHECKPOINTS ── */}
                {activeTab === "qc" && (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                            <div className="flex gap-3">
                                <div className="rounded-lg bg-brand-green/10 px-4 py-2.5 text-center">
                                    <p className="text-xl font-bold text-brand-green">{passCount}</p>
                                    <p className="text-[10px] font-semibold uppercase text-brand-green/70">Passed</p>
                                </div>
                                <div className="rounded-lg bg-brand-red/10 px-4 py-2.5 text-center">
                                    <p className="text-xl font-bold text-brand-red">{failCount}</p>
                                    <p className="text-[10px] font-semibold uppercase text-brand-red/70">Failed</p>
                                </div>
                                <div className="rounded-lg bg-gray-100 px-4 py-2.5 text-center">
                                    <p className="text-xl font-bold text-gray-500">{pendingCount}</p>
                                    <p className="text-[10px] font-semibold uppercase text-gray-400">Pending</p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:ml-auto">
                                <label className="text-xs font-semibold text-gray-500">Load Template:</label>
                                <div className="relative">
                                    <select
                                        value={selectedTemplate}
                                        onChange={(e) => setSelectedTemplate(e.target.value)}
                                        className="appearance-none rounded-md border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm text-gray-700 focus:border-brand-blue focus:outline-none"
                                    >
                                        <option value="">Select template…</option>
                                        {allQCTemplateOptions.length > BUILTIN_QC_OPTIONS.length && (
                                            <optgroup label="Custom Templates">
                                                {allQCTemplateOptions
                                                    .filter((t) => t.key.startsWith("custom_"))
                                                    .map((t) => (
                                                        <option key={t.key} value={t.key}>{t.label}</option>
                                                    ))}
                                            </optgroup>
                                        )}
                                        <optgroup label="Built-in Templates">
                                            {BUILTIN_QC_OPTIONS.map((t) => (
                                                <option key={t.key} value={t.key}>{t.label}</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                    <ChevronDownIcon className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
                                </div>
                                <button
                                    onClick={() => {
                                        if (selectedTemplate) {
                                            loadTemplateMut.mutate(selectedTemplate);
                                            setSelectedTemplate("");
                                        }
                                    }}
                                    disabled={!selectedTemplate || loadTemplateMut.isPending}
                                    className="rounded-md bg-brand-blue px-3 py-2 text-xs font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-40 transition-colors"
                                >
                                    {loadTemplateMut.isPending ? "Loading…" : "Apply"}
                                </button>
                            </div>
                        </div>

                        {loadTemplateMut.isError && (
                            <div className="flex items-center gap-1.5 rounded-lg border border-brand-red/20 bg-brand-red/5 px-4 py-2.5 text-sm text-brand-red">
                                <AlertCircleIcon className="h-4 w-4 shrink-0" />
                                Failed to load template. Please try again.
                            </div>
                        )}

                        {qcQuery.isLoading && (
                            <div className="flex items-center justify-center py-10 text-gray-400">
                                <LoaderCircleIcon className="h-6 w-6 animate-spin mr-2" />
                                <span className="text-sm">Loading checkpoints…</span>
                            </div>
                        )}

                        {!qcQuery.isLoading && qcResults.length === 0 && (
                            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-400">
                                No checkpoints on this component yet. Choose a template above and click{" "}
                                <span className="font-semibold text-gray-600">Apply</span> to load the checklist.
                            </div>
                        )}

                        {categories.map((cat) => (
                            <div key={cat} className="rounded-xl border border-gray-200 bg-white shadow-sm">
                                <div className="border-b border-gray-100 px-5 py-2.5">
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{cat}</span>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {qcResults.filter((r) => r.category === cat).map((r) => (
                                        <div key={r.id} className="flex items-center gap-4 px-5 py-3.5">
                                            <div className={`h-2 w-2 rounded-full shrink-0 ${
                                                r.passed === true ? "bg-brand-green" : r.passed === false ? "bg-brand-red" : "bg-gray-300"
                                            }`} />
                                            <p className="flex-1 text-sm text-gray-700">{r.description}</p>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    onClick={() => markQCMut.mutate({ resultId: r.id, passed: true })}
                                                    disabled={markQCMut.isPending}
                                                    className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                                        r.passed === true
                                                            ? "bg-brand-green text-white"
                                                            : "border border-gray-200 text-gray-500 hover:border-brand-green hover:text-brand-green"
                                                    }`}
                                                >
                                                    <CheckIcon className="h-3.5 w-3.5" />
                                                    Pass
                                                </button>
                                                <button
                                                    onClick={() => markQCMut.mutate({ resultId: r.id, passed: false })}
                                                    disabled={markQCMut.isPending}
                                                    className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                                        r.passed === false
                                                            ? "bg-brand-red text-white"
                                                            : "border border-gray-200 text-gray-500 hover:border-brand-red hover:text-brand-red"
                                                    }`}
                                                >
                                                    <XIcon className="h-3.5 w-3.5" />
                                                    Fail
                                                </button>
                                                {r.passed !== null && (
                                                    <button
                                                        onClick={() => markQCMut.mutate({ resultId: r.id, passed: null })}
                                                        disabled={markQCMut.isPending}
                                                        className="rounded-md border border-gray-200 px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                                                    >
                                                        Reset
                                                    </button>
                                                )}
                                                {r.is_custom && (
                                                    <button
                                                        onClick={() => deleteQCMut.mutate(r.id)}
                                                        disabled={deleteQCMut.isPending}
                                                        className="text-gray-200 hover:text-brand-red transition-colors"
                                                    >
                                                        <TrashIcon className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {qcResults.length > 0 && (
                            <div className="flex justify-end gap-3">
                                <p className="self-center text-xs text-gray-400">{qcRemainingLabel}</p>
                                <button
                                    disabled={pendingCount > 0}
                                    className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green/90 disabled:opacity-40 transition-colors"
                                    onClick={() =>
                                        updateStatusMut.mutate(failCount > 0 ? "qc_hold" : "ready")
                                    }
                                >
                                    {failCount > 0 ? "Mark QC Hold" : "Submit QC Sign-off"}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── VENDOR BRIEF ── */}
                {activeTab === "brief" && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                            {/* Main brief card */}
                            <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">

                                {/* Vendor header row */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-5 py-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <BuildingIcon className="h-4 w-4 shrink-0 text-gray-400" />
                                        {rawComp?.vendor_name ? (
                                            <span className="text-sm font-bold text-gray-800">{rawComp.vendor_name}</span>
                                        ) : (
                                            <span className="text-sm font-semibold text-brand-orange">No vendor assigned</span>
                                        )}
                                        <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-orange shrink-0">
                                            PENDING CONFIRMATION
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {!briefEditing && (
                                            <button
                                                onClick={() => setBriefEditing(true)}
                                                className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-brand-blue hover:text-brand-blue transition-colors"
                                            >
                                                <FileTextIcon className="h-3.5 w-3.5" />
                                                Edit Brief
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setShowVendorPicker((v) => !v)}
                                            className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-brand-blue hover:text-brand-blue transition-colors"
                                        >
                                            <PlusIcon className="h-3.5 w-3.5" />
                                            {rawComp?.vendor_name ? "Change" : "Assign Vendor"}
                                        </button>
                                    </div>
                                </div>

                                {/* Vendor picker */}
                                {showVendorPicker && (
                                    <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-5 py-3">
                                        <div className="relative flex-1">
                                            <select
                                                defaultValue={rawComp?.vendor ?? ""}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    assignVendorMut.mutate(val ? Number(val) : null);
                                                    setShowVendorPicker(false);
                                                }}
                                                className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-brand-blue focus:outline-none"
                                            >
                                                <option value="">— No vendor (clear) —</option>
                                                {vendorsQuery.isLoading && <option disabled>Loading vendors…</option>}
                                                {vendors.map((v) => (
                                                    <option key={v.id} value={v.id}>{v.name}{v.email ? ` — ${v.email}` : ""}</option>
                                                ))}
                                            </select>
                                            {vendorsQuery.isLoading && (
                                                <LoaderCircleIcon className="pointer-events-none absolute right-2.5 top-2 h-4 w-4 animate-spin text-gray-300" />
                                            )}
                                        </div>
                                        <button onClick={() => setShowVendorPicker(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                                    </div>
                                )}
                                {assignVendorMut.isPending && (
                                    <p className="flex items-center gap-1.5 border-b border-gray-100 px-5 py-2 text-xs text-gray-400">
                                        <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" /> Saving vendor…
                                    </p>
                                )}
                                {assignVendorMut.isError && (
                                    <p className="border-b border-brand-red/10 bg-brand-red/5 px-5 py-2 text-xs text-brand-red">Failed to assign vendor. Please try again.</p>
                                )}

                                {/* EDIT FORM */}
                                {briefEditing ? (
                                    <div className="px-5 py-5 space-y-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Edit Brief</p>

                                        {/* Vendor-visible fields */}
                                        <div className="rounded-lg border border-brand-blue/20 bg-brand-blue/5 p-4 space-y-3">
                                            <p className="text-xs font-bold text-brand-blue">Visible to Vendor</p>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-400 mb-1">Product</label>
                                                <input
                                                    value={briefDraft.product_name}
                                                    onChange={(e) => setBriefDraft((p) => ({ ...p, product_name: e.target.value }))}
                                                    placeholder="e.g. Clear Vinyl Sticker"
                                                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-400 mb-1">Process</label>
                                                <input
                                                    value={briefDraft.production_type}
                                                    onChange={(e) => setBriefDraft((p) => ({ ...p, production_type: e.target.value }))}
                                                    placeholder="e.g. Embroidery — Chest Logo"
                                                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                                />
                                            </div>

                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="col-span-2">
                                                    <label className="block text-xs font-semibold text-gray-400 mb-1">Quantity</label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={briefDraft.quantity ?? ""}
                                                        onChange={(e) => setBriefDraft((p) => ({ ...p, quantity: e.target.value }))}
                                                        className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-400 mb-1">Unit</label>
                                                    <input
                                                        value={briefDraft.unit}
                                                        onChange={(e) => setBriefDraft((p) => ({ ...p, unit: e.target.value }))}
                                                        placeholder="pcs"
                                                        className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                                    />
                                                </div>
                                            </div>

                                            {/* Brief Attachments — inline in form */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="block text-xs font-semibold text-gray-400">
                                                        Attachments & Instructions
                                                        <span className="ml-1 font-normal text-gray-300">(mockups, artworks — visible to vendor)</span>
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setBaRows((prev) => [...prev, { name: "", desc: "", file: null }])}
                                                        className="flex items-center gap-1 text-xs font-semibold text-brand-blue hover:text-brand-blue/80 transition-colors"
                                                    >
                                                        <PlusIcon className="h-3.5 w-3.5" /> Add Row
                                                    </button>
                                                </div>
                                                <div className="space-y-2">
                                                    {baRows.map((row, idx) => (
                                                        <div key={idx} className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-3">
                                                            <div className="flex-1 space-y-2 min-w-0">
                                                                <input
                                                                    type="text"
                                                                    value={row.name}
                                                                    onChange={(e) => setBaRows((prev) => prev.map((r, i) => i === idx ? { ...r, name: e.target.value } : r))}
                                                                    placeholder="Label (optional) — e.g. 'Chest Artwork'"
                                                                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={row.desc}
                                                                    onChange={(e) => setBaRows((prev) => prev.map((r, i) => i === idx ? { ...r, desc: e.target.value } : r))}
                                                                    placeholder="Instruction for vendor (optional)"
                                                                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                                                />
                                                                <input
                                                                    type="file"
                                                                    onChange={(e) => setBaRows((prev) => prev.map((r, i) => i === idx ? { ...r, file: e.target.files?.[0] ?? null } : r))}
                                                                    className="text-sm text-gray-600"
                                                                />
                                                            </div>
                                                            {baRows.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setBaRows((prev) => prev.filter((_, i) => i !== idx))}
                                                                    className="mt-1 rounded border border-gray-200 p-1 text-gray-300 hover:border-brand-red hover:text-brand-red transition-colors shrink-0"
                                                                >
                                                                    <XIcon className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={handleBaUploadAll}
                                                        disabled={baUploading || !baRows.some((r) => r.file || r.name.trim() || r.desc.trim())}
                                                        className="flex items-center gap-1.5 rounded-md bg-brand-blue px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-40 transition-colors"
                                                    >
                                                        {baUploading ? <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" /> : <UploadIcon className="h-3.5 w-3.5" />}
                                                        {baUploading ? "Uploading…" : `Save${baRows.filter((r) => r.file || r.name.trim() || r.desc.trim()).length > 1 ? " All" : ""}`}
                                                    </button>
                                                    {baUploadError && <span className="text-xs text-brand-red">{baUploadError}</span>}
                                                </div>
                                                {/* Already-uploaded attachments */}
                                                {briefAttachmentsQuery.isLoading ? (
                                                    <div className="flex items-center gap-2 py-2">
                                                        <LoaderCircleIcon className="h-4 w-4 animate-spin text-gray-300" />
                                                        <span className="text-xs text-gray-300">Loading…</span>
                                                    </div>
                                                ) : briefAttachmentsQuery.data?.length ? (
                                                    <div className="rounded-lg border border-gray-100 divide-y divide-gray-50">
                                                        {briefAttachmentsQuery.data.map((ba) => (
                                                            <div key={ba.id} className="flex items-center gap-3 px-3 py-2">
                                                                <PaperclipIcon className="h-4 w-4 text-gray-400 shrink-0" />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-semibold text-gray-800">{ba.attachment_name}</p>
                                                                    {ba.description && <p className="text-xs text-gray-400">{ba.description}</p>}
                                                                    <p className="text-[10px] text-gray-300">
                                                                        {ba.uploaded_by ?? "—"} · {new Date(ba.uploaded_at).toLocaleDateString("en-KE")}
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => deleteBaMut.mutate(ba.id)}
                                                                    disabled={deleteBaMut.isPending && deleteBaMut.variables === ba.id}
                                                                    className="rounded border border-gray-200 p-1 text-gray-400 hover:border-brand-red hover:text-brand-red transition-colors disabled:opacity-40"
                                                                >
                                                                    {deleteBaMut.isPending && deleteBaMut.variables === ba.id
                                                                        ? <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" />
                                                                        : <TrashIcon className="h-3.5 w-3.5" />
                                                                    }
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-300 italic">No attachments yet.</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-400 mb-1">SLA Deadline</label>
                                                <input
                                                    type="date"
                                                    value={briefDraft.sla_deadline ?? ""}
                                                    onChange={(e) => setBriefDraft((p) => ({ ...p, sla_deadline: e.target.value }))}
                                                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-400 mb-1">Proof Required / Special Instructions</label>
                                                <textarea
                                                    rows={3}
                                                    value={briefDraft.notes}
                                                    onChange={(e) => setBriefDraft((p) => ({ ...p, notes: e.target.value }))}
                                                    placeholder="e.g. Yes — send digital proof before full run. Packaging…"
                                                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none resize-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Internal-only fields */}
                                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                                            <p className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                                                <LockIcon className="h-3.5 w-3.5" /> Internal Only — not sent to vendor
                                            </p>
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-400 mb-1">Unit Cost</label>
                                                    <input
                                                        value={briefDraft.brief_quoted_price}
                                                        onChange={(e) => setBriefDraft((p) => ({ ...p, brief_quoted_price: e.target.value }))}
                                                        placeholder="e.g. KES 1,200"
                                                        className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-400 mb-1">Internal LPO / PO Ref</label>
                                                    <input
                                                        value={briefDraft.brief_lpo_ref}
                                                        onChange={(e) => setBriefDraft((p) => ({ ...p, brief_lpo_ref: e.target.value }))}
                                                        placeholder="e.g. LPO-2025-0042"
                                                        className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-xs font-semibold text-gray-400 mb-1">Client Contact (internal)</label>
                                                    <input
                                                        value={briefDraft.brief_client_contact}
                                                        onChange={(e) => setBriefDraft((p) => ({ ...p, brief_client_contact: e.target.value }))}
                                                        placeholder="e.g. Jane Mwangi — +254 712 345 678"
                                                        className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={handleSaveBrief}
                                                disabled={briefSaving}
                                                className="flex items-center gap-1.5 rounded-md bg-brand-blue px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-40 transition-colors"
                                            >
                                                {briefSaving ? <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" /> : <CheckIcon className="h-3.5 w-3.5" />}
                                                {briefSaving ? "Saving…" : "Save Draft"}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setBriefEditing(false);
                                                    if (rawComp) setBriefDraft({
                                                        product_name: rawComp.product_name ?? "",
                                                        production_type: rawComp.production_type ?? "",
                                                        quantity: String(rawComp.quantity ?? ""),
                                                        unit: rawComp.unit ?? "",
                                                        specifications: rawComp.specifications ?? "",
                                                        brief_artwork_ref: rawComp.brief_artwork_ref ?? "",
                                                        sla_deadline: rawComp.sla_deadline ? rawComp.sla_deadline.split("T")[0] : "",
                                                        notes: rawComp.notes ?? "",
                                                        brief_quoted_price: rawComp.brief_quoted_price ?? "",
                                                        brief_client_contact: rawComp.brief_client_contact ?? "",
                                                        brief_lpo_ref: rawComp.brief_lpo_ref ?? "",
                                                    });
                                                }}
                                                className="text-xs text-gray-400 hover:text-gray-600"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* READ VIEW */
                                    <div className="divide-y divide-gray-50">
                                        {/* Vendor-visible fields */}
                                        {[
                                            { label: "Product",           value: rawComp?.product_name ?? "—" },
                                            { label: "Process",           value: rawComp?.production_type ?? "—" },
                                            { label: "Quantity",          value: rawComp ? `${rawComp.quantity} ${rawComp.unit}`.trim() : "—" },
                                            { label: "Placement",         value: rawComp?.specifications || "—" },
                                            { label: "Thread Colors",     value: rawComp?.brief_artwork_ref || "—" },
                                            {
                                                label: "SLA Deadline",
                                                value: rawComp?.sla_deadline
                                                    ? new Date(rawComp.sla_deadline).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
                                                    : "—",
                                            },
                                            { label: "Proof Required",    value: rawComp?.notes || "—" },
                                        ].map((field) => (
                                            <div key={field.label} className="flex items-start gap-8 px-5 py-3">
                                                <p className="w-44 shrink-0 pt-0.5 text-xs font-semibold text-gray-400">{field.label}</p>
                                                <p className={`flex-1 text-sm ${field.value === "—" ? "italic text-gray-300" : "text-gray-800"}`}>{field.value}</p>
                                            </div>
                                        ))}

                                        {/* Artwork files attached */}
                                        {uploadedFiles.filter((f) => f.slot === "artwork").length > 0 && (
                                            <div className="flex items-start gap-8 px-5 py-3">
                                                <p className="w-44 shrink-0 pt-0.5 text-xs font-semibold text-gray-400">Attached Artwork</p>
                                                <div className="flex flex-col gap-1">
                                                    {uploadedFiles.filter((f) => f.slot === "artwork").map((f) => (
                                                        <a
                                                            key={f.id}
                                                            href={f.file_url ?? "#"}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 text-sm text-brand-blue hover:underline"
                                                        >
                                                            <FileImageIcon className="h-3.5 w-3.5 shrink-0" />
                                                            {f.file_name}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Hidden from vendor */}
                                        <div className="bg-gray-50 px-5 py-4">
                                            <div className="mb-3 flex items-center gap-1.5">
                                                <LockIcon className="h-3.5 w-3.5 text-gray-400" />
                                                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Hidden from Vendor</p>
                                                <button
                                                    onClick={() => setBriefMasked((m) => !m)}
                                                    className="ml-auto flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-brand-blue transition-colors"
                                                >
                                                    {briefMasked ? <UnlockIcon className="h-3 w-3" /> : <LockIcon className="h-3 w-3" />}
                                                    {briefMasked ? "Reveal" : "Mask"}
                                                </button>
                                            </div>
                                            {[
                                                {
                                                    label: "Unit Cost",
                                                    value: rawComp?.brief_quoted_price
                                                        ? (briefMasked ? `KES ••••` : rawComp.brief_quoted_price)
                                                        : "—",
                                                    masked: briefMasked && Boolean(rawComp?.brief_quoted_price),
                                                },
                                                {
                                                    label: "Client Name",
                                                    value: briefMasked ? "[Anonymized]" : (rawComp?.brief_client_contact || "—"),
                                                    masked: briefMasked,
                                                },
                                                {
                                                    label: "Internal LPO",
                                                    value: briefMasked ? "[Internal]" : (rawComp?.brief_lpo_ref || "—"),
                                                    masked: briefMasked,
                                                },
                                                { label: "Margin", value: "[Internal]", masked: true },
                                            ].map((field) => (
                                                <div key={field.label} className="flex items-center gap-8 py-1.5">
                                                    <p className="w-44 shrink-0 text-xs font-semibold text-gray-400">{field.label}</p>
                                                    <p className={`text-sm font-mono ${field.masked || field.value === "—" ? "italic text-gray-300" : "text-gray-700"}`}>
                                                        {field.value}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Send brief footer */}
                                {sendBriefMut.isSuccess ? (
                                    <div className="flex items-center gap-2 border-t border-brand-green/20 bg-brand-green/5 px-5 py-3">
                                        <CheckCircleIcon className="h-4 w-4 text-brand-green" />
                                        <p className="text-sm font-semibold text-brand-green">Brief sent to {rawComp?.vendor_name}</p>
                                        <button onClick={() => sendBriefMut.reset()} className="ml-auto text-xs text-gray-400 hover:text-gray-600">Send again</button>
                                    </div>
                                ) : sendBriefMut.isError ? (
                                    <div className="flex items-start justify-between border-t border-brand-red/20 bg-brand-red/5 px-5 py-3 gap-3">
                                        <p className="text-sm text-brand-red break-all">{sendBriefMut.error instanceof Error ? sendBriefMut.error.message : "Failed to send. Check vendor email address."}</p>
                                        <button onClick={() => sendBriefMut.mutate(briefChannel)} className="text-xs font-semibold text-brand-red hover:underline shrink-0">Retry</button>
                                    </div>
                                ) : (
                                    <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                                        {!rawComp?.vendor && (
                                            <p className="text-xs text-brand-orange">Assign a vendor above before sending the brief</p>
                                        )}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-semibold text-gray-500 shrink-0">Send via:</span>
                                            {(["email", "whatsapp", "both"] as const).map((ch) => (
                                                <button
                                                    key={ch}
                                                    onClick={() => setBriefChannel(ch)}
                                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                                                        briefChannel === ch
                                                            ? "border-brand-blue bg-brand-blue text-white"
                                                            : "border-gray-200 text-gray-600 hover:border-brand-blue hover:text-brand-blue"
                                                    }`}
                                                >
                                                    {ch === "email" ? "Email" : ch === "whatsapp" ? "WhatsApp" : "Email + WhatsApp"}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => sendBriefMut.mutate(briefChannel)}
                                                disabled={sendBriefMut.isPending || !rawComp?.vendor}
                                                className="ml-auto flex items-center gap-2 rounded-md bg-brand-blue px-5 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-40 transition-colors"
                                            >
                                                {sendBriefMut.isPending ? <LoaderCircleIcon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
                                                {sendBriefMut.isPending ? "Sending…" : "Send Brief →"}
                                            </button>
                                        </div>
                                        {briefChannel === "whatsapp" && (
                                            <p className="text-xs text-gray-400">WhatsApp: generates the brief link and opens a pre-filled WhatsApp message in a new tab.</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* ── Production Cost Breakdown ── */}
                            <div className="lg:col-span-3 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 bg-gray-50">
                                    <div className="flex items-center gap-2">
                                        <LockIcon className="h-4 w-4 text-gray-400" />
                                        <span className="text-sm font-semibold text-gray-800">Production Cost Breakdown</span>
                                        {productionCostQuery.data?.total != null && productionCostQuery.data.total > 0 && (
                                            <span className="ml-1 rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-xs font-bold text-brand-blue">
                                                KES {productionCostQuery.data.total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                            </span>
                                        )}
                                    </div>
                                    {!costEditing && (
                                        <button
                                            onClick={() => {
                                                const existing = productionCostQuery.data?.items ?? [];
                                                setCostItems(existing.length > 0 ? existing.map(i => ({ ...i })) : [{ service_name: "", cost: 0 }]);
                                                setCostEditing(true);
                                            }}
                                            className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-brand-blue hover:text-brand-blue transition-colors"
                                        >
                                            <PlusIcon className="h-3.5 w-3.5" />
                                            {productionCostQuery.data?.items?.length ? "Edit Costs" : "Create Cost"}
                                        </button>
                                    )}
                                </div>

                                {costEditing ? (
                                    <div className="px-5 py-4 space-y-3">
                                        <p className="text-xs text-gray-400">Add each service/material and its cost in KES. Click <strong>Compute &amp; Save</strong> when done.</p>
                                        <div className="space-y-2">
                                            {costItems.map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={item.service_name}
                                                        onChange={e => setCostItems(prev => prev.map((it, i) => i === idx ? { ...it, service_name: e.target.value } : it))}
                                                        placeholder="Service / material name"
                                                        className="flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                                    />
                                                    <div className="relative w-36">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">KES</span>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={item.cost || ""}
                                                            onChange={e => setCostItems(prev => prev.map((it, i) => i === idx ? { ...it, cost: parseFloat(e.target.value) || 0 } : it))}
                                                            placeholder="0.00"
                                                            className="w-full rounded-md border border-gray-200 pl-10 pr-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => setCostItems(prev => prev.filter((_, i) => i !== idx))}
                                                        className="p-1.5 text-gray-300 hover:text-brand-red transition-colors"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => setCostItems(prev => [...prev, { service_name: "", cost: 0 }])}
                                            className="flex items-center gap-1.5 text-xs text-brand-blue hover:underline"
                                        >
                                            <PlusIcon className="h-3.5 w-3.5" /> Add Row
                                        </button>

                                        {/* Total preview */}
                                        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
                                            <span className="text-sm font-semibold text-gray-700">Total</span>
                                            <span className="text-sm font-bold text-brand-blue">
                                                KES {costItems.reduce((s, i) => s + (i.cost || 0), 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 pt-1">
                                            <button
                                                onClick={() => saveCostMut.mutate(costItems.filter(i => i.service_name.trim()))}
                                                disabled={saveCostMut.isPending}
                                                className="flex items-center gap-1.5 rounded-md bg-brand-blue px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-40 transition-colors"
                                            >
                                                {saveCostMut.isPending ? <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" /> : <CheckIcon className="h-3.5 w-3.5" />}
                                                {saveCostMut.isPending ? "Saving…" : "Compute & Save"}
                                            </button>
                                            <button onClick={() => setCostEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                                            {saveCostMut.isError && <span className="text-xs text-brand-red">Save failed. Try again.</span>}
                                        </div>
                                    </div>
                                ) : productionCostQuery.data?.items?.length ? (
                                    <div className="divide-y divide-gray-50">
                                        {productionCostQuery.data.items.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between px-5 py-2.5">
                                                <span className="text-sm text-gray-700">{item.service_name}</span>
                                                <span className="text-sm font-mono text-gray-800">KES {Number(item.cost).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        ))}
                                        <div className="flex items-center justify-between bg-gray-50 px-5 py-3">
                                            <span className="text-sm font-bold text-gray-700">Total</span>
                                            <span className="text-sm font-bold text-brand-blue">KES {productionCostQuery.data.total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="px-5 py-8 text-center">
                                        <p className="text-sm text-gray-400">No production cost recorded yet.</p>
                                        <p className="text-xs text-gray-300 mt-1">Click <strong>Create Cost</strong> above to add a breakdown.</p>
                                    </div>
                                )}
                            </div>

                            {/* Vendor Status Timeline */}
                            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                                <div className="border-b border-gray-100 px-5 py-3 flex items-center justify-between">
                                    <span className="text-sm font-semibold text-gray-800">Vendor Status Timeline</span>
                                    {vendorBriefStatusQuery.data?.has_brief && !vendorBriefStatusQuery.data.is_active && (
                                        <span className="text-xs font-medium text-brand-orange bg-brand-orange/10 border border-brand-orange/20 rounded-full px-2 py-0.5">Link expired</span>
                                    )}
                                </div>
                                <div className="p-5">
                                    {(() => {
                                        const bs: VendorBriefStatus | undefined = vendorBriefStatusQuery.data;
                                        const fmtDate = (iso: string) => {
                                            const d = new Date(iso);
                                            return `${d.toLocaleDateString("en-KE", { day: "numeric", month: "short" })} · ${d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}`;
                                        };
                                        const createdDate = rawComp?.created_at ? rawComp.created_at : null;
                                        const briefSentAt = bs?.brief_sent_at ?? (sendBriefMut.isSuccess ? new Date().toISOString() : null);
                                        const firstProof = bs?.proofs?.[0];
                                        const inProduction = rawComp?.status === "in_progress" || rawComp?.status === "completed" || rawComp?.status === "dispatched";
                                        const readyOrDone = rawComp?.status === "completed" || rawComp?.status === "dispatched";

                                        const steps: { label: string; time: string | null; done: boolean; detail?: string }[] = [
                                            {
                                                label: "Brief prepared by PT",
                                                time: createdDate ? fmtDate(createdDate) : null,
                                                done: true,
                                            },
                                            {
                                                label: "Brief sent — awaiting acknowledgement",
                                                time: briefSentAt ? fmtDate(briefSentAt) : null,
                                                done: Boolean(briefSentAt),
                                            },
                                            {
                                                label: bs?.acknowledged ? `Acknowledged by ${bs.acknowledged_by || "vendor"}` : "Vendor acknowledgement",
                                                time: bs?.acknowledged_at ? fmtDate(bs.acknowledged_at) : null,
                                                done: Boolean(bs?.acknowledged),
                                            },
                                            {
                                                label: firstProof ? `Proof uploaded by ${firstProof.uploaded_by_name || "vendor"}` : "Proof upload",
                                                time: firstProof ? fmtDate(firstProof.uploaded_at) : null,
                                                done: Boolean(firstProof),
                                                detail: bs?.proofs && bs.proofs.length > 1 ? `${bs.proofs.length} proofs total` : undefined,
                                            },
                                            {
                                                label: "Production running",
                                                time: bs?.vendor_accepted_at ? fmtDate(bs.vendor_accepted_at) : null,
                                                done: inProduction,
                                            },
                                            {
                                                label: "Ready for pickup",
                                                time: null,
                                                done: readyOrDone,
                                            },
                                        ];

                                        return (
                                            <>
                                                {steps.map((step, i) => (
                                                    <div key={i} className="flex gap-3">
                                                        <div className="flex flex-col items-center">
                                                            <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${step.done ? "bg-brand-green/15 text-brand-green" : "bg-gray-100 text-gray-400"}`}>
                                                                {step.done ? <CheckIcon className="h-3.5 w-3.5" /> : i + 1}
                                                            </div>
                                                            {i < steps.length - 1 && (
                                                                <div className={`mt-1 w-px min-h-[20px] flex-1 ${step.done ? "bg-brand-green/30" : "bg-gray-100"}`} />
                                                            )}
                                                        </div>
                                                        <div className="pb-4 min-w-0">
                                                            <p className={`text-sm font-semibold ${step.done ? "text-gray-800" : "text-gray-400"}`}>{step.label}</p>
                                                            <p className="text-xs text-gray-400">{step.time ?? "—"}</p>
                                                            {step.detail && <p className="text-xs text-brand-blue mt-0.5">{step.detail}</p>}
                                                        </div>
                                                    </div>
                                                ))}
                                                {bs?.time_adjustment_requested && (
                                                    <div className="mt-2 rounded-lg border border-brand-orange/20 bg-brand-orange/5 px-3 py-2">
                                                        <p className="text-xs font-semibold text-brand-orange">Vendor requested time adjustment</p>
                                                        {bs.time_adjustment_reason && <p className="text-xs text-gray-600 mt-0.5">{bs.time_adjustment_reason}</p>}
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* ── Off-System Communication ── */}
                        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3.5">
                                <div className="flex items-center gap-2">
                                    <MessageCircleIcon className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm font-semibold text-gray-800">Off-System Communication</span>
                                    {vendorBriefStatusQuery.data?.off_system_logs?.length ? (
                                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-500">{vendorBriefStatusQuery.data.off_system_logs.length}</span>
                                    ) : null}
                                </div>
                                <button
                                    onClick={() => setShowLogForm((v) => !v)}
                                    className="flex items-center gap-1 text-xs font-semibold text-brand-blue hover:text-brand-blue/80 transition-colors"
                                >
                                    <PlusIcon className="h-3.5 w-3.5" />
                                    Log
                                </button>
                            </div>
                            {showLogForm && (
                                <div className="border-b border-gray-100 px-5 py-4 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1">Channel</label>
                                            <select
                                                value={logChannel}
                                                onChange={(e) => setLogChannel(e.target.value as OffSystemChannel)}
                                                className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                            >
                                                <option value="phone">Phone Call</option>
                                                <option value="whatsapp">WhatsApp</option>
                                                <option value="email">Email (external)</option>
                                                <option value="in_person">In Person</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 mb-1">Direction</label>
                                            <select
                                                value={logDirection}
                                                onChange={(e) => setLogDirection(e.target.value as OffSystemDirection)}
                                                className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                            >
                                                <option value="outbound">We contacted them</option>
                                                <option value="inbound">They contacted us</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1">When</label>
                                        <input
                                            type="datetime-local"
                                            value={logOccurredAt}
                                            onChange={(e) => setLogOccurredAt(e.target.value)}
                                            className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-1">Summary <span className="text-brand-red">*</span></label>
                                        <textarea
                                            rows={2}
                                            value={logSummary}
                                            onChange={(e) => setLogSummary(e.target.value)}
                                            placeholder="What was discussed or decided…"
                                            className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none resize-none"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => { if (logSummary.trim()) logCommMut.mutate(); }}
                                            disabled={!logSummary.trim() || logCommMut.isPending}
                                            className="flex items-center gap-1.5 rounded-md bg-brand-blue px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-40 transition-colors"
                                        >
                                            {logCommMut.isPending ? <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" /> : <CheckIcon className="h-3.5 w-3.5" />}
                                            Save
                                        </button>
                                        <button
                                            onClick={() => { setShowLogForm(false); setLogSummary(""); }}
                                            className="text-xs text-gray-400 hover:text-gray-600"
                                        >
                                            Cancel
                                        </button>
                                        {logCommMut.isError && <span className="text-xs text-brand-red">Failed to save.</span>}
                                    </div>
                                </div>
                            )}
                            {vendorBriefStatusQuery.data?.off_system_logs?.length ? (
                                <div className="divide-y divide-gray-50">
                                    {vendorBriefStatusQuery.data.off_system_logs.map((log) => (
                                        <div key={log.id} className="px-5 py-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                                                    String(log.channel).toLowerCase().includes("whatsapp") ? "bg-green-100 text-green-700" :
                                                    String(log.channel).toLowerCase().includes("phone") ? "bg-blue-100 text-blue-700" :
                                                    "bg-gray-100 text-gray-600"
                                                }`}>{log.channel}</span>
                                                <span className="text-[10px] text-gray-400 uppercase tracking-wide">{log.direction}</span>
                                                <span className="ml-auto text-xs text-gray-400">
                                                    {new Date(log.occurred_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                                                    {" · "}
                                                    {new Date(log.occurred_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700">{log.summary}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">Logged by {log.recorded_by}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : !showLogForm ? (
                                <div className="px-5 py-6 text-center">
                                    <p className="text-sm text-gray-300">No off-system communication logged yet.</p>
                                </div>
                            ) : null}
                        </div>

                        {/* ── Vendor Adjustment Response ── */}
                        {(() => {
                            const bs = vendorBriefStatusQuery.data;
                            if (!bs?.time_adjustment_requested) return null;
                            const fmtBs = (iso: string) => new Date(iso).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
                            return (
                                <div className="rounded-xl border border-brand-orange/30 bg-white shadow-sm overflow-hidden">
                                    <div className="flex items-center gap-3 border-b border-brand-orange/20 bg-brand-orange/5 px-5 py-4">
                                        <AlertCircleIcon className="h-5 w-5 text-brand-orange shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800">Vendor Adjustment Request</p>
                                            {bs.time_adjustment_requested_at && (
                                                <p className="text-xs text-gray-500 mt-0.5">{fmtBs(bs.time_adjustment_requested_at)}</p>
                                            )}
                                        </div>
                                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                                            bs.adjustment_status === "approved" ? "bg-brand-green/10 text-brand-green" :
                                            bs.adjustment_status === "rejected" ? "bg-brand-red/10 text-brand-red" :
                                            "bg-brand-orange/10 text-brand-orange"
                                        }`}>
                                            {(bs.adjustment_status ?? "pending").toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="px-5 py-4 space-y-4">
                                        {bs.time_adjustment_reason && (
                                            <div>
                                                <p className="text-xs font-semibold text-gray-400 mb-1">Reason from vendor</p>
                                                <p className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700">{bs.time_adjustment_reason}</p>
                                            </div>
                                        )}
                                        {(bs.proposed_deadline || bs.proposed_cost) && (
                                            <div className="grid grid-cols-2 gap-4">
                                                {bs.proposed_deadline && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-400 mb-1">Proposed Deadline</p>
                                                        <p className="text-sm font-semibold text-gray-800">{new Date(bs.proposed_deadline).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</p>
                                                    </div>
                                                )}
                                                {bs.proposed_cost && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-400 mb-1">Proposed Cost</p>
                                                        <p className="text-sm font-semibold text-gray-800">{bs.proposed_cost}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {bs.adjustment_status === "pending" ? (
                                            !showAdjReply ? (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <button
                                                        onClick={() => { setAdjAction("approve"); setShowAdjReply(true); }}
                                                        className="flex items-center gap-1.5 rounded-md border border-brand-green/40 bg-brand-green/5 px-4 py-2 text-sm font-semibold text-brand-green hover:bg-brand-green/10 transition-colors"
                                                    >
                                                        <ThumbsUpIcon className="h-4 w-4" /> Approve
                                                    </button>
                                                    <button
                                                        onClick={() => { setAdjAction("reject"); setShowAdjReply(true); }}
                                                        className="flex items-center gap-1.5 rounded-md border border-brand-red/30 bg-brand-red/5 px-4 py-2 text-sm font-semibold text-brand-red hover:bg-brand-red/10 transition-colors"
                                                    >
                                                        <ThumbsDownIcon className="h-4 w-4" /> Reject
                                                    </button>
                                                    <button
                                                        onClick={() => { setAdjAction("reply"); setShowAdjReply(true); }}
                                                        className="flex items-center gap-1.5 rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:border-brand-blue hover:text-brand-blue transition-colors"
                                                    >
                                                        <MessageSquareIcon className="h-4 w-4" /> Reply
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                                                        {adjAction === "approve" ? "Approve Adjustment" : adjAction === "reject" ? "Reject Adjustment" : "Reply to Vendor"}
                                                    </p>
                                                    {adjAction === "approve" && (
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-xs font-semibold text-gray-400 mb-1">New Deadline <span className="text-gray-300">(optional)</span></label>
                                                                <input
                                                                    type="date"
                                                                    value={adjNewDeadline}
                                                                    onChange={(e) => setAdjNewDeadline(e.target.value)}
                                                                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-semibold text-gray-400 mb-1">New Cost <span className="text-gray-300">(optional)</span></label>
                                                                <input
                                                                    type="text"
                                                                    value={adjNewCost}
                                                                    onChange={(e) => setAdjNewCost(e.target.value)}
                                                                    placeholder="e.g. KES 15,000"
                                                                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-400 mb-1">Message <span className="text-gray-300">(optional)</span></label>
                                                        <textarea
                                                            rows={2}
                                                            value={adjMessage}
                                                            onChange={(e) => setAdjMessage(e.target.value)}
                                                            placeholder="Additional note to vendor…"
                                                            className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none resize-none"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => respondAdjMut.mutate()}
                                                            disabled={respondAdjMut.isPending}
                                                            className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40 transition-colors ${
                                                                adjAction === "approve" ? "bg-brand-green hover:bg-brand-green/90" :
                                                                adjAction === "reject" ? "bg-brand-red hover:bg-brand-red/90" :
                                                                "bg-brand-blue hover:bg-brand-blue/90"
                                                            }`}
                                                        >
                                                            {respondAdjMut.isPending ? <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" /> : <CheckIcon className="h-3.5 w-3.5" />}
                                                            {adjAction === "approve" ? "Confirm Approval" : adjAction === "reject" ? "Confirm Rejection" : "Send Reply"}
                                                        </button>
                                                        <button
                                                            onClick={() => { setShowAdjReply(false); setAdjMessage(""); setAdjNewDeadline(""); setAdjNewCost(""); }}
                                                            className="text-xs text-gray-400 hover:text-gray-600"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        ) : (
                                            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                                                <p className="text-xs font-semibold text-gray-400 mb-1">
                                                    Response by {bs.adjustment_responded_by ?? "Admin"}
                                                    {bs.adjustment_responded_at && ` · ${fmtBs(bs.adjustment_responded_at)}`}
                                                </p>
                                                <p className="text-sm text-gray-700">{bs.adjustment_response || "—"}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* ── FILES & ASSETS ── */}
                {activeTab === "files" && (
                    <div className="space-y-4">
                        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                                <span className="text-sm font-semibold text-gray-800">Files & Assets</span>
                                {filesQuery.isFetching && <LoaderCircleIcon className="h-4 w-4 animate-spin text-gray-300" />}
                            </div>
                            {uploadError && (
                                <div className="mx-5 mt-3 flex items-center gap-2 rounded-lg bg-brand-red/10 px-3 py-2 text-xs text-brand-red">
                                    <AlertCircleIcon className="h-3.5 w-3.5 shrink-0" />
                                    {uploadError}
                                    <button onClick={() => setUploadError(null)} className="ml-auto text-brand-red/60 hover:text-brand-red"><XIcon className="h-3.5 w-3.5" /></button>
                                </div>
                            )}
                            <div className="divide-y divide-gray-100">
                                {FILE_SLOT_DEFS.map((slotDef) => {
                                    const slotFiles = uploadedFiles.filter((f) => f.slot === slotDef.slot);
                                    const isUploading = uploadingSlots.has(slotDef.slot);
                                    return (
                                        <div key={slotDef.slot} className="px-5 py-4">
                                            {/* Slot header */}
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${slotFiles.length > 0 ? "bg-brand-blue/10 text-brand-blue" : "bg-gray-100 text-gray-300"}`}>
                                                    {slotDef.icon}
                                                </div>
                                                <p className="flex-1 text-sm font-semibold text-gray-700">{slotDef.label}</p>
                                                <div className="shrink-0 flex items-center gap-1.5">
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        ref={(el) => { fileInputRefs.current[slotDef.slot] = el; }}
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleFileChange(slotDef.slot, file);
                                                            e.target.value = "";
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        disabled={isUploading}
                                                        onClick={() => fileInputRefs.current[slotDef.slot]?.click()}
                                                        className="flex items-center gap-1 rounded-md border border-dashed border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-400 hover:border-brand-blue hover:text-brand-blue transition-colors disabled:opacity-50"
                                                    >
                                                        {isUploading ? <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" /> : <PlusIcon className="h-3.5 w-3.5" />}
                                                        {slotFiles.length === 0 ? "Upload" : "Add"}
                                                    </button>
                                                </div>
                                            </div>
                                            {/* File list */}
                                            {slotFiles.length === 0 ? (
                                                <p className="ml-12 text-xs italic text-gray-300">No files uploaded</p>
                                            ) : (
                                                <div className="ml-12 space-y-1.5">
                                                    {slotFiles.map((f) => {
                                                        const isDeleting = deletingFileIds.has(f.id);
                                                        return (
                                                            <div key={f.id} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-semibold text-gray-700 truncate">{f.file_name}</p>
                                                                    <p className="text-[10px] text-gray-400">
                                                                        {(f.file_size / 1024).toFixed(1)} KB
                                                                        {f.uploaded_by_name && <span> · {f.uploaded_by_name}</span>}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                    {f.file_url && (
                                                                        <a
                                                                            href={f.file_url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="rounded border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-500 hover:border-brand-blue hover:text-brand-blue transition-colors"
                                                                        >
                                                                            View
                                                                        </a>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteFile(f.id)}
                                                                        disabled={isDeleting}
                                                                        className="rounded border border-gray-200 p-1 text-gray-400 hover:border-brand-red hover:text-brand-red transition-colors disabled:opacity-40"
                                                                    >
                                                                        {isDeleting
                                                                            ? <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" />
                                                                            : <TrashIcon className="h-3.5 w-3.5" />
                                                                        }
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── ADJUSTMENT REQUEST ── */}
                {activeTab === "adjustment" && (
                    <div className="space-y-4">
                        <div className="rounded-xl border border-brand-orange/30 bg-white shadow-sm overflow-hidden">
                            <div className="flex items-center gap-2 border-b border-brand-orange/20 bg-brand-orange/5 px-5 py-4">
                                <AlertCircleIcon className="h-5 w-5 text-brand-orange shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">Request Adjustment</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Notify AM &amp; Admin of a required change on this component — quantity, spec correction, pricing, or any other issue.
                                    </p>
                                </div>
                            </div>
                            <div className="px-5 py-5 space-y-4">
                                <textarea
                                    rows={5}
                                    value={adjustmentNote}
                                    onChange={e => setAdjustmentNote(e.target.value)}
                                    placeholder="Describe the adjustment needed — e.g. client requested a colour change, quantity revised from 100 to 150, pricing needs to be updated…"
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-blue focus:outline-none resize-none"
                                />
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            if (adjustmentNote.trim()) adjustmentMut.mutate(adjustmentNote.trim());
                                        }}
                                        disabled={!adjustmentNote.trim() || adjustmentMut.isPending}
                                        className="flex items-center gap-2 rounded-md bg-brand-orange px-5 py-2 text-sm font-semibold text-white hover:bg-brand-orange/90 disabled:opacity-40 transition-colors"
                                    >
                                        {adjustmentMut.isPending
                                            ? <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                                            : <SendIcon className="h-4 w-4" />
                                        }
                                        {adjustmentMut.isPending ? "Sending…" : "Send to AM & Admin"}
                                    </button>
                                    {adjustmentMut.isSuccess && (
                                        <span className="flex items-center gap-1.5 text-sm text-brand-green font-medium">
                                            <CheckIcon className="h-4 w-4" /> Request sent successfully
                                        </span>
                                    )}
                                    {adjustmentMut.isError && (
                                        <span className="text-sm text-brand-red">Failed to send. Please try again.</span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400">
                                    All Account Managers and Admins will receive a notification with your note.
                                    The AM will then update the quote or invoice as needed.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── AUDIT LOG ── */}
                {activeTab === "audit" && (
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="border-b border-gray-100 px-5 py-3">
                            <span className="text-sm font-semibold text-gray-800">Audit Log</span>
                        </div>
                        <div className="p-6">
                            {rawComp && (
                                <div className="flex gap-4 mb-4">
                                    <div className="flex flex-col items-center">
                                        <div className="h-3 w-3 rounded-full shrink-0 mt-1 bg-brand-green" />
                                    </div>
                                    <div className="pb-5 min-w-0">
                                        <p className="text-sm text-gray-700 leading-snug">Component created</p>
                                        <p className="mt-0.5 text-xs text-gray-400">
                                            System · {rawComp.created_at ? new Date(rawComp.created_at).toLocaleDateString("en-KE") : "—"}
                                        </p>
                                    </div>
                                </div>
                            )}
                            <p className="text-center text-sm text-gray-300 py-4">Full audit trail coming soon</p>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
