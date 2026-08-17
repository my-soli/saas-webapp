"use client";

import { useMemo, useState, type ReactElement, type ChangeEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeftIcon,
    BriefcaseIcon,
    FileTextIcon,
    CheckCircleIcon,
    LayoutGridIcon,
    ClockIcon,
    PaperclipIcon,
    InboxIcon,
    LoaderCircleIcon,
    PlusIcon,
    TruckIcon,
    XIcon,
    DownloadIcon,
    RefreshCwIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { ProductionComponent } from "../types";
import { fetchJob, fetchJobAttachments, fetchComponentEvents, type JobAttachment, type ComponentEvent } from "@/services/jobs";
import { syncQuoteToJob } from "@/services/quotes";
import { fetchJobComponents, createDispatchUnit } from "@/services/orchestration";
import type { JobComponent } from "@/services/orchestration";
import type { Job } from "@/types/jobs";
import {
    apiProgressPct,
    apiRiskLevel,
    apiUserLabel,
    jobComponentToProductionComponent,
} from "../lib/api-job-helpers";

const compStatusColor = (status: string) => {
    if (["DEP_BLOCKED", "SEQ_BLOCKED", "QC_FAILED"].includes(status)) return "bg-brand-red/10 text-brand-red border-brand-red/20";
    if (status === "QC_HOLD") return "bg-brand-orange/10 text-brand-orange border-brand-orange/20";
    if (status === "IN_PRODUCTION") return "bg-brand-blue/10 text-brand-blue border-brand-blue/20";
    if (status === "DISPATCH_READY" || status === "COMPLETE") return "bg-brand-green/10 text-brand-green border-brand-green/20";
    return "bg-gray-100 text-gray-500 border-gray-200";
};

const priorityColor = (p: string) => {
    if (p === "Critical") return "bg-brand-red/10 text-brand-red";
    if (p === "Rush") return "bg-brand-orange/10 text-brand-orange";
    return "bg-brand-blue/10 text-brand-blue";
};

const riskColor = (level: string) => {
    if (level === "HIGH") return "bg-brand-red/10 text-brand-red";
    if (level === "MEDIUM") return "bg-brand-orange/10 text-brand-orange";
    return "bg-brand-green/10 text-brand-green";
};

const formatDate = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) : "—";

interface JobDetailVM {
    routeJobKey: string;
    breadcrumbLabel: string;
    titleName: string;
    subtitleLine: string;
    priorityLabel: string;
    riskLevel: "HIGH" | "MEDIUM" | "LOW";
    progressPct: number;
    client: string;
    orderManager: string;
    dispatchDeadline: string | null;
    componentCount: number;
}

function mapApiJobToVm(j: Job, componentCount: number): JobDetailVM {
    const priorityLabel =
        j.priority === "urgent" ? "Critical" : j.priority === "high" ? "Rush" : "Standard";
    return {
        routeJobKey: String(j.id),
        breadcrumbLabel: j.job_number ?? String(j.id),
        titleName: j.job_name,
        subtitleLine: `${j.job_number ?? j.id} · ${j.quote != null ? `Quote #${j.quote}` : "No quote linked"}`,
        priorityLabel,
        riskLevel: apiRiskLevel(j),
        progressPct: Math.round(apiProgressPct(j)),
        client: j.client?.name ?? "—",
        orderManager: apiUserLabel(j.person_in_charge),
        dispatchDeadline: j.expected_completion ?? null,
        componentCount,
    };
}

// ── Create Dispatch Unit Modal ────────────────────────────────────────────────

interface CreateDispatchModalProps {
    jobId: number;
    rawComponents: JobComponent[];
    onClose: () => void;
    onSuccess: () => void;
}

function CreateDispatchModal({ jobId, rawComponents, onClose, onSuccess }: CreateDispatchModalProps): ReactElement {
    const readyComponents = rawComponents.filter((c) => ["ready", "dispatched"].includes(c.status));

    const [selected, setSelected] = useState<Set<number>>(
        new Set(readyComponents.map((c) => c.id))
    );
    const [form, setForm] = useState({
        dispatch_type: "full",
        courier: "",
        delivery_location: "",
        dispatch_date: "",
    });

    const createMut = useMutation({
        mutationFn: () => createDispatchUnit({
            job: jobId,
            dispatch_type: form.dispatch_type,
            courier: form.courier,
            delivery_location: form.delivery_location,
            dispatch_date: form.dispatch_date || null,
            components: Array.from(selected),
        }),
        onSuccess: () => {
            toast.success("Dispatch unit created and sent to Dispatch queue.");
            onSuccess();
        },
        onError: () => toast.error("Failed to create dispatch unit."),
    });

    const toggleComp = (id: number) =>
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const allComponents = rawComponents.filter(
        (c) => !["completed"].includes(c.status)
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div>
                        <h3 className="text-base font-bold text-gray-900">Create Dispatch Unit</h3>
                        <p className="mt-0.5 text-sm text-gray-500">
                            Bundle ready components into a dispatch unit for the Dispatch tab.
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-md border border-gray-200 p-1.5 text-gray-400 hover:text-gray-600">
                        <XIcon className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Component selection */}
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                            Select Components to Bundle
                        </p>
                        <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-52 overflow-y-auto">
                            {allComponents.length === 0 ? (
                                <p className="px-4 py-6 text-center text-sm text-gray-400">No components available to bundle</p>
                            ) : allComponents.map((c) => {
                                const isReady = ["ready", "dispatched"].includes(c.status);
                                return (
                                    <label key={c.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            checked={selected.has(c.id)}
                                            onChange={() => toggleComp(c.id)}
                                            className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">{c.product_name}</p>
                                            <p className="text-xs text-gray-400">{c.quantity} {c.unit} · {c.production_type}</p>
                                        </div>
                                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                            isReady ? "bg-brand-green/10 text-brand-green" : "bg-gray-100 text-gray-500"
                                        }`}>
                                            {c.status.replace(/_/g, " ")}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        {selected.size === 0 && (
                            <p className="mt-1.5 text-xs text-brand-red">Select at least one component.</p>
                        )}
                    </div>

                    {/* Dispatch details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                                Dispatch Type
                            </label>
                            <select
                                value={form.dispatch_type}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm((p) => ({ ...p, dispatch_type: e.target.value }))}
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                            >
                                <option value="full">Full Dispatch</option>
                                <option value="partial">Partial Dispatch</option>
                                <option value="blind">Blind Dispatch (Vendor → Client)</option>
                                <option value="warehouse">Warehouse Routing</option>
                                <option value="installation">Installation Dispatch</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                                Dispatch Date
                            </label>
                            <input
                                type="date"
                                value={form.dispatch_date}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, dispatch_date: e.target.value }))}
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                                Courier / Handler
                            </label>
                            <input
                                type="text"
                                value={form.courier}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, courier: e.target.value }))}
                                placeholder="e.g. G4S, DHL, Internal"
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                                Delivery Location
                            </label>
                            <input
                                type="text"
                                value={form.delivery_location}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, delivery_location: e.target.value }))}
                                placeholder="e.g. Westlands, Nairobi"
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                    <button onClick={onClose} className="rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                        Cancel
                    </button>
                    <button
                        onClick={() => createMut.mutate()}
                        disabled={createMut.isPending || selected.size === 0}
                        className="flex items-center gap-2 rounded-md bg-brand-green px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green/90 disabled:opacity-40 transition-colors"
                    >
                        {createMut.isPending
                            ? <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                            : <TruckIcon className="h-4 w-4" />
                        }
                        {createMut.isPending ? "Creating…" : `Create Dispatch Unit (${selected.size} component${selected.size !== 1 ? "s" : ""})`}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main workspace ────────────────────────────────────────────────────────────

export default function JobDetailWorkspace({ basePath = "/production-team" }: { basePath?: string } = {}): ReactElement {
    const params = useParams();
    const jobId = params?.jobId as string;
    const isNumericJob = Boolean(jobId && /^\d+$/.test(jobId));
    const numericJobId = isNumericJob ? Number(jobId) : 0;
    const queryClient = useQueryClient();

    const [showDispatchModal, setShowDispatchModal] = useState(false);

    const syncQuoteMut = useMutation({
        mutationFn: (quoteId: number) => syncQuoteToJob(quoteId),
        onSuccess: (result) => {
            const parts: string[] = [`New total: KES ${result.new_total.toLocaleString()}`];
            if (result.components_created > 0) parts.push(`${result.components_created} new component(s) added`);
            if (result.components_updated > 0) parts.push(`${result.components_updated} component(s) updated`);
            if (result.zoho_updated) parts.push("Zoho invoice updated");
            if (result.zoho_reset) parts.push("Zoho sync reset — re-sync needed");
            toast.success("Quote changes pushed to job", { description: parts.join(" · ") });
            queryClient.invalidateQueries({ queryKey: ["orchestration", "job-detail", jobId] });
            queryClient.invalidateQueries({ queryKey: ["job-components", numericJobId] });
        },
        onError: (err: Error) => toast.error(err.message || "Failed to sync quote changes"),
    });

    const apiJobQuery = useQuery({
        queryKey: ["orchestration", "job-detail", jobId],
        queryFn: () => fetchJob(numericJobId),
        enabled: isNumericJob,
    });

    const componentsQuery = useQuery({
        queryKey: ["job-components", numericJobId],
        queryFn: () => fetchJobComponents(numericJobId),
        enabled: isNumericJob,
    });

    const attachmentsQuery = useQuery({
        queryKey: ["job-attachments", numericJobId],
        queryFn: () => fetchJobAttachments(numericJobId),
        enabled: isNumericJob,
        refetchInterval: 30_000,
    });

    const eventsQuery = useQuery<ComponentEvent[]>({
        queryKey: ["job-component-events", numericJobId],
        queryFn: () => fetchComponentEvents(numericJobId),
        enabled: isNumericJob,
        refetchInterval: 60_000,
    });

    const rawComponents: JobComponent[] = componentsQuery.data ?? [];

    const components: ProductionComponent[] = useMemo(() => {
        if (!componentsQuery.data || !isNumericJob) return [];
        const deadline = apiJobQuery.data?.expected_completion ?? undefined;
        return componentsQuery.data.map((jc) =>
            jobComponentToProductionComponent(numericJobId, jc, deadline)
        );
    }, [componentsQuery.data, apiJobQuery.data, isNumericJob, numericJobId]);

    const vm: JobDetailVM | null = useMemo(() => {
        if (isNumericJob && apiJobQuery.data)
            return mapApiJobToVm(apiJobQuery.data, components.length);
        return null;
    }, [isNumericJob, apiJobQuery.data, components.length]);

    const readyCount = rawComponents.filter((c) => ["ready", "dispatched"].includes(c.status)).length;

    if (!isNumericJob) {
        return (
            <>
                <header className="border-b border-gray-200 bg-white">
                    <div className="px-4 lg:px-8 py-4">
                        <Link href={`${basePath}/orchestration`} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-blue transition-colors">
                            <ArrowLeftIcon className="h-4 w-4" />
                            Control Tower
                        </Link>
                    </div>
                </header>
                <main className="flex min-h-[60vh] flex-col items-center justify-center bg-gray-50 p-8">
                    <InboxIcon className="h-12 w-12 text-gray-200" />
                    <p className="mt-4 text-sm font-semibold text-gray-600">Invalid job ID</p>
                    <Link href={`${basePath}/orchestration`} className="mt-6 rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90">
                        Back to Control Tower
                    </Link>
                </main>
            </>
        );
    }

    if (apiJobQuery.isPending) {
        return (
            <main className="flex min-h-[50vh] flex-col items-center justify-center bg-gray-50 p-8 text-gray-400">
                <LoaderCircleIcon className="h-10 w-10 animate-spin" />
                <p className="mt-3 text-sm">Loading job…</p>
            </main>
        );
    }

    if (apiJobQuery.isError || !vm) {
        return (
            <>
                <header className="border-b border-gray-200 bg-white px-4 lg:px-8 py-4">
                    <Link href={`${basePath}/orchestration`} className="text-sm text-gray-500 hover:text-brand-blue">
                        ← Control Tower
                    </Link>
                </header>
                <main className="flex min-h-[50vh] flex-col items-center justify-center bg-gray-50 p-8">
                    <p className="text-sm font-semibold text-brand-red">Could not load this job</p>
                    <p className="mt-1 text-xs text-gray-400">It may not exist or you may not have access.</p>
                </main>
            </>
        );
    }

    return (
        <>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4">
                    <div className="flex items-center gap-3 mb-4">
                        <Link
                            href={`${basePath}/orchestration`}
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-blue transition-colors"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                            Control Tower
                        </Link>
                        <span className="text-gray-300">/</span>
                        <span className="text-sm font-semibold text-gray-700">{vm.breadcrumbLabel}</span>
                    </div>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <BriefcaseIcon className="h-6 w-6 text-brand-blue" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{vm.titleName}</h1>
                                <p className="mt-0.5 text-sm text-gray-500">{vm.subtitleLine}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${priorityColor(vm.priorityLabel)}`}>
                                {vm.priorityLabel}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${riskColor(vm.riskLevel)}`}>
                                {vm.riskLevel} RISK
                            </span>
                            {apiJobQuery.data?.quote != null && (
                                <button
                                    onClick={() => {
                                        if (!window.confirm("Pull the latest quantities and totals from the quote into this job and LPO?\n\nThis will overwrite component quantities and recalculate the invoice amount.")) return;
                                        syncQuoteMut.mutate(apiJobQuery.data!.quote as number);
                                    }}
                                    disabled={syncQuoteMut.isPending}
                                    className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                    title="Pull latest quantities and totals from the linked quote"
                                >
                                    {syncQuoteMut.isPending
                                        ? <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                                        : <RefreshCwIcon className="h-4 w-4" />
                                    }
                                    Pull from Quote
                                </button>
                            )}
                            {readyCount > 0 && (
                                <button
                                    onClick={() => setShowDispatchModal(true)}
                                    className="flex items-center gap-2 rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green/90 transition-colors"
                                >
                                    <TruckIcon className="h-4 w-4" />
                                    Create Dispatch Unit
                                    <span className="rounded-full bg-white/25 px-1.5 py-0 text-[10px] font-bold">{readyCount}</span>
                                </button>
                            )}
                            <Link
                                href={`${basePath}/jobs/${vm.routeJobKey}/components`}
                                className="ml-1 rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 transition-colors"
                            >
                                View Components →
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="min-h-screen bg-gray-50 p-8 space-y-6">

                {/* Masthead Info Grid */}
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
                        <FileTextIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-semibold text-gray-800">Job Overview</span>
                    </div>
                    <div className="grid grid-cols-2 gap-0 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-gray-100">
                        {[
                            { label: "Client", value: vm.client },
                            { label: "Order Manager (PIC)", value: vm.orderManager },
                            { label: "Dispatch Deadline", value: formatDate(vm.dispatchDeadline) },
                            { label: "Components", value: componentsQuery.isLoading ? "…" : `${vm.componentCount} streams` },
                            { label: "Progress", value: `${vm.progressPct}%` },
                        ].map((field) => (
                            <div key={field.label} className="px-5 py-4">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{field.label}</p>
                                <p className="mt-1 text-sm font-semibold text-gray-800">{field.value}</p>
                            </div>
                        ))}
                    </div>
                    <div className="px-5 pb-4">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                                className="h-full rounded-full bg-brand-blue transition-all"
                                style={{ width: `${vm.progressPct}%` }}
                            />
                        </div>
                        <p className="mt-1 text-xs text-gray-400">{vm.progressPct}% complete across all production streams</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                    {/* Left 2/3 */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Component Quick-Status Board */}
                        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                                <div className="flex items-center gap-2">
                                    <LayoutGridIcon className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm font-semibold text-gray-800">Production Components</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {readyCount > 0 && (
                                        <span className="rounded-full bg-brand-green/10 px-2 py-0.5 text-[10px] font-bold text-brand-green">
                                            {readyCount} READY
                                        </span>
                                    )}
                                    <Link
                                        href={`${basePath}/jobs/${vm.routeJobKey}/components`}
                                        className="text-xs text-brand-blue hover:underline font-semibold"
                                    >
                                        View full board →
                                    </Link>
                                </div>
                            </div>

                            {componentsQuery.isLoading ? (
                                <div className="flex items-center justify-center py-12 text-gray-400">
                                    <LoaderCircleIcon className="h-6 w-6 animate-spin" />
                                    <span className="ml-2 text-sm">Loading components…</span>
                                </div>
                            ) : componentsQuery.isError ? (
                                <p className="px-5 py-6 text-sm text-brand-red text-center">Could not load components</p>
                            ) : components.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <InboxIcon className="h-8 w-8 text-gray-200" />
                                    <p className="mt-2 text-sm text-gray-400">No components yet</p>
                                    <Link
                                        href={`${basePath}/jobs/${vm.routeJobKey}/components`}
                                        className="mt-3 flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-brand-blue hover:text-brand-blue transition-colors"
                                    >
                                        <PlusIcon className="h-3.5 w-3.5" />
                                        Add Component
                                    </Link>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {components.map((comp) => (
                                        <Link
                                            key={comp.id}
                                            href={`${basePath}/jobs/${comp.jobId}/components/${comp.id}`}
                                            className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors"
                                        >
                                            <div
                                                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                                style={{ backgroundColor: comp.picColor }}
                                            >
                                                {comp.picInitials}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-800 truncate">{comp.name}</p>
                                                <p className="text-xs text-gray-400">
                                                    {comp.productionType} · {comp.vendor} · SLA {formatDate(comp.deadline)}
                                                </p>
                                            </div>
                                            {comp.depsOpen > 0 && (
                                                <span className="shrink-0 rounded-full bg-brand-orange/10 px-2 py-0.5 text-[10px] font-bold text-brand-orange">
                                                    {comp.depsOpen} DEPS OPEN
                                                </span>
                                            )}
                                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${compStatusColor(comp.status)}`}>
                                                {comp.status.replace(/_/g, " ")}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right 1/3 */}
                    <div className="space-y-6">

                        {/* Dispatch readiness */}
                        {components.length > 0 && (
                            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                                <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
                                    <TruckIcon className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm font-semibold text-gray-800">Dispatch Readiness</span>
                                </div>
                                <div className="p-4 space-y-2">
                                    {[
                                        { label: "Not Started",   count: components.filter(c => c.status === "NOT_STARTED").length,  color: "bg-gray-300" },
                                        { label: "In Production", count: components.filter(c => c.status === "IN_PRODUCTION").length, color: "bg-brand-blue" },
                                        { label: "QC Hold",       count: components.filter(c => c.status === "QC_HOLD" || c.status === "QC_FAILED").length, color: "bg-brand-orange" },
                                        { label: "Ready",         count: components.filter(c => c.status === "DISPATCH_READY").length, color: "bg-brand-green" },
                                        { label: "Complete",      count: components.filter(c => c.status === "COMPLETE").length,      color: "bg-brand-green/50" },
                                    ].filter(r => r.count > 0).map((row) => (
                                        <div key={row.label} className="flex items-center gap-3">
                                            <div className={`h-2 w-2 rounded-full shrink-0 ${row.color}`} />
                                            <span className="text-xs text-gray-600 flex-1">{row.label}</span>
                                            <span className="text-xs font-bold text-gray-800">{row.count}</span>
                                        </div>
                                    ))}
                                    {readyCount > 0 && (
                                        <button
                                            onClick={() => setShowDispatchModal(true)}
                                            className="mt-3 w-full flex items-center justify-center gap-2 rounded-md bg-brand-green px-3 py-2 text-xs font-semibold text-white hover:bg-brand-green/90 transition-colors"
                                        >
                                            <TruckIcon className="h-3.5 w-3.5" />
                                            Create Dispatch Unit
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* AM Attachments */}
                        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
                                <PaperclipIcon className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-semibold text-gray-800">AM Attachments</span>
                                {attachmentsQuery.data && attachmentsQuery.data.length > 0 && (
                                    <span className="ml-1 rounded-full bg-brand-blue/10 px-2 py-0.5 text-[10px] font-bold text-brand-blue">
                                        {attachmentsQuery.data.length}
                                    </span>
                                )}
                                <span className="ml-auto text-xs text-gray-400">Read-only</span>
                            </div>
                            {attachmentsQuery.isLoading ? (
                                <div className="flex items-center justify-center py-6 text-gray-400">
                                    <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                                </div>
                            ) : !attachmentsQuery.data || attachmentsQuery.data.length === 0 ? (
                                <div className="p-4 text-center text-sm text-gray-400">
                                    <PaperclipIcon className="mx-auto h-6 w-6 text-gray-200 mb-2" />
                                    No attachments from Account Management yet
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {attachmentsQuery.data.map((att: JobAttachment) => (
                                        <div key={att.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors">
                                            <PaperclipIcon className="h-4 w-4 text-gray-300 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-gray-700 truncate">{att.file_name}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                    {att.uploaded_by ?? "Account Manager"} · {new Date(att.uploaded_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}
                                                    {att.file_size > 0 && (
                                                        <span className="ml-1">
                                                            · {att.file_size < 1024 * 1024
                                                                ? `${Math.round(att.file_size / 1024)} KB`
                                                                : `${(att.file_size / (1024 * 1024)).toFixed(1)} MB`
                                                            }
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            {att.file_url && (
                                                <a
                                                    href={`/api/download?url=${encodeURIComponent(att.file_url)}&filename=${encodeURIComponent(att.file_name)}`}
                                                    download={att.file_name}
                                                    className="shrink-0 p-1.5 rounded hover:bg-brand-blue/10 text-gray-400 hover:text-brand-blue transition-colors"
                                                    title="Download"
                                                >
                                                    <DownloadIcon className="h-4 w-4" />
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Audit Log */}
                        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
                                <ClockIcon className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-semibold text-gray-800">Audit Log</span>
                                {eventsQuery.data && eventsQuery.data.length > 0 && (
                                    <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                                        {eventsQuery.data.length}
                                    </span>
                                )}
                            </div>
                            <div className="p-4 space-y-0">
                                {/* Job created entry */}
                                {apiJobQuery.data && (
                                    <div className="flex gap-3 pb-3">
                                        <div className="flex flex-col items-center">
                                            <div className="h-2.5 w-2.5 rounded-full shrink-0 mt-1 bg-brand-green" />
                                            {(eventsQuery.data?.length ?? 0) > 0 && <div className="w-px flex-1 bg-gray-100 mt-1" />}
                                        </div>
                                        <div className="min-w-0 pb-1">
                                            <p className="text-xs text-gray-700 leading-snug">Job created</p>
                                            <p className="mt-0.5 text-[10px] text-gray-400">System · {formatDate(apiJobQuery.data.created_at)}</p>
                                        </div>
                                    </div>
                                )}
                                {eventsQuery.isLoading && (
                                    <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                                        <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" /> Loading events…
                                    </div>
                                )}
                                {eventsQuery.data?.map((evt, i) => {
                                    const isLast = i === (eventsQuery.data?.length ?? 0) - 1;
                                    const dot = evt.event_type === "status_change" ? "bg-brand-blue" : evt.event_type === "assignment" ? "bg-brand-yellow" : "bg-gray-400";
                                    const label = evt.event_type === "status_change"
                                        ? `${evt.component_name}: ${evt.old_value} → ${evt.new_value}`
                                        : evt.event_type === "assignment"
                                        ? `${evt.component_name} assigned: ${evt.old_value} → ${evt.new_value}`
                                        : evt.note;
                                    return (
                                        <div key={evt.id} className="flex gap-3 pb-3">
                                            <div className="flex flex-col items-center">
                                                <div className={`h-2.5 w-2.5 rounded-full shrink-0 mt-1 ${dot}`} />
                                                {!isLast && <div className="w-px flex-1 bg-gray-100 mt-1" />}
                                            </div>
                                            <div className="min-w-0 pb-1">
                                                <p className="text-xs text-gray-700 leading-snug">{label}</p>
                                                <p className="mt-0.5 text-[10px] text-gray-400">
                                                    {evt.changed_by ?? "System"} · {new Date(evt.created_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {!eventsQuery.isLoading && eventsQuery.data?.length === 0 && (
                                    <p className="text-[11px] text-gray-400 py-2">No component events yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Create Dispatch Unit modal */}
            {showDispatchModal && (
                <CreateDispatchModal
                    jobId={numericJobId}
                    rawComponents={rawComponents}
                    onClose={() => setShowDispatchModal(false)}
                    onSuccess={() => {
                        setShowDispatchModal(false);
                        queryClient.invalidateQueries({ queryKey: ["dispatch-units"] });
                    }}
                />
            )}
        </>
    );
}
