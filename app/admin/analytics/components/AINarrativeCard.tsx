"use client";

import { useState } from "react";
import {
    SparklesIcon,
    RefreshCwIcon,
    AlertCircleIcon,
    CheckCircleIcon,
    InfoIcon,
    AlertTriangleIcon,
    ClockIcon,
    ZapIcon,
    TrendingUpIcon,
    CheckIcon,
} from "lucide-react";
import { fetchAINarrative, type AIInsightsData, type AIKpi, type AIInsight } from "@/services/analytics";

// ── KPI badge ────────────────────────────────────────────────────────────────

function KpiBadge({ kpi }: { kpi: AIKpi }) {
    const cfg = {
        good: {
            dot: "bg-green-500",
            bg: "bg-green-50 border-green-200",
            label: "text-green-800",
            note: "text-green-600",
        },
        warning: {
            dot: "bg-amber-500",
            bg: "bg-amber-50 border-amber-200",
            label: "text-amber-800",
            note: "text-amber-600",
        },
        critical: {
            dot: "bg-red-500",
            bg: "bg-red-50 border-red-200",
            label: "text-red-800",
            note: "text-red-600",
        },
    }[kpi.status];

    return (
        <div className={`flex flex-col gap-1 rounded-lg border px-3 py-2.5 ${cfg.bg}`}>
            <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
                <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.label}`}>
                    {kpi.label}
                </span>
            </div>
            <p className={`text-xs ${cfg.note} pl-3.5`}>{kpi.note}</p>
        </div>
    );
}

// ── Insight card ─────────────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: AIInsight }) {
    const cfg = {
        positive: {
            icon: <CheckCircleIcon className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />,
            bg: "bg-green-50 border-green-100",
            title: "text-green-900",
            body: "text-green-800",
        },
        warning: {
            icon: <AlertTriangleIcon className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />,
            bg: "bg-amber-50 border-amber-100",
            title: "text-amber-900",
            body: "text-amber-800",
        },
        neutral: {
            icon: <InfoIcon className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
            bg: "bg-blue-50/70 border-blue-100",
            title: "text-blue-900",
            body: "text-blue-800",
        },
    }[insight.type];

    return (
        <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${cfg.bg}`}>
            {cfg.icon}
            <div>
                <p className={`text-xs font-semibold mb-0.5 ${cfg.title}`}>{insight.title}</p>
                <p className={`text-xs leading-relaxed ${cfg.body}`}>{insight.body}</p>
            </div>
        </div>
    );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
    return (
        <div className="space-y-5 animate-pulse">
            {/* summary */}
            <div className="space-y-1.5">
                <div className="h-3 rounded bg-gray-200 w-full" />
                <div className="h-3 rounded bg-gray-200 w-4/5" />
            </div>
            {/* kpis */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-14 rounded-lg bg-gray-100" />
                ))}
            </div>
            {/* insights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-lg bg-gray-100" />
                ))}
            </div>
            {/* actions */}
            <div className="space-y-1.5">
                <div className="h-3 rounded bg-gray-200 w-2/3" />
                <div className="h-3 rounded bg-gray-200 w-1/2" />
            </div>
        </div>
    );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onLoad }: { onLoad: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue/8 mb-4">
                <TrendingUpIcon className="h-7 w-7 text-brand-blue/50" />
            </div>
            <p className="text-sm font-semibold text-gray-700">No insights generated yet</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
                Click below to let AI analyze your current business data — revenue, jobs, leads, and receivables.
            </p>
            <button
                onClick={onLoad}
                className="mt-5 flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors"
            >
                <SparklesIcon className="h-4 w-4" />
                Generate AI Insights
            </button>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

function formatTime(d: Date) {
    return d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
}

export default function AINarrativeCard() {
    const [data, setData] = useState<AIInsightsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchAINarrative();
            setData(result);
            setGeneratedAt(new Date());
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "";
            setError(
                msg.includes("429") || msg.toLowerCase().includes("rate")
                    ? "Too many requests — wait a moment and try again."
                    : "AI service unavailable. Try again shortly."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-brand-blue/5 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blue/10">
                        <SparklesIcon className="h-4.5 w-4.5 text-brand-blue" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">AI Business Insights</h3>
                        {generatedAt ? (
                            <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                <ClockIcon className="h-3 w-3" />
                                Updated at {formatTime(generatedAt)} · refreshes every 5 min
                            </p>
                        ) : (
                            <p className="text-xs text-gray-400 mt-0.5">Powered by Groq</p>
                        )}
                    </div>
                </div>
                {data && (
                    <button
                        onClick={load}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCwIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                        {loading ? "Refreshing…" : "Refresh"}
                    </button>
                )}
            </div>

            {/* ── Body ── */}
            <div className="px-6 py-5">

                {/* Error */}
                {error && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
                        <AlertCircleIcon className="h-4 w-4 shrink-0 mt-0.5" />
                        {error}
                    </div>
                )}

                {/* Loading */}
                {loading && <Skeleton />}

                {/* Empty */}
                {!data && !loading && !error && <EmptyState onLoad={load} />}

                {/* Results */}
                {data && !loading && (
                    <div className="space-y-5">

                        {/* Summary */}
                        <div className="flex items-start gap-3 rounded-lg bg-brand-blue/5 border border-brand-blue/10 px-4 py-3">
                            <ZapIcon className="h-4 w-4 text-brand-blue shrink-0 mt-0.5" />
                            <p className="text-sm text-gray-700 leading-relaxed">{data.summary}</p>
                        </div>

                        {/* KPI row */}
                        {data.kpis?.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Health Indicators</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {data.kpis.map((kpi, i) => (
                                        <KpiBadge key={i} kpi={kpi} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Insights grid */}
                        {data.insights?.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Key Observations</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {data.insights.map((insight, i) => (
                                        <InsightCard key={i} insight={insight} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        {data.actions?.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Recommended Actions</p>
                                <ul className="space-y-1.5">
                                    {data.actions.map((action, i) => (
                                        <li key={i} className="flex items-start gap-2.5">
                                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-blue/10 shrink-0 mt-0.5">
                                                <CheckIcon className="h-2.5 w-2.5 text-brand-blue" />
                                            </span>
                                            <span className="text-sm text-gray-700">{action}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Footer ── */}
            {data && !loading && (
                <div className="flex items-center justify-end gap-1.5 px-6 py-2.5 border-t border-gray-100 bg-gray-50/60">
                    <SparklesIcon className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-400">Powered by Groq</span>
                </div>
            )}
        </div>
    );
}
