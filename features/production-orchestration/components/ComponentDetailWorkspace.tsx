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
} from "lucide-react";
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
    type JobComponent,
    type ComponentDependency,
    type ComponentTask,
    type ComponentQCResult,
    type ComponentFile,
    type ComponentFileSlot,
} from "@/services/orchestration";
import { jobComponentToProductionComponent } from "../lib/api-job-helpers";
import type { ProductionComponent } from "../types";

type Tab = "deps" | "tasks" | "qc" | "brief" | "files" | "audit";

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
    { key: "deps",  label: "Dependencies",   icon: <LinkIcon className="h-4 w-4" /> },
    { key: "tasks", label: "Tasks",          icon: <ListChecksIcon className="h-4 w-4" /> },
    { key: "qc",    label: "QC Checkpoints", icon: <ClipboardCheckIcon className="h-4 w-4" /> },
    { key: "brief", label: "Vendor Brief",   icon: <SendIcon className="h-4 w-4" /> },
    { key: "files", label: "Files & Assets", icon: <FolderOpenIcon className="h-4 w-4" /> },
    { key: "audit", label: "Audit Log",      icon: <ActivityIcon className="h-4 w-4" /> },
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
        mutationFn: () => sendVendorBrief(numericCompId),
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

    // Add dependency form
    const [showAddDep, setShowAddDep] = useState(false);
    const [depForm, setDepForm] = useState({ description: "", dependency_type: "artwork_approval", due_by: "" });
    const [depError, setDepError] = useState("");

    // Add task form
    const [showAddTask, setShowAddTask] = useState(false);
    const [taskForm, setTaskForm] = useState({ name: "", due_by: "", assigned_to: "" });
    const [taskError, setTaskError] = useState("");

    useEffect(() => {
        setActiveTab("deps");
        setShowAddDep(false);
        setShowAddTask(false);
        setDepForm({ description: "", dependency_type: "artwork_approval", due_by: "" });
        setTaskForm({ name: "", due_by: "", assigned_to: "" });
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
                status: "pending",
                due_by: taskForm.due_by || null,
                assigned_to: taskForm.assigned_to ? Number(taskForm.assigned_to) : null,
            });
            setTaskForm({ name: "", due_by: "", assigned_to: "" });
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
                                {tab.key === "tasks" && tasksQuery.data && tasksQuery.data.length > 0 && (
                                    <span className="ml-1 rounded-full bg-gray-100 px-1.5 py-0 text-[10px] font-bold text-gray-500">
                                        {tasksQuery.data.length}
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
                            <button
                                onClick={() => { setShowAddTask((v) => !v); setTaskError(""); }}
                                className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-brand-blue hover:text-brand-blue transition-colors"
                            >
                                <PlusIcon className="h-3.5 w-3.5" />
                                Add Task
                            </button>
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
                            {(tasksQuery.data ?? []).map((task) => (
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
                                            {task.assigned_to_name && (
                                                <span className="text-xs text-gray-500">{task.assigned_to_name}</span>
                                            )}
                                            {task.due_by && (
                                                <span className="text-xs text-gray-400">Due {task.due_by}</span>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${taskStatusColor(task.status)}`}>
                                        {apiTaskStatusLabel(task.status)}
                                    </span>
                                    <button
                                        onClick={() => deleteTaskMut.mutate(task.id)}
                                        disabled={deleteTaskMut.isPending}
                                        className="shrink-0 text-gray-200 hover:text-brand-red transition-colors disabled:opacity-40"
                                    >
                                        <TrashIcon className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                            {!tasksQuery.isLoading && (tasksQuery.data ?? []).length === 0 && (
                                <p className="px-5 py-8 text-center text-sm text-gray-400">No tasks yet</p>
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

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-400 mb-1">Placement</label>
                                                <input
                                                    value={briefDraft.specifications}
                                                    onChange={(e) => setBriefDraft((p) => ({ ...p, specifications: e.target.value }))}
                                                    placeholder="e.g. Centre chest, 8cm width"
                                                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-gray-400 mb-1">Thread / Color Spec</label>
                                                <input
                                                    value={briefDraft.brief_artwork_ref}
                                                    onChange={(e) => setBriefDraft((p) => ({ ...p, brief_artwork_ref: e.target.value }))}
                                                    placeholder="e.g. Green #00A651, White — Pantone 485"
                                                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
                                                />
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
                                        <button onClick={() => sendBriefMut.mutate()} className="text-xs font-semibold text-brand-red hover:underline shrink-0">Retry</button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
                                        {!rawComp?.vendor && (
                                            <p className="text-xs text-brand-orange">Assign a vendor above before sending the brief</p>
                                        )}
                                        <button
                                            onClick={() => sendBriefMut.mutate()}
                                            disabled={sendBriefMut.isPending || !rawComp?.vendor}
                                            className="ml-auto flex items-center gap-2 rounded-md bg-brand-blue px-5 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-40 transition-colors"
                                        >
                                            {sendBriefMut.isPending ? <LoaderCircleIcon className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
                                            {sendBriefMut.isPending ? "Sending…" : "Send Brief to Vendor →"}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Vendor Status Timeline */}
                            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                                <div className="border-b border-gray-100 px-5 py-3">
                                    <span className="text-sm font-semibold text-gray-800">Vendor Status Timeline</span>
                                </div>
                                <div className="p-5">
                                    {(() => {
                                        const briefSent = sendBriefMut.isSuccess;
                                        const createdDate = rawComp?.created_at
                                            ? new Date(rawComp.created_at)
                                            : null;
                                        const fmtDate = (d: Date) =>
                                            `${d.toLocaleDateString("en-KE", { day: "numeric", month: "short" })} · ${d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}`;

                                        const steps = [
                                            { label: "Brief prepared by PT", time: createdDate ? fmtDate(createdDate) : null, done: true },
                                            { label: "Brief sent — awaiting acknowledgement", time: briefSent ? "Just now" : null, done: briefSent },
                                            { label: "Proof upload", time: null, done: false },
                                            { label: "Production running", time: null, done: false },
                                            { label: "Ready for pickup", time: null, done: false },
                                        ];

                                        return steps.map((step, i) => (
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
                                                    <p className="text-xs text-gray-300">{step.time ?? "—"}</p>
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        </div>
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
