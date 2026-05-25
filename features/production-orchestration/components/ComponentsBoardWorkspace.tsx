"use client";

import { useMemo, type ReactElement } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
    ArrowLeftIcon,
    LayoutGridIcon,
    CheckCircleIcon,
    LockIcon,
    PackageIcon,
    InboxIcon,
    LoaderCircleIcon,
} from "lucide-react";
import type { CompStatus, ProductionComponent } from "../types";
import { fetchJob } from "@/services/jobs";
import { fetchJobComponents } from "@/services/orchestration";
import { jobComponentToProductionComponent } from "../lib/api-job-helpers";

const statusConfig: Record<CompStatus, { label: string; bg: string; text: string; border: string }> = {
    NOT_STARTED:     { label: "Not Started",      bg: "bg-gray-100",           text: "text-gray-500",       border: "border-gray-200" },
    IN_PRODUCTION:   { label: "In Production",    bg: "bg-brand-blue/10",      text: "text-brand-blue",     border: "border-brand-blue/20" },
    DEP_BLOCKED:     { label: "Dep Blocked",       bg: "bg-brand-red/10",       text: "text-brand-red",      border: "border-brand-red/20" },
    SEQ_BLOCKED:     { label: "Seq Blocked",       bg: "bg-brand-red/10",       text: "text-brand-red",      border: "border-brand-red/20" },
    QC_HOLD:         { label: "QC Hold",           bg: "bg-brand-orange/10",    text: "text-brand-orange",   border: "border-brand-orange/20" },
    QC_FAILED:       { label: "QC Failed",         bg: "bg-brand-red/10",       text: "text-brand-red",      border: "border-brand-red/20" },
    DISPATCH_READY:  { label: "Dispatch Ready",    bg: "bg-brand-green/10",     text: "text-brand-green",    border: "border-brand-green/20" },
    COMPLETE:        { label: "Complete",          bg: "bg-brand-green/10",     text: "text-brand-green",    border: "border-brand-green/20" },
};

const execModeColor = (mode: string) => {
    if (mode === "External") return "bg-brand-purple/10 text-brand-purple";
    if (mode === "Field") return "bg-brand-orange/10 text-brand-orange";
    return "bg-brand-blue/10 text-brand-blue";
};

const riskDot = (level: string) => {
    if (level === "HIGH") return "bg-brand-red";
    if (level === "MEDIUM") return "bg-brand-orange";
    return "bg-brand-green";
};

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-KE", { day: "2-digit", month: "short" });

export default function ComponentsBoardWorkspace({ basePath = "/production-team" }: { basePath?: string } = {}): ReactElement {
    const params = useParams();
    const jobId = (params?.jobId as string) ?? "";
    const isNumeric = Boolean(jobId && /^\d+$/.test(jobId));

    const numericJobId = isNumeric ? Number(jobId) : 0;

    const apiJobQuery = useQuery({
        queryKey: ["orchestration", "components-board", jobId],
        queryFn: () => fetchJob(numericJobId),
        enabled: isNumeric,
    });

    const componentsQuery = useQuery({
        queryKey: ["job-components", numericJobId],
        queryFn: () => fetchJobComponents(numericJobId),
        enabled: isNumeric,
    });

    const boardJob = useMemo(() => {
        if (isNumeric && apiJobQuery.data) {
            const j = apiJobQuery.data;
            return {
                routeKey: String(j.id),
                breadcrumb: j.job_number ?? String(j.id),
                title: j.job_name,
            };
        }
        return null;
    }, [isNumeric, apiJobQuery.data]);

    const components: ProductionComponent[] = useMemo(() => {
        if (!componentsQuery.data || !isNumeric) return [];
        const deadline = apiJobQuery.data?.expected_completion ?? undefined;
        return componentsQuery.data.map((jc) =>
            jobComponentToProductionComponent(numericJobId, jc, deadline)
        );
    }, [componentsQuery.data, apiJobQuery.data, isNumeric, numericJobId]);

    const grouped = {
        blocked: components.filter((c) => ["DEP_BLOCKED", "SEQ_BLOCKED"].includes(c.status)),
        qcIssue: components.filter((c) => ["QC_HOLD", "QC_FAILED"].includes(c.status)),
        active:  components.filter((c) => c.status === "IN_PRODUCTION"),
        pending: components.filter((c) => c.status === "NOT_STARTED"),
        done:    components.filter((c) => ["DISPATCH_READY", "COMPLETE"].includes(c.status)),
    };

    if (!isNumeric) {
        return (
            <>
                <header className="border-b border-gray-200 bg-white px-4 lg:px-8 py-4">
                    <Link href={`${basePath}/orchestration`} className="text-sm text-gray-500 hover:text-brand-blue">← Control Tower</Link>
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

    if (isNumeric && apiJobQuery.isPending) {
        return (
            <main className="flex min-h-[50vh] flex-col items-center justify-center bg-gray-50 p-8 text-gray-400">
                <LoaderCircleIcon className="h-10 w-10 animate-spin" />
                <p className="mt-3 text-sm">Loading job…</p>
            </main>
        );
    }

    if (isNumeric && apiJobQuery.isError) {
        return (
            <>
                <header className="border-b border-gray-200 bg-white px-4 lg:px-8 py-4">
                    <Link href={`${basePath}/orchestration`} className="text-sm text-gray-500 hover:text-brand-blue">
                        ← Control Tower
                    </Link>
                </header>
                <main className="flex min-h-[50vh] flex-col items-center justify-center bg-gray-50 p-8">
                    <p className="text-sm font-semibold text-brand-red">Job not found</p>
                </main>
            </>
        );
    }

    if (!boardJob) {
        return (
            <>
                <header className="border-b border-gray-200 bg-white">
                    <div className="px-4 lg:px-8 py-4">
                        <Link
                            href={`${basePath}/orchestration`}
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-blue transition-colors"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                            Control Tower
                        </Link>
                    </div>
                </header>
                <main className="flex min-h-[60vh] flex-col items-center justify-center bg-gray-50 p-8">
                    <InboxIcon className="h-12 w-12 text-gray-200" />
                    <p className="mt-4 text-sm font-semibold text-gray-600">Job not found</p>
                    <p className="mt-1 text-center text-xs text-gray-400 max-w-sm">
                        {jobId ? `No job matches "${jobId}".` : "Missing job id in URL."}
                    </p>
                    <Link
                        href={`${basePath}/orchestration`}
                        className="mt-6 rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90"
                    >
                        Back to Control Tower
                    </Link>
                </main>
            </>
        );
    }

    const job = boardJob;

    return (
        <>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4">
                    <div className="flex items-center gap-3 mb-4">
                        <Link
                            href={`${basePath}/jobs/${job.routeKey}`}
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-blue transition-colors"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                            {job.breadcrumb}
                        </Link>
                        <span className="text-gray-300">/</span>
                        <span className="text-sm font-semibold text-gray-700">Components</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <LayoutGridIcon className="h-6 w-6 text-brand-blue" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Production Board</h1>
                                <p className="mt-0.5 text-sm text-gray-500">
                                    {job.title} · {componentsQuery.isLoading ? "…" : `${components.length} production streams`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            {Object.entries({
                                [`${grouped.blocked.length} Blocked`]: "text-brand-red",
                                [`${grouped.qcIssue.length} QC Issue`]: "text-brand-orange",
                                [`${grouped.active.length} In Production`]: "text-brand-blue",
                                [`${grouped.done.length} Done`]: "text-brand-green",
                            }).map(([label, color]) => (
                                <span key={label} className={`font-semibold ${color}`}>{label}</span>
                            )).reduce<ReactElement[]>((acc, el, i) => {
                                if (i > 0) acc.push(<span key={`sep-${i}`} className="text-gray-300">·</span>);
                                acc.push(el);
                                return acc;
                            }, [])}
                        </div>
                    </div>
                </div>
            </header>

            <main className="min-h-screen bg-gray-50 p-8">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {components.map((comp) => {
                        const sc = statusConfig[comp.status];
                        return (
                            <Link
                                key={comp.id}
                                href={`${basePath}/jobs/${comp.jobId}/components/${comp.id}`}
                                className="group relative flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm hover:border-brand-blue/40 hover:shadow-md transition-all"
                            >
                                {/* Status stripe */}
                                <div className={`h-1 w-full rounded-t-xl ${sc.bg.replace("/10", "").replace("bg-", "bg-")} ${
                                    comp.status === "DEP_BLOCKED" || comp.status === "SEQ_BLOCKED" || comp.status === "QC_FAILED" ? "bg-brand-red" :
                                    comp.status === "QC_HOLD" ? "bg-brand-orange" :
                                    comp.status === "IN_PRODUCTION" ? "bg-brand-blue" :
                                    comp.status === "DISPATCH_READY" || comp.status === "COMPLETE" ? "bg-brand-green" :
                                    "bg-gray-200"
                                }`} />

                                <div className="flex-1 p-5">
                                    {/* Header row */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-mono text-[10px] text-gray-400">{comp.id}</p>
                                            <p className="mt-0.5 text-base font-bold text-gray-900 leading-tight truncate">
                                                {comp.name}
                                            </p>
                                        </div>
                                        {/* Risk dot */}
                                        <div className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${riskDot(comp.riskLevel)}`} title={`${comp.riskLevel} risk`} />
                                    </div>

                                    {/* Tags row */}
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${sc.bg} ${sc.text} ${sc.border}`}>
                                            {sc.label}
                                        </span>
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${execModeColor(comp.execMode)}`}>
                                            {comp.execMode}
                                        </span>
                                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                                            {comp.productionType}
                                        </span>
                                    </div>

                                    {/* Info rows */}
                                    <div className="mt-4 space-y-2">
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">Vendor</span>
                                            <span className="font-semibold text-gray-700">{comp.vendor}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">Quantity</span>
                                            <span className="font-semibold text-gray-700">{comp.qty.toLocaleString()} {comp.unit}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">SLA Deadline</span>
                                            <span className={`font-bold ${new Date(comp.deadline) < new Date() ? "text-brand-red" : "text-gray-700"}`}>
                                                {formatDate(comp.deadline)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
                                    {/* PIC */}
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                                            style={{ backgroundColor: comp.picColor }}
                                        >
                                            {comp.picInitials}
                                        </div>
                                        <span className="text-xs text-gray-500">{comp.picName}</span>
                                    </div>
                                    {/* Deps indicator */}
                                    {comp.depsTotal > 0 && (
                                        <div className={`flex items-center gap-1 text-xs font-semibold ${comp.depsOpen > 0 ? "text-brand-red" : "text-brand-green"}`}>
                                            {comp.depsOpen > 0 ? (
                                                <LockIcon className="h-3.5 w-3.5" />
                                            ) : (
                                                <CheckCircleIcon className="h-3.5 w-3.5" />
                                            )}
                                            {comp.depsOpen}/{comp.depsTotal} deps
                                        </div>
                                    )}
                                </div>
                            </Link>
                        );
                    })}

                    {components.length === 0 && (
                        <div className="col-span-full py-16 text-center">
                            <PackageIcon className="mx-auto h-8 w-8 text-gray-300" />
                            <p className="mt-2 text-sm text-gray-400">No components found for this job.</p>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
