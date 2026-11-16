"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import { useRouter } from "next/navigation";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import type { DashboardReports } from "@/types/dashboard";
import { BRAND, Card, Segmented, Stat, monthLabel } from "./shared";

type View = "status" | "flow";

const STATUS_META: Record<string, { label: string; color: string }> = {
    pending: { label: "Pending", color: BRAND.yellow },
    in_progress: { label: "In progress", color: BRAND.blue },
    on_hold: { label: "On hold", color: BRAND.orange },
    blocked: { label: "Blocked", color: BRAND.red },
    qc_hold: { label: "QC hold", color: "#F59E0B" },
    ready: { label: "Ready", color: BRAND.teal },
    dispatched: { label: "Dispatched", color: BRAND.purple },
    completed: { label: "Completed", color: BRAND.green },
};

interface Props {
    reports: DashboardReports;
    basePath?: string;
}

export default function JobsStatusReport({ reports, basePath = "/admin" }: Props): ReactElement {
    const router = useRouter();
    const [view, setView] = useState<View>("status");
    const [hovered, setHovered] = useState<string | null>(null);

    const rows = Object.entries(reports.jobs_by_status)
        .map(([status, value]) => ({
            status,
            value,
            label: STATUS_META[status]?.label ?? status.replace(/_/g, " "),
            color: STATUS_META[status]?.color ?? BRAND.gray,
        }))
        .filter((r) => r.value > 0)
        .sort((a, b) => b.value - a.value);
    const total = rows.reduce((s, r) => s + r.value, 0);
    const active = rows.filter((r) => !["completed", "dispatched"].includes(r.status)).reduce((s, r) => s + r.value, 0);
    const focus = rows.find((r) => r.status === hovered);

    const created = reports.monthly.reduce((s, m) => s + m.jobs_created, 0);
    const completed = reports.monthly.reduce((s, m) => s + m.jobs_completed, 0);

    const openStatus = (status: string): void => router.push(`${basePath}/jobs?status=${encodeURIComponent(status)}`);

    return (
        <Card
            exportName="jobs-by-status"
            exportRows={(): Record<string, string | number>[] => rows.map((r) => ({ Status: r.label, Jobs: r.value }))}
            title="Jobs"
            subtitle={`${total} total · ${active} still open · click a status to see those jobs`}
            actions={
                <Segmented
                    ariaLabel="Jobs view"
                    value={view}
                    onChange={setView}
                    options={[
                        { value: "status", label: "By status" },
                        { value: "flow", label: "Created vs done" },
                    ]}
                />
            }
        >
            <div className="grid grid-cols-3 gap-3">
                <Stat label="Open jobs" value={active} />
                <Stat label={`Completed (${reports.months}M)`} value={reports.job_metrics.completed} />
                <Stat
                    label="On time"
                    value={reports.job_metrics.on_time_rate === null ? "—" : `${reports.job_metrics.on_time_rate}%`}
                    tone={reports.job_metrics.on_time_rate === null ? "neutral" : reports.job_metrics.on_time_rate >= 80 ? "up" : "down"}
                    hint={reports.job_metrics.on_time_rate === null ? "no completions yet" : "finished by due date"}
                />
            </div>

            {view === "status" ? (
                rows.length === 0 ? (
                    <p className="py-16 text-center text-sm text-gray-500">No jobs yet.</p>
                ) : (
                    <div className="mt-5 grid grid-cols-1 items-center gap-6 md:grid-cols-2">
                        <div className="relative h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={rows}
                                        dataKey="value"
                                        nameKey="label"
                                        innerRadius="62%"
                                        outerRadius="92%"
                                        paddingAngle={2}
                                        onMouseEnter={(_d, i): void => setHovered(rows[i]?.status ?? null)}
                                        onMouseLeave={(): void => setHovered(null)}
                                        onClick={(_d, i): void => { const r = rows[i]; if (r) openStatus(r.status); }}
                                        style={{ cursor: "pointer" }}
                                    >
                                        {rows.map((r) => (
                                            <Cell
                                                key={r.status}
                                                fill={r.color}
                                                stroke="#fff"
                                                strokeWidth={2}
                                                opacity={hovered && hovered !== r.status ? 0.35 : 1}
                                            />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold text-gray-900">{focus ? focus.value : total}</span>
                                <span className="text-xs font-medium text-gray-500">{focus ? focus.label : "jobs"}</span>
                                {focus && total > 0 && <span className="text-xs text-gray-400">{Math.round((focus.value / total) * 100)}%</span>}
                            </div>
                        </div>
                        <ul className="space-y-1.5">
                            {rows.map((r) => (
                                <li key={r.status}>
                                    <button
                                        type="button"
                                        onMouseEnter={(): void => setHovered(r.status)}
                                        onMouseLeave={(): void => setHovered(null)}
                                        onClick={(): void => openStatus(r.status)}
                                        className={`w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-gray-50 ${hovered === r.status ? "bg-gray-50" : ""}`}
                                    >
                                        <div className="flex items-center justify-between gap-2 text-sm">
                                            <span className="flex items-center gap-2 text-gray-700">
                                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                                                {r.label}
                                            </span>
                                            <span className="font-semibold text-gray-900">
                                                {r.value}
                                                <span className="ml-1.5 text-xs font-normal text-gray-400">{Math.round((r.value / total) * 100)}%</span>
                                            </span>
                                        </div>
                                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-100">
                                            <div className="h-full rounded-full" style={{ width: `${(r.value / total) * 100}%`, backgroundColor: r.color }} />
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )
            ) : (
                <>
                    <p className="mt-4 text-xs text-gray-500">
                        {created} created · {completed} completed in the last {reports.months} months
                        {created > completed ? ` · backlog grew by ${created - completed}` : ""}
                    </p>
                    <div className="mt-2 h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={reports.monthly} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF0F3" />
                                <XAxis dataKey="month" tickFormatter={(v: string): string => monthLabel(v)} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} />
                                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#6B7280" }} />
                                <Tooltip labelFormatter={(v): string => monthLabel(String(v), true)} contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="jobs_created" name="Created" fill={BRAND.orange} radius={[6, 6, 0, 0]} maxBarSize={22} />
                                <Bar dataKey="jobs_completed" name="Completed" fill={BRAND.green} radius={[6, 6, 0, 0]} maxBarSize={22} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}
        </Card>
    );
}
