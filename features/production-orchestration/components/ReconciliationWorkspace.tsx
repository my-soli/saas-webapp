"use client";

import { type ReactElement, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React from "react";
import {
    ScaleIcon,
    FlagIcon,
    TrendingUpIcon,
    TrendingDownIcon,
    InboxIcon,
    LoaderCircleIcon,
    DownloadIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    RotateCcwIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    ShieldCheckIcon,
    SearchIcon,
    XIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
    fetchReconciliation,
    fetchOverrideLog,
    postReconciliationOverride,
    postReconciliationFlag,
    syncJobToZoho,
    pullZohoPayments,
    type ReconciliationRow,
} from "@/services/orchestration";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtKes = (n: number) => {
    if (n === 0) return "—";
    if (Math.abs(n) >= 1_000_000)
        return `KES ${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000)
        return `KES ${(n / 1_000).toFixed(0)}K`;
    return `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtFull = (n: number) =>
    `KES ${Math.abs(n).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatTs = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) +
        " · " + d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
};

const mapStatus = (row: ReconciliationRow): "CLOSED" | "MISMATCH" | "IN PROD" => {
    if (row.status === "MATCHED") return "CLOSED";
    if (row.status === "VARIANCE") return "MISMATCH";
    return "IN PROD";
};

const statusCfg = {
    CLOSED:    { label: "CLOSED",   bg: "bg-brand-green/10",  text: "text-brand-green",  dot: "bg-brand-green" },
    MISMATCH:  { label: "MISMATCH", bg: "bg-brand-red/10",    text: "text-brand-red",    dot: "bg-brand-red" },
    "IN PROD": { label: "IN PROD",  bg: "bg-brand-orange/10", text: "text-brand-orange", dot: "bg-brand-orange" },
};

// ── CSV Export ────────────────────────────────────────────────────────────────

const exportCSV = (rows: ReconciliationRow[]) => {
    const header = ["Job ID", "Job Name", "Client", "Quoted (KES)", "Production Cost (KES)", "Invoiced (KES)", "Variance (KES)", "Margin %", "Status"];
    const lines = rows.map((r) => [
        r.jobId, r.jobName, r.client,
        r.quotedRevenue, r.actualCost, r.invoicedAmount,
        r.variance, r.margin.toFixed(2),
        mapStatus(r),
    ].join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reconciliation-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function ReconciliationWorkspace(): ReactElement {
    const { data, isLoading } = useQuery({
        queryKey: ["pt-reconciliation"],
        queryFn: fetchReconciliation,
        refetchInterval: 120_000,
    });

    const overrideQuery = useQuery({
        queryKey: ["pt-override-log"],
        queryFn: fetchOverrideLog,
        refetchInterval: 120_000,
    });

    const queryClient = useQueryClient();
    const [flagged, setFlagged] = useState<Set<string>>(new Set());
    const [overridden, setOverridden] = useState<Set<string>>(new Set());
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [overrideTarget, setOverrideTarget] = useState<ReconciliationRow | null>(null);
    const [overrideReason, setOverrideReason] = useState("");
    const [search, setSearch] = useState("");

    const toggleExpand = (jobId: string) =>
        setExpanded(prev => { const n = new Set(prev); n.has(jobId) ? n.delete(jobId) : n.add(jobId); return n; });

    const [syncingJobId, setSyncingJobId] = useState<number | null>(null);
    const [syncedJobs, setSyncedJobs] = useState<Map<number, { invoiceNumber: string; zohoStatus: string; balance: number }>>(new Map());

    const zohoSyncMutation = useMutation({
        mutationFn: (jobDbId: number) => syncJobToZoho(jobDbId),
        onMutate: (jobDbId) => setSyncingJobId(jobDbId),
        onSuccess: (result, jobDbId) => {
            setSyncingJobId(null);
            setSyncedJobs(prev => new Map(prev).set(jobDbId, {
                invoiceNumber: result.zoho_invoice_number,
                zohoStatus: result.zoho_status,
                balance: result.zoho_balance,
            }));
            toast.success(result.message);
            queryClient.invalidateQueries({ queryKey: ["pt-reconciliation"] });
        },
        onError: (err: Error) => {
            setSyncingJobId(null);
            toast.error(err.message || "Zoho sync failed.");
        },
    });

    const pullPaymentsMutation = useMutation({
        mutationFn: pullZohoPayments,
        onSuccess: (result) => {
            const msg = result.payments_created > 0
                ? `${result.updated} invoices updated · ${result.payments_created} payment${result.payments_created !== 1 ? "s" : ""} auto-recorded`
                : `${result.updated} invoices updated · no new payments`;
            toast.success(msg);
            queryClient.invalidateQueries({ queryKey: ["pt-reconciliation"] });
        },
        onError: (err: Error) => toast.error(err.message || "Failed to pull payments from Zoho."),
    });

    const flagMutation = useMutation({
        mutationFn: ({ jobDbId, flagged: next }: { jobDbId: number; flagged: boolean }) =>
            postReconciliationFlag(jobDbId, next),
        onError: (err: Error) => toast.error(err.message || "Failed to update flag."),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["pt-reconciliation"] }),
    });

    const overrideMutation = useMutation({
        mutationFn: ({ jobDbId, reason }: { jobDbId: number; reason: string }) =>
            postReconciliationOverride(jobDbId, reason),
        onSuccess: (data, vars) => {
            const row = overrideTarget;
            if (row) {
                setOverridden(prev => { const n = new Set(prev); n.add(row.jobId); return n; });
                if (data?.zoho_invoice_number) {
                    setSyncedJobs(prev => new Map(prev).set(row.jobDbId, {
                        invoiceNumber: data.zoho_invoice_number!,
                        zohoStatus: data.zoho_status ?? "sent",
                        balance: data.zoho_balance ?? 0,
                    }));
                }
            }
            toast.success(data?.detail ?? "Override recorded.");
            setOverrideTarget(null);
            setOverrideReason("");
            queryClient.invalidateQueries({ queryKey: ["pt-override-log"] });
            queryClient.invalidateQueries({ queryKey: ["pt-reconciliation"] });
        },
        onError: (err: Error) => toast.error(err.message || "Failed to record override."),
    });

    const allItems: ReconciliationRow[] = useMemo(() => data?.rows ?? [], [data]);
    const reworkCostsTotal: number = data?.rework_costs_total ?? 0;

    const items = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return allItems;
        return allItems.filter((i) =>
            i.jobId.toLowerCase().includes(q) ||
            i.jobName.toLowerCase().includes(q) ||
            i.client.toLowerCase().includes(q)
        );
    }, [allItems, search]);

    const totalQuoted   = items.reduce((s, i) => s + i.quotedRevenue, 0);
    const totalCost     = items.reduce((s, i) => s + i.actualCost, 0);
    const totalInvoiced = items.reduce((s, i) => s + i.invoicedAmount, 0);
    const totalVariance = items.reduce((s, i) => s + i.variance, 0);
    const grossMargin   = totalQuoted > 0 ? ((totalQuoted - totalCost) / totalQuoted) * 100 : 0;
    const varianceCount = items.filter((i) => i.status === "VARIANCE").length;
    const flaggedCount  = items.filter((i) => i.flagged || flagged.has(i.jobId)).length;

    const mismatches = useMemo(() => items.filter((i) => i.status === "VARIANCE"), [items]);

    const toggleFlag = (row: ReconciliationRow) => {
        const currentlyFlagged = row.flagged || flagged.has(row.jobId);
        const next = !currentlyFlagged;
        setFlagged((prev) => {
            const s = new Set(prev);
            next ? s.add(row.jobId) : s.delete(row.jobId);
            return s;
        });
        flagMutation.mutate({ jobDbId: row.jobDbId, flagged: next });
    };

    const flagAllVariances = () => {
        const toFlag = items.filter((i) => i.status === "VARIANCE" && !i.flagged && !flagged.has(i.jobId));
        setFlagged((prev) => {
            const next = new Set(prev);
            toFlag.forEach((i) => next.add(i.jobId));
            return next;
        });
        toFlag.forEach((i) => flagMutation.mutate({ jobDbId: i.jobDbId, flagged: true }));
    };

    return (
        <>
            <header className="border-b border-gray-200 bg-white">
                <div className="px-4 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <ScaleIcon className="h-6 w-6 text-brand-blue" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Financial Reconciliation</h1>
                            <p className="mt-0.5 text-sm text-gray-500">
                                Quoted vs produced vs invoiced · Variance flags · Finance escalation
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {(isLoading || overrideQuery.isFetching) && (
                            <LoaderCircleIcon className="h-4 w-4 animate-spin text-gray-300" />
                        )}
                        <button
                            onClick={() => exportCSV(items)}
                            disabled={items.length === 0}
                            className="flex items-center gap-2 rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:border-brand-blue hover:text-brand-blue transition-colors disabled:opacity-40"
                        >
                            <DownloadIcon className="h-4 w-4" />
                            Export Report
                        </button>
                        <button
                            onClick={() => pullPaymentsMutation.mutate()}
                            disabled={pullPaymentsMutation.isPending}
                            className="flex items-center gap-2 rounded-md border border-brand-green/40 px-4 py-2 text-sm font-semibold text-brand-green hover:bg-brand-green/10 transition-colors disabled:opacity-40"
                        >
                            {pullPaymentsMutation.isPending
                                ? <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                                : <RotateCcwIcon className="h-4 w-4" />
                            }
                            Pull Payments from Zoho
                        </button>
                        <button
                            onClick={flagAllVariances}
                            disabled={varianceCount === 0}
                            className="flex items-center gap-2 rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-brand-red/90 transition-colors disabled:opacity-40"
                        >
                            <FlagIcon className="h-4 w-4" />
                            Flag All Mismatches
                        </button>
                    </div>
                </div>
                <div className="px-4 lg:px-8 pb-4">
                    <div className="relative max-w-md">
                        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by job name, job ID, or client…"
                            className="w-full rounded-md border border-gray-200 py-2 pl-9 pr-9 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                aria-label="Clear search"
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                            >
                                <XIcon className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="min-h-screen bg-gray-50 p-8 space-y-6">

                {/* KPI strip */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                    <article className="relative overflow-hidden rounded-xl border border-brand-blue/20 bg-white px-5 py-4 shadow-sm">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-brand-blue" />
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Quoted</p>
                        <p className="mt-2 text-2xl font-extrabold text-gray-900">{fmtKes(totalQuoted)}</p>
                        <p className="mt-1 text-xs text-gray-400">Across {items.length} jobs</p>
                    </article>
                    <article className="relative overflow-hidden rounded-xl border border-brand-orange/20 bg-white px-5 py-4 shadow-sm">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-brand-orange" />
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Production Cost</p>
                        <p className="mt-2 text-2xl font-extrabold text-gray-900">{fmtKes(totalCost)}</p>
                        <p className="mt-1 text-xs text-gray-400">PT production cost</p>
                    </article>
                    <article className={`relative overflow-hidden rounded-xl border bg-white px-5 py-4 shadow-sm ${totalVariance < 0 ? "border-brand-red/20" : "border-brand-green/20"}`}>
                        <div className={`absolute top-0 left-0 right-0 h-1 ${totalVariance < 0 ? "bg-brand-red" : "bg-brand-green"}`} />
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Net Variance</p>
                        <div className="mt-2 flex items-center gap-2">
                            <p className={`text-2xl font-extrabold ${totalVariance < 0 ? "text-brand-red" : "text-brand-green"}`}>
                                {totalVariance < 0 ? `−${fmtKes(Math.abs(totalVariance))}` : fmtKes(totalVariance)}
                            </p>
                            {totalVariance < 0
                                ? <TrendingDownIcon className="h-5 w-5 text-brand-red" />
                                : <TrendingUpIcon className="h-5 w-5 text-brand-green" />
                            }
                        </div>
                        <p className="mt-1 text-xs text-gray-400">{grossMargin.toFixed(1)}% gross margin</p>
                    </article>
                    <article className={`relative overflow-hidden rounded-xl border bg-white px-5 py-4 shadow-sm ${reworkCostsTotal > 0 ? "border-brand-red/20" : "border-gray-100"}`}>
                        <div className={`absolute top-0 left-0 right-0 h-1 ${reworkCostsTotal > 0 ? "bg-brand-red" : "bg-gray-300"}`} />
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Rework Costs</p>
                        <p className={`mt-2 text-2xl font-extrabold ${reworkCostsTotal > 0 ? "text-brand-red" : "text-gray-400"}`}>
                            {reworkCostsTotal > 0 ? fmtKes(reworkCostsTotal) : "—"}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">Production cost overruns</p>
                    </article>
                    <article className={`relative overflow-hidden rounded-xl border bg-white px-5 py-4 shadow-sm ${varianceCount > 0 ? "border-brand-red/20" : "border-gray-100"}`}>
                        <div className={`absolute top-0 left-0 right-0 h-1 ${varianceCount > 0 ? "bg-brand-red" : "bg-gray-300"}`} />
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Variance Flags</p>
                        <p className={`mt-2 text-2xl font-extrabold ${varianceCount > 0 ? "text-brand-red" : "text-gray-400"}`}>
                            {varianceCount}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">{flaggedCount > 0 ? `${flaggedCount} flagged for Finance` : "No active flags"}</p>
                    </article>
                </div>

                {/* Mismatch alerts */}
                {mismatches.length > 0 && (
                    <div className="space-y-2">
                        {mismatches.map((r) => (
                            <div key={r.jobId} className="flex items-start gap-3 rounded-xl border border-brand-red/20 bg-brand-red/5 px-5 py-3">
                                <XCircleIcon className="h-4 w-4 text-brand-red shrink-0 mt-0.5" />
                                <p className="text-sm text-brand-red">
                                    <strong>Cost overrun:</strong> {r.jobName} ({r.jobId}) — quoted{" "}
                                    <span className="font-mono">{fmtFull(r.quotedRevenue)}</span>, production cost{" "}
                                    <span className="font-mono">{fmtFull(r.actualCost)}</span>{" "}
                                    (over by <span className="font-mono">{fmtFull(r.actualCost - r.quotedRevenue)}</span>). Adjustment or override required before financial closure.
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Job Reconciliation Matrix */}
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                        <div className="flex items-center gap-2">
                            <ScaleIcon className="h-4 w-4 text-brand-blue" />
                            <span className="text-sm font-bold text-gray-800">Job Reconciliation Matrix</span>
                        </div>
                        {flaggedCount > 0 && (
                            <span className="rounded-full bg-brand-red/10 px-2.5 py-0.5 text-xs font-bold text-brand-red">
                                {flaggedCount} FLAGGED FOR FINANCE
                            </span>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <LoaderCircleIcon className="h-8 w-8 animate-spin text-gray-300" />
                            <p className="mt-3 text-sm text-gray-400">Loading reconciliation data…</p>
                        </div>
                    ) : allItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <InboxIcon className="h-10 w-10 text-gray-200" />
                            <p className="mt-3 text-sm font-semibold text-gray-400">No reconciliation data</p>
                            <p className="mt-1 text-xs text-gray-300 text-center px-4 lg:px-8">
                                Jobs assigned to you with PT-costed quotes will appear here.
                            </p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <SearchIcon className="h-10 w-10 text-gray-200" />
                            <p className="mt-3 text-sm font-semibold text-gray-400">No jobs match &quot;{search}&quot;</p>
                            <p className="mt-1 text-xs text-gray-300 text-center px-4 lg:px-8">
                                Try a different job name, ID, or client.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50">
                                        <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Job</th>
                                        <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Quoted</th>
                                        <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Production Cost</th>
                                        <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Invoiced</th>
                                        <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Margin</th>
                                        <th className="px-5 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
                                        <th className="px-5 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">Finance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {items.map((row) => {
                                        const displayStatus = mapStatus(row);
                                        const sc = statusCfg[displayStatus];
                                        const isFlagged = row.flagged || flagged.has(row.jobId);
                                        const isExpanded = expanded.has(row.jobId);
                                        const hasComponents = (row.components ?? []).length > 0;
                                        const quoteVsProdMatch = row.actualCost === 0 || Math.abs(row.quotedRevenue - row.actualCost) < 0.01;
                                        const prodVsInvMatch  = row.invoicedAmount === 0 || Math.abs(row.actualCost - row.invoicedAmount) < 0.01;
                                        return (
                                            <React.Fragment key={row.jobId}>
                                                <tr className={`transition-colors ${isFlagged ? "bg-brand-red/[0.03]" : isExpanded ? "bg-blue-50/40" : "hover:bg-gray-50"}`}>
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-start gap-2">
                                                            <button
                                                                onClick={() => hasComponents && toggleExpand(row.jobId)}
                                                                className={`mt-0.5 shrink-0 transition-colors ${hasComponents ? "text-brand-blue hover:text-brand-blue/70 cursor-pointer" : "text-gray-200 cursor-default"}`}
                                                                title={hasComponents ? "Show component breakdown" : "No cost entries yet"}
                                                            >
                                                                {isExpanded
                                                                    ? <ChevronDownIcon className="h-4 w-4" />
                                                                    : <ChevronRightIcon className="h-4 w-4" />
                                                                }
                                                            </button>
                                                            <div>
                                                                <p className="font-semibold text-gray-800">{row.jobName}</p>
                                                                <p className="text-xs text-gray-400 font-mono">{row.jobId} · {row.client}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        <span className="font-semibold text-brand-green">{fmtFull(row.quotedRevenue)}</span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        {row.actualCost === 0
                                                            ? <span className="text-gray-300 italic text-xs">Not costed</span>
                                                            : <span className={`font-semibold ${quoteVsProdMatch ? "text-brand-green" : "text-brand-red"}`}>
                                                                {fmtFull(row.actualCost)}
                                                              </span>
                                                        }
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        {row.invoicedAmount === 0
                                                            ? <span className="text-gray-300 italic text-xs">—</span>
                                                            : <span className={`font-semibold ${prodVsInvMatch ? "text-brand-green" : "text-brand-orange"}`}>
                                                                {fmtFull(row.invoicedAmount)}
                                                              </span>
                                                        }
                                                    </td>
                                                    <td className={`px-5 py-3.5 text-right font-bold ${
                                                        row.actualCost === 0 ? "text-gray-300" :
                                                        row.margin < 35 ? "text-brand-red" : "text-brand-green"
                                                    }`}>
                                                        {row.actualCost === 0 ? "—" : `${row.margin.toFixed(1)}%`}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${sc.bg} ${sc.text}`}>
                                                            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                                                            {sc.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-center">
                                                        <div className="flex items-center justify-center gap-2 flex-wrap">
                                                            {/* Zoho sync */}
                                                            {(() => {
                                                                const localSync = syncedJobs.get(row.jobDbId);
                                                                const synced = row.zohoSynced || !!localSync;
                                                                const invNum = localSync?.invoiceNumber ?? row.zohoInvoiceNumber;
                                                                const zStatus = localSync?.zohoStatus ?? row.zohoStatus;
                                                                const isSyncing = syncingJobId === row.jobDbId;
                                                                if (synced && invNum) {
                                                                    return (
                                                                        <div className="flex flex-col items-center gap-0.5">
                                                                            <span className="text-[10px] font-bold text-brand-green">{invNum}</span>
                                                                            {zStatus && (
                                                                                <span className="text-[9px] uppercase tracking-wider text-gray-400">{zStatus}</span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                }
                                                                return (
                                                                    <button
                                                                        onClick={() => zohoSyncMutation.mutate(row.jobDbId)}
                                                                        disabled={isSyncing || (!row.hasLpo && !row.overridden && !syncedJobs.has(row.jobDbId))}
                                                                        title={(!row.hasLpo && !row.overridden) ? "No LPO — use Override first" : "Sync to Zoho Books"}
                                                                        className="flex items-center gap-1 rounded-md border border-brand-green/40 px-2.5 py-1.5 text-[10px] font-bold text-brand-green hover:bg-brand-green/10 transition-colors disabled:opacity-40"
                                                                    >
                                                                        {isSyncing
                                                                            ? <LoaderCircleIcon className="h-3 w-3 animate-spin" />
                                                                            : <CheckCircleIcon className="h-3 w-3" />
                                                                        }
                                                                        {isSyncing ? "Syncing…" : "Zoho"}
                                                                    </button>
                                                                );
                                                            })()}
                                                            <button
                                                                onClick={() => toggleFlag(row)}
                                                                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                                                                    isFlagged
                                                                        ? "bg-brand-red text-white hover:bg-brand-red/90"
                                                                        : row.status === "VARIANCE"
                                                                            ? "border border-brand-red/40 text-brand-red hover:bg-brand-red/10"
                                                                            : "border border-gray-200 text-gray-400 hover:border-gray-300"
                                                                }`}
                                                            >
                                                                {isFlagged ? "Flagged ✓" : "Flag"}
                                                            </button>
                                                            {row.status === "VARIANCE" && !row.overridden && !overridden.has(row.jobId) && (
                                                                <button
                                                                    onClick={() => { setOverrideTarget(row); setOverrideReason(""); }}
                                                                    className="flex items-center gap-1 rounded-md border border-brand-blue/40 px-3 py-1.5 text-xs font-semibold text-brand-blue hover:bg-brand-blue/10 transition-colors"
                                                                    title="Override this mismatch with a reason"
                                                                >
                                                                    <ShieldCheckIcon className="h-3 w-3" />
                                                                    Override
                                                                </button>
                                                            )}
                                                            {overridden.has(row.jobId) && (
                                                                <span className="text-[10px] font-bold text-brand-green">OVERRIDDEN</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* ── Component breakdown rows ── */}
                                                {isExpanded && (row.components ?? []).map((comp) => {
                                                    const compVariance = comp.total > 0 ? comp.quotedAmount - comp.total : null;
                                                    return (
                                                        <tr key={`${row.jobId}-comp-${comp.componentId}`} className="bg-blue-50/20 border-l-4 border-brand-blue/20">
                                                            <td className="py-2.5 pl-14 pr-5">
                                                                <p className="text-xs font-semibold text-gray-700">{comp.name}</p>
                                                                <p className="text-[10px] text-gray-400">{comp.quantity} {comp.unit}</p>
                                                                {comp.items.length > 0 && (
                                                                    <div className="mt-1.5 space-y-0.5">
                                                                        {comp.items.map((item, i) => (
                                                                            <p key={i} className="text-[10px] text-gray-500 flex justify-between max-w-xs">
                                                                                <span>{item.service_name}</span>
                                                                                <span className="font-mono ml-4">KES {Number(item.cost).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
                                                                            </p>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            {/* Quoted per component */}
                                                            <td className="px-5 py-2.5 text-right">
                                                                {comp.quotedAmount > 0
                                                                    ? <span className="text-xs font-semibold text-brand-green">{fmtFull(comp.quotedAmount)}</span>
                                                                    : <span className="text-[10px] italic text-gray-300">—</span>
                                                                }
                                                            </td>
                                                            {/* PT cost per component */}
                                                            <td className="px-5 py-2.5 text-right">
                                                                {comp.total > 0
                                                                    ? <span className={`text-xs font-semibold ${compVariance !== null && compVariance < 0 ? "text-brand-red" : "text-brand-blue"}`}>
                                                                        {fmtFull(comp.total)}
                                                                      </span>
                                                                    : <span className="text-[10px] italic text-gray-300">Not costed</span>
                                                                }
                                                            </td>
                                                            {/* Variance indicator */}
                                                            <td className="px-5 py-2.5 text-right">
                                                                {compVariance !== null
                                                                    ? <span className={`text-[10px] font-semibold ${compVariance < 0 ? "text-brand-red" : "text-brand-green"}`}>
                                                                        {compVariance < 0 ? `−${fmtFull(Math.abs(compVariance))}` : `+${fmtFull(compVariance)}`}
                                                                      </span>
                                                                    : null
                                                                }
                                                            </td>
                                                            <td colSpan={3} />
                                                        </tr>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                                        <td className="px-5 py-3 font-bold text-gray-800 text-sm">Totals</td>
                                        <td className="px-5 py-3 text-right font-bold text-gray-800 text-sm">{fmtFull(totalQuoted)}</td>
                                        <td className="px-5 py-3 text-right font-bold text-gray-800 text-sm">{fmtFull(totalCost)}</td>
                                        <td className="px-5 py-3 text-right font-bold text-gray-800 text-sm">{totalInvoiced > 0 ? fmtFull(totalInvoiced) : "—"}</td>
                                        <td className={`px-5 py-3 text-right font-bold text-sm ${grossMargin < 35 ? "text-brand-red" : "text-brand-green"}`}>
                                            {grossMargin.toFixed(1)}%
                                        </td>
                                        <td colSpan={2} />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>

                {/* Override / Audit Log */}
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3.5">
                        <RotateCcwIcon className="h-4 w-4 text-brand-orange" />
                        <span className="text-sm font-bold text-gray-800">Override Log</span>
                        <span className="ml-1 text-xs text-gray-400">— Recent job, quote &amp; invoice updates</span>
                    </div>

                    {overrideQuery.isLoading ? (
                        <div className="flex items-center gap-2 px-5 py-6 text-sm text-gray-400">
                            <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                            Loading audit entries…
                        </div>
                    ) : (overrideQuery.data ?? []).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10">
                            <CheckCircleIcon className="h-8 w-8 text-gray-200" />
                            <p className="mt-2 text-sm text-gray-400">No override events recorded</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {(overrideQuery.data ?? []).map((entry) => (
                                <div key={entry.id} className="px-5 py-3.5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 leading-snug">{entry.title}</p>
                                            {entry.details && (
                                                <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{entry.details}</p>
                                            )}
                                            <p className="mt-1 text-xs text-gray-400 font-mono">
                                                {entry.action} on {entry.model} · by {entry.overriddenBy}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0 text-xs text-gray-400">
                                            <ClockIcon className="h-3 w-3" />
                                            {formatTs(entry.timestamp)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </main>

            {/* Override reason modal */}
            {overrideTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-2xl">
                        <div className="border-b border-gray-100 px-6 py-4">
                            <h3 className="text-base font-bold text-gray-900">Override Reconciliation Mismatch</h3>
                            <p className="mt-0.5 text-sm text-gray-500">
                                Job: <span className="font-semibold">{overrideTarget.jobName}</span> ({overrideTarget.jobId})
                            </p>
                        </div>
                        <div className="p-6">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                                Reason for override <span className="text-brand-red">*</span>
                            </label>
                            <textarea
                                value={overrideReason}
                                onChange={(e) => setOverrideReason(e.target.value)}
                                rows={4}
                                placeholder="e.g., Client approved revised pricing, production cost covers partial scope only..."
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none resize-none"
                                autoFocus
                            />
                        </div>
                        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                            <button
                                onClick={() => setOverrideTarget(null)}
                                className="rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => overrideMutation.mutate({ jobDbId: overrideTarget.jobDbId, reason: overrideReason })}
                                disabled={!overrideReason.trim() || overrideMutation.isPending}
                                className="flex items-center gap-2 rounded-md bg-brand-blue px-5 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-40"
                            >
                                {overrideMutation.isPending ? <LoaderCircleIcon className="h-4 w-4 animate-spin" /> : <ShieldCheckIcon className="h-4 w-4" />}
                                Record Override
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
