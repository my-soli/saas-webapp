"use client";

import { type ReactElement, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    LockIcon,
    XCircleIcon,
    ClockIcon,
    BuildingIcon,
    ZapIcon,
    CheckCircleIcon,
    BriefcaseIcon,
    InboxIcon,
    LoaderCircleIcon,
    BellIcon,
} from "lucide-react";
import { fetchJobs } from "@/services/jobs";
import { getCurrentUser } from "@/services/users";
import { fetchControlTowerStats, resolveDependency } from "@/services/orchestration";
import type { Job } from "@/types/jobs";
import {
    apiJobStatusBadgeClass,
    apiJobStatusLabel,
    apiProgressPct,
    apiRiskLevel,
    apiUserLabel,
} from "../lib/api-job-helpers";

type Tab = "overview" | "jobs";

const riskColor = (level: string) => {
    if (level === "HIGH") return "bg-brand-red/10 text-brand-red";
    if (level === "MEDIUM") return "bg-brand-orange/10 text-brand-orange";
    return "bg-brand-green/10 text-brand-green";
};

const BLOCK_TYPE_LABEL: Record<string, string> = {
    sequential:       "SEQ",
    artwork_approval: "ART",
    client_approval:  "CLIENT",
    financial:        "FIN",
    material_arrival: "MATL",
    dispatch:         "DISP",
};
const BLOCK_TYPE_COLOR: Record<string, string> = {
    sequential:       "bg-gray-100 text-gray-500",
    artwork_approval: "bg-brand-orange/10 text-brand-orange",
    client_approval:  "bg-brand-blue/10 text-brand-blue",
    financial:        "bg-brand-red/10 text-brand-red",
    material_arrival: "bg-brand-yellow/10 text-[#b45309]",
    dispatch:         "bg-gray-100 text-gray-500",
};

const VENDOR_CAP_COLOR = {
    available: { bar: "bg-brand-green",  label: "bg-brand-green/10  text-brand-green"  },
    busy:      { bar: "bg-brand-orange", label: "bg-brand-orange/10 text-brand-orange" },
    critical:  { bar: "bg-brand-red",    label: "bg-brand-red/10   text-brand-red"    },
};

const formatDeadline = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function JobsTable({ jobs, onNavigate, muted = false }: { jobs: Job[]; onNavigate: (id: number) => void; muted?: boolean }): ReactElement {
    return (
        <table className="w-full text-sm">
            <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Job ID</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Job Name</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Client</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Lead (PIC)</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Progress</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Deadline</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Risk</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {jobs.map((job) => {
                    const pct = Math.round(apiProgressPct(job));
                    const risk = apiRiskLevel(job);
                    const deadline = formatDeadline(job.expected_completion);
                    return (
                        <tr
                            key={job.id}
                            className={`cursor-pointer hover:bg-gray-50 transition-colors ${muted ? "opacity-60" : ""}`}
                            onClick={() => onNavigate(job.id)}
                        >
                            <td className="px-4 py-3 font-mono text-xs text-gray-500">
                                {job.job_number ?? `#${job.id}`}
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-800">{job.job_name}</td>
                            <td className="px-4 py-3 text-gray-500">{job.client?.name ?? "—"}</td>
                            <td className="px-4 py-3 text-gray-500">{apiUserLabel(job.person_in_charge)}</td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">
                                        <div
                                            className="h-full rounded-full bg-brand-blue transition-all"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-gray-400">{pct}%</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">{deadline}</td>
                            <td className="px-4 py-3">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${riskColor(risk)}`}>
                                    {risk}
                                </span>
                            </td>
                            <td className="px-4 py-3">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${apiJobStatusBadgeClass(job.status)}`}>
                                    {apiJobStatusLabel(job.status)}
                                </span>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

export default function OrchestrationControlTowerWorkspace({ basePath = "/production-team" }: { basePath?: string } = {}): ReactElement {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<Tab>("overview");

    const currentUserQuery = useQuery({
        queryKey: ["orchestration", "current-user"],
        queryFn: getCurrentUser,
        staleTime: 5 * 60 * 1000,
    });
    const myUserId = currentUserQuery.data?.id;

    const myJobsParams = useMemo(
        () => ({
            page: 1,
            pageSize: 100,
            search: "",
            status: "all" as const,
            personInCharge: myUserId,
        }),
        [myUserId]
    );

    const myJobsQuery = useQuery({
        queryKey: ["orchestration", "my-master-jobs", myJobsParams],
        queryFn: () => fetchJobs(myJobsParams),
        enabled: typeof myUserId === "number" && myUserId > 0,
    });

    const ctStatsQuery = useQuery({
        queryKey: ["orchestration", "control-tower-stats"],
        queryFn: fetchControlTowerStats,
        refetchInterval: 60_000,
    });

    const myJobs: Job[] = myJobsQuery.data?.results ?? [];
    const myJobsCount = myJobsQuery.data?.count ?? myJobs.length;
    const activeJobs = myJobs.filter((j) => j.status !== "completed");
    const completedJobs = myJobs.filter((j) => j.status === "completed");

    const ctStats = ctStatsQuery.data;
    const blockedComponents = ctStats?.blocked_components ?? [];
    const qcHoldComponents = ctStats?.qc_hold_components ?? [];
    const openDependencies = ctStats?.open_dependencies ?? [];
    const pendingApprovals = ctStats?.pending_approvals ?? [];
    const vendorCapacity   = ctStats?.vendor_capacity ?? [];

    const resolveApprovalMut = useMutation({
        mutationFn: (depId: number) => resolveDependency(depId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orchestration", "control-tower-stats"] }),
    });

    const showOverviewBody =
        myJobsCount > 0 ||
        (ctStats?.blocked_count ?? 0) > 0 ||
        (ctStats?.qc_failures_count ?? 0) > 0 ||
        openDependencies.length > 0 ||
        pendingApprovals.length > 0 ||
        vendorCapacity.length > 0;

    const tabs: { key: Tab; label: string; icon: ReactElement }[] = [
        { key: "overview", label: "Live Overview", icon: <ZapIcon className="h-4 w-4" /> },
        { key: "jobs",     label: "Master Jobs",   icon: <BriefcaseIcon className="h-4 w-4" /> },
    ];

    return (
        <>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ZapIcon className="h-6 w-6 text-brand-red" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Control Tower</h1>
                                <p className="mt-0.5 text-sm text-gray-500">
                                    Live orchestration overview — all active jobs and alerts
                                </p>
                            </div>
                        </div>
                        {ctStatsQuery.isFetching && (
                            <LoaderCircleIcon className="h-4 w-4 animate-spin text-gray-300" />
                        )}
                    </div>

                    <div className="mt-4 flex gap-1 border-b border-gray-100 -mb-px">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                                    activeTab === tab.key
                                        ? "border-brand-blue text-brand-blue"
                                        : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                                {tab.key === "jobs" && myJobsCount > 0 && (
                                    <span className="ml-1 rounded-full bg-gray-100 px-1.5 py-0 text-[10px] font-bold text-gray-500">
                                        {myJobsCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="min-h-screen bg-gray-50 p-8 space-y-6">

                {/* ── LIVE OVERVIEW TAB ── */}
                {activeTab === "overview" && (
                    <>
                        {/* KPI Stat Row */}
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <article className="relative overflow-hidden rounded-xl border border-brand-red/20 bg-white px-5 py-4 shadow-sm">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-brand-red" />
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Blocked Components</p>
                                <p className="mt-2 text-4xl font-extrabold text-gray-900">
                                    {ctStatsQuery.isLoading ? "—" : (ctStats?.blocked_count ?? 0)}
                                </p>
                                <p className="mt-1 text-xs text-gray-400">Require immediate action</p>
                            </article>
                            <article className="relative overflow-hidden rounded-xl border border-brand-orange/20 bg-white px-5 py-4 shadow-sm">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-brand-orange" />
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">QC Hold</p>
                                <p className="mt-2 text-4xl font-extrabold text-gray-900">
                                    {ctStatsQuery.isLoading ? "—" : (ctStats?.qc_failures_count ?? 0)}
                                </p>
                                <p className="mt-1 text-xs text-gray-400">Awaiting QC sign-off</p>
                            </article>
                            <article className="relative overflow-hidden rounded-xl border border-brand-blue/20 bg-white px-5 py-4 shadow-sm">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-brand-blue" />
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active Jobs</p>
                                <p className="mt-2 text-4xl font-extrabold text-gray-900">
                                    {ctStatsQuery.isLoading ? "—" : (ctStats?.active_jobs_count ?? 0)}
                                </p>
                                <p className="mt-1 text-xs text-gray-400">Pending + in production</p>
                            </article>
                            <article className="relative overflow-hidden rounded-xl border border-brand-yellow/20 bg-white px-5 py-4 shadow-sm">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-brand-yellow" />
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Vendor Pending</p>
                                <p className="mt-2 text-4xl font-extrabold text-gray-900">
                                    {ctStatsQuery.isLoading ? "—" : (ctStats?.vendor_pending_count ?? 0)}
                                </p>
                                <p className="mt-1 text-xs text-gray-400">Awaiting confirmation</p>
                            </article>
                        </div>

                        {ctStatsQuery.isLoading ? (
                            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-20">
                                <LoaderCircleIcon className="h-8 w-8 animate-spin text-gray-300" />
                                <p className="mt-3 text-sm text-gray-400">Loading live data…</p>
                            </div>
                        ) : !showOverviewBody ? (
                            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-20">
                                <InboxIcon className="h-10 w-10 text-gray-200" />
                                <p className="mt-3 text-sm font-semibold text-gray-400">No active alerts</p>
                                <p className="mt-1 text-xs text-gray-300 text-center max-w-md">
                                    When jobs have blocked components or QC holds, they appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                                {/* Left column */}
                                <div className="space-y-6">

                                    {/* Blocked Components */}
                                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                <LockIcon className="h-4 w-4 text-brand-red" />
                                                <span className="text-sm font-semibold text-gray-800">Blocked Components</span>
                                            </div>
                                            <span className="rounded-full bg-brand-red/10 px-2 py-0.5 text-xs font-bold text-brand-red">
                                                {blockedComponents.length} BLOCKED
                                            </span>
                                        </div>
                                        <div className="divide-y divide-gray-50 p-3">
                                            {blockedComponents.map((c) => (
                                                <Link
                                                    key={c.id}
                                                    href={`${basePath}/jobs/${c.job_id}/components/${c.id}`}
                                                    className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50"
                                                >
                                                    <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-gray-800 truncate">
                                                            {c.product_name} — {c.job_name}
                                                        </p>
                                                        <div className="mt-1 flex items-center flex-wrap gap-1">
                                                            {(c.block_types ?? []).map((bt) => (
                                                                <span
                                                                    key={bt}
                                                                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${BLOCK_TYPE_COLOR[bt] ?? "bg-gray-100 text-gray-500"}`}
                                                                >
                                                                    {BLOCK_TYPE_LABEL[bt] ?? bt.toUpperCase()} BLOCK
                                                                </span>
                                                            ))}
                                                            <span className="text-xs text-gray-400">
                                                                {c.deps_open} dep{c.deps_open !== 1 ? "s" : ""} · SLA {formatDeadline(c.sla_deadline)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="shrink-0 rounded-full bg-brand-red/10 px-2 py-0.5 text-[10px] font-bold text-brand-red">
                                                        BLOCKED
                                                    </span>
                                                </Link>
                                            ))}
                                            {blockedComponents.length === 0 && (
                                                <div className="flex items-center gap-2 p-3 text-sm text-brand-green">
                                                    <CheckCircleIcon className="h-4 w-4" />
                                                    No blocked components
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* QC Hold */}
                                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                <XCircleIcon className="h-4 w-4 text-brand-orange" />
                                                <span className="text-sm font-semibold text-gray-800">QC Hold</span>
                                            </div>
                                            <span className="rounded-full bg-brand-orange/10 px-2 py-0.5 text-xs font-bold text-brand-orange">
                                                {qcHoldComponents.length} ON HOLD
                                            </span>
                                        </div>
                                        <div className="divide-y divide-gray-50 p-3">
                                            {qcHoldComponents.map((c) => (
                                                <div key={c.id} className="flex items-start gap-3 rounded-lg p-3">
                                                    <XCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-gray-800 truncate">
                                                            {c.product_name} — {c.job_name}
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-gray-500">Vendor: {c.vendor_name ?? "—"}</p>
                                                    </div>
                                                    <Link
                                                        href={`${basePath}/jobs/${c.job_id}/components/${c.id}`}
                                                        className="shrink-0 rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:border-brand-blue hover:text-brand-blue transition-colors"
                                                    >
                                                        View
                                                    </Link>
                                                </div>
                                            ))}
                                            {qcHoldComponents.length === 0 && (
                                                <div className="flex items-center gap-2 p-3 text-sm text-brand-green">
                                                    <CheckCircleIcon className="h-4 w-4" />
                                                    No QC holds — all clear
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right column */}
                                <div className="space-y-6">

                                    {/* Open Dependencies */}
                                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                                        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
                                            <ClockIcon className="h-4 w-4 text-brand-blue" />
                                            <span className="text-sm font-semibold text-gray-800">Open Dependencies</span>
                                            {openDependencies.length > 0 && (
                                                <span className="ml-auto rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs font-bold text-brand-blue">
                                                    {openDependencies.length}
                                                </span>
                                            )}
                                        </div>
                                        <div className="divide-y divide-gray-50 p-3">
                                            {openDependencies.map((dep) => (
                                                <Link
                                                    key={dep.id}
                                                    href={`${basePath}/jobs/${dep.job_id}/components/${dep.component_id}`}
                                                    className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-gray-50"
                                                >
                                                    <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-gray-800 truncate">
                                                            {dep.description}
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-gray-500">
                                                            {dep.component_name} · {dep.job_name} · {dep.dependency_type}
                                                        </p>
                                                    </div>
                                                    {dep.due_by && (
                                                        <span className="shrink-0 text-[10px] text-gray-400">
                                                            Due {formatDeadline(dep.due_by)}
                                                        </span>
                                                    )}
                                                </Link>
                                            ))}
                                            {openDependencies.length === 0 && (
                                                <div className="flex items-center gap-2 p-3 text-sm text-brand-green">
                                                    <CheckCircleIcon className="h-4 w-4" />
                                                    No open dependencies
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Vendor Capacity */}
                                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                                        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
                                            <BuildingIcon className="h-4 w-4 text-gray-500" />
                                            <span className="text-sm font-semibold text-gray-800">Vendor Capacity</span>
                                            {vendorCapacity.length > 0 && (
                                                <span className="ml-auto text-xs text-gray-400">{vendorCapacity.length} vendor{vendorCapacity.length !== 1 ? "s" : ""}</span>
                                            )}
                                        </div>
                                        {vendorCapacity.length === 0 ? (
                                            <div className="p-6 text-center">
                                                <BuildingIcon className="mx-auto h-6 w-6 text-gray-200" />
                                                <p className="mt-2 text-sm text-gray-400">No active external components</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-gray-50 p-3">
                                                {vendorCapacity.map((v) => {
                                                    const cfg = VENDOR_CAP_COLOR[v.status];
                                                    const barWidth = Math.min(v.utilization_pct, 100);
                                                    return (
                                                        <div key={v.id} className="px-2 py-3">
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <p className="text-sm font-semibold text-gray-800 truncate max-w-[160px]">{v.name}</p>
                                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.label}`}>
                                                                    {v.status.toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all ${cfg.bar}`}
                                                                        style={{ width: `${barWidth}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs text-gray-500 tabular-nums shrink-0">
                                                                    {v.active_jobs}/{v.max_capacity}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Pending Approvals */}
                                    {pendingApprovals.length > 0 && (
                                        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                                            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
                                                <BellIcon className="h-4 w-4 text-brand-blue" />
                                                <span className="text-sm font-semibold text-gray-800">Pending Approvals</span>
                                                <span className="ml-auto rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs font-bold text-brand-blue">
                                                    {pendingApprovals.length}
                                                </span>
                                            </div>
                                            <div className="divide-y divide-gray-50 p-3">
                                                {pendingApprovals.map((ap) => (
                                                    <div key={ap.id} className="flex items-start gap-3 rounded-lg p-3">
                                                        <BellIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-gray-800 truncate">{ap.title}</p>
                                                            <p className="mt-0.5 text-xs text-gray-500">
                                                                {ap.dependency_type.replace(/_/g, " ")}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => resolveApprovalMut.mutate(ap.id)}
                                                            disabled={resolveApprovalMut.isPending}
                                                            className="shrink-0 rounded border border-brand-blue/30 px-2.5 py-1 text-xs font-semibold text-brand-blue hover:bg-brand-blue/5 transition-colors disabled:opacity-40"
                                                        >
                                                            {ap.action_label}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ── MASTER JOBS TAB ── */}
                {activeTab === "jobs" && (
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                            <div>
                                <span className="text-sm font-semibold text-gray-800">Master Jobs</span>
                                <p className="text-xs text-gray-400 mt-0.5">Jobs where you are set as production lead (PIC)</p>
                            </div>
                            <span className="text-xs text-gray-400">{myJobsCount} assigned</span>
                        </div>

                        {currentUserQuery.isLoading || (typeof myUserId === "number" && myUserId > 0 && myJobsQuery.isPending) ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <LoaderCircleIcon className="h-8 w-8 animate-spin" />
                                <p className="mt-2 text-sm">Loading your jobs…</p>
                            </div>
                        ) : currentUserQuery.isError ? (
                            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                                <p className="text-sm text-brand-red font-semibold">Could not load your session</p>
                                <p className="mt-1 text-xs text-gray-400">Sign in again, then reopen Control Tower.</p>
                            </div>
                        ) : myJobsQuery.isError ? (
                            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                                <p className="text-sm text-brand-red font-semibold">Could not load jobs</p>
                                <p className="mt-1 text-xs text-gray-400">Check your connection and API permissions.</p>
                            </div>
                        ) : myJobs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <InboxIcon className="h-10 w-10 text-gray-200" />
                                <p className="mt-3 text-sm font-semibold text-gray-400">No jobs assigned to you yet</p>
                                <p className="mt-1 text-xs text-gray-300 text-center max-w-md">
                                    Ask Account Management to assign a job to your user from the quote/job flow.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Active jobs */}
                                {activeJobs.length > 0 && (
                                    <div className="overflow-x-auto">
                                        <JobsTable jobs={activeJobs} onNavigate={(id) => router.push(`${basePath}/jobs/${id}`)} />
                                    </div>
                                )}

                                {/* Completed jobs */}
                                {completedJobs.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 border-t border-gray-100 px-5 py-3 bg-gray-50">
                                            <CheckCircleIcon className="h-4 w-4 text-brand-green" />
                                            <span className="text-sm font-semibold text-gray-600">Completed</span>
                                            <span className="rounded-full bg-brand-green/10 px-2 py-0.5 text-[10px] font-bold text-brand-green">
                                                {completedJobs.length}
                                            </span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <JobsTable jobs={completedJobs} onNavigate={(id) => router.push(`${basePath}/jobs/${id}`)} muted />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </main>
        </>
    );
}
