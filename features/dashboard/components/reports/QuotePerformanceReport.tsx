"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import { useRouter } from "next/navigation";
import {
    Bar,
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import type { DashboardReports } from "@/types/dashboard";
import { BRAND, Card, Segmented, Stat, formatKES, monthLabel } from "./shared";

type View = "funnel" | "status" | "trend";

const STATUS_ORDER: { status: string; label: string; color: string }[] = [
    { status: "Draft", label: "Draft", color: BRAND.gray },
    { status: "Sent to PT", label: "With production (costing)", color: BRAND.yellow },
    { status: "Costed", label: "Costed", color: BRAND.teal },
    { status: "Sent to Customer", label: "Sent to client", color: BRAND.purple },
    { status: "Approved", label: "Approved", color: BRAND.green },
    { status: "Lost", label: "Lost", color: BRAND.red },
    { status: "Rejected", label: "Rejected", color: BRAND.orange },
    { status: "Void", label: "Void", color: "#D1D5DB" },
];

interface Props {
    reports: DashboardReports;
    basePath?: string;
}

export default function QuotePerformanceReport({ reports, basePath = "/admin" }: Props): ReactElement {
    const router = useRouter();
    const [view, setView] = useState<View>("funnel");

    const by = reports.quotes_by_status;
    const total = Object.values(by).reduce((s, n) => s + n, 0);
    const statusRows = STATUS_ORDER.map((s) => ({ ...s, value: by[s.status] ?? 0 })).filter((r) => r.value > 0);
    const statusMax = Math.max(1, ...statusRows.map((r) => r.value));

    // Funnel: every quote ever created → reached the client → approved.
    const approved = by["Approved"] ?? 0;
    const lost = by["Lost"] ?? 0;
    const sent = (by["Sent to Customer"] ?? 0) + approved + lost + (by["Rejected"] ?? 0);
    const funnel = [
        { label: "Quotes created", value: total, color: BRAND.gray, status: null as string | null },
        { label: "Reached the client", value: sent, color: BRAND.purple, status: "Sent to Customer" },
        { label: "Approved", value: approved, color: BRAND.green, status: "Approved" },
    ];

    const qm = reports.quote_metrics;
    const trend = reports.monthly.map((m) => {
        const decided = m.quotes_approved + m.quotes_lost;
        return { ...m, win_rate: decided ? Math.round((m.quotes_approved / decided) * 100) : null };
    });

    const openStatus = (status: string): void => router.push(`${basePath}/quotes?status=${encodeURIComponent(status)}`);

    return (
        <Card
            exportName="quotes-by-status"
            exportRows={(): Record<string, string | number>[] => STATUS_ORDER.map((r) => ({ Status: r.label, Quotes: by[r.status] ?? 0 }))}
            title="Quote Performance"
            subtitle={`${total} quotes · click a stage or status to open the list`}
            actions={
                <Segmented
                    ariaLabel="Quotes view"
                    value={view}
                    onChange={setView}
                    options={[
                        { value: "funnel", label: "Funnel" },
                        { value: "status", label: "By status" },
                        { value: "trend", label: "Monthly" },
                    ]}
                />
            }
        >
            <div className="grid grid-cols-3 gap-3">
                <Stat
                    label="Win rate"
                    value={qm.win_rate === null ? "—" : `${qm.win_rate}%`}
                    hint="approved ÷ (approved + lost)"
                    tone={qm.win_rate === null ? "neutral" : qm.win_rate >= 50 ? "up" : "down"}
                />
                <Stat label="Avg quote value" value={formatKES(qm.avg_value, true)} hint={`${qm.created} created (${reports.months}M)`} />
                <Stat label="Time to approve" value={qm.avg_days_to_approve === null ? "—" : `${qm.avg_days_to_approve}d`} hint="average" />
            </div>

            {view === "funnel" && (
                <div className="mt-6 space-y-3">
                    {funnel.map((f, i) => {
                        const pctOfTotal = total ? (f.value / total) * 100 : 0;
                        const prev = i > 0 ? funnel[i - 1].value : null;
                        const step = prev ? Math.round((f.value / prev) * 100) : null;
                        return (
                            <button
                                key={f.label}
                                type="button"
                                disabled={!f.status}
                                onClick={(): void => { if (f.status) openStatus(f.status); }}
                                className={`block w-full text-left ${f.status ? "group" : "cursor-default"}`}
                            >
                                <div className="mb-1 flex items-baseline justify-between text-sm">
                                    <span className="font-medium text-gray-700 group-hover:text-brand-blue">{f.label}</span>
                                    <span className="font-semibold text-gray-900">
                                        {f.value.toLocaleString()}
                                        {step !== null && <span className="ml-2 text-xs font-normal text-gray-500">{step}% of previous step</span>}
                                    </span>
                                </div>
                                <div className="h-8 overflow-hidden rounded-lg bg-gray-100">
                                    <div
                                        className="flex h-full items-center rounded-lg px-3 text-xs font-semibold text-white transition-all group-hover:brightness-110"
                                        style={{ width: `${Math.max(pctOfTotal, 4)}%`, backgroundColor: f.color }}
                                    >
                                        {pctOfTotal >= 12 ? `${Math.round(pctOfTotal)}%` : ""}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                    <p className="pt-1 text-xs text-gray-500">
                        {lost} lost · {by["Draft"] ?? 0} still in draft · {(by["Sent to PT"] ?? 0) + (by["Costed"] ?? 0)} with production for costing
                    </p>
                </div>
            )}

            {view === "status" && (
                <ul className="mt-5 space-y-2">
                    {statusRows.map((r) => (
                        <li key={r.status}>
                            <button type="button" onClick={(): void => openStatus(r.status)} className="group w-full rounded-lg px-2 py-1.5 text-left hover:bg-gray-50">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2 text-gray-700 group-hover:text-brand-blue">
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                                        {r.label}
                                    </span>
                                    <span className="font-semibold text-gray-900">
                                        {r.value}
                                        <span className="ml-1.5 text-xs font-normal text-gray-400">{total ? Math.round((r.value / total) * 100) : 0}%</span>
                                    </span>
                                </div>
                                <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                                    <div className="h-full rounded-full" style={{ width: `${(r.value / statusMax) * 100}%`, backgroundColor: r.color }} />
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {view === "trend" && (
                <div className="mt-4 h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={trend} margin={{ top: 8, right: 0, left: -12, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF0F3" />
                            <XAxis dataKey="month" tickFormatter={(v: string): string => monthLabel(v)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} />
                            <YAxis yAxisId="n" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} />
                            <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tickFormatter={(v: number): string => `${v}%`} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} />
                            <Tooltip
                                labelFormatter={(v): string => monthLabel(String(v), true)}
                                formatter={(v, name): [string, string] => [name === "Win rate" ? `${v}%` : String(v), String(name)]}
                                contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                            <Bar yAxisId="n" dataKey="quotes_created" name="Created" fill={BRAND.gray} radius={[6, 6, 0, 0]} maxBarSize={20} />
                            <Bar yAxisId="n" dataKey="quotes_approved" name="Approved" fill={BRAND.green} radius={[6, 6, 0, 0]} maxBarSize={20} />
                            <Bar yAxisId="n" dataKey="quotes_lost" name="Lost" fill={BRAND.red} radius={[6, 6, 0, 0]} maxBarSize={20} />
                            <Line yAxisId="pct" type="monotone" dataKey="win_rate" name="Win rate" stroke={BRAND.blue} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            )}
        </Card>
    );
}
